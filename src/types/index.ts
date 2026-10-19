export type ProviderId = 'chatgpt' | 'claude' | 'gemini';

export type ProviderStatus =
  | 'unavailable'
  | 'connecting'
  | 'ready'
  | 'sending'
  | 'generating'
  | 'awaiting_input'
  | 'completed'
  | 'failed'
  | 'timed_out';

export interface ProviderQuestion {
  provider: ProviderId;
  question: string;
  options?: string[];
  timestamp: number;
}

export interface ModelResponse {
  provider: ProviderId;
  text: string;
  status: ProviderStatus;
  error?: string;
  startedAt: number;
  completedAt: number;
}

export interface CouncilSynthesis {
  consolidatedAnswer: string;
  verdict: string;
  consensus: string[];
  disagreements: string[];
  why: string[];
  confidence?: string;
  rawMarkdown: string;
}

export interface ProviderRunState {
  id: ProviderId;
  name: string;
  status: ProviderStatus;
  isFresh?: boolean;
  error?: string;
  response?: ModelResponse;
  tabId?: number;
  pendingQuestion?: ProviderQuestion;
}

export type RunStatus = 'idle' | 'running' | 'synthesizing' | 'completed' | 'failed';

export interface ConversationTurn {
  id: string;
  userPrompt: string;
  userContext?: string;
  runStatus: RunStatus;
  synthesis: CouncilSynthesis | null;
  modelResponses: Partial<Record<ProviderId, ModelResponse>>;
  streamingResponses?: Partial<Record<ProviderId, string>>;
  pendingQuestions?: Partial<Record<ProviderId, ProviderQuestion>>;
  error: string | null;
  createdAt: number;
}

export interface CouncilState {
  prompt: string;
  context: string;
  runStatus: RunStatus;
  providers: Record<ProviderId, ProviderRunState>;
  streamingResponses?: Partial<Record<ProviderId, string>>;
  synthesis: CouncilSynthesis | null;
  error: string | null;
  turns: ConversationTurn[];
  activeTurnId: string | null;
}
