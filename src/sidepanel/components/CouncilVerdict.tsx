import React from 'react';
import { CouncilSynthesis } from '../../types';
import { ShieldCheck, CheckCircle, AlertTriangle, Lightbulb, Scale } from 'lucide-react';

interface Props {
  synthesis: CouncilSynthesis;
}

export const CouncilVerdict: React.FC<Props> = ({ synthesis }) => {
  return (
    <div className="bg-dark-800/90 border border-purple-900/50 rounded-2xl p-4 shadow-xl space-y-4 animate-fadeIn">
      {/* Verdict Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-purple-400" />
          <h2 className="font-bold text-base tracking-wide text-gray-100 uppercase">Council Verdict</h2>
        </div>
        {synthesis.confidence && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-950/80 border border-purple-800/60 rounded-full text-xs font-semibold text-purple-300">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>{synthesis.confidence}</span>
          </div>
        )}
      </div>

      {/* Main Verdict Box */}
      <div className="bg-purple-950/20 border border-purple-800/30 rounded-xl p-3.5 text-sm font-semibold text-purple-200 leading-relaxed">
        {synthesis.verdict}
      </div>

      {/* Consensus Section */}
      {synthesis.consensus && synthesis.consensus.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" /> Consensus
          </h3>
          <ul className="space-y-1 bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3 text-xs text-gray-200">
            {synthesis.consensus.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disagreement Section */}
      {synthesis.disagreements && synthesis.disagreements.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Disagreements & Caveats
          </h3>
          <ul className="space-y-1 bg-amber-950/20 border border-amber-900/30 rounded-xl p-3 text-xs text-gray-200">
            {synthesis.disagreements.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">⚠</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Why / Reasoning Section */}
      {synthesis.why && synthesis.why.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" /> Why / Key Reasons
          </h3>
          <ul className="space-y-1 bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-3 text-xs text-gray-200">
            {synthesis.why.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
