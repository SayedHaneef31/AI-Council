import { ClaudeSelectors } from './selectors';

export class ClaudeDetector {
  static isClaudePage(url: string = window.location.href): boolean {
    return url.includes('claude.ai');
  }

  static isReady(): boolean {
    const input = document.querySelector(ClaudeSelectors.input);
    return input !== null;
  }

  static isGenerating(): boolean {
    const stopBtn = document.querySelector(ClaudeSelectors.stopButton);
    return stopBtn !== null;
  }
}
