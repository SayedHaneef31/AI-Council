import React from 'react';
import { useCouncilStore } from '../../state/council-store';
import { ArrowRight, Loader2, SlidersHorizontal } from 'lucide-react';

interface Props {
  onSubmit: () => void;
  disabled?: boolean;
}

export const PromptInput: React.FC<Props> = ({ onSubmit, disabled }) => {
  const { prompt, setPrompt, context, setContext, runStatus } = useCouncilStore();
  const [showContext, setShowContext] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || disabled) return;
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={disabled || runStatus === 'running' || runStatus === 'synthesizing'}
          placeholder="Ask a decision prompt across your open AI models..."
          rows={3}
          className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-all resize-none shadow-sm"
        />
        <button
          type="button"
          onClick={() => setShowContext(!showContext)}
          className="absolute right-2.5 bottom-2.5 text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700/80 transition-colors"
        >
          <SlidersHorizontal className="w-3 h-3 text-slate-400" />
          {showContext ? 'Hide Context' : '+ Shared Context'}
        </button>
      </div>

      {showContext && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-1">
          <label className="text-[11px] font-medium text-slate-400 block">
            Constraints / Context (e.g. Budget, Skill Level, Preferences)
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            disabled={disabled || runStatus === 'running' || runStatus === 'synthesizing'}
            placeholder="e.g. Budget: ₹10,000, Playing level: Intermediate, Playing style: Doubles"
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-700 transition-all resize-none"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || !prompt.trim() || runStatus === 'running' || runStatus === 'synthesizing'}
        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
      >
        {runStatus === 'running' || runStatus === 'synthesizing' ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Analyzing Responses...</span>
          </>
        ) : (
          <>
            <span>Run AI Council</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </form>
  );
};
