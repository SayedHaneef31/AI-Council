import React, { useState } from 'react';
import { ModelResponse, ProviderId } from '../../types';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';

interface Props {
  responses: Partial<Record<ProviderId, ModelResponse>>;
}

export const OriginalResponses: React.FC<Props> = ({ responses }) => {
  const [openProvider, setOpenProvider] = useState<ProviderId | null>(null);

  const providerNames: Record<ProviderId, string> = {
    chatgpt: 'ChatGPT Analysis',
    claude: 'Claude Analysis',
    gemini: 'Gemini Synthesis',
  };

  const toggle = (p: ProviderId) => {
    setOpenProvider(openProvider === p ? null : p);
  };

  const keys = (Object.keys(responses) as ProviderId[]).filter((k) => responses[k]);

  if (keys.length === 0) return null;

  return (
    <div className="space-y-2 pt-2 border-t border-gray-800">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
        <FileText className="w-3.5 h-3.5" /> Individual Model Evidence
      </h3>

      <div className="space-y-1.5">
        {keys.map((p) => {
          const resp = responses[p];
          if (!resp) return null;
          const isOpen = openProvider === p;

          return (
            <div key={p} className="bg-dark-800/60 border border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => toggle(p)}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-gray-300 hover:text-white hover:bg-dark-700/40 transition-colors"
              >
                <span>{providerNames[p]}</span>
                {isOpen ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
              </button>

              {isOpen && (
                <div className="p-3 border-t border-gray-800/80 bg-dark-900/90 text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
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
