import { AIProvider, WaitOptions } from '../../providers/provider';
import { ModelResponse, ProviderId, ProviderStatus } from '../../types';
import { GeminiSelectors } from './selectors';
import { GeminiDetector } from './detector';

function extractStructuredMarkdown(root: HTMLElement): string {
  if (!root) return '';

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    if (el.classList.contains('sr-only') || el.getAttribute('aria-hidden') === 'true') {
      return '';
    }

    switch (tagName) {
      case 'table': {
        const rows = Array.from(el.querySelectorAll('tr'));
        if (rows.length === 0) return '';
        const tableLines: string[] = [];
        let hasHeader = false;

        rows.forEach((row, rIdx) => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          if (cells.length === 0) return;
          const isHeaderRow = rIdx === 0 || row.querySelector('th') !== null;
          const rowText = '| ' + cells.map((c) => {
            const content = (c.textContent || '').trim().replace(/\n+/g, ' ');
            return content || '-';
          }).join(' | ') + ' |';

          tableLines.push(rowText);

          if (isHeaderRow && !hasHeader) {
            const separator = '| ' + cells.map(() => '---').join(' | ') + ' |';
            tableLines.push(separator);
            hasHeader = true;
          }
        });
        return '\n\n' + tableLines.join('\n') + '\n\n';
      }
      case 'pre': {
        const codeEl = el.querySelector('code');
        const lang = codeEl?.className?.match(/language-(\w+)/)?.[1] || '';
        const codeText = (codeEl ? codeEl.textContent : el.textContent) || '';
        return `\n\n\`\`\`${lang}\n${codeText.trim()}\n\`\`\`\n\n`;
      }
      case 'code':
        if (el.parentElement?.tagName.toLowerCase() === 'pre') return el.textContent || '';
        return `\`${el.textContent || ''}\``;
      case 'h1':
        return `\n\n# ${processChildren(el).trim()}\n\n`;
      case 'h2':
        return `\n\n## ${processChildren(el).trim()}\n\n`;
      case 'h3':
        return `\n\n### ${processChildren(el).trim()}\n\n`;
      case 'h4':
      case 'h5':
      case 'h6':
        return `\n\n#### ${processChildren(el).trim()}\n\n`;
      case 'ul': {
        const items = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === 'li');
        return '\n' + items.map((li) => `- ${processChildren(li).trim()}`).join('\n') + '\n\n';
      }
      case 'ol': {
        const items = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === 'li');
        return '\n' + items.map((li, idx) => `${idx + 1}. ${processChildren(li).trim()}`).join('\n') + '\n\n';
      }
      case 'li':
        return processChildren(el);
      case 'strong':
      case 'b':
        return `**${processChildren(el)}**`;
      case 'em':
      case 'i':
        return `*${processChildren(el)}*`;
      case 'p':
        return `\n\n${processChildren(el).trim()}\n\n`;
      case 'br':
        return '\n';
      case 'blockquote':
        return `\n\n> ${processChildren(el).trim()}\n\n`;
      default:
        return processChildren(el);
    }
  }

  function processChildren(parent: Element): string {
    let result = '';
    for (const child of Array.from(parent.childNodes)) {
      result += processNode(child);
    }
    return result;
  }

  return processNode(root).replace(/\n{3,}/g, '\n\n').trim();
}

async function insertTextIntoInput(input: HTMLElement, text: string): Promise<void> {
  input.focus();

  if (input.tagName.toLowerCase() === 'textarea') {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    nativeSetter?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  // Gemini uses rich-textarea div[contenteditable="true"] with inner <p>
  let p = input.querySelector('p');
  if (!p) {
    p = document.createElement('p');
    input.innerHTML = '';
    input.appendChild(p);
  }
  p.textContent = text;

  // Dispatch InputEvents that ProseMirror / Angular listens for
  const inputEventInit: InputEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    inputType: 'insertText',
    data: text,
  };

  try {
    input.dispatchEvent(new InputEvent('beforeinput', inputEventInit));
    input.dispatchEvent(new InputEvent('input', inputEventInit));
  } catch (_e) {
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }));

  // Set selection range to end of text
  try {
    const range = document.createRange();
    range.selectNodeContents(p);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  } catch (_e) {}
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

    // Wait for Gemini's Angular controller to activate the send button
    let sendBtn: HTMLElement | null = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 100));
      sendBtn = document.querySelector(GeminiSelectors.sendButton) as HTMLElement | null;
      if (sendBtn) {
        const isAriaDisabled = sendBtn.getAttribute('aria-disabled') === 'true';
        const isDisabled = sendBtn.hasAttribute('disabled');
        if (!isAriaDisabled && !isDisabled) {
          break; // Send button is active!
        }
      }
      // Re-trigger input event if still not enabled
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const isAriaDisabled = sendBtn?.getAttribute('aria-disabled') === 'true';
    const isDisabled = sendBtn?.hasAttribute('disabled');

    if (sendBtn && !isAriaDisabled && !isDisabled) {
      sendBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true }));
      sendBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, composed: true }));
      sendBtn.click();
    } else {
      // Fallback: Dispatch Enter key event directly to the input
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      input.dispatchEvent(enterEvent);
      if (sendBtn) {
        sendBtn.click();
      }
    }
  }

  async waitForCompletion(options?: WaitOptions): Promise<void> {
    const timeoutMs = options?.timeoutMs || 120000;
    const pollInterval = options?.pollIntervalMs || 250;
    const startTime = Date.now();

    let lastText = '';
    let lastStreamedText = '';
    let stableCount = 0;
    let observer: MutationObserver | null = null;

    return new Promise((resolve, reject) => {
      const checkProgress = () => {
        const isGenerating = GeminiDetector.isGenerating();

        const elements = document.querySelectorAll(
          'model-response, message-content, div.model-response-text, div.response-container-content, [data-test-id="model-response"], .response-content, .markdown'
        );

        let currentText = '';
        if (elements && elements.length > 0) {
          const latest = elements[elements.length - 1] as HTMLElement;
          currentText = extractStructuredMarkdown(latest) || (latest.innerText || latest.textContent || '').trim();
        }

        // Stream real-time progress if new text is generated
        if (currentText && currentText !== lastStreamedText && options?.onProgress) {
          lastStreamedText = currentText;
          options.onProgress(currentText);
        }

        if (currentText.length > 20 && !isGenerating) {
          if (currentText === lastText) {
            stableCount++;
            // 4 consecutive stable checks = 1 second without new tokens
            if (stableCount >= 4) {
              cleanup();
              resolve();
            }
          } else {
            lastText = currentText;
            stableCount = 0;
          }
        }

        if (Date.now() - startTime > timeoutMs) {
          cleanup();
          if (currentText.length > 20) {
            resolve();
          } else {
            reject(new Error('Gemini generation timed out'));
          }
        }
      };

      const cleanup = () => {
        clearInterval(interval);
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      };

      const interval = setInterval(checkProgress, pollInterval);

      // MutationObserver runs even in background tabs without Chrome timer throttling
      try {
        observer = new MutationObserver(() => {
          checkProgress();
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      } catch (_e) {
        // Fallback to interval only
      }
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
        const text = extractStructuredMarkdown(latest) || (latest.innerText || latest.textContent || '').trim();
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
