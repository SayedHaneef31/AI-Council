import { CouncilSynthesis } from '../types';

export function parseSynthesisMarkdown(rawMarkdown: string): CouncilSynthesis {
  // Strip prefixes like "Gemini said " or "Gemini:"
  let cleanText = rawMarkdown.replace(/^(?:Gemini|Assistant)\s+said[:\s]*/i, '').trim();

  const synthesis: CouncilSynthesis = {
    consolidatedAnswer: '',
    verdict: '',
    consensus: [],
    disagreements: [],
    why: [],
    confidence: undefined,
    rawMarkdown: cleanText,
  };

  if (!cleanText) return synthesis;

  // Regex matching CONSOLIDATED_RESPONSE, VERDICT, CONSENSUS, DISAGREEMENT, WHY, CONFIDENCE anywhere in text
  const keywordPattern =
    'CONSOLIDATED_RESPONSE|CONSOLIDATED RESPONSE|CONSOLIDATED ANSWER|CONSOLIDATED|VERDICT|CONSENSUS|DISAGREEMENT|DISAGREEMENTS|WHY|CONFIDENCE';
  const keywordRegex = new RegExp(`(?:^|\\n|\\s|#{1,4}\\s*|\\*{2})(${keywordPattern})(?:[:\\s*#]+|\\*{2})`, 'gi');

  const matches: { keyword: string; index: number; endHeaderIndex: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = keywordRegex.exec(cleanText)) !== null) {
    matches.push({
      keyword: match[1].toUpperCase().replace(/\s+/g, '_'),
      index: match.index,
      endHeaderIndex: match.index + match[0].length,
    });
  }

  // If there's text before the first section header, it might be the consolidated intro/response
  let textBeforeFirstHeader = '';
  if (matches.length > 0 && matches[0].index > 0) {
    textBeforeFirstHeader = cleanText.slice(0, matches[0].index).trim();
  }

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const nextIndex = i + 1 < matches.length ? matches[i + 1].index : cleanText.length;
      const textBlock = cleanText.slice(current.endHeaderIndex, nextIndex).trim();

      if (
        current.keyword === 'CONSOLIDATED_RESPONSE' ||
        current.keyword === 'CONSOLIDATED_ANSWER' ||
        current.keyword === 'CONSOLIDATED'
      ) {
        synthesis.consolidatedAnswer = textBlock;
      } else if (current.keyword === 'VERDICT') {
        synthesis.verdict = textBlock;
      } else if (current.keyword === 'CONSENSUS') {
        synthesis.consensus = formatBlockIntoItems(textBlock);
      } else if (current.keyword === 'DISAGREEMENT' || current.keyword === 'DISAGREEMENTS') {
        synthesis.disagreements = formatBlockIntoItems(textBlock);
      } else if (current.keyword === 'WHY') {
        synthesis.why = formatBlockIntoItems(textBlock);
      } else if (current.keyword === 'CONFIDENCE') {
        synthesis.confidence = textBlock;
      }
    }
  }

  // Fallbacks:
  // If consolidated answer was not tagged explicitly, use text before first header if present
  if (!synthesis.consolidatedAnswer && textBeforeFirstHeader) {
    synthesis.consolidatedAnswer = textBeforeFirstHeader;
  }

  // If still no consolidated answer, fallback to verdict or full text
  if (!synthesis.consolidatedAnswer) {
    synthesis.consolidatedAnswer = synthesis.verdict || cleanText;
  }

  // If no verdict extracted, fallback to consolidated answer or full text
  if (!synthesis.verdict) {
    synthesis.verdict = synthesis.consolidatedAnswer || cleanText;
  }

  return synthesis;
}

function formatBlockIntoItems(block: string): string[] {
  if (!block) return [];

  // Split by newlines or bullets
  const rawLines = block.split(/\n+/);
  const items: string[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim().replace(/^(?:[-*•]|\d+[.)])\s*/, '');
    if (!trimmed) continue;

    // If it's a block of text without newlines, split by sentence or topic colons
    if (trimmed.length > 120 && trimmed.includes('.')) {
      const sentences = trimmed.split(/(?<=\.)\s+/).filter((s) => s.trim().length > 0);
      items.push(...sentences);
    } else {
      items.push(trimmed);
    }
  }

  return items;
}
