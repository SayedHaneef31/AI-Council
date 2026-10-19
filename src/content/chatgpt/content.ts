import { ChatGPTAdapter } from './adapter';
import { ExtensionMessage } from '../../messaging/message-types';

const adapter = new ChatGPTAdapter();

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (!('provider' in message) || message.provider !== 'chatgpt') return false;

  (async () => {
    try {
      switch (message.type) {
        case 'CHECK_PROVIDER_STATUS': {
          const status = await adapter.getStatus();
          sendResponse({ type: 'PROVIDER_STATUS_RESPONSE', provider: 'chatgpt', status });
          break;
        }

        case 'SUBMIT_PROMPT': {
          await adapter.sendPrompt(message.prompt);
          sendResponse({ type: 'PROMPT_SUBMITTED', provider: 'chatgpt', success: true });
          
          try {
            await adapter.waitForCompletion({
              timeoutMs: message.timeoutMs || 90000,
              onProgress: (text: string) => {
                chrome.runtime.sendMessage({
                  type: 'PROVIDER_STREAM_UPDATE',
                  provider: 'chatgpt',
                  text,
                }).catch(() => {});
              },
            });
            const response = await adapter.getLatestResponse();
            chrome.runtime.sendMessage({
              type: 'PROVIDER_RESPONSE',
              provider: 'chatgpt',
              response,
            });
          } catch (err: any) {
            chrome.runtime.sendMessage({
              type: 'PROVIDER_ERROR',
              provider: 'chatgpt',
              error: err.message || 'ChatGPT failed during generation',
            });
          }
          break;
        }

        case 'ANSWER_PROVIDER_QUESTION': {
          if (adapter.answerQuestion) {
            await adapter.answerQuestion(message.answer, message.optionIndex);
            sendResponse({ type: 'PROVIDER_QUESTION_ANSWERED', provider: 'chatgpt', success: true });
          }
          break;
        }

        case 'GET_LATEST_RESPONSE': {
          const response = await adapter.getLatestResponse();
          sendResponse({ type: 'PROVIDER_RESPONSE', provider: 'chatgpt', response });
          break;
        }
      }
    } catch (err: any) {
      sendResponse({ type: 'PROVIDER_ERROR', provider: 'chatgpt', error: err.message });
    }
  })();

  return true;
});
