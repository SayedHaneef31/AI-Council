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

  const sections = rawMarkdown.split(/^##\s+/m);

  for (const sec of sections) {
    const lines = sec.trim().split('\n');
    if (lines.length === 0) continue;

    const title = lines[0].trim().toUpperCase();
    const contentLines = lines.slice(1).map((l) => l.trim()).filter((l) => l.length > 0);

    if (title.includes('VERDICT')) {
      synthesis.verdict = contentLines.join(' ');
    } else if (title.includes('CONSENSUS')) {
      synthesis.consensus = contentLines.map((l) => l.replace(/^[-*•]\s*/, ''));
    } else if (title.includes('DISAGREEMENT')) {
      synthesis.disagreements = contentLines.map((l) => l.replace(/^[-*•]\s*/, ''));
    } else if (title.includes('WHY')) {
      synthesis.why = contentLines.map((l) => l.replace(/^[-*•]\s*/, ''));
    } else if (title.includes('CONFIDENCE')) {
      synthesis.confidence = contentLines.join(' ');
    }
  }

  // Fallback if parsing didn't find clear headings
  if (!synthesis.verdict && rawMarkdown) {
    synthesis.verdict = rawMarkdown.slice(0, 300) + '...';
  }

  return synthesis;
}
