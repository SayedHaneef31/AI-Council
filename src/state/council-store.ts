import { create } from 'zustand';
import { CouncilState, ProviderId, ProviderStatus, ModelResponse, CouncilSynthesis, RunStatus } from '../types';

interface CouncilStoreActions {
  setPrompt: (prompt: string) => void;
  setContext: (context: string) => void;
  setRunStatus: (status: RunStatus) => void;
  updateProviderStatus: (id: ProviderId, status: ProviderStatus, error?: string, response?: ModelResponse) => void;
  setSynthesis: (synthesis: CouncilSynthesis | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
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
  synthesis: null,
  error: null,

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

  reset: () =>
    set({
      prompt: '',
      context: '',
      runStatus: 'idle',
      synthesis: null,
      error: null,
      providers: {
        chatgpt: { id: 'chatgpt', name: 'ChatGPT', status: 'unavailable' },
        claude: { id: 'claude', name: 'Claude', status: 'unavailable' },
        gemini: { id: 'gemini', name: 'Gemini', status: 'unavailable' },
      },
    }),

  updateFromPartialState: (partialState) =>
    set((state) => ({
      ...state,
      ...partialState,
      providers: partialState.providers
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
        : state.providers,
    })),
}));
