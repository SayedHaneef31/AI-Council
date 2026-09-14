import React, { useState } from 'react';
import { ModelResponse, ProviderId } from '../../types';
import { ChevronDown, ChevronRight, FileText, Maximize2, Minimize2 } from 'lucide-react';

interface Props {
  responses: Partial<Record<ProviderId, ModelResponse>>;
  selectedProvider?: ProviderId | null;
}

export const OriginalResponses: React.FC<Props> = ({ responses, selectedProvider }) => {
  const [openProvider, setOpenProvider] = useState<ProviderId | null>(null);
  const [expandAll, setExpandAll] = useState(false);

  React.useEffect(() => {
    if (selectedProvider) {
      setOpenProvider(selectedProvider);
    }
  }, [selectedProvider]);

  const providerNames: Record<ProviderId, string> = {
    chatgpt: 'ChatGPT 4o Raw Output',
    claude: 'Claude 3.5 Sonnet Raw Output',
    gemini: 'Gemini Synthesis Transcript',
  };

  const toggle = (p: ProviderId) => {
    setOpenProvider(openProvider === p ? null : p);
  };

  const keys = (Object.keys(responses) as ProviderId[]).filter((k) => responses[k]);

  if (keys.length === 0) return null;

  return (
    <div className="space-y-3 pt-4 border-t border-slate-200 w-full mx-auto">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" /> Individual Model Evidence &amp; Raw Transcripts
        </h3>
        <button
          onClick={() => setExpandAll(!expandAll)}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          {expandAll ? (
            <>
              <Minimize2 className="w-3 h-3" /> Collapse All
            </>
          ) : (
            <>
              <Maximize2 className="w-3 h-3" /> Expand Side-by-Side
            </>
          )}
        </button>
      </div>

      <div className={expandAll ? 'grid grid-cols-1 md:grid-cols-3 gap-4' : 'space-y-2'}>
        {keys.map((p) => {
          const resp = responses[p];
          if (!resp) return null;
          const isOpen = expandAll || openProvider === p;

          return (
            <div
              key={p}
              id={`provider-evidence-${p}`}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs transition-all"
            >
              <button
                onClick={() => toggle(p)}
                className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {providerNames[p]}
                </span>
                {!expandAll && (isOpen ? <ChevronDown className="w-4 h-4 text-emerald-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />)}
              </button>

              {isOpen && (
                <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar">
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
