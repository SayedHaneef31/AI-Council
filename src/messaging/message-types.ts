import { ProviderId, ModelResponse, ProviderStatus } from '../types';

export type ExtensionMessage =
  | { type: 'CHECK_PROVIDER_STATUS'; provider?: ProviderId }
  | { type: 'PROVIDER_STATUS_RESPONSE'; provider?: ProviderId; statuses?: Record<ProviderId, { status: ProviderStatus; tabId?: number; isFresh?: boolean }>; status?: ProviderStatus; tabId?: number; isFresh?: boolean }
  | { type: 'SUBMIT_PROMPT'; provider: ProviderId; prompt: string; timeoutMs?: number }
  | { type: 'PROMPT_SUBMITTED'; provider: ProviderId; success: boolean; error?: string }
  | { type: 'GET_LATEST_RESPONSE'; provider: ProviderId }
  | { type: 'PROVIDER_RESPONSE'; provider: ProviderId; response: ModelResponse }
  | { type: 'PROVIDER_STREAM_UPDATE'; provider: ProviderId; text: string }
  | { type: 'PROVIDER_QUESTION_ASKED'; provider: ProviderId; question: string; options?: string[] }
  | { type: 'ANSWER_PROVIDER_QUESTION'; provider: ProviderId; answer: string; optionIndex?: number }
  | { type: 'PROVIDER_QUESTION_ANSWERED'; provider: ProviderId; success: boolean; error?: string }
  | { type: 'PROVIDER_ERROR'; provider: ProviderId; error: string }
  | { type: 'START_COUNCIL_RUN'; prompt: string; context?: string }
  | { type: 'OPEN_PROVIDER_TABS'; forceNewChat?: boolean }
  | { type: 'OPEN_SINGLE_PROVIDER_TAB'; provider: ProviderId; forceNewChat?: boolean }
  | { type: 'INIT_EXTENSION_SESSION' }
  | { type: 'COUNCIL_STATE_UPDATE'; state: any };
