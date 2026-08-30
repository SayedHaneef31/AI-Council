import { describe, it, expect, beforeEach } from 'vitest';
import { useCouncilStore } from '../../src/state/council-store';

describe('Council Store', () => {
  beforeEach(() => {
    useCouncilStore.getState().reset();
  });

  it('should initialize with default state', () => {
    const state = useCouncilStore.getState();
    expect(state.prompt).toBe('');
    expect(state.runStatus).toBe('idle');
    expect(state.synthesis).toBeNull();
    expect(state.providers.chatgpt.status).toBe('unavailable');
  });

  it('should update prompt and context', () => {
    useCouncilStore.getState().setPrompt('Which racket to buy?');
    useCouncilStore.getState().setContext('Budget: ₹10k');

    const state = useCouncilStore.getState();
    expect(state.prompt).toBe('Which racket to buy?');
    expect(state.context).toBe('Budget: ₹10k');
  });

  it('should update provider status', () => {
    useCouncilStore.getState().updateProviderStatus('chatgpt', 'completed', undefined, {
      provider: 'chatgpt',
      text: 'Test response',
      status: 'completed',
      startedAt: 100,
      completedAt: 200,
    });

    const state = useCouncilStore.getState();
    expect(state.providers.chatgpt.status).toBe('completed');
    expect(state.providers.chatgpt.response?.text).toBe('Test response');
  });
});
