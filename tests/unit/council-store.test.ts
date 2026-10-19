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

  it('should manage conversation turns and support continuous chat', () => {
    const turnId1 = useCouncilStore.getState().startTurn('Question 1', 'Context 1');
    expect(useCouncilStore.getState().turns.length).toBe(1);
    expect(useCouncilStore.getState().turns[0].id).toBe(turnId1);
    expect(useCouncilStore.getState().turns[0].userPrompt).toBe('Question 1');
    expect(useCouncilStore.getState().runStatus).toBe('running');

    // Simulate completion of turn 1
    useCouncilStore.getState().updateFromPartialState({
      runStatus: 'completed',
      synthesis: {
        consolidatedAnswer: 'Consolidated answer 1',
        verdict: 'Verdict 1',
        consensus: ['Point 1'],
        disagreements: [],
        why: ['Reason 1'],
        rawMarkdown: 'raw',
      },
    });

    expect(useCouncilStore.getState().turns[0].synthesis?.consolidatedAnswer).toBe('Consolidated answer 1');

    // Start turn 2 (follow-up question)
    const turnId2 = useCouncilStore.getState().startTurn('Question 2');
    expect(useCouncilStore.getState().turns.length).toBe(2);
    expect(useCouncilStore.getState().turns[1].id).toBe(turnId2);
    expect(useCouncilStore.getState().turns[0].synthesis?.consolidatedAnswer).toBe('Consolidated answer 1');

    // Clear chat
    useCouncilStore.getState().clearChat();
    expect(useCouncilStore.getState().turns.length).toBe(0);
    expect(useCouncilStore.getState().runStatus).toBe('idle');
  });

  it('should handle mid-chat provider questions and answering', () => {
    useCouncilStore.getState().startTurn('Evaluate frameworks');

    // Simulate provider asking a question mid-chat
    useCouncilStore.getState().updateFromPartialState({
      providers: {
        chatgpt: {
          id: 'chatgpt',
          name: 'ChatGPT',
          status: 'awaiting_input',
          pendingQuestion: {
            provider: 'chatgpt',
            question: 'Which framework do you prefer?',
            options: ['Next.js', 'Vite'],
            timestamp: Date.now(),
          },
        },
      },
    });

    const stateWithQuestion = useCouncilStore.getState();
    expect(stateWithQuestion.providers.chatgpt.status).toBe('awaiting_input');
    expect(stateWithQuestion.providers.chatgpt.pendingQuestion?.question).toBe('Which framework do you prefer?');
    expect(stateWithQuestion.turns[0].pendingQuestions?.chatgpt?.options).toContain('Next.js');

    // Answer the question
    useCouncilStore.getState().answerProviderQuestion('chatgpt', 'Next.js', 0);

    const stateAfterAnswer = useCouncilStore.getState();
    expect(stateAfterAnswer.providers.chatgpt.status).toBe('generating');
    expect(stateAfterAnswer.providers.chatgpt.pendingQuestion).toBeUndefined();
  });
});
