import React, { useEffect, useState, useRef } from 'react';
import { ProviderRunState, RunStatus } from '../../types';
import { Bot, CheckCircle, Clock, Loader2, Sparkles, AlertTriangle } from 'lucide-react';

interface Props {
  runStatus: RunStatus;
  providers: Record<string, ProviderRunState>;
  streamingResponses?: Partial<Record<string, string>>;
}

const RenderLiveMarkdown: React.FC<{ text: string; isGenerating?: boolean; accent: 'emerald' | 'amber' }> = ({
  text,
  isGenerating,
  accent,
}) => {
  if (!text) return null;

  const lines = text.split(/\n/);
  const elements: React.ReactNode[] = [];
  let currentBulletList: string[] = [];
  let currentTableLines: string[] = [];

  const flushList = (keyPrefix: number) => {
    if (currentBulletList.length > 0) {
      elements.push(
        <ul key={`ul-${keyPrefix}`} className="space-y-1.5 my-2 pl-1">
          {currentBulletList.map((item, bidx) => (
            <li key={bidx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${accent === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="flex-1">{formatInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      currentBulletList = [];
    }
  };

  const flushTable = (keyPrefix: number) => {
    if (currentTableLines.length > 0) {
      const rows = currentTableLines.map((row) =>
        row
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim())
      );

      if (rows.length > 0) {
        const headerRow = rows[0];
        const bodyRows = rows.slice(1).filter((r) => !r.every((c) => /^[-:]+$/.test(c)));

        elements.push(
          <div key={`tbl-${keyPrefix}`} className="overflow-x-auto my-3 rounded-lg border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {headerRow.map((col, hIdx) => (
                    <th key={hIdx} className="py-2 px-3 font-bold text-slate-800">
                      {formatInline(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bodyRows.map((bRow, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50">
                    {bRow.map((cell, cIdx) => (
                      <td key={cIdx} className="py-1.5 px-3 text-slate-700 leading-snug">
                        {formatInline(cell)}
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

  const formatInline = (str: string) => {
    if (str.includes('**')) {
      const parts = str.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    }
    return str;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(idx);
      flushTable(idx);
      return;
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList(idx);
      currentTableLines.push(trimmed);
      return;
    }

    flushTable(idx);

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      currentBulletList.push(trimmed.slice(2));
      return;
    }

    flushList(idx);

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h5 key={idx} className="text-xs font-bold text-slate-900 mt-3 mb-1 tracking-tight flex items-center gap-1.5">
          <span className={`w-1 h-3 rounded-full ${accent === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {trimmed.slice(4)}
        </h5>
      );
      return;
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h4 key={idx} className="text-sm font-bold text-slate-900 mt-4 mb-1.5 pb-0.5 border-b border-slate-200">
          {trimmed.slice(3)}
        </h4>
      );
      return;
    }

    elements.push(
      <p key={idx} className="text-xs text-slate-700 leading-relaxed my-1">
        {formatInline(trimmed)}
      </p>
    );
  });

  flushList(lines.length);
  flushTable(lines.length);

  return (
    <>
      {elements}
      {isGenerating && (
        <span className={`inline-block w-1.5 h-3.5 ml-1 animate-pulse align-middle rounded-xs ${
          accent === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'
        }`} />
      )}
    </>
  );
};

export const LiveSynthesisProgress: React.FC<Props> = ({ runStatus, providers, streamingResponses = {} }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [insightIndex, setInsightIndex] = useState(0);

  const chatgptScrollRef = useRef<HTMLDivElement>(null);
  const claudeScrollRef = useRef<HTMLDivElement>(null);

  const insights = [
    'Streaming live tokens directly from ChatGPT & Claude browser tabs...',
    'Comparing recommendations, trade-offs, and practical advice in real-time...',
    'Extracting consensus points and identifying distinct divergences...',
    'Gemini will synthesize a consolidated answer with inline citations once models finish...',
  ];

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => +(prev + 0.1).toFixed(1));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Insight rotator
  useEffect(() => {
    const insightTimer = setInterval(() => {
      setInsightIndex((prev) => (prev + 1) % insights.length);
    }, 2800);
    return () => clearInterval(insightTimer);
  }, [insights.length]);

  const chatgpt = providers.chatgpt;
  const claude = providers.claude;
  const isSynthesizing = runStatus === 'synthesizing';

  const chatgptText = chatgpt?.response?.text || streamingResponses.chatgpt || '';
  const claudeText = claude?.response?.text || streamingResponses.claude || '';

  // Auto-scroll ChatGPT stream pane if near bottom
  useEffect(() => {
    if (chatgptScrollRef.current) {
      const el = chatgptScrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [chatgptText]);

  // Auto-scroll Claude stream pane if near bottom
  useEffect(() => {
    if (claudeScrollRef.current) {
      const el = claudeScrollRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [claudeText]);

  const wordCount = (text?: string) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const isChatGptGenerating = chatgpt?.status === 'generating' || (chatgpt?.status === 'sending' && !chatgpt?.response);
  const isClaudeGenerating = claude?.status === 'generating' || (claude?.status === 'sending' && !claude?.response);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-5 animate-fadeIn w-full">
      {/* Top Header with Status & Elapsed Timer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 shadow-xs">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>{isSynthesizing ? 'Gemini Synthesizing Final Consensus' : 'Parallel Multi-Model Consultation'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            </h3>
            <p className="text-xs text-slate-500">Live dual-stream comparison across active browser tabs</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Gemini Synthesis Status Pill */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
            isSynthesizing
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isSynthesizing ? 'Gemini Synthesizing...' : 'Gemini: Waiting for models'}</span>
          </div>

          {/* Live Timer Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-mono text-slate-700 font-semibold shadow-xs">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{elapsedSeconds.toFixed(1)}s</span>
          </div>
        </div>
      </div>

      {/* Real-time Side-by-Side Streaming Dual Terminals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ChatGPT Live Column */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
          <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-700">
                <Bot className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-slate-800">ChatGPT 4o</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">
                {wordCount(chatgptText)} words
              </span>
              {chatgpt?.status === 'completed' ? (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" /> Finished
                </span>
              ) : chatgpt?.status === 'failed' ? (
                <span className="text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" /> Failed
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-600" /> Live Streaming
                </span>
              )}
            </div>
          </div>

          {/* ChatGPT Streaming Content Box */}
          <div
            ref={chatgptScrollRef}
            className="p-4 bg-slate-50/50 min-h-[240px] max-h-[420px] overflow-y-auto text-xs md:text-sm font-sans leading-relaxed text-slate-700 select-text custom-scrollbar flex-1"
          >
            {chatgptText ? (
              <RenderLiveMarkdown
                text={chatgptText}
                isGenerating={isChatGptGenerating}
                accent="emerald"
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span className="text-xs">Dispatching prompt to ChatGPT tab...</span>
              </div>
            )}
          </div>
        </div>

        {/* Claude Live Column */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
          <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-amber-100 border border-amber-200 rounded-lg text-amber-700">
                <Bot className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-slate-800">Claude 3.5 Sonnet</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">
                {wordCount(claudeText)} words
              </span>
              {claude?.status === 'completed' ? (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-amber-600" /> Finished
                </span>
              ) : claude?.status === 'failed' ? (
                <span className="text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" /> Failed
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-amber-600" /> Live Streaming
                </span>
              )}
            </div>
          </div>

          {/* Claude Streaming Content Box */}
          <div
            ref={claudeScrollRef}
            className="p-4 bg-slate-50/50 min-h-[240px] max-h-[420px] overflow-y-auto text-xs md:text-sm font-sans leading-relaxed text-slate-700 select-text custom-scrollbar flex-1"
          >
            {claudeText ? (
              <RenderLiveMarkdown
                text={claudeText}
                isGenerating={isClaudeGenerating}
                accent="amber"
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 space-y-2">
                <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                <span className="text-xs">Dispatching prompt to Claude tab...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Synthesis Active Alert / Explainer */}
      {isSynthesizing && (
        <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 animate-fadeIn shadow-xs">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 animate-pulse" />
          <span className="font-semibold">
            ChatGPT &amp; Claude finished! Gemini is currently analyzing both outputs, finding consensus, and synthesizing the consolidated answer with citations...
          </span>
        </div>
      )}

      {/* Rotating Dynamic Insight Ticker */}
      <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 shadow-xs">
        <span className="text-base leading-none">💡</span>
        <span className="flex-1 italic text-slate-700 font-medium transition-opacity duration-300">
          {insights[insightIndex]}
        </span>
      </div>
    </div>
  );
};

