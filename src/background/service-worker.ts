import { ExtensionMessage } from '../messaging/message-types';
import { ModelResponse, ProviderId, ProviderStatus } from '../types';
import { buildSynthesisPrompt } from '../orchestration/prompts';
import { parseSynthesisMarkdown } from '../orchestration/synthesis';

interface RunSession {
  prompt: string;
  context?: string;
  responses: Partial<Record<ProviderId, ModelResponse>>;
  streamingResponses: Partial<Record<ProviderId, string>>;
  errors: Partial<Record<ProviderId, string>>;
}

let activeRun: RunSession | null = null;

const PROVIDER_NEW_CHAT_URLS: Record<ProviderId, string> = {
  chatgpt: 'https://chatgpt.com',
  claude: 'https://claude.ai/new',
  gemini: 'https://gemini.google.com/app',
};

async function openProviderTabs(forceNewChat = false): Promise<void> {
  const providers: ProviderId[] = ['chatgpt', 'claude', 'gemini'];
  for (const p of providers) {
    const existingTab = await findProviderTab(p);
    if (!existingTab) {
      // Create new tab in background so it doesn't snatch focus from the extension
      chrome.tabs.create({ url: PROVIDER_NEW_CHAT_URLS[p], active: false });
    } else if (forceNewChat && existingTab.id) {
      // Navigate existing tab to fresh new chat URL
      chrome.tabs.update(existingTab.id, { url: PROVIDER_NEW_CHAT_URLS[p] });
    }
  }
}

// Open or focus AI Council full-screen tab when extension toolbar icon is clicked
chrome.action.onClicked.addListener(() => {
  const url = chrome.runtime.getURL('sidepanel/index.html');
  chrome.tabs.query({}, (allTabs) => {
    const existing = allTabs.find((t) => t.url && t.url.includes(url));
    if (existing && existing.id) {
      chrome.tabs.update(existing.id, { active: true });
    } else {
      chrome.tabs.create({ url: 'sidepanel/index.html' });
    }
  });
});

function matchesProviderUrl(url: string | undefined, provider: ProviderId): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  switch (provider) {
    case 'chatgpt':
      return lower.includes('chatgpt.com') || lower.includes('chat.openai.com');
    case 'claude':
      return lower.includes('claude.ai');
    case 'gemini':
      return lower.includes('gemini.google.com');
    default:
      return false;
  }
}

async function findProviderTab(provider: ProviderId): Promise<chrome.tabs.Tab | null> {
  const allTabs = await chrome.tabs.query({});
  const matchedTabs = allTabs.filter((t) => matchesProviderUrl(t.url, provider));

  if (matchedTabs.length === 0) return null;

  // Prefer active tab, or non-discarded tab
  const active = matchedTabs.find((t) => t.active);
  if (active) return active;

  const nonDiscarded = matchedTabs.find((t) => !t.discarded);
  if (nonDiscarded) return nonDiscarded;

  return matchedTabs[0];
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
      console.log(`[AI Council] Injecting content script for ${provider} into tab ${tabId}...`);
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [`content/${provider}.js`],
      });
      await new Promise((r) => setTimeout(r, 350));
    }
    return true;
  } catch (err) {
    console.warn(`Could not inject script into ${provider} tab ${tabId}:`, err);
    return false;
  }
}

async function getProviderStatuses(): Promise<Record<ProviderId, { status: ProviderStatus; tabId?: number }>> {
  const providers: ProviderId[] = ['chatgpt', 'claude', 'gemini'];
  const results: Record<ProviderId, { status: ProviderStatus; tabId?: number }> = {
    chatgpt: { status: 'unavailable' },
    claude: { status: 'unavailable' },
    gemini: { status: 'unavailable' },
  };

  for (const p of providers) {
    try {
      const tab = await findProviderTab(p);
      if (!tab || !tab.id) {
        results[p] = { status: 'unavailable' };
        continue;
      }

      // If the tab is still loading HTML/assets in Chrome, it's not ready yet
      if (tab.status === 'loading') {
        results[p] = { status: 'connecting', tabId: tab.id };
        continue;
      }

      const tabId = tab.id;

      // Query content script for actual DOM input readiness
      const statusFromTab = await new Promise<ProviderStatus>((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'CHECK_PROVIDER_STATUS', provider: p }, (res) => {
          if (chrome.runtime.lastError || !res || !res.status) {
            resolve('unavailable');
          } else {
            resolve(res.status);
          }
        });
      });

      if (statusFromTab === 'ready' || statusFromTab === 'generating') {
        results[p] = { status: statusFromTab, tabId };
      } else {
        // Ensure content script is injected if not already
        const injected = await ensureContentScriptInjected(tabId, p);
        if (injected) {
          const retryStatus = await new Promise<ProviderStatus>((resolve) => {
            chrome.tabs.sendMessage(tabId, { type: 'CHECK_PROVIDER_STATUS', provider: p }, (res) => {
              if (chrome.runtime.lastError || !res || !res.status) {
                resolve('connecting');
              } else {
                resolve(res.status);
              }
            });
          });
          results[p] = {
            status: (retryStatus === 'ready' || retryStatus === 'generating') ? retryStatus : 'connecting',
            tabId,
          };
        } else {
          results[p] = { status: 'connecting', tabId };
        }
      }
    } catch (e) {
      console.warn(`Error checking status for ${p}:`, e);
      results[p] = { status: 'unavailable' };
    }
  }

  return results;
}

// Broadcast status changes automatically when tabs are created, updated, or removed
async function broadcastStatusUpdate() {
  const statuses = await getProviderStatuses();
  chrome.runtime.sendMessage({
    type: 'PROVIDER_STATUS_RESPONSE',
    statuses,
  }).catch(() => {
    // Ignore error if UI is not currently open
  });
}

chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.status || changeInfo.url) {
    broadcastStatusUpdate();
  }
});

chrome.tabs.onRemoved.addListener(() => {
  broadcastStatusUpdate();
});

chrome.tabs.onActivated.addListener(() => {
  broadcastStatusUpdate();
});

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

  if (message.type === 'INIT_EXTENSION_SESSION') {
    broadcastStatusUpdate();
    return true;
  }

  if (message.type === 'OPEN_PROVIDER_TABS') {
    openProviderTabs(message.forceNewChat ?? true).then(() => {
      broadcastStatusUpdate();
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'PROVIDER_STREAM_UPDATE') {
    if (activeRun) {
      activeRun.streamingResponses[message.provider] = message.text;
    }
    chrome.runtime.sendMessage({
      type: 'COUNCIL_STATE_UPDATE',
      state: {
        streamingResponses: {
          [message.provider]: message.text,
        },
      },
    }).catch(() => {});
    return false;
  }

  if (message.type === 'START_COUNCIL_RUN') {
    (async () => {
      const { prompt, context } = message;
      activeRun = { prompt, context, responses: {}, streamingResponses: {}, errors: {} };

      const tabStatuses = await getProviderStatuses();

      chrome.runtime.sendMessage({
        type: 'COUNCIL_STATE_UPDATE',
        state: {
          runStatus: 'running',
          streamingResponses: {},
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
            .then((res) => {
              activeRun!.responses.chatgpt = res;
              chrome.runtime.sendMessage({
                type: 'COUNCIL_STATE_UPDATE',
                state: {
                  providers: {
                    chatgpt: { status: 'completed', response: res },
                  },
                },
              }).catch(() => {});
              return { provider: 'chatgpt' as ProviderId, response: res };
            })
            .catch((err) => {
              activeRun!.errors.chatgpt = err.message;
              chrome.runtime.sendMessage({
                type: 'COUNCIL_STATE_UPDATE',
                state: {
                  providers: {
                    chatgpt: { status: 'failed', error: err.message },
                  },
                },
              }).catch(() => {});
              return { provider: 'chatgpt' as ProviderId, error: err.message };
            })
        );
      }

      if (tabStatuses.claude.tabId) {
        tasks.push(
          runWorkerProvider('claude', tabStatuses.claude.tabId, prompt)
            .then((res) => {
              activeRun!.responses.claude = res;
              chrome.runtime.sendMessage({
                type: 'COUNCIL_STATE_UPDATE',
                state: {
                  providers: {
                    claude: { status: 'completed', response: res },
                  },
                },
              }).catch(() => {});
              return { provider: 'claude' as ProviderId, response: res };
            })
            .catch((err) => {
              activeRun!.errors.claude = err.message;
              chrome.runtime.sendMessage({
                type: 'COUNCIL_STATE_UPDATE',
                state: {
                  providers: {
                    claude: { status: 'failed', error: err.message },
                  },
                },
              }).catch(() => {});
              return { provider: 'claude' as ProviderId, error: err.message };
            })
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
            error: 'No model responses were retrieved. Please make sure ChatGPT or Claude tab is open and logged in.',
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

          // Ensure Gemini tab receives active rendering and input dispatch in Chrome
          const [currentActiveTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const needTabWakeup = currentActiveTab && currentActiveTab.id !== tabStatuses.gemini.tabId;

          if (needTabWakeup && tabStatuses.gemini.tabId) {
            await chrome.tabs.update(tabStatuses.gemini.tabId, { active: true });
            await new Promise((r) => setTimeout(r, 250));
          }

          const geminiPromise = runWorkerProvider('gemini', tabStatuses.gemini.tabId, synthesisPrompt, 120000);

          if (needTabWakeup && currentActiveTab && currentActiveTab.id) {
            setTimeout(async () => {
              try {
                await chrome.tabs.update(currentActiveTab.id!, { active: true });
              } catch (_e) {}
            }, 600);
          }

          const geminiResponse = await geminiPromise;
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
            error: 'Gemini tab is not open. Please open gemini.google.com and try again.',
          },
        });
      }
    })();
    return true;
  }
});
