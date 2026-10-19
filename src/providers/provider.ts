import { ProviderId, ProviderStatus, ModelResponse } from '../types';

export interface WaitOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  onProgress?: (text: string) => void;
}

export interface AIProvider {
  id: ProviderId;
  name: string;
  matches(url: string): boolean;
  isReady(): Promise<boolean>;
  sendPrompt(prompt: string): Promise<void>;
  waitForCompletion(options?: WaitOptions): Promise<void>;
  answerQuestion?(answer: string, optionIndex?: number): Promise<void>;
  getLatestResponse(): Promise<ModelResponse>;
  getStatus(): Promise<ProviderStatus>;
}
