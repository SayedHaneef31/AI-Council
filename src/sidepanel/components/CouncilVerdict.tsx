import React from 'react';
import { CouncilSynthesis } from '../../types';
import { ShieldCheck, Check, AlertTriangle, HelpCircle, Scale } from 'lucide-react';

interface Props {
  synthesis: CouncilSynthesis;
}

export const CouncilVerdict: React.FC<Props> = ({ synthesis }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-emerald-400" />
          <h2 className="font-semibold text-xs text-slate-200 uppercase tracking-wider">Council Verdict</h2>
        </div>
        {synthesis.confidence && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-md text-[11px] font-medium text-emerald-400">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>{synthesis.confidence}</span>
          </div>
        )}
      </div>

      {/* Main Recommendation */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs font-semibold text-slate-100 leading-relaxed">
        {synthesis.verdict}
      </div>

      {/* Consensus */}
      {synthesis.consensus && synthesis.consensus.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> Consensus
          </h3>
          <ul className="space-y-1 bg-slate-950/40 border border-slate-800/80 rounded-lg p-2.5 text-xs text-slate-300">
            {synthesis.consensus.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disagreements */}
      {synthesis.disagreements && synthesis.disagreements.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Disagreements
          </h3>
          <ul className="space-y-1 bg-slate-950/40 border border-slate-800/80 rounded-lg p-2.5 text-xs text-slate-300">
            {synthesis.disagreements.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">⚠</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Why Reasoning */}
      {synthesis.why && synthesis.why.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" /> Why / Key Factors
          </h3>
          <ul className="space-y-1 bg-slate-950/40 border border-slate-800/80 rounded-lg p-2.5 text-xs text-slate-300">
            {synthesis.why.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-sky-400 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
