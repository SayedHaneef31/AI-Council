import { describe, it, expect } from 'vitest';
import { buildSynthesisPrompt } from '../../src/orchestration/prompts';
import { parseSynthesisMarkdown } from '../../src/orchestration/synthesis';
import { ModelResponse } from '../../src/types';

describe('Synthesis Module', () => {
  it('should build synthesis prompt correctly', () => {
    const responses: ModelResponse[] = [
      {
        provider: 'chatgpt',
        text: 'I recommend Yonex Arc 11 Play for control.',
        status: 'completed',
        startedAt: 1000,
        completedAt: 5000,
      },
      {
        provider: 'claude',
        text: 'Arc 11 Play is best for versatile control, though Astrox 100 ZZ offers more power.',
        status: 'completed',
        startedAt: 1000,
        completedAt: 5000,
      },
    ];

    const prompt = buildSynthesisPrompt(
      'Which badminton racket should I buy under ₹10,000?',
      'Budget: ₹10,000, Skill: Intermediate',
      responses
    );

    expect(prompt).toContain('ORIGINAL USER QUESTION:');
    expect(prompt).toContain('Which badminton racket should I buy under ₹10,000?');
    expect(prompt).toContain('CHATGPT RESPONSE');
    expect(prompt).toContain('CLAUDE RESPONSE');
    expect(prompt).toContain('Yonex Arc 11 Play');
  });

  it('should parse markdown synthesis correctly', () => {
    const rawMarkdown = `
## VERDICT
Arc 11 Play is the optimal choice for your intermediate doubles control requirement.

## CONSENSUS
- Both models consider Arc 11 Play suitable for control-oriented play.
- Excellent value under ₹10,000.

## DISAGREEMENT
- Claude notes that Astrox 100 ZZ is better if aggressive rear-court smashing is preferred.

## WHY
- Fits stated budget constraint.
- Forgiving frame for intermediate doubles players.

## CONFIDENCE
85% high agreement on primary recommendation
`;

    const parsed = parseSynthesisMarkdown(rawMarkdown);

    expect(parsed.verdict).toContain('Arc 11 Play is the optimal choice');
    expect(parsed.consensus.length).toBe(2);
    expect(parsed.consensus[0]).toContain('Both models consider Arc 11 Play');
    expect(parsed.disagreements.length).toBe(1);
    expect(parsed.disagreements[0]).toContain('Claude notes');
    expect(parsed.why.length).toBe(2);
    expect(parsed.confidence).toContain('85%');
  });
});
