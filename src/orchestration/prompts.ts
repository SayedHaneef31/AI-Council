import { ModelResponse } from '../types';

export function buildSynthesisPrompt(
  question: string,
  userContext: string,
  responses: ModelResponse[]
): string {
  const modelNames = responses
    .map((r) => (r.provider === 'chatgpt' ? 'ChatGPT' : r.provider === 'claude' ? 'Claude' : r.provider))
    .join(' and ');
  const modelTextBlocks = responses
    .map((r) => `=== ${r.provider.toUpperCase()} RESPONSE ===\n${r.text}`)
    .join('\n\n');

  return `You are acting as the AI Council Orchestrator and Synthesizer.
You have collected independent answers from ${modelNames} to the user's question.
Your mission is to produce a single, high-quality, Reddit-style CONSOLIDATED RESPONSE that directly answers the user's question by synthesizing the perspectives of both models with inline citations, followed by a structured council breakdown.

ORIGINAL USER QUESTION:
${question}

${userContext ? `ADDITIONAL USER CONTEXT:\n${userContext}\n` : ''}
${modelTextBlocks}

SYNTHESIS GUIDELINES:
1. CONSOLIDATED RESPONSE:
   - Structure your answer cleanly for effortless skimming and reading! NEVER output an unformatted wall of text.
   - Use bold descriptive markdown subheadings (with ###) for each key category, consideration, or option.
   - Use comparison markdown tables (| Feature | ChatGPT Perspective | Claude Perspective |) where appropriate for side-by-side trade-offs.
   - Use bullet points (- ) with bold lead-ins (e.g. - **Key Factor:** explanation) for specifications, trade-offs, and criteria.
   - Include an explicit "### Overall Recommendation" or bottom-line takeaway section at the end.
   - Weave together key insights, points of agreement, and trade-offs from both models.
   - Use inline attribution references like [ChatGPT], [Claude], or [ChatGPT & Claude] SPARINGLY and naturally at key claims or section ends. Do NOT spam citations into every single cell or sentence.

2. STRUCTURED COUNCIL BREAKDOWN:
   - Provide the concise verdict, consensus items, divergence items, why factors, and confidence score so the user can inspect the full breakdown if desired.

IMPORTANT FORMAT REQUIREMENT:
Your response MUST use the exact markdown headers below (with ##):

## CONSOLIDATED_RESPONSE
[Provide the natural, consolidated, comprehensive answer directly answering the user, with inline citations like [ChatGPT] and [Claude].]

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
