import { AIProvider, WaitOptions } from '../../providers/provider';
import { ModelResponse, ProviderId, ProviderStatus } from '../../types';
import { ClaudeSelectors } from './selectors';
import { ClaudeDetector } from './detector';

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
    // Fallback
  }

  await new Promise((r) => setTimeout(r, 150));

  const currentText = input.tagName.toLowerCase() === 'textarea'
    ? (input as HTMLTextAreaElement).value
    : (input.innerText || input.textContent || '');

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

    await insertTextIntoInput(input, prompt);

    await new Promise((r) => setTimeout(r, 350));

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
    const pollInterval = options?.pollIntervalMs || 250;
    const startTime = Date.now();

    let lastText = '';
    let lastStreamedText = '';
    let stableCount = 0;

    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const isGenerating = ClaudeDetector.isGenerating();

        const messages = document.querySelectorAll(
          'div.font-claude-message, div.prose, [data-is-streaming="false"]'
        );

        let currentText = '';
        if (messages && messages.length > 0) {
          const latest = messages[messages.length - 1] as HTMLElement;
          currentText = extractStructuredMarkdown(latest) || (latest.innerText || latest.textContent || '').trim();
        }

        // Stream real-time progress if new text is generated
        if (currentText && currentText !== lastStreamedText && options?.onProgress) {
          lastStreamedText = currentText;
          options.onProgress(currentText);
        }

        if (currentText.length > 10 && !isGenerating) {
          if (currentText === lastText) {
            stableCount++;
            // With 250ms interval, 4 stable checks = 1 second without new tokens
            if (stableCount >= 4) {
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
          if (currentText.length > 10) {
            resolve();
          } else {
            reject(new Error('Claude generation timed out'));
          }
        }
      }, pollInterval);
    });
  }

  async getLatestResponse(): Promise<ModelResponse> {
    const selectorList = [
      'div.font-claude-message',
      'div.prose',
      '[data-is-streaming="false"]',
    ];

    for (const selector of selectorList) {
      const messages = document.querySelectorAll(selector);
      if (messages && messages.length > 0) {
        const latest = messages[messages.length - 1] as HTMLElement;
        const text = extractStructuredMarkdown(latest) || (latest.innerText || latest.textContent || '').trim();
        if (text.length > 0) {
          return {
            provider: 'claude',
            text,
            status: 'completed',
            startedAt: Date.now() - 5000,
            completedAt: Date.now(),
          };
        }
      }
    }

    throw new Error('No assistant response found in Claude DOM');
  }
}
