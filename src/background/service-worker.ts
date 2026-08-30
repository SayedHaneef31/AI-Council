import { ExtensionMessage } from '../messaging/message-types';
import { ModelResponse, ProviderId, ProviderStatus } from '../types';
import { buildSynthesisPrompt } from '../orchestration/prompts';
import { parseSynthesisMarkdown } from '../orchestration/synthesis';

interface RunSession {
  prompt: string;
  context?: string;
  responses: Partial<Record<ProviderId, ModelResponse>>;
  errors: Partial<Record<ProviderId, string>>;
}

let activeRun: RunSession | null = null;

// Enable opening Side Panel directly on toolbar icon click
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && typeof chrome.sidePanel.setPanelBehavior === 'function') {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.error('Failed to set side panel behavior:', err);
    });
  }
});

// Also configure behavior on startup
if (chrome.sidePanel && typeof chrome.sidePanel.setPanelBehavior === 'function') {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

async function findProviderTab(urlPattern: string): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ url: urlPattern });
  return tabs.length > 0 ? tabs[0] : null;
}

async function ensureContentScriptInjected(tabId: number, provider: ProviderId): Promise<boolean> {
  try {
    const isResponding = await new Promise<boolean>((resolve) => {
      chrome.tabs.sendMessage(tabId, { type: 'CHECK_PROVIDER_STATUS', provider }, (res) => {
        if (chrome.runtime.lastError || !res) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });

    if (!isResponding) {
      console.log(`[AI Council] Content script missing on ${provider} tab (${tabId}). Injecting dynamically...`);
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [`content/${provider}.js`],
      });
      await new Promise((r) => setTimeout(r, 300));
    }
    return true;
  } catch (err) {
    console.error(`Failed to ensure content script on ${provider}:`, err);
    return false;
  }
}

async function getProviderStatuses(): Promise<Record<ProviderId, { status: ProviderStatus; tabId?: number }>> {
  const providers: ProviderId[] = ['chatgpt', 'claude', 'gemini'];
  const patterns: Record<ProviderId, string> = {
    chatgpt: 'https://chatgpt.com/*',
    claude: 'https://claude.ai/*',
    gemini: 'https://gemini.google.com/*',
  };

  const results: Record<ProviderId, { status: ProviderStatus; tabId?: number }> = {
    chatgpt: { status: 'unavailable' },
    claude: { status: 'unavailable' },
    gemini: { status: 'unavailable' },
  };

  for (const p of providers) {
    const tab = await findProviderTab(patterns[p]);
    if (tab && tab.id) {
      await ensureContentScriptInjected(tab.id, p);
      results[p] = { status: 'ready', tabId: tab.id };
    }
  }

  return results;
}

async function runWorkerProvider(
  provider: ProviderId,
  tabId: number,
  prompt: string,
  timeoutMs: number = 90000
): Promise<ModelResponse> {
  await ensureContentScriptInjected(tabId, provider);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${provider} timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    chrome.tabs.sendMessage(
      tabId,
      { type: 'SUBMIT_PROMPT', provider, prompt, timeoutMs },
      (res) => {
        if (chrome.runtime.lastError) {
          clearTimeout(timer);
          reject(new Error(`Failed to contact ${provider} tab: ${chrome.runtime.lastError.message}`));
          return;
        }
        if (res && res.type === 'PROVIDER_ERROR') {
          clearTimeout(timer);
          reject(new Error(res.error));
        }
      }
    );

    const listener = (msg: ExtensionMessage) => {
      if ('provider' in msg && msg.provider === provider) {
        if (msg.type === 'PROVIDER_RESPONSE') {
          clearTimeout(timer);
          chrome.runtime.onMessage.removeListener(listener);
          resolve(msg.response);
        } else if (msg.type === 'PROVIDER_ERROR') {
          clearTimeout(timer);
          chrome.runtime.onMessage.removeListener(listener);
          reject(new Error(msg.error));
        }
      }
    };

    chrome.runtime.onMessage.addListener(listener);
  });
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'CHECK_PROVIDER_STATUS') {
    getProviderStatuses().then((statuses) => {
      sendResponse({ type: 'PROVIDER_STATUS_RESPONSE', statuses });
    });
    return true;
  }

  if (message.type === 'START_COUNCIL_RUN') {
    (async () => {
      const { prompt, context } = message;
      activeRun = { prompt, context, responses: {}, errors: {} };

      const tabStatuses = await getProviderStatuses();

      chrome.runtime.sendMessage({
        type: 'COUNCIL_STATE_UPDATE',
        state: {
          runStatus: 'running',
          providers: {
            chatgpt: { status: tabStatuses.chatgpt.tabId ? 'sending' : 'unavailable' },
            claude: { status: tabStatuses.claude.tabId ? 'sending' : 'unavailable' },
            gemini: { status: tabStatuses.gemini.tabId ? 'ready' : 'unavailable' },
          },
        },
      });

      const tasks: Promise<{ provider: ProviderId; response?: ModelResponse; error?: string }>[] = [];

      if (tabStatuses.chatgpt.tabId) {
        tasks.push(
          runWorkerProvider('chatgpt', tabStatuses.chatgpt.tabId, prompt)
            .then((res) => ({ provider: 'chatgpt' as ProviderId, response: res }))
            .catch((err) => ({ provider: 'chatgpt' as ProviderId, error: err.message }))
        );
      }

      if (tabStatuses.claude.tabId) {
        tasks.push(
          runWorkerProvider('claude', tabStatuses.claude.tabId, prompt)
            .then((res) => ({ provider: 'claude' as ProviderId, response: res }))
            .catch((err) => ({ provider: 'claude' as ProviderId, error: err.message }))
        );
      }

      const results = await Promise.allSettled(tasks);
      const collectedResponses: ModelResponse[] = [];

      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          const val = r.value;
          if (val.response) {
            activeRun!.responses[val.provider] = val.response;
            collectedResponses.push(val.response);
          } else if (val.error) {
            activeRun!.errors[val.provider] = val.error;
          }
        }
      });

      if (collectedResponses.length === 0) {
        chrome.runtime.sendMessage({
          type: 'COUNCIL_STATE_UPDATE',
          state: {
            runStatus: 'failed',
            error: 'No model responses were successfully retrieved from ChatGPT or Claude.',
          },
        });
        return;
      }

      chrome.runtime.sendMessage({
        type: 'COUNCIL_STATE_UPDATE',
        state: {
          runStatus: 'synthesizing',
          providers: {
            chatgpt: {
              status: activeRun.responses.chatgpt ? 'completed' : 'failed',
              error: activeRun.errors.chatgpt,
              response: activeRun.responses.chatgpt,
            },
            claude: {
              status: activeRun.responses.claude ? 'completed' : 'failed',
              error: activeRun.errors.claude,
              response: activeRun.responses.claude,
            },
            gemini: { status: 'sending' },
          },
        },
      });

      if (tabStatuses.gemini.tabId) {
        try {
          const synthesisPrompt = buildSynthesisPrompt(prompt, context || '', collectedResponses);
          const geminiResponse = await runWorkerProvider('gemini', tabStatuses.gemini.tabId, synthesisPrompt, 120000);
          activeRun.responses.gemini = geminiResponse;

          const synthesis = parseSynthesisMarkdown(geminiResponse.text);

          chrome.runtime.sendMessage({
            type: 'COUNCIL_STATE_UPDATE',
            state: {
              runStatus: 'completed',
              synthesis,
              providers: {
                chatgpt: {
                  status: activeRun.responses.chatgpt ? 'completed' : 'failed',
                  error: activeRun.errors.chatgpt,
                  response: activeRun.responses.chatgpt,
                },
                claude: {
                  status: activeRun.responses.claude ? 'completed' : 'failed',
                  error: activeRun.errors.claude,
                  response: activeRun.responses.claude,
                },
                gemini: {
                  status: 'completed',
                  response: geminiResponse,
                },
              },
            },
          });
        } catch (err: any) {
          chrome.runtime.sendMessage({
            type: 'COUNCIL_STATE_UPDATE',
            state: {
              runStatus: 'failed',
              error: `Gemini synthesis failed: ${err.message}`,
            },
          });
        }
      } else {
        chrome.runtime.sendMessage({
          type: 'COUNCIL_STATE_UPDATE',
          state: {
            runStatus: 'failed',
            error: 'Gemini tab is not open or available for synthesis.',
          },
        });
      }
    })();
    return true;
  }
});
