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
    const stopBtn = document.querySelector(ChatGPTSelectors.stopButton);
    return stopBtn !== null;
  }
}
