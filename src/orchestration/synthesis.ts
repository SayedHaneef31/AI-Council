import { CouncilSynthesis } from '../types';

export function parseSynthesisMarkdown(rawMarkdown: string): CouncilSynthesis {
  const synthesis: CouncilSynthesis = {
    verdict: '',
    consensus: [],
    disagreements: [],
    why: [],
    confidence: undefined,
    rawMarkdown,
  };

  if (!rawMarkdown) return synthesis;

  // Flexible regex matching markdown headers like ## VERDICT, **VERDICT:**, 1. VERDICT, etc.
  const sectionRegex = /(?:^|\n)(?:#{1,4}\s*|\*{2}\s*\d?\.?\s*|\d\.\s*)(VERDICT|CONSENSUS|DISAGREEMENT|WHY|CONFIDENCE)[\s:*]*/gi;

  const matches = Array.from(rawMarkdown.matchAll(sectionRegex));

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const headerType = match[1].toUpperCase();
      const startIndex = match.index! + match[0].length;
      const endIndex = i + 1 < matches.length ? matches[i + 1].index! : rawMarkdown.length;
      const contentText = rawMarkdown.slice(startIndex, endIndex).trim();

      // Only strip list bullet prefixes like "1.", "1)", "-", "*", "•"
      const lines = contentText
        .split('\n')
        .map((l) => l.trim().replace(/^(?:[-*•]|\d+[.)])\s*/, ''))
        .filter((l) => l.length > 0);

      if (headerType.includes('VERDICT')) {
        synthesis.verdict = contentText.replace(/^[\s:*]+/, '').trim();
      } else if (headerType.includes('CONSENSUS')) {
        synthesis.consensus = lines;
      } else if (headerType.includes('DISAGREEMENT')) {
        synthesis.disagreements = lines;
      } else if (headerType.includes('WHY')) {
        synthesis.why = lines;
      } else if (headerType.includes('CONFIDENCE')) {
        synthesis.confidence = lines.join(' ');
      }
    }
  }

  // Fallback: If no structured sections were found, set verdict to full raw markdown
  if (!synthesis.verdict) {
    synthesis.verdict = rawMarkdown.trim();
  }

  return synthesis;
}
