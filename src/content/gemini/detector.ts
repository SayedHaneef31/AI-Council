import { GeminiSelectors } from './selectors';

export class GeminiDetector {
  static isGeminiPage(url: string = window.location.href): boolean {
    return url.includes('gemini.google.com');
  }

  static isReady(): boolean {
    const input = document.querySelector(GeminiSelectors.input);
    return input !== null;
  }

  static isGenerating(): boolean {
    const stopBtn = document.querySelector(GeminiSelectors.stopButton);
    return stopBtn !== null;
  }
}
