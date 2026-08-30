import { AIProvider, WaitOptions } from '../../providers/provider';
import { ModelResponse, ProviderId, ProviderStatus } from '../../types';
import { ClaudeSelectors } from './selectors';
import { ClaudeDetector } from './detector';

export class ClaudeAdapter implements AIProvider {
  id: ProviderId = 'claude';
  name = 'Claude';

  matches(url: string): boolean {
    return ClaudeDetector.isClaudePage(url);
  }

  async isReady(): Promise<boolean> {
    return ClaudeDetector.isReady();
  }

  async getStatus(): Promise<ProviderStatus> {
    if (!ClaudeDetector.isClaudePage()) return 'unavailable';
    if (ClaudeDetector.isGenerating()) return 'generating';
    if (ClaudeDetector.isReady()) return 'ready';
    return 'unavailable';
  }

  async sendPrompt(prompt: string): Promise<void> {
    const input = document.querySelector(ClaudeSelectors.input) as HTMLElement | null;
    if (!input) {
      throw new Error('Claude input element not found');
    }

    input.focus();
    if (input.tagName.toLowerCase() === 'textarea') {
      (input as HTMLTextAreaElement).value = prompt;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      input.innerHTML = `<p>${prompt}</p>`;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    await new Promise((r) => setTimeout(r, 200));

    const sendBtn = document.querySelector(ClaudeSelectors.sendButton) as HTMLButtonElement | null;
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
        const isGenerating = ClaudeDetector.isGenerating();
        if (!isGenerating) {
          clearInterval(interval);
          resolve();
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          clearInterval(interval);
          reject(new Error('Claude generation timed out'));
        }
      }, pollInterval);
    });
  }

  async getLatestResponse(): Promise<ModelResponse> {
    const messages = document.querySelectorAll(ClaudeSelectors.assistantMessages);
    if (!messages || messages.length === 0) {
      // Fallback selector check for Claude chat messages
      const fallbackMessages = document.querySelectorAll('div.prose');
      if (fallbackMessages && fallbackMessages.length > 0) {
        const latest = fallbackMessages[fallbackMessages.length - 1] as HTMLElement;
        return {
          provider: 'claude',
          text: (latest.innerText || latest.textContent || '').trim(),
          status: 'completed',
          startedAt: Date.now() - 5000,
          completedAt: Date.now(),
        };
      }
      throw new Error('No assistant response found in Claude DOM');
    }

    const latest = messages[messages.length - 1] as HTMLElement;
    const text = latest.innerText || latest.textContent || '';

    return {
      provider: 'claude',
      text: text.trim(),
      status: 'completed',
      startedAt: Date.now() - 5000,
      completedAt: Date.now(),
    };
  }
}
