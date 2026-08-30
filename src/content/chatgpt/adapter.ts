import { AIProvider, WaitOptions } from '../../providers/provider';
import { ModelResponse, ProviderId, ProviderStatus } from '../../types';
import { ChatGPTSelectors } from './selectors';
import { ChatGPTDetector } from './detector';

export class ChatGPTAdapter implements AIProvider {
  id: ProviderId = 'chatgpt';
  name = 'ChatGPT';

  matches(url: string): boolean {
    return ChatGPTDetector.isChatGPTPage(url);
  }

  async isReady(): Promise<boolean> {
    return ChatGPTDetector.isReady();
  }

  async getStatus(): Promise<ProviderStatus> {
    if (!ChatGPTDetector.isChatGPTPage()) return 'unavailable';
    if (ChatGPTDetector.isGenerating()) return 'generating';
    if (ChatGPTDetector.isReady()) return 'ready';
    return 'unavailable';
  }

  async sendPrompt(prompt: string): Promise<void> {
    const input = document.querySelector(ChatGPTSelectors.input) as HTMLElement | null;
    if (!input) {
      throw new Error('ChatGPT input element not found');
    }

    input.focus();
    if (input.tagName.toLowerCase() === 'textarea') {
      (input as HTMLTextAreaElement).value = prompt;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      input.textContent = prompt;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    await new Promise((r) => setTimeout(r, 200));

    const sendBtn = document.querySelector(ChatGPTSelectors.sendButton) as HTMLButtonElement | null;
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
      // Fallback: Dispatch Enter Key
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(enterEvent);
    }
  }

  async waitForCompletion(options?: WaitOptions): Promise<void> {
    const timeoutMs = options?.timeoutMs || 90000;
    const pollInterval = options?.pollIntervalMs || 500;
    const startTime = Date.now();

    // Give it a short time for generation to begin
    await new Promise((r) => setTimeout(r, 1000));

    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const isGenerating = ChatGPTDetector.isGenerating();
        if (!isGenerating) {
          clearInterval(interval);
          resolve();
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          clearInterval(interval);
          reject(new Error('ChatGPT generation timed out'));
        }
      }, pollInterval);
    });
  }

  async getLatestResponse(): Promise<ModelResponse> {
    const messages = document.querySelectorAll(ChatGPTSelectors.assistantMessages);
    if (!messages || messages.length === 0) {
      throw new Error('No assistant response found in ChatGPT DOM');
    }

    const latest = messages[messages.length - 1] as HTMLElement;
    const text = latest.innerText || latest.textContent || '';

    return {
      provider: 'chatgpt',
      text: text.trim(),
      status: 'completed',
      startedAt: Date.now() - 5000,
      completedAt: Date.now(),
    };
  }
}
