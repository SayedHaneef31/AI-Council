import React from 'react';
import { useCouncilStore } from '../../state/council-store';
import { Send, Sparkles, SlidersHorizontal } from 'lucide-react';

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
          placeholder="What decision or question do you want the AI Council to solve?"
          rows={3}
          className="w-full bg-dark-800 border border-gray-700/70 rounded-xl p-3.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none shadow-inner"
        />
        <button
          type="button"
          onClick={() => setShowContext(!showContext)}
          className="absolute right-3 bottom-3 text-xs text-gray-400 hover:text-purple-400 flex items-center gap-1 bg-dark-900/80 px-2 py-1 rounded-md border border-gray-800 transition-colors"
        >
          <SlidersHorizontal className="w-3 h-3" />
          {showContext ? 'Hide Context' : '+ Context'}
        </button>
      </div>

      {showContext && (
        <div className="bg-dark-800/50 border border-gray-800 rounded-xl p-3 animate-fadeIn">
          <label className="text-xs font-medium text-gray-400 mb-1 block">
            Shared Context / Constraints (Budget, Skill, Preferences, etc.)
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            disabled={disabled || runStatus === 'running' || runStatus === 'synthesizing'}
            placeholder="e.g. Budget: ₹10k, Skill: Intermediate, Playing style: Doubles, Preference: Control"
            rows={2}
            className="w-full bg-dark-900 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-all resize-none"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || !prompt.trim() || runStatus === 'running' || runStatus === 'synthesizing'}
        className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-purple-950/40 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]"
      >
        {runStatus === 'running' || runStatus === 'synthesizing' ? (
          <>
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>Council is Thinking...</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>Ask Council</span>
          </>
        )}
      </button>
    </form>
  );
};
