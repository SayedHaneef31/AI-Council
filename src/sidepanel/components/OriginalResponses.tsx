import React, { useState } from 'react';
import { ModelResponse, ProviderId } from '../../types';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';

interface Props {
  responses: Partial<Record<ProviderId, ModelResponse>>;
}

export const OriginalResponses: React.FC<Props> = ({ responses }) => {
  const [openProvider, setOpenProvider] = useState<ProviderId | null>(null);

  const providerNames: Record<ProviderId, string> = {
    chatgpt: 'ChatGPT Response',
    claude: 'Claude Response',
    gemini: 'Gemini Synthesis Raw',
  };

  const toggle = (p: ProviderId) => {
    setOpenProvider(openProvider === p ? null : p);
  };

  const keys = (Object.keys(responses) as ProviderId[]).filter((k) => responses[k]);

  if (keys.length === 0) return null;

  return (
    <div className="space-y-2 pt-2 border-t border-slate-800">
      <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
        <FileText className="w-3.5 h-3.5" /> Individual Model Evidence
      </h3>

      <div className="space-y-1.5">
        {keys.map((p) => {
          const resp = responses[p];
          if (!resp) return null;
          const isOpen = openProvider === p;

          return (
            <div key={p} className="bg-slate-900/80 border border-slate-800 rounded-lg overflow-hidden">
              <button
                onClick={() => toggle(p)}
                className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
              >
                <span>{providerNames[p]}</span>
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
              </button>

              {isOpen && (
                <div className="p-3 border-t border-slate-800 bg-slate-950 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {resp.text}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
