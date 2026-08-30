import { AIProvider, WaitOptions } from '../../providers/provider';
import { ModelResponse, ProviderId, ProviderStatus } from '../../types';
import { GeminiSelectors } from './selectors';
import { GeminiDetector } from './detector';

export class GeminiAdapter implements AIProvider {
  id: ProviderId = 'gemini';
  name = 'Gemini';

  matches(url: string): boolean {
    return GeminiDetector.isGeminiPage(url);
  }

  async isReady(): Promise<boolean> {
    return GeminiDetector.isReady();
  }

  async getStatus(): Promise<ProviderStatus> {
    if (!GeminiDetector.isGeminiPage()) return 'unavailable';
    if (GeminiDetector.isGenerating()) return 'generating';
    if (GeminiDetector.isReady()) return 'ready';
    return 'unavailable';
  }

  async sendPrompt(prompt: string): Promise<void> {
    const input = document.querySelector(GeminiSelectors.input) as HTMLElement | null;
    if (!input) {
      throw new Error('Gemini input element not found');
    }

    input.focus();
    if (input.tagName.toLowerCase() === 'textarea') {
      (input as HTMLTextAreaElement).value = prompt;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      input.textContent = prompt;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    await new Promise((r) => setTimeout(r, 250));

    const sendBtn = document.querySelector(GeminiSelectors.sendButton) as HTMLButtonElement | null;
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
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

    await new Promise((r) => setTimeout(r, 1000));

    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const isGenerating = GeminiDetector.isGenerating();
        if (!isGenerating) {
          clearInterval(interval);
          resolve();
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          clearInterval(interval);
          reject(new Error('Gemini generation timed out'));
        }
      }, pollInterval);
    });
  }

  async getLatestResponse(): Promise<ModelResponse> {
    const messages = document.querySelectorAll(GeminiSelectors.assistantMessages);
    if (!messages || messages.length === 0) {
      const fallback = document.querySelectorAll('.model-response-text');
      if (fallback && fallback.length > 0) {
        const latest = fallback[fallback.length - 1] as HTMLElement;
        return {
          provider: 'gemini',
          text: (latest.innerText || latest.textContent || '').trim(),
          status: 'completed',
          startedAt: Date.now() - 5000,
          completedAt: Date.now(),
        };
      }
      throw new Error('No assistant response found in Gemini DOM');
    }

    const latest = messages[messages.length - 1] as HTMLElement;
    const text = latest.innerText || latest.textContent || '';

    return {
      provider: 'gemini',
      text: text.trim(),
      status: 'completed',
      startedAt: Date.now() - 5000,
      completedAt: Date.now(),
    };
  }
}
