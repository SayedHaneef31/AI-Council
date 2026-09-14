import React from 'react';
import { CouncilSynthesis } from '../../types';
import { ShieldCheck, CheckCircle2, AlertTriangle, HelpCircle, Scale } from 'lucide-react';

interface Props {
  synthesis: CouncilSynthesis;
}

export const CouncilVerdict: React.FC<Props> = ({ synthesis }) => {
  // Helper to render text with formatted bold subheadings (e.g., "Topic Title: ...")
  const renderFormattedParagraph = (text: string) => {
    if (!text) return null;
    const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0);

    return (
      <div className="space-y-3">
        {paragraphs.map((p, i) => {
          const colonIdx = p.indexOf(':');
          if (colonIdx > 0 && colonIdx < 50) {
            const title = p.slice(0, colonIdx + 1);
            const body = p.slice(colonIdx + 1);
            return (
              <p key={i} className="text-sm md:text-[15px] text-slate-700 leading-relaxed">
                <strong className="text-emerald-800 font-semibold mr-1.5">{title}</strong>
                {body}
              </p>
            );
          }
          return (
            <p key={i} className="text-sm md:text-[15px] text-slate-700 leading-relaxed">
              {p}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-xs animate-fadeIn w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-800 shadow-xs">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base md:text-lg text-slate-900 tracking-tight">COUNCIL SYNTHESIS VERDICT</h2>
            <p className="text-xs text-slate-500">Cross-Model Cross-Examination &amp; Unified Executive Recommendation</p>
          </div>
        </div>
        {synthesis.confidence && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-800 self-start md:self-auto">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Confidence Score: {synthesis.confidence}</span>
          </div>
        )}
      </div>

      {/* Main Verdict Recommendation Box */}
      <div className="bg-white border border-emerald-200/90 rounded-xl p-5 md:p-6 shadow-xs space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
          <span>★</span> PRIMARY EXECUTIVE RECOMMENDATION
        </div>
        <div className="text-sm md:text-[15px] text-slate-800 font-medium leading-relaxed">
          {renderFormattedParagraph(synthesis.verdict)}
        </div>
      </div>

      {/* Consensus */}
      {synthesis.consensus && synthesis.consensus.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Points of Consensus
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {synthesis.consensus.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 shadow-xs hover:border-slate-300 transition-colors">
                <span className="text-emerald-600 font-bold shrink-0 mt-0.5 text-base">✓</span>
                <div className="flex-1">{renderFormattedParagraph(item)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disagreements */}
      {synthesis.disagreements && synthesis.disagreements.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Key Divergences &amp; Caveats
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {synthesis.disagreements.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-amber-50/50 border border-amber-200 rounded-xl p-4 text-sm text-slate-800 shadow-xs hover:border-amber-300 transition-colors">
                <span className="text-amber-600 font-bold shrink-0 mt-0.5 text-base">⚠</span>
                <div className="flex-1">{renderFormattedParagraph(item)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Why Reasoning */}
      {synthesis.why && synthesis.why.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-500" /> Critical Decision Factors
          </h3>
          <div className="space-y-3">
            {synthesis.why.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 shadow-xs">
                <span className="text-slate-400 font-bold shrink-0 mt-0.5 text-base">•</span>
                <div className="flex-1">{renderFormattedParagraph(item)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
