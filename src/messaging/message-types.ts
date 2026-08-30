import { ProviderId, ModelResponse, ProviderStatus } from '../types';

export type ExtensionMessage =
  | { type: 'CHECK_PROVIDER_STATUS'; provider?: ProviderId }
  | { type: 'PROVIDER_STATUS_RESPONSE'; provider?: ProviderId; statuses?: Record<ProviderId, { status: ProviderStatus; tabId?: number }>; status?: ProviderStatus; tabId?: number }
  | { type: 'SUBMIT_PROMPT'; provider: ProviderId; prompt: string; timeoutMs?: number }
  | { type: 'PROMPT_SUBMITTED'; provider: ProviderId; success: boolean; error?: string }
  | { type: 'GET_LATEST_RESPONSE'; provider: ProviderId }
  | { type: 'PROVIDER_RESPONSE'; provider: ProviderId; response: ModelResponse }
  | { type: 'PROVIDER_ERROR'; provider: ProviderId; error: string }
  | { type: 'START_COUNCIL_RUN'; prompt: string; context?: string }
  | { type: 'COUNCIL_STATE_UPDATE'; state: any };
