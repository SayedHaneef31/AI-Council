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
    expect(prompt).toContain('## CONSOLIDATED_RESPONSE');
  });

  it('should parse markdown synthesis with consolidated response correctly', () => {
    const rawMarkdown = `
## CONSOLIDATED_RESPONSE
Both models recommend the Yonex Arcsaber 11 Play for intermediate doubles players looking for control under ₹10,000 [ChatGPT, Claude]. ChatGPT highlights its forgiving even-balance frame [ChatGPT], while Claude points out that if you want aggressive rear-court smashing power, the Astrox series might be considered [Claude]. Overall, the Arc 11 Play is the ideal balance.

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

    expect(parsed.consolidatedAnswer).toContain('Both models recommend the Yonex Arcsaber 11 Play');
    expect(parsed.consolidatedAnswer).toContain('[ChatGPT, Claude]');
    expect(parsed.verdict).toContain('Arc 11 Play is the optimal choice');
    expect(parsed.consensus.length).toBe(2);
    expect(parsed.consensus[0]).toContain('Both models consider Arc 11 Play');
    expect(parsed.disagreements.length).toBe(1);
    expect(parsed.disagreements[0]).toContain('Claude notes');
    expect(parsed.why.length).toBe(2);
    expect(parsed.confidence).toContain('85%');
  });

  it('should fallback gracefully if consolidated response header is omitted', () => {
    const rawMarkdown = `
## VERDICT
Arc 11 Play is the optimal choice.

## CONSENSUS
- High control and value.
`;

    const parsed = parseSynthesisMarkdown(rawMarkdown);
    expect(parsed.consolidatedAnswer).toContain('Arc 11 Play is the optimal choice');
    expect(parsed.verdict).toContain('Arc 11 Play is the optimal choice');
  });

  it('should not clip consolidated answer when conversational words like why or consensus appear in sentences', () => {
    const rawMarkdown = `
## CONSOLIDATED_RESPONSE
Here is the full consolidated answer. The main reason why this model works best is its balance. Reaching a consensus among team members is easy with this choice. The ultimate verdict on durability is positive. All this text must remain intact without clipping.

## VERDICT
Choose this model with confidence.

## CONSENSUS
- Clear winner for reliability.

## WHY
- Tested durability under load.
`;

    const parsed = parseSynthesisMarkdown(rawMarkdown);
    expect(parsed.consolidatedAnswer).toContain('The main reason why this model works best');
    expect(parsed.consolidatedAnswer).toContain('Reaching a consensus among team members');
    expect(parsed.consolidatedAnswer).toContain('The ultimate verdict on durability');
    expect(parsed.consolidatedAnswer).toContain('All this text must remain intact without clipping.');
    expect(parsed.verdict).toContain('Choose this model with confidence.');
    expect(parsed.why[0]).toContain('Tested durability under load.');
  });
});
