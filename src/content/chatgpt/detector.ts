import { ChatGPTSelectors } from './selectors';

export class ChatGPTDetector {
  static isChatGPTPage(url: string = window.location.href): boolean {
    return url.includes('chatgpt.com') || url.includes('chat.openai.com');
  }

  static isReady(): boolean {
    const input = document.querySelector(ChatGPTSelectors.input);
    return input !== null && !(input as HTMLTextAreaElement).disabled;
  }

  static isGenerating(): boolean {
    // Check streaming indicator elements
    const isStreaming = document.querySelector('.result-streaming, [data-is-streaming="true"], div.streaming');
    if (isStreaming) return true;

    // Check stop button
    const stopBtns = Array.from(document.querySelectorAll(
      'button[data-testid="stop-button"], button[data-testid="fruitjuice-stop-button"], button[aria-label*="Stop" i]'
    )) as HTMLElement[];

    const visibleStop = stopBtns.find((b) => {
      if (b.offsetParent === null && b.offsetWidth === 0 && b.offsetHeight === 0) return false;
      const s = window.getComputedStyle(b);
      return s.display !== 'none' && s.visibility !== 'hidden';
    });

    return !!visibleStop;
  }
}

