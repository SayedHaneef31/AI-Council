import { ModelResponse } from '../types';

export function buildSynthesisPrompt(
  question: string,
  userContext: string,
  responses: ModelResponse[]
): string {
  const modelTextBlocks = responses
    .map((r) => `=== ${r.provider.toUpperCase()} RESPONSE ===\n${r.text}`)
    .join('\n\n');

  return `You are acting as the AI Council Orchestrator and Synthesizer.
Your goal is to cross-examine and synthesize answers from multiple AI models into ONE clear, transparent recommendation.

ORIGINAL USER QUESTION:
${question}

${userContext ? `ADDITIONAL USER CONTEXT:\n${userContext}\n` : ''}
${modelTextBlocks}

TASK & FORMAT INSTRUCTIONS:
Analyze the model responses above. Produce a response adhering strictly to the following sections:

## VERDICT
[Provide the single concise recommendation or conclusion here.]

## CONSENSUS
- [Key point 1 of agreement across models]
- [Key point 2 of agreement across models]

## DISAGREEMENT
- [Key disagreement or divergence in priority/reasoning]

## WHY
- [Reason 1 supporting the recommendation]
- [Reason 2 supporting the recommendation]

## CONFIDENCE
[Confidence percentage e.g. 85%, with a brief 1-line justification]
`;
}
