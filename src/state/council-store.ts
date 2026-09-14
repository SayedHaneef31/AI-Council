import { create } from 'zustand';
import { CouncilState, ProviderId, ProviderStatus, ModelResponse, CouncilSynthesis, RunStatus, ConversationTurn } from '../types';

interface CouncilStoreActions {
  setPrompt: (prompt: string) => void;
  setContext: (context: string) => void;
  setRunStatus: (status: RunStatus) => void;
  updateProviderStatus: (id: ProviderId, status: ProviderStatus, error?: string, response?: ModelResponse) => void;
  setSynthesis: (synthesis: CouncilSynthesis | null) => void;
  setError: (error: string | null) => void;
  startTurn: (prompt: string, context?: string) => string;
  reset: () => void;
  clearChat: () => void;
  updateFromPartialState: (partialState: Partial<CouncilState>) => void;
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
        chatgpt: { id: 'chatgpt', name: 'ChatGPT', status: 'unavailable' },
        claude: { id: 'claude', name: 'Claude', status: 'unavailable' },
        gemini: { id: 'gemini', name: 'Gemini', status: 'unavailable' },
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
              acc[pKey] = {
                ...state.providers[pKey],
                ...partialState.providers![pKey],
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
          if (partialState.providers) {
            (['chatgpt', 'claude', 'gemini'] as ProviderId[]).forEach((p) => {
              if (partialState.providers![p]?.response) {
                newResponses[p] = partialState.providers![p].response;
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
