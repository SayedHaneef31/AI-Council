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
  // 1. Spoof visibility and window focus inside MAIN world
  try {
    const s = document.createElement('script');
    s.textContent = `
      try {
        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.hasFocus = () => true;
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('focus'));
      } catch (e) {}
    `;
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  } catch (_e) {}

  try {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('focus'));
  } catch (_e) {}

  input.focus();

  if (input.tagName.toLowerCase() === 'textarea') {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    nativeSetter?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    return;
  }

  // 2. Select contents and try native execCommand
  try {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(input);
    sel?.removeAllRanges();
    sel?.addRange(range);
    document.execCommand('delete', false);
    document.execCommand('insertText', false, text);
  } catch (_e) {}

  // 3. Try ClipboardEvent paste
  try {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const pasteEv = new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    input.dispatchEvent(pasteEv);
  } catch (_e) {}

  // 4. Format paragraph inside contenteditable
  let p = input.querySelector('p');
  if (!p) {
    p = document.createElement('p');
    input.appendChild(p);
  }
  p.innerHTML = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

  // 5. Custom element rich-textarea binding
  const rta = input.closest('rich-textarea') || document.querySelector('rich-textarea');
  if (rta) {
    try {
      (rta as any).value = text;
    } catch (_e) {}
  }

  // 6. Dispatch composed events
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
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  p.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

  if (rta) {
    rta.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    rta.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    rta.dispatchEvent(new CustomEvent('input', { bubbles: true, composed: true, detail: { value: text } }));
  }

  input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
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
    const rta = document.querySelector('rich-textarea');
    const input =
      (rta?.shadowRoot?.querySelector('[contenteditable="true"]') as HTMLElement) ||
      (document.querySelector(GeminiSelectors.input) as HTMLElement | null);

    if (!input) {
      throw new Error('Gemini input element not found');
    }

    // Baseline response count before submission
    const initialResponses = Array.from(document.querySelectorAll('model-response')) as HTMLElement[];
    const initialCount = initialResponses.length;

    await insertTextIntoInput(input, prompt);
    await new Promise((r) => setTimeout(r, 250));

    // Active submission retry loop:
    // Repeatedly trigger send button & Enter key until Gemini actually starts generating
    const startTime = Date.now();
    const maxAttemptDuration = 18000; // 18 seconds retry window

    while (Date.now() - startTime < maxAttemptDuration) {
      // If Gemini has started generating or a new response node appeared, prompt successfully submitted!
      if (GeminiDetector.isGenerating() || document.querySelectorAll('model-response').length > initialCount) {
        return;
      }

      // Find the send button (in shadow DOM, in light DOM, or broad search)
      let sendBtn: HTMLElement | null =
        (rta?.shadowRoot?.querySelector('button[aria-label*="Send" i], button.send-button, .send-button-container button') as HTMLElement) ||
        (document.querySelector(GeminiSelectors.sendButton) as HTMLElement | null);

      if (!sendBtn) {
        const allButtons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
        sendBtn = allButtons.find((b) => {
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          return aria.includes('send') || aria.includes('submit');
        }) || null;
      }

      // Re-trigger input events on input and rich-textarea
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      if (rta) {
        rta.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      }

      if (sendBtn) {
        sendBtn.removeAttribute('aria-disabled');
        sendBtn.setAttribute('aria-disabled', 'false');
        sendBtn.removeAttribute('disabled');
        (sendBtn as HTMLButtonElement).disabled = false;

        const mouseOpts: MouseEventInit = { bubbles: true, cancelable: true, composed: true, view: window };
        try {
          sendBtn.dispatchEvent(new PointerEvent('pointerdown', mouseOpts));
          sendBtn.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
          sendBtn.dispatchEvent(new PointerEvent('pointerup', mouseOpts));
          sendBtn.dispatchEvent(new MouseEvent('mouseup', mouseOpts));
        } catch (_e) {}
        sendBtn.click();
      }

      // Dispatch Enter key events directly to input
      const enterOpts: KeyboardEventInit = {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        composed: true,
      };
      input.dispatchEvent(new KeyboardEvent('keydown', enterOpts));
      input.dispatchEvent(new KeyboardEvent('keypress', enterOpts));
      input.dispatchEvent(new KeyboardEvent('keyup', enterOpts));

      await new Promise((r) => setTimeout(r, 350));
    }
  }

  async waitForCompletion(options?: WaitOptions): Promise<void> {
    const timeoutMs = options?.timeoutMs || 120000;
    const pollInterval = options?.pollIntervalMs || 250;
    const startTime = Date.now();

    // Baseline: track how many responses already existed in the chat prior to sending
    const initialResponses = Array.from(document.querySelectorAll('model-response')) as HTMLElement[];
    const initialCount = initialResponses.length;
    const initialLatestText = initialCount > 0
      ? (extractStructuredMarkdown(initialResponses[initialCount - 1]) || initialResponses[initialCount - 1].innerText || '').trim()
      : '';

    let lastText = '';
    let lastStreamedText = '';
    let stableCount = 0;
    let hasStarted = false;
    let observer: MutationObserver | null = null;

    return new Promise((resolve, reject) => {
      const checkProgress = () => {
        const isGenerating = GeminiDetector.isGenerating();

        const modelResponses = Array.from(document.querySelectorAll('model-response')) as HTMLElement[];
        let currentText = '';

        if (modelResponses.length > 0) {
          const latest = modelResponses[modelResponses.length - 1];
          currentText = extractStructuredMarkdown(latest) || (latest.innerText || latest.textContent || '').trim();
        } else {
          const fallbackElements = document.querySelectorAll(
            'message-content, div.model-response-text, div.response-container-content, .response-content'
          );
          if (fallbackElements.length > 0) {
            const latest = fallbackElements[fallbackElements.length - 1] as HTMLElement;
            currentText = extractStructuredMarkdown(latest) || (latest.innerText || latest.textContent || '').trim();
          }
        }

        // Has generation started for this new turn?
        const isNewNode = modelResponses.length > initialCount;
        const isTextChanged = currentText.length > 20 && currentText !== initialLatestText;
        if (isGenerating || isNewNode || isTextChanged) {
          hasStarted = true;
        }

        // Stream real-time progress if new text is generated
        if (hasStarted && currentText && (isNewNode || isTextChanged) && currentText !== lastStreamedText && options?.onProgress) {
          lastStreamedText = currentText;
          options.onProgress(currentText);
        }

        // Only declare completion when generation has actually started, belongs to new turn, is not generating, and content is stable
        if (hasStarted && (isNewNode || isTextChanged) && currentText.length > 30 && !isGenerating) {
          if (currentText === lastText) {
            stableCount++;
            // 6 consecutive checks (1.5 seconds) of stability
            if (stableCount >= 6) {
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
          if (hasStarted && (isNewNode || isTextChanged) && currentText.length > 30) {
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

      try {
        observer = new MutationObserver(() => {
          checkProgress();
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      } catch (_e) {}
    });
  }

  async getLatestResponse(): Promise<ModelResponse> {
    const modelResponses = Array.from(document.querySelectorAll('model-response')) as HTMLElement[];
    if (modelResponses.length > 0) {
      const latest = modelResponses[modelResponses.length - 1];
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

    const fallbackList = ['message-content', 'div.model-response-text', 'div.response-container-content', '.response-content'];
    for (const selector of fallbackList) {
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

