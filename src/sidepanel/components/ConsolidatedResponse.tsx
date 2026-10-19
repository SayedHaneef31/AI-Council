import React, { useState } from 'react';
import { CouncilSynthesis, ProviderId } from '../../types';
import { CouncilVerdict } from './CouncilVerdict';
import { Sparkles, Copy, Check, BarChart3, ChevronDown, ChevronUp, Bot, CheckCircle2 } from 'lucide-react';

interface Props {
  synthesis: CouncilSynthesis;
  onSelectProvider?: (provider: ProviderId) => void;
}

export const ConsolidatedResponse: React.FC<Props> = ({ synthesis, onSelectProvider }) => {
  const [showStructuredVerdict, setShowStructuredVerdict] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!synthesis.consolidatedAnswer) return;
    navigator.clipboard.writeText(synthesis.consolidatedAnswer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCitationClick = (provider: ProviderId) => {
    if (onSelectProvider) {
      onSelectProvider(provider);
    }
    const elem = document.getElementById(`provider-evidence-${provider}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Render inline citation tags like [ChatGPT], [Claude], [ChatGPT, Claude] as subtle, clean micro-pills
  const renderRichTextWithCitations = (text: string) => {
    const citationRegex = /(\[(?:ChatGPT|Claude|ChatGPT,\s*Claude|ChatGPT\s*&\s*Claude|\d+)\])/gi;
    const parts = text.split(citationRegex);

    return parts.map((part, idx) => {
      const lower = part.toLowerCase();

      if (lower.includes('chatgpt') && lower.includes('claude')) {
        return (
          <button
            key={idx}
            type="button"
            onClick={() => handleCitationClick('chatgpt')}
            title="Consensus between ChatGPT & Claude (Click to view sources)"
            className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors align-baseline cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            GPT + Claude
          </button>
        );
      } else if (lower.includes('chatgpt')) {
        return (
          <button
            key={idx}
            type="button"
            onClick={() => handleCitationClick('chatgpt')}
            title="Referenced from ChatGPT (Click to view source)"
            className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 transition-colors align-baseline cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            GPT
          </button>
        );
      } else if (lower.includes('claude')) {
        return (
          <button
            key={idx}
            type="button"
            onClick={() => handleCitationClick('claude')}
            title="Referenced from Claude (Click to view source)"
            className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60 transition-colors align-baseline cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Claude
          </button>
        );
      }

      // Format bold text (**word**)
      if (part.includes('**')) {
        const subparts = part.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={idx}>
            {subparts.map((sp, sidx) => {
              if (sp.startsWith('**') && sp.endsWith('**')) {
                return (
                  <strong key={sidx} className="font-semibold text-slate-900">
                    {sp.slice(2, -2)}
                  </strong>
                );
              }
              return sp;
            })}
          </span>
        );
      }

      return <span key={idx}>{part}</span>;
    });
  };

  // Advanced content parser that breaks response into skimmable sections, tables, topic cards, and highlighted points
  const renderContent = (rawText: string) => {
    if (!rawText) return null;
    const lines = rawText.split(/\n/);

    const elements: React.ReactNode[] = [];
    let currentBulletList: string[] = [];
    let currentTableLines: string[] = [];
    let currentCodeLines: string[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';

    const flushCodeBlock = (keyPrefix: number) => {
      if (currentCodeLines.length > 0) {
        elements.push(
          <div key={`code-${keyPrefix}`} className="my-4 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 shadow-sm">
            {codeLanguage && (
              <div className="px-4 py-1.5 bg-slate-800 text-[11px] font-mono text-slate-300 border-b border-slate-700 uppercase tracking-wider">
                {codeLanguage}
              </div>
            )}
            <pre className="p-4 text-xs md:text-sm font-mono overflow-x-auto leading-relaxed text-slate-100">
              <code>{currentCodeLines.join('\n')}</code>
            </pre>
          </div>
        );
        currentCodeLines = [];
        inCodeBlock = false;
        codeLanguage = '';
      }
    };

    const flushList = (keyPrefix: number) => {
      if (currentBulletList.length > 0) {
        elements.push(
          <ul key={`ul-${keyPrefix}`} className="space-y-2.5 my-3 pl-1">
            {currentBulletList.map((item, bidx) => (
              <li key={bidx} className="flex items-start gap-2.5 text-[15px] text-slate-700 leading-relaxed">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0" />
                <span className="flex-1">{renderRichTextWithCitations(item)}</span>
              </li>
            ))}
          </ul>
        );
        currentBulletList = [];
      }
    };

    const flushTable = (keyPrefix: number) => {
      if (currentTableLines.length > 0) {
        const rows = currentTableLines.map((row) => {
          return row
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());
        });

        if (rows.length > 0) {
          const headerRow = rows[0];
          const bodyRows = rows.slice(1).filter((r) => !r.every((c) => /^[-:]+$/.test(c)));

          elements.push(
            <div key={`table-${keyPrefix}`} className="overflow-x-auto my-5 rounded-xl border border-slate-200/90 shadow-xs bg-white">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {headerRow.map((col, hIdx) => (
                      <th key={hIdx} className="py-3 px-4 font-bold text-slate-800 text-xs uppercase tracking-wider">
                        {renderRichTextWithCitations(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bodyRows.map((bRow, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/60 transition-colors">
                      {bRow.map((cell, cIdx) => (
                        <td key={cIdx} className={`py-3 px-4 text-slate-700 leading-relaxed ${cIdx === 0 ? 'font-semibold text-slate-900 bg-slate-50/30' : ''}`}>
                          {renderRichTextWithCitations(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        currentTableLines = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Check for code fence
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock(index);
          return;
        } else {
          flushList(index);
          flushTable(index);
          inCodeBlock = true;
          codeLanguage = trimmed.slice(3).trim();
          return;
        }
      }

      if (inCodeBlock) {
        currentCodeLines.push(line);
        return;
      }

      if (!trimmed) {
        flushList(index);
        flushTable(index);
        return;
      }

      // Check for markdown table line (starts and ends with '|')
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        flushList(index);
        currentTableLines.push(trimmed);
        return;
      }

      flushTable(index);

      // Check for bullet list item
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        currentBulletList.push(trimmed.slice(2));
        return;
      }

      flushList(index);

      // 1. Check for explicit Markdown Headings
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h4 key={index} className="text-base md:text-lg font-bold text-slate-900 mt-6 mb-2 tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full inline-block" />
            {trimmed.slice(4)}
          </h4>
        );
        return;
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h3 key={index} className="text-lg md:text-xl font-extrabold text-slate-900 mt-7 mb-3 pb-1 border-b border-slate-200 tracking-tight">
            {trimmed.slice(3)}
          </h3>
        );
        return;
      }

      // 2. Check for Numbered Section Titles: e.g. "1. Specs & Hardware Baseline (What ₹8,000 gets you)"
      const numberedSectionMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)$/);
      if (numberedSectionMatch && trimmed.length < 90 && !trimmed.includes(': ')) {
        elements.push(
          <div key={index} className="flex items-center gap-3 mt-6 mb-3 pt-3 border-t border-slate-100">
            <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
              {numberedSectionMatch[1]}
            </span>
            <h3 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
              {numberedSectionMatch[2]}
            </h3>
          </div>
        );
        return;
      }

      // 3. Check for Feature / Spec / Key-Value Callouts: e.g. "Screen Size & Resolution: A 24 inch..."
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 2 && colonIdx < 45) {
        const potentialLabel = trimmed.slice(0, colonIdx).trim();
        const content = trimmed.slice(colonIdx + 1).trim();

        // Ensure label looks like a key/topic rather than full sentence
        if (!potentialLabel.includes('.') && potentialLabel.split(' ').length <= 6) {
          elements.push(
            <div
              key={index}
              className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-4 my-2.5 transition-colors shadow-xs"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {potentialLabel}
              </div>
              <div className="text-[14px] md:text-[15px] text-slate-700 leading-relaxed">
                {renderRichTextWithCitations(content)}
              </div>
            </div>
          );
          return;
        }
      }

      // 4. Check for Conclusion / Takeaway Callout (Starts with "Overall", "Recommendation", "Bottom line")
      const lower = trimmed.toLowerCase();
      if (lower.startsWith('overall') || lower.startsWith('recommendation:') || lower.startsWith('bottom line') || lower.startsWith('to conclude')) {
        elements.push(
          <div
            key={index}
            className="bg-emerald-50/80 border-l-4 border-emerald-500 rounded-r-xl p-4 md:p-5 my-4 text-[15px] text-slate-800 leading-relaxed shadow-xs"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Final Takeaway &amp; Recommendation
            </div>
            {renderRichTextWithCitations(trimmed)}
          </div>
        );
        return;
      }

      // 5. Section titles without markdown hashes (short standalone line under 50 chars)
      if (trimmed.length < 50 && !trimmed.endsWith('.') && !trimmed.endsWith(':') && index > 0) {
        elements.push(
          <h4 key={index} className="text-base font-bold text-slate-900 mt-6 mb-2 tracking-tight">
            {trimmed}
          </h4>
        );
        return;
      }

      // 6. Normal Paragraph
      elements.push(
        <p key={index} className="text-[15px] text-slate-700 leading-relaxed my-2.5">
          {renderRichTextWithCitations(trimmed)}
        </p>
      );
    });

    flushCodeBlock(lines.length);
    flushList(lines.length);
    flushTable(lines.length);
    return elements;
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 animate-fadeIn w-full">
      {/* Clean Light Header Bar with Sources & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 border-b border-slate-100 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
              Council Consolidated Answer
            </h2>
          </div>

          {/* Model Source Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-xs text-slate-500 font-medium">Synthesized across:</span>
            <button
              type="button"
              onClick={() => handleCitationClick('chatgpt')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-800 transition-colors shadow-xs cursor-pointer"
              title="Click to view ChatGPT raw evidence"
            >
              <Bot className="w-3.5 h-3.5 text-emerald-600" />
              ChatGPT
            </button>
            <button
              type="button"
              onClick={() => handleCitationClick('claude')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full text-xs font-semibold text-amber-800 transition-colors shadow-xs cursor-pointer"
              title="Click to view Claude raw evidence"
            >
              <Bot className="w-3.5 h-3.5 text-amber-600" />
              Claude
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-medium rounded-xl transition-colors shadow-xs cursor-pointer"
            title="Copy consolidated answer to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowStructuredVerdict(!showStructuredVerdict)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-xs cursor-pointer ${
              showStructuredVerdict
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{showStructuredVerdict ? 'Hide Structured Report' : '📊 View Full Structured Verdict'}</span>
            {showStructuredVerdict ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Full Structured Council Report - Placed directly at the top below header */}
      {showStructuredVerdict && (
        <div className="p-5 bg-slate-50/90 rounded-2xl border border-emerald-200/80 animate-fadeIn space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Structured Executive Verdict &amp; Breakdown
            </span>
            <button
              type="button"
              onClick={() => setShowStructuredVerdict(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
          <CouncilVerdict synthesis={synthesis} />
        </div>
      )}

      {/* Main Structured Body */}
      <div className="space-y-3 font-sans text-slate-700">
        {renderContent(synthesis.consolidatedAnswer || synthesis.verdict)}
      </div>
    </div>
  );
};
