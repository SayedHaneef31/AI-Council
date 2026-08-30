import { AIProvider, WaitOptions } from '../../providers/provider';
import { ModelResponse, ProviderId, ProviderStatus } from '../../types';
import { GeminiSelectors } from './selectors';
import { GeminiDetector } from './detector';

async function insertTextIntoInput(input: HTMLElement, text: string): Promise<void> {
  input.focus();

  // Try synthetic paste event first - paste preserves all multi-line text without breaking at \n
  try {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', text);
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(pasteEvent);
  } catch (_e) {
    // Ignore synthetic paste error
  }

  await new Promise((r) => setTimeout(r, 150));

  const currentText = input.tagName.toLowerCase() === 'textarea'
    ? (input as HTMLTextAreaElement).value
    : (input.innerText || input.textContent || '');

  // Fallback if paste event didn't fill the text completely
  if (!currentText || currentText.trim().length < text.trim().length * 0.5) {
    if (input.tagName.toLowerCase() === 'textarea') {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      nativeSetter?.call(input, text);
    } else {
      input.innerText = text;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

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

    await insertTextIntoInput(input, prompt);

    await new Promise((r) => setTimeout(r, 350));

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
    const timeoutMs = options?.timeoutMs || 120000;
    const pollInterval = options?.pollIntervalMs || 1000;
    const startTime = Date.now();

    let lastText = '';
    let stableCount = 0;

    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const isGenerating = GeminiDetector.isGenerating();

        const elements = document.querySelectorAll(
          'model-response, message-content, div.model-response-text, div.response-container-content, [data-test-id="model-response"], .response-content, .markdown'
        );

        let currentText = '';
        if (elements && elements.length > 0) {
          const latest = elements[elements.length - 1] as HTMLElement;
          currentText = (latest.innerText || latest.textContent || '').trim();
        }

        if (currentText.length > 20 && !isGenerating) {
          if (currentText === lastText) {
            stableCount++;
            if (stableCount >= 2) {
              clearInterval(interval);
              resolve();
              return;
            }
          } else {
            lastText = currentText;
            stableCount = 0;
          }
        }

        if (Date.now() - startTime > timeoutMs) {
          clearInterval(interval);
          if (currentText.length > 20) {
            resolve();
          } else {
            reject(new Error('Gemini generation timed out'));
          }
        }
      }, pollInterval);
    });
  }

  async getLatestResponse(): Promise<ModelResponse> {
    const selectorList = [
      'model-response',
      'message-content',
      'div.model-response-text',
      'div.response-container-content',
      '[data-test-id="model-response"]',
      '.response-content',
      '.markdown',
    ];

    for (const selector of selectorList) {
      const messages = document.querySelectorAll(selector);
      if (messages && messages.length > 0) {
        const latest = messages[messages.length - 1] as HTMLElement;
        const text = (latest.innerText || latest.textContent || '').trim();
        if (text.length > 0) {
          return {
            provider: 'gemini',
            text,
            status: 'completed',
            startedAt: Date.now() - 5000,
            completedAt: Date.now(),
          };
        }
      }
    }

    throw new Error('No assistant response found in Gemini DOM');
  }
}
