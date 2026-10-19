import { create } from 'zustand';
import {
  CouncilState,
  ProviderId,
  ProviderStatus,
  ProviderRunState,
  ModelResponse,
  CouncilSynthesis,
  RunStatus,
  ConversationTurn,
} from '../types';

interface CouncilStoreActions {
  setPrompt: (prompt: string) => void;
  setContext: (context: string) => void;
  setRunStatus: (status: RunStatus) => void;
  updateProviderStatus: (id: ProviderId, status: ProviderStatus, error?: string, response?: ModelResponse) => void;
  answerProviderQuestion: (provider: ProviderId, answer: string, optionIndex?: number) => void;
  setSynthesis: (synthesis: CouncilSynthesis | null) => void;
  setError: (error: string | null) => void;
  startTurn: (prompt: string, context?: string) => string;
  reset: () => void;
  clearChat: () => void;
  updateFromPartialState: (
    partialState: Partial<Omit<CouncilState, 'providers'>> & {
      providers?: Partial<Record<ProviderId, Partial<ProviderRunState>>>;
    }
  ) => void;
}

export const useCouncilStore = create<CouncilState & CouncilStoreActions>((set) => ({
  prompt: '',
  context: '',
  runStatus: 'idle',
  providers: {
    chatgpt: { id: 'chatgpt', name: 'ChatGPT', status: 'unavailable' },
    claude: { id: 'claude', name: 'Claude', status: 'unavailable' },
    gemini: { id: 'gemini', name: 'Gemini', status: 'unavailable' },
  },
  streamingResponses: {},
  synthesis: null,
  error: null,
  turns: [],
  activeTurnId: null,

  setPrompt: (prompt) => set({ prompt }),
  setContext: (context) => set({ context }),
  setRunStatus: (runStatus) => set({ runStatus }),

  updateProviderStatus: (id, status, error, response) =>
    set((state) => ({
      providers: {
        ...state.providers,
        [id]: {
          ...state.providers[id],
          status,
          ...(error !== undefined && { error }),
          ...(response !== undefined && { response }),
        },
      },
    })),

  answerProviderQuestion: (provider: ProviderId, answer: string, optionIndex?: number) => {
    set((state) => {
      const updatedTurns = state.turns.map((t) => {
        if (t.id !== state.activeTurnId) return t;
        const newPQ = { ...t.pendingQuestions };
        delete newPQ[provider];
        return { ...t, pendingQuestions: newPQ };
      });

      return {
        ...state,
        providers: {
          ...state.providers,
          [provider]: {
            ...state.providers[provider],
            status: 'generating',
            pendingQuestion: undefined,
          },
        },
        turns: updatedTurns,
      };
    });

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'ANSWER_PROVIDER_QUESTION',
        provider,
        answer,
        optionIndex,
      });
    }
  },

  setSynthesis: (synthesis) => set({ synthesis }),
  setError: (error) => set({ error }),

  startTurn: (userPrompt: string, userContext?: string) => {
    const id = Date.now().toString();
    const newTurn: ConversationTurn = {
      id,
      userPrompt,
      userContext,
      runStatus: 'running',
      synthesis: null,
      modelResponses: {},
      streamingResponses: {},
      pendingQuestions: {},
      error: null,
      createdAt: Date.now(),
    };
    set((state) => ({
      turns: [...state.turns, newTurn],
      activeTurnId: id,
      runStatus: 'running',
      streamingResponses: {},
      error: null,
      synthesis: null,
      providers: {
        chatgpt: { ...state.providers.chatgpt, status: 'sending', response: undefined, pendingQuestion: undefined },
        claude: { ...state.providers.claude, status: 'sending', response: undefined, pendingQuestion: undefined },
        gemini: { ...state.providers.gemini, status: 'ready', response: undefined, pendingQuestion: undefined },
      },
    }));
    return id;
  },

  reset: () =>
    set({
      prompt: '',
      context: '',
      runStatus: 'idle',
      synthesis: null,
      error: null,
      turns: [],
      activeTurnId: null,
      streamingResponses: {},
      providers: {
        chatgpt: { id: 'chatgpt', name: 'ChatGPT', status: 'unavailable', pendingQuestion: undefined },
        claude: { id: 'claude', name: 'Claude', status: 'unavailable', pendingQuestion: undefined },
        gemini: { id: 'gemini', name: 'Gemini', status: 'unavailable', pendingQuestion: undefined },
      },
    }),

  clearChat: () =>
    set({
      prompt: '',
      context: '',
      runStatus: 'idle',
      synthesis: null,
      error: null,
      turns: [],
      activeTurnId: null,
      streamingResponses: {},
    }),

  updateFromPartialState: (partialState) =>
    set((state) => {
      const updatedProviders = partialState.providers
        ? {
            ...state.providers,
            ...Object.keys(partialState.providers).reduce((acc, key) => {
              const pKey = key as ProviderId;
              const incoming = partialState.providers![pKey];
              if (!incoming) return acc;
              acc[pKey] = {
                ...state.providers[pKey],
                ...incoming,
                status:
                  (incoming.pendingQuestion || state.providers[pKey]?.pendingQuestion) && incoming.status !== 'completed'
                    ? 'awaiting_input'
                    : incoming.status || state.providers[pKey]?.status,
                response:
                  incoming.response !== undefined
                    ? incoming.response
                    : incoming.status === 'sending' || incoming.status === 'generating'
                    ? undefined
                    : state.providers[pKey]?.response,
                pendingQuestion:
                  incoming.pendingQuestion !== undefined
                    ? incoming.pendingQuestion
                    : incoming.status === 'completed'
                    ? undefined
                    : state.providers[pKey]?.pendingQuestion,
              };
              return acc;
            }, {} as Record<ProviderId, any>),
          }
        : state.providers;

      const updatedStreamingResponses = partialState.streamingResponses
        ? {
            ...state.streamingResponses,
            ...partialState.streamingResponses,
          }
        : state.streamingResponses;

      // Update current active turn if present
      let updatedTurns = state.turns;
      if (state.activeTurnId && updatedTurns.length > 0) {
        updatedTurns = updatedTurns.map((turn) => {
          if (turn.id !== state.activeTurnId) return turn;

          const newResponses = { ...turn.modelResponses };
          const newPendingQuestions = { ...turn.pendingQuestions };
          if (partialState.providers) {
            (['chatgpt', 'claude', 'gemini'] as ProviderId[]).forEach((p) => {
              if (partialState.providers![p]?.response) {
                newResponses[p] = partialState.providers![p].response;
              }
              if (partialState.providers![p]?.pendingQuestion !== undefined) {
                if (partialState.providers![p]!.pendingQuestion) {
                  newPendingQuestions[p] = partialState.providers![p]!.pendingQuestion;
                } else {
                  delete newPendingQuestions[p];
                }
              } else if (partialState.providers![p]?.status === 'completed') {
                delete newPendingQuestions[p];
              }
            });
          }

          const newStreamingResponses = {
            ...turn.streamingResponses,
            ...(partialState.streamingResponses || {}),
          };

          return {
            ...turn,
            runStatus: partialState.runStatus || turn.runStatus,
            synthesis: partialState.synthesis !== undefined ? partialState.synthesis : turn.synthesis,
            error: partialState.error !== undefined ? partialState.error : turn.error,
            modelResponses: newResponses,
            streamingResponses: newStreamingResponses,
            pendingQuestions: newPendingQuestions,
          };
        });
      }

      return {
        ...state,
        ...partialState,
        providers: updatedProviders,
        streamingResponses: updatedStreamingResponses,
        turns: updatedTurns,
      };
    }),
}));
