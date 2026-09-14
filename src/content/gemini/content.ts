import { GeminiAdapter } from './adapter';
import { ExtensionMessage } from '../../messaging/message-types';

const adapter = new GeminiAdapter();

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (!('provider' in message) || message.provider !== 'gemini') return false;

  (async () => {
    try {
      switch (message.type) {
        case 'CHECK_PROVIDER_STATUS': {
          const status = await adapter.getStatus();
          sendResponse({ type: 'PROVIDER_STATUS_RESPONSE', provider: 'gemini', status });
          break;
        }

        case 'SUBMIT_PROMPT': {
          await adapter.sendPrompt(message.prompt);
          sendResponse({ type: 'PROMPT_SUBMITTED', provider: 'gemini', success: true });
          
          try {
            await adapter.waitForCompletion({
              timeoutMs: message.timeoutMs || 120000,
              onProgress: (text: string) => {
                chrome.runtime.sendMessage({
                  type: 'PROVIDER_STREAM_UPDATE',
                  provider: 'gemini',
                  text,
                }).catch(() => {});
              },
            });
            const response = await adapter.getLatestResponse();
            chrome.runtime.sendMessage({
              type: 'PROVIDER_RESPONSE',
              provider: 'gemini',
              response,
            });
          } catch (err: any) {
            chrome.runtime.sendMessage({
              type: 'PROVIDER_ERROR',
              provider: 'gemini',
              error: err.message || 'Gemini failed during synthesis generation',
            });
          }
          break;
        }

        case 'GET_LATEST_RESPONSE': {
          const response = await adapter.getLatestResponse();
          sendResponse({ type: 'PROVIDER_RESPONSE', provider: 'gemini', response });
          break;
        }
      }
    } catch (err: any) {
      sendResponse({ type: 'PROVIDER_ERROR', provider: 'gemini', error: err.message });
    }
  })();

  return true;
});
