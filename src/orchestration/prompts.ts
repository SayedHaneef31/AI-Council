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
Your task is to cross-examine and synthesize answers from the participating AI models into ONE clear, transparent decision recommendation.

ORIGINAL USER QUESTION:
${question}

${userContext ? `ADDITIONAL USER CONTEXT:\n${userContext}\n` : ''}
${modelTextBlocks}

IMPORTANT FORMAT REQUIREMENT:
Your response MUST use the exact markdown headers below (with ##):

## VERDICT
[Provide the single concise recommendation or conclusion here.]

## CONSENSUS
- [Key point of agreement 1]
- [Key point of agreement 2]

## DISAGREEMENT
- [Key disagreement or divergence in priority/reasoning 1]

## WHY
- [Reason 1 supporting the recommendation]
- [Reason 2 supporting the recommendation]

## CONFIDENCE
[Confidence percentage e.g. 85%, with a brief 1-line justification]
`;
}
