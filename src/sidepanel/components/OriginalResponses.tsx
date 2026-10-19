import React, { useState, useEffect } from 'react';
import { ModelResponse, ProviderId } from '../../types';
import {
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Code,
  Eye,
  Clock,
  FileText,
} from 'lucide-react';


interface Props {
  responses: Partial<Record<ProviderId, ModelResponse>>;
  selectedProvider?: ProviderId | null;
}

interface ProviderMeta {
  fullName: string;
  shortName: string;
  company: string;
  accentBorder: string;
  accentBg: string;
  badgeBg: string;
  badgeText: string;
  dotBg: string;
}

const PROVIDER_METAS: Record<string, ProviderMeta> = {
  chatgpt: {
    fullName: 'ChatGPT (GPT-4o)',
    shortName: 'ChatGPT',
    company: 'OpenAI',
    accentBorder: 'border-emerald-200 hover:border-emerald-300',
    accentBg: 'bg-emerald-50/30',
    badgeBg: 'bg-emerald-50 border-emerald-200/80',
    badgeText: 'text-emerald-800',
    dotBg: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  },
  claude: {
    fullName: 'Claude 3.5 Sonnet',
    shortName: 'Claude',
    company: 'Anthropic',
    accentBorder: 'border-amber-200 hover:border-amber-300',
    accentBg: 'bg-amber-50/20',
    badgeBg: 'bg-amber-50 border-amber-200/80',
    badgeText: 'text-amber-800',
    dotBg: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
  },
  gemini: {
    fullName: 'Gemini 2.0 Flash',
    shortName: 'Gemini',
    company: 'Google',
    accentBorder: 'border-blue-200 hover:border-blue-300',
    accentBg: 'bg-blue-50/20',
    badgeBg: 'bg-blue-50 border-blue-200/80',
    badgeText: 'text-blue-800',
    dotBg: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]',
  },
};

// Render inline markdown for formatted reading view
function renderInlineContent(text: string): React.ReactNode {
  if (!text) return null;
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs border border-slate-200">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic text-slate-700">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

// Render formatted sections from raw markdown transcript
function FormattedReaderView({ text }: { text: string }) {
  const lines = text.split(/\n/);
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];

  const flushList = (key: string) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={key} className="space-y-1.5 my-2.5 pl-1">
          {currentList.map((item, lidx) => (
            <li key={lidx} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-700 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
              <span className="flex-1">{renderInlineContent(item)}</span>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(`list-${idx}`);
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList(`list-${idx}`);
      elements.push(
        <h4 key={`h3-${idx}`} className="text-sm font-bold text-slate-900 mt-3 mb-1 tracking-tight">
          {renderInlineContent(trimmed.slice(4))}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList(`list-${idx}`);
      elements.push(
        <h3 key={`h2-${idx}`} className="text-base font-bold text-slate-900 mt-4 mb-1.5 tracking-tight border-b border-slate-100 pb-1">
          {renderInlineContent(trimmed.slice(3))}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList(`list-${idx}`);
      elements.push(
        <h2 key={`h1-${idx}`} className="text-lg font-extrabold text-slate-900 mt-5 mb-2 tracking-tight">
          {renderInlineContent(trimmed.slice(2))}
        </h2>
      );
    } else if (trimmed.match(/^[-*•]\s+/)) {
      currentList.push(trimmed.replace(/^[-*•]\s+/, ''));
    } else if (trimmed.match(/^\d+\.\s+/)) {
      currentList.push(trimmed.replace(/^\d+\.\s+/, ''));
    } else {
      flushList(`list-${idx}`);
      elements.push(
        <p key={`p-${idx}`} className="text-xs md:text-sm text-slate-700 leading-relaxed my-2">
          {renderInlineContent(trimmed)}
        </p>
      );
    }
  });

  flushList('list-end');

  return <div className="space-y-1">{elements}</div>;
}

export const OriginalResponses: React.FC<Props> = ({ responses, selectedProvider }) => {
  const [openMap, setOpenMap] = useState<Record<ProviderId, boolean>>({
    chatgpt: false,
    claude: false,
    gemini: false,
  });
  const [isSideBySide, setIsSideBySide] = useState(false);
  const [viewModes, setViewModes] = useState<Record<ProviderId, 'formatted' | 'raw'>>({
    chatgpt: 'formatted',
    claude: 'formatted',
    gemini: 'formatted',
  });
  const [copiedProvider, setCopiedProvider] = useState<ProviderId | null>(null);

  useEffect(() => {
    if (selectedProvider && responses[selectedProvider]) {
      setOpenMap((prev) => ({ ...prev, [selectedProvider]: true }));
    }
  }, [selectedProvider, responses]);

  const keys = (Object.keys(responses) as ProviderId[]).filter((k) => responses[k] && k !== 'gemini');

  if (keys.length === 0) return null;

  const toggleCard = (p: ProviderId) => {
    setOpenMap((prev) => ({ ...prev, [p]: !prev[p] }));
  };

  const toggleAll = () => {
    const anyOpen = keys.some((k) => openMap[k]);
    const newState = !anyOpen;
    const updated: Record<ProviderId, boolean> = { ...openMap };
    keys.forEach((k) => {
      updated[k] = newState;
    });
    setOpenMap(updated);
    if (newState) {
      setIsSideBySide(true);
    }
  };

  const handleCopy = (p: ProviderId, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = responses[p]?.text;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedProvider(p);
    setTimeout(() => setCopiedProvider(null), 2000);
  };

  const toggleViewMode = (p: ProviderId, e: React.MouseEvent) => {
    e.stopPropagation();
    setViewModes((prev) => ({
      ...prev,
      [p]: prev[p] === 'formatted' ? 'raw' : 'formatted',
    }));
  };

  const allOpen = keys.every((k) => openMap[k]);

  return (
    <div className="space-y-4 pt-6 border-t border-slate-200/90 w-full mx-auto animate-fadeIn">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-700 shadow-xs">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Individual Model Evidence &amp; Raw Transcripts
              </h3>
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {keys.length} Consulted
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Audit the unedited, full transcripts produced by each deliberating AI before consensus
            </p>
          </div>
        </div>

        {/* Global Expand & Layout Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsSideBySide(!isSideBySide)}
            title="Toggle side-by-side comparison layout"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
              isSideBySide
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Side-by-Side</span>
          </button>
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            {allOpen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" /> Collapse All
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" /> Expand All
              </>
            )}
          </button>
        </div>
      </div>

      {/* Model Cards Grid / List */}
      <div className={isSideBySide ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
        {keys.map((p) => {
          const resp = responses[p];
          if (!resp) return null;
          const meta = PROVIDER_METAS[p] || PROVIDER_METAS.chatgpt;
          const isOpen = openMap[p];
          const text = resp.text || '';
          const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
          const readingTime = Math.max(1, Math.ceil(wordCount / 220));
          const isCopied = copiedProvider === p;
          const mode = viewModes[p] || 'formatted';

          return (
            <div
              key={p}
              id={`provider-evidence-${p}`}
              className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs overflow-hidden ${
                isOpen ? `${meta.accentBorder} shadow-sm ring-1 ring-emerald-500/10` : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Header Bar */}
              <div
                onClick={() => toggleCard(p)}
                className={`w-full flex items-center justify-between p-4 cursor-pointer select-none transition-colors ${
                  isOpen ? meta.accentBg : 'hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${meta.dotBg}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 tracking-tight">{meta.fullName}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${meta.badgeBg} ${meta.badgeText}`}>
                        {meta.company}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mt-0.5">
                      <span>{wordCount.toLocaleString()} words</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> ~{readingTime}m read
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Header Action Icons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleCopy(p, e)}
                    title="Copy this model's transcript"
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 text-[11px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] hidden sm:inline">Copy</span>
                      </>
                    )}
                  </button>

                  <div className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-emerald-700 transform transition-transform duration-200" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Card Body (When Expanded) */}
              {isOpen && (
                <div className="border-t border-slate-200/80 bg-white animate-fadeIn">
                  {/* Internal Subtoolbar */}
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 border-b border-slate-200 text-xs text-slate-500">
                    <span className="font-mono text-[11px] text-slate-500">
                      Deliberation Proof ({text.length.toLocaleString()} characters)
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => toggleViewMode(p, e)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 hover:border-slate-300 rounded text-[11px] font-medium text-slate-700 transition-colors cursor-pointer"
                      >
                        {mode === 'formatted' ? (
                          <>
                            <Code className="w-3 h-3 text-slate-500" /> Raw Markdown
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 text-emerald-600" /> Formatted View
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Text Reader Container */}
                  <div className="p-5 max-h-96 overflow-y-auto custom-scrollbar">
                    {mode === 'formatted' ? (
                      <FormattedReaderView text={text} />
                    ) : (
                      <pre className="text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed">
                        {text}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

