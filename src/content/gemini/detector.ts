import { GeminiSelectors } from './selectors';

export class GeminiDetector {
  static isGeminiPage(url: string = window.location.href): boolean {
    return url.includes('gemini.google.com');
  }

  static isReady(): boolean {
    const rta = document.querySelector('rich-textarea');
    const input =
      rta?.shadowRoot?.querySelector('[contenteditable="true"]') ||
      document.querySelector(GeminiSelectors.input);
    return input !== null;
  }

  static isGenerating(): boolean {
    const stopButtons = Array.from(
      document.querySelectorAll(
        'button[aria-label*="Stop response" i], button[aria-label*="Stop generating" i], button.stop-button, [data-test-id="stop-button"]'
      )
    ) as HTMLElement[];

    const visibleStop = stopButtons.find((el) => {
      if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) {
        return false;
      }
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
    });

    return !!visibleStop;
  }
}

