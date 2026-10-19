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

const freshlyResetTabs = new Set<ProviderId>();

function isTabFreshChat(url: string | undefined, provider: ProviderId): boolean {
  if (!url) return true;
  const lower = url.toLowerCase().split('?')[0].split('#')[0];

  switch (provider) {
    case 'chatgpt':
      // chatgpt.com/c/xxx is an ongoing thread
      return !lower.includes('/c/');
    case 'claude':
      // claude.ai/chat/xxx is an ongoing thread
      return !lower.includes('/chat/');
    case 'gemini': {
      // gemini.google.com/app/<id> is an ongoing thread
      const match = lower.match(/gemini\.google\.com\/app\/([a-zA-Z0-9_-]{4,})/);
      return !match;
    }
    default:
      return true;
  }
}

async function openProviderTabs(forceNewChat = false): Promise<void> {
  const providers: ProviderId[] = ['chatgpt', 'claude', 'gemini'];
  for (const p of providers) {
    freshlyResetTabs.add(p);
    const existingTab = await findProviderTab(p);
    if (!existingTab) {
      // Create new tab in background so it doesn't snatch focus from the extension
      chrome.tabs.create({ url: PROVIDER_NEW_CHAT_URLS[p], active: false });
    } else if (forceNewChat && existingTab.id) {
      // Navigate existing tab to fresh new chat URL without activating it
      chrome.tabs.update(existingTab.id, { url: PROVIDER_NEW_CHAT_URLS[p] });
    }
  }
}

async function openSingleProviderTab(provider: ProviderId, forceNewChat = false): Promise<void> {
  freshlyResetTabs.add(provider);
  const existingTab = await findProviderTab(provider);
  if (!existingTab || !existingTab.id) {
    // Open new tab in background so user remains in AI Council
    chrome.tabs.create({ url: PROVIDER_NEW_CHAT_URLS[provider], active: false });
  } else if (forceNewChat) {
    // Navigate existing tab to fresh new chat URL without activating it
    chrome.tabs.update(existingTab.id, { url: PROVIDER_NEW_CHAT_URLS[provider] });
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

async function getProviderStatuses(): Promise<Record<ProviderId, { status: ProviderStatus; tabId?: number; isFresh?: boolean }>> {
  const providers: ProviderId[] = ['chatgpt', 'claude', 'gemini'];
  const results: Record<ProviderId, { status: ProviderStatus; tabId?: number; isFresh?: boolean }> = {
    chatgpt: { status: 'unavailable' },
    claude: { status: 'unavailable' },
    gemini: { status: 'unavailable' },
  };

  for (const p of providers) {
    try {
      const tab = await findProviderTab(p);
      if (!tab || !tab.id) {
        results[p] = { status: 'unavailable' };
        freshlyResetTabs.delete(p);
        continue;
      }

      const urlIsFresh = isTabFreshChat(tab.url, p);
      const isFresh = freshlyResetTabs.has(p) || urlIsFresh;

      // If the tab is still loading HTML/assets in Chrome, it's not ready yet
      if (tab.status === 'loading') {
        results[p] = { status: 'connecting', tabId: tab.id, isFresh };
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

      if (statusFromTab === 'ready' || statusFromTab === 'generating' || statusFromTab === 'awaiting_input') {
        results[p] = { status: statusFromTab, tabId, isFresh };
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
            status: (retryStatus === 'ready' || retryStatus === 'generating' || retryStatus === 'awaiting_input') ? retryStatus : 'connecting',
            tabId,
            isFresh,
          };
        } else {
          results[p] = { status: 'connecting', tabId, isFresh };
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

  if (provider === 'gemini') {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => {
          try {
            Object.defineProperty(document, 'hidden', { value: false, configurable: true });
            Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
            document.hasFocus = () => true;
            document.dispatchEvent(new Event('visibilitychange'));
            window.dispatchEvent(new Event('focus'));
          } catch (_e) {}
        },
      });
    } catch (_e) {}
  }

  return new Promise((resolve, reject) => {
    let timer = setTimeout(() => {
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
        if (msg.type === 'PROVIDER_QUESTION_ASKED') {
          // Extend timer so user has ample time to answer question
          clearTimeout(timer);
          timer = setTimeout(() => {
            reject(new Error(`${provider} timed out waiting for clarification answer`));
          }, 180000);
        } else if (msg.type === 'PROVIDER_RESPONSE') {
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

  if (message.type === 'OPEN_SINGLE_PROVIDER_TAB') {
    openSingleProviderTab(message.provider, message.forceNewChat ?? false).then(() => {
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

  if (message.type === 'PROVIDER_QUESTION_ASKED') {
    chrome.runtime.sendMessage({
      type: 'COUNCIL_STATE_UPDATE',
      state: {
        providers: {
          [message.provider]: {
            status: 'awaiting_input',
            pendingQuestion: {
              provider: message.provider,
              question: message.question,
              options: message.options,
              timestamp: Date.now(),
            },
          },
        },
      },
    }).catch(() => {});
    return false;
  }

  if (message.type === 'ANSWER_PROVIDER_QUESTION') {
    (async () => {
      const tab = await findProviderTab(message.provider);
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'ANSWER_PROVIDER_QUESTION',
          provider: message.provider,
          answer: message.answer,
          optionIndex: message.optionIndex,
        });
        chrome.runtime.sendMessage({
          type: 'COUNCIL_STATE_UPDATE',
          state: {
            providers: {
              [message.provider]: {
                status: 'generating',
                pendingQuestion: undefined,
              },
            },
          },
        }).catch(() => {});
      }
    })();
    return true;
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
            chatgpt: { status: tabStatuses.chatgpt.tabId ? 'sending' : 'unavailable', response: undefined },
            claude: { status: tabStatuses.claude.tabId ? 'sending' : 'unavailable', response: undefined },
            gemini: { status: tabStatuses.gemini.tabId ? 'ready' : 'unavailable', response: undefined },
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
            gemini: { status: 'sending', response: undefined },
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
            error: 'Gemini tab is not open. Please open gemini.google.com and try again.',
          },
        });
      }
    })();
    return true;
  }
});
