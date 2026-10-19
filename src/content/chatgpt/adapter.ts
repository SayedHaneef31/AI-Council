import { AIProvider, WaitOptions } from '../../providers/provider';
import { ModelResponse, ProviderId, ProviderStatus } from '../../types';
import { ChatGPTSelectors } from './selectors';
import { ChatGPTDetector } from './detector';

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

function getChatGPTAssistantNodes(): HTMLElement[] {
  // 1. Explicit assistant role or model attribute
  const byRole = Array.from(
    document.querySelectorAll(
      '[data-message-author-role="assistant"], [data-message-model-slug], div.agent-turn'
    )
  ) as HTMLElement[];
  if (byRole.length > 0) return byRole;

  // 2. Conversation turns (any tag: div, article, section)
  const allTurns = Array.from(
    document.querySelectorAll(
      '[data-testid^="conversation-turn-"], div.group\\/conversation-turn, div[class*="conversation-turn"]'
    )
  ) as HTMLElement[];

  if (allTurns.length > 0) {
    const assistantTurns = allTurns.filter((turn) => {
      if (turn.querySelector('[data-message-author-role="user"], [data-testid*="user-message"]')) {
        return false;
      }
      return true;
    });
    if (assistantTurns.length > 0) return assistantTurns;
  }

  // 3. Look for assistant markdown or prose blocks
  const proseBlocks = Array.from(
    document.querySelectorAll('.markdown, .prose, [class*="prose"], [class*="markdown"]')
  ) as HTMLElement[];
  if (proseBlocks.length > 0) {
    const assistantProse = proseBlocks.filter((el) => {
      const turn = el.closest('[data-testid^="conversation-turn-"]');
      if (turn && turn.querySelector('[data-message-author-role="user"]')) {
        return false;
      }
      return true;
    });
    if (assistantProse.length > 0) return assistantProse;
    return proseBlocks;
  }

  // 4. Any article or message container
  const articles = Array.from(document.querySelectorAll('main article, article, div[data-message-id]')) as HTMLElement[];
  if (articles.length > 0) return articles;

  return [];
}

function extractTextFromAssistantNode(node: HTMLElement): string {
  if (!node) return '';

  const markdownElements = Array.from(
    node.querySelectorAll('.markdown, .prose, [class*="prose"], [class*="markdown"]')
  ) as HTMLElement[];

  let textParts: string[] = [];

  if (markdownElements.length > 0) {
    const topLevel = markdownElements.filter(
      (el) => !markdownElements.some((other) => other !== el && other.contains(el))
    );

    textParts = topLevel
      .map((el) => extractStructuredMarkdown(el) || (el.innerText || el.textContent || '').trim())
      .filter(Boolean);
  }

  if (textParts.length === 0) {
    const extracted = extractStructuredMarkdown(node) || (node.innerText || node.textContent || '').trim();
    if (extracted) {
      textParts.push(extracted);
    }
  }

  // Also include any questionnaire/widget text rendered outside markdown
  const widgetContainer = node.querySelector(
    'fieldset, [role="radiogroup"], div[class*="radio"], div[class*="questionnaire"], div[class*="options"]'
  ) as HTMLElement | null;
  if (widgetContainer) {
    const widgetText = (widgetContainer.innerText || widgetContainer.textContent || '').trim();
    if (widgetText && !textParts.some((p) => p.includes(widgetText.slice(0, 30)))) {
      textParts.push(widgetText);
    }
  }

  let fullText = textParts.join('\n\n').trim();

  // Clean up UI action button noise
  fullText = fullText.replace(
    /\b(Copy code|Good response|Bad response|Read aloud|Is this conversation helpful so far\?|Thumbs up|Thumbs down)\b/gi,
    ''
  ).trim();

  return fullText;
}

function extractFullChatGPTAssistantText(targetNode?: HTMLElement): string {
  if (targetNode) {
    return extractTextFromAssistantNode(targetNode);
  }

  const nodes = getChatGPTAssistantNodes();
  if (nodes.length > 0) {
    return extractTextFromAssistantNode(nodes[nodes.length - 1]);
  }

  return '';
}

export interface ExtractedOption {
  text: string;
  element?: HTMLElement;
  isRadio?: boolean;
}

export interface ExtractedQuestionnaire {
  question: string;
  options: ExtractedOption[];
  submitButton?: HTMLElement | null;
}

function findQuestionnaireSubmitButton(node: HTMLElement): HTMLElement | null {
  if (!node) return null;
  const submitSelectors = [
    ChatGPTSelectors.questionnaireSubmitButton,
    'button[type="submit"]',
    'button[data-testid*="submit"]',
    'button[data-testid*="continue"]',
    'button[data-testid*="confirm"]',
    'form button[type="submit"]',
    'form button',
  ];
  for (const sel of submitSelectors) {
    const btn = node.querySelector(sel) as HTMLElement | null;
    if (btn && !btn.hasAttribute('disabled')) return btn;
  }

  const allButtons = Array.from(node.querySelectorAll('button')) as HTMLButtonElement[];
  for (const b of allButtons) {
    const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
    if (
      txt.includes('choice') ||
      txt.includes('help me') ||
      txt.includes('submit') ||
      txt.includes('continue') ||
      txt.includes('confirm') ||
      txt.includes('next') ||
      txt.includes('done') ||
      txt.includes('proceed')
    ) {
      return b;
    }
  }

  return null;
}

function extractQuestionnaireFromNode(node: HTMLElement): ExtractedQuestionnaire | null {
  if (!node) return null;

  // Search the entire turn container
  const turnContainer = node.closest('[data-testid^="conversation-turn-"], div.agent-turn, div.group\\/conversation-turn') || node;

  // 1. Look for radio inputs, role="radio", or Radix UI data-state elements
  const radioElements = Array.from(
    turnContainer.querySelectorAll(
      'input[type="radio"], [role="radio"], button[role="radio"], [data-state="checked"], [data-state="unchecked"]'
    )
  ) as HTMLElement[];

  if (radioElements.length > 0) {
    const options: ExtractedOption[] = [];

    for (const r of radioElements) {
      let labelText = '';

      if (r.tagName.toLowerCase() === 'input') {
        const input = r as HTMLInputElement;
        const parentLabel = input.closest('label');
        if (parentLabel) {
          labelText = (parentLabel.innerText || parentLabel.textContent || '').trim();
        } else if (input.id) {
          const escapeFn = window.CSS?.escape || ((s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '\\$&'));
          const matchingLabel = turnContainer.querySelector(`label[for="${escapeFn(input.id)}"]`);
          if (matchingLabel) {
            labelText = (matchingLabel.textContent || '').trim();
          }
        }
        if (!labelText && input.value) {
          labelText = input.value;
        }
        if (!labelText && input.getAttribute('aria-label')) {
          labelText = input.getAttribute('aria-label') || '';
        }
        if (!labelText && input.nextElementSibling) {
          labelText = (input.nextElementSibling.textContent || '').trim();
        }
        if (!labelText && input.parentElement) {
          labelText = (input.parentElement.innerText || input.parentElement.textContent || '').trim();
        }
      } else {
        // [role="radio"] or [data-state]
        const parentLabel = r.closest('label');
        if (parentLabel) {
          labelText = (parentLabel.innerText || parentLabel.textContent || '').trim();
        } else if (r.parentElement) {
          const siblingLabel = r.parentElement.querySelector('label, span, p') as HTMLElement | null;
          if (siblingLabel && siblingLabel !== r) {
            labelText = (siblingLabel.innerText || siblingLabel.textContent || '').trim();
          } else {
            labelText = (r.parentElement.innerText || r.parentElement.textContent || '').trim();
          }
        }
        if (!labelText) {
          labelText = (r.innerText || r.textContent || r.getAttribute('aria-label') || '').trim();
        }
      }

      labelText = labelText.replace(/\n+/g, ' ').trim();

      if (labelText && labelText.length > 1 && !options.some((o) => o.text === labelText)) {
        options.push({
          text: labelText,
          element: r,
          isRadio: true,
        });
      }
    }

    if (options.length > 0) {
      let questionText = '';
      const fieldset = turnContainer.querySelector('fieldset, [role="radiogroup"], form');
      if (fieldset) {
        const legend = fieldset.querySelector('legend, h2, h3, h4, [class*="title"], [class*="question"]');
        if (legend) {
          questionText = (legend.textContent || '').trim();
        }
      }
      if (!questionText) {
        const firstRadio = radioElements[0];
        const container = firstRadio.closest('fieldset, form, div[role="radiogroup"]') || firstRadio.parentElement?.parentElement;
        const prev = container?.previousElementSibling;
        if (prev) {
          questionText = (prev.textContent || '').trim();
        }
      }
      if (!questionText) {
        questionText = extractTextFromAssistantNode(turnContainer as HTMLElement);
      }

      const submitButton = findQuestionnaireSubmitButton(turnContainer as HTMLElement);

      return {
        question: questionText || 'Please select an option:',
        options,
        submitButton,
      };
    }
  }

  // 2. Look for choice buttons / option pills
  const choiceButtons = Array.from(turnContainer.querySelectorAll(ChatGPTSelectors.choiceButtons)) as HTMLButtonElement[];
  let validButtons: HTMLButtonElement[] = [];

  if (choiceButtons.length > 0) {
    validButtons = choiceButtons;
  } else {
    const allButtons = Array.from(turnContainer.querySelectorAll('button')) as HTMLButtonElement[];
    validButtons = allButtons.filter((b) => {
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      const testid = (b.getAttribute('data-testid') || '').toLowerCase();
      if (
        aria.includes('copy') ||
        aria.includes('good') ||
        aria.includes('bad') ||
        aria.includes('share') ||
        aria.includes('read aloud') ||
        aria.includes('voice') ||
        aria.includes('listen') ||
        aria.includes('edit')
      ) {
        return false;
      }
      if (testid.includes('send') || testid.includes('stop')) return false;
      const txt = (b.innerText || b.textContent || '').trim();
      return txt.length > 1 && txt.length < 150;
    });
  }

  if (validButtons.length > 0) {
    const submitButton = findQuestionnaireSubmitButton(turnContainer as HTMLElement);
    const optionButtons = submitButton
      ? validButtons.filter((b) => b !== submitButton)
      : validButtons;

    if (optionButtons.length > 0) {
      const options: ExtractedOption[] = [];
      for (const b of optionButtons) {
        const txt = (b.innerText || b.textContent || '').trim();
        if (txt && !options.some((o) => o.text === txt)) {
          options.push({
            text: txt,
            element: b,
            isRadio: false,
          });
        }
      }

      if (options.length > 0) {
        const questionText = extractTextFromAssistantNode(turnContainer as HTMLElement);
        return {
          question: questionText || 'Please select an option:',
          options,
          submitButton,
        };
      }
    }
  }

  return null;
}

export function extractChoicesFromNode(node: HTMLElement): string[] {
  if (!node) return [];
  const q = extractQuestionnaireFromNode(node);
  if (q && q.options.length > 0) {
    return q.options.map((o) => o.text);
  }
  return [];
}

function isClarificationOrQuestion(text: string, options: string[]): boolean {
  if (options.length > 0) {
    return true;
  }
  const trimmed = text.trim();
  if (!trimmed) return false;

  const endsWithQuestion = /[?？]\s*$/.test(trimmed);

  const questionPatterns = [
    /\b(which|what) (option|one|approach|framework|version|path|strategy|tier) (would you|do you) (prefer|like|want)\b/i,
    /\bplease (choose|select|pick|specify|clarify|answer|let me know)\b/i,
    /\bwould you like (me to|to choose|to focus on|to proceed with)\b/i,
    /\bbefore (we proceed|i proceed|we start|i start|we begin|i begin|moving forward|you buy)\b/i,
    /\bcould you (please )?(clarify|specify|provide more details)\b/i,
    /\blet me know (if|which|what|how you'd like)\b/i,
    /\bdo you (prefer|want me to)\b/i,
    /\bplease answer the following\b/i,
    /\bto help you better\b/i,
    /\bwhat's your (biggest|main) priority\b/i,
  ];
  const matchesPattern = questionPatterns.some((pattern) => pattern.test(trimmed));
  const wordCount = trimmed.split(/\s+/).length;

  if ((endsWithQuestion || matchesPattern) && wordCount < 220) {
    return true;
  }
  return false;
}

export class ChatGPTAdapter implements AIProvider {
  id: ProviderId = 'chatgpt';
  name = 'ChatGPT';
  private pendingAnswerResolver: (() => void) | null = null;
  private isWaitingForUserAnswer: boolean = false;

  matches(url: string): boolean {
    return ChatGPTDetector.isChatGPTPage(url);
  }

  async isReady(): Promise<boolean> {
    return ChatGPTDetector.isReady();
  }

  async getStatus(): Promise<ProviderStatus> {
    if (!ChatGPTDetector.isChatGPTPage()) return 'unavailable';
    if (this.isWaitingForUserAnswer) return 'awaiting_input';

    const nodes = getChatGPTAssistantNodes();
    if (nodes.length > 0) {
      const latest = nodes[nodes.length - 1];
      const q = extractQuestionnaireFromNode(latest);
      if (q && q.options.length > 0) {
        return 'awaiting_input';
      }
    }

    if (ChatGPTDetector.isGenerating()) return 'generating';
    if (ChatGPTDetector.isReady()) return 'ready';
    return 'unavailable';
  }

  async sendPrompt(prompt: string): Promise<void> {
    const input = document.querySelector(ChatGPTSelectors.input) as HTMLElement | null;
    if (!input) {
      throw new Error('ChatGPT input element not found');
    }

    await insertTextIntoInput(input, prompt);

    await new Promise((r) => setTimeout(r, 350));

    const sendBtn = document.querySelector(ChatGPTSelectors.sendButton) as HTMLButtonElement | null;
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

  async answerQuestion(answer: string, optionIndex?: number): Promise<void> {
    const nodes = getChatGPTAssistantNodes();
    const latestNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;

    if (latestNode) {
      const turnContainer = latestNode.closest('[data-testid^="conversation-turn-"], div.agent-turn, div.group\\/conversation-turn') || latestNode;
      const questionnaire = extractQuestionnaireFromNode(latestNode);

      if (questionnaire && questionnaire.options.length > 0) {
        let targetOption: ExtractedOption | undefined;

        if (optionIndex !== undefined && questionnaire.options[optionIndex]) {
          targetOption = questionnaire.options[optionIndex];
        } else {
          targetOption = questionnaire.options.find(
            (o) => o.text.trim().toLowerCase() === answer.trim().toLowerCase()
          );
        }

        if (targetOption && targetOption.element) {
          const el = targetOption.element;

          if (el.tagName.toLowerCase() === 'input' && (el as HTMLInputElement).type === 'radio') {
            const radio = el as HTMLInputElement;

            const nativeCheckedSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              'checked'
            )?.set;
            if (nativeCheckedSetter) {
              nativeCheckedSetter.call(radio, true);
            } else {
              radio.checked = true;
            }

            radio.dispatchEvent(new Event('input', { bubbles: true }));
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            radio.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

            const parentLabel = radio.closest('label') ||
              (radio.id ? (turnContainer.querySelector(`label[for="${radio.id}"]`) as HTMLElement | null) : null);
            if (parentLabel) {
              parentLabel.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              parentLabel.click();
            }
          } else {
            // Button, [role="radio"], [data-state], or label container
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            el.click();

            const parentLabel = el.closest('label');
            if (parentLabel && parentLabel !== el) {
              parentLabel.click();
            }
          }

          await new Promise((r) => setTimeout(r, 300));

          const submitBtn = questionnaire.submitButton || findQuestionnaireSubmitButton(turnContainer as HTMLElement);
          if (submitBtn) {
            submitBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            submitBtn.click();
          }

          await new Promise((r) => setTimeout(r, 400));
          if (this.pendingAnswerResolver) {
            this.pendingAnswerResolver();
            this.pendingAnswerResolver = null;
          }
          return;
        }
      }
    }

    const input = document.querySelector(ChatGPTSelectors.input) as HTMLElement | null;
    if (input) {
      await insertTextIntoInput(input, answer);
      await new Promise((r) => setTimeout(r, 350));
      const sendBtn = document.querySelector(ChatGPTSelectors.sendButton) as HTMLButtonElement | null;
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

    if (this.pendingAnswerResolver) {
      this.pendingAnswerResolver();
      this.pendingAnswerResolver = null;
    }
  }

  async waitForCompletion(options?: WaitOptions): Promise<void> {
    const timeoutMs = options?.timeoutMs || 90000;
    const pollInterval = options?.pollIntervalMs || 250;
    let startTime = Date.now();

    let initialNodes = getChatGPTAssistantNodes();
    let initialCount = initialNodes.length;
    let initialLatestText = initialCount > 0
      ? extractTextFromAssistantNode(initialNodes[initialCount - 1])
      : '';

    let lastText = '';
    let lastStreamedText = '';
    let stableCount = 0;
    let hasStarted = false;
    let hasAnsweredQuestion = false;

    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        const isGenerating = ChatGPTDetector.isGenerating();

        const currentNodes = getChatGPTAssistantNodes();
        const isNewNodePresent = currentNodes.length > initialCount;
        const latestNode = currentNodes.length > 0 ? currentNodes[currentNodes.length - 1] : null;
        const currentText = latestNode ? extractTextFromAssistantNode(latestNode) : '';

        const isNewText = isNewNodePresent || (currentText.length > 0 && currentText !== initialLatestText);

        const questionnaire = latestNode ? extractQuestionnaireFromNode(latestNode) : null;
        const hasInteractiveWidget = !!(questionnaire && questionnaire.options.length > 0);
        const choices = questionnaire ? questionnaire.options.map((o) => o.text) : [];
        const isQuestion = hasInteractiveWidget || (latestNode ? isClarificationOrQuestion(currentText, choices) : false);

        if (isGenerating || isNewText || currentText.length > 0 || hasInteractiveWidget) {
          hasStarted = true;
        }

        if (hasAnsweredQuestion && currentText !== lastText) {
          hasAnsweredQuestion = false;
        }

        // Stream real-time progress to AI Council whenever text is present
        if (currentText && currentText !== lastStreamedText && options?.onProgress) {
          lastStreamedText = currentText;
          options.onProgress(currentText);
        }

        // When a questionnaire is detected, do NOT require !isGenerating
        const isPausedForInput = hasInteractiveWidget
          ? (currentText === lastText)
          : (isQuestion && !isGenerating);

        if ((hasStarted || hasInteractiveWidget) && (hasInteractiveWidget || currentText.length > 5) && isPausedForInput && !hasAnsweredQuestion && !this.isWaitingForUserAnswer) {
          if (currentText === lastText) {
            stableCount++;
            const requiredStability = hasInteractiveWidget ? 2 : 3;
            if (stableCount >= requiredStability) {
              this.isWaitingForUserAnswer = true;
              startTime = Date.now();

              let promptText = currentText;
              if (questionnaire?.question && questionnaire.question.length > 5) {
                promptText = questionnaire.question;
              }
              if (!promptText && choices.length > 0) {
                promptText = 'Please select an option to continue:';
              }

              if (options?.onProgress) {
                options.onProgress(currentText || promptText);
              }

              chrome.runtime.sendMessage({
                type: 'PROVIDER_QUESTION_ASKED',
                provider: 'chatgpt',
                question: promptText,
                options: choices.length > 0 ? choices : undefined,
              }).catch(() => {});

              await new Promise<void>((resolveAnswer) => {
                this.pendingAnswerResolver = resolveAnswer;
              });

              hasAnsweredQuestion = true;
              this.isWaitingForUserAnswer = false;
              stableCount = 0;
              lastText = '';
              initialCount = getChatGPTAssistantNodes().length - 1;
              initialLatestText = currentText;
              startTime = Date.now();
              return;
            }
          } else {
            lastText = currentText;
            stableCount = 0;
          }
          return;
        }

        if (hasStarted && isNewText && currentText.length > 10 && !isGenerating && !hasInteractiveWidget) {
          if (currentText === lastText) {
            stableCount++;
            if (stableCount >= 6) {
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
          if (hasStarted && currentText.length > 10) {
            resolve();
          } else {
            reject(new Error('ChatGPT generation timed out'));
          }
        }
      }, pollInterval);
    });
  }

  async getLatestResponse(): Promise<ModelResponse> {
    const nodes = getChatGPTAssistantNodes();
    if (nodes.length > 0) {
      const latest = nodes[nodes.length - 1];
      const text = extractTextFromAssistantNode(latest);
      if (text.length > 0) {
        return {
          provider: 'chatgpt',
          text,
          status: 'completed',
          startedAt: Date.now() - 5000,
          completedAt: Date.now(),
        };
      }
    }

    const text = extractFullChatGPTAssistantText();
    if (text.length > 0) {
      return {
        provider: 'chatgpt',
        text,
        status: 'completed',
        startedAt: Date.now() - 5000,
        completedAt: Date.now(),
      };
    }

    throw new Error('No assistant response found in ChatGPT DOM');
  }
}

