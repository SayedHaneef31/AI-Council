import React, { useState, useRef, useEffect } from 'react';
import { useCouncilStore } from '../../state/council-store';
import { ArrowUp, Loader2, Plus, SlidersHorizontal, X, Sparkles } from 'lucide-react';

interface Props {
  onSubmitPrompt?: (promptText: string, contextText?: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  isFollowUp?: boolean;
}

export const PromptInput: React.FC<Props> = ({ onSubmitPrompt, onSubmit, disabled, isFollowUp }) => {
  const { prompt, setPrompt, context, setContext, runStatus } = useCouncilStore();
  const [localPrompt, setLocalPrompt] = useState(prompt);
  const [localContext, setLocalContext] = useState(context);
  const [showContext, setShowContext] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external prompt when changed externally (e.g., sample prompts clicked)
  useEffect(() => {
    if (prompt !== localPrompt) {
      setLocalPrompt(prompt);
      adjustHeight();
    }
  }, [prompt]);

  // Auto adjust textarea height based on content (up to max-h-48)
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [localPrompt]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = localPrompt.trim();
    if (!text || disabled || runStatus === 'running' || runStatus === 'synthesizing') return;

    if (onSubmitPrompt) {
      onSubmitPrompt(text, localContext.trim());
    } else if (onSubmit) {
      setPrompt(text);
      setContext(localContext.trim());
      onSubmit();
    }

    // Clear prompt for next chat message
    setLocalPrompt('');
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isBusy = runStatus === 'running' || runStatus === 'synthesizing';
  const hasContent = localPrompt.trim().length > 0;
  const hasContext = localContext.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full mx-auto relative">
      {/* Expandable Context & Constraints Drawer */}
      {showContext && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-2 animate-fadeIn mb-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
              <span>Council Constraints &amp; Context</span>
              <span className="text-[10px] text-slate-400 font-normal">(Optional guidance for models)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowContext(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            value={localContext}
            onChange={(e) => {
              setLocalContext(e.target.value);
              setContext(e.target.value);
            }}
            disabled={disabled || isBusy}
            placeholder="e.g. Budget: ₹8,000 | Location: Delhi | Primary use: Dual screen coding & office work | Preferences: IPS, 100Hz+"
            rows={2}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none font-sans"
          />
        </div>
      )}

      {/* Modern ChatGPT/Claude Capsule Pill Container */}
      <div
        className={`flex items-end gap-2 bg-white border rounded-[26px] px-3 py-2 shadow-sm transition-all ${
          isBusy
            ? 'border-emerald-200 bg-emerald-50/20'
            : 'border-slate-300 hover:border-slate-400 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10'
        }`}
      >
        {/* Left "+" Action Icon for Context / Options */}
        <button
          type="button"
          onClick={() => setShowContext(!showContext)}
          title="Add context & constraints"
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
            showContext || hasContext
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Center Auto-Expanding Textarea */}
        <textarea
          ref={textareaRef}
          value={localPrompt}
          onChange={(e) => setLocalPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isBusy}
          placeholder={
            isFollowUp
              ? 'Ask a follow-up question to the Council...'
              : 'Ask anything across ChatGPT & Claude...'
          }
          rows={1}
          className="flex-1 max-h-44 bg-transparent border-0 outline-none focus:ring-0 text-sm md:text-[15px] text-slate-800 placeholder-slate-400 py-1.5 px-1 resize-none font-sans leading-relaxed overflow-y-auto custom-scrollbar"
        />

        {/* Right Inline Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
          {/* Think / Context Pill */}
          <button
            type="button"
            onClick={() => setShowContext(!showContext)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              hasContext
                ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-300'
                : 'bg-slate-100 text-slate-600 hover:text-slate-800 hover:bg-slate-200 border border-slate-200'
            }`}
            title="Configure constraints (Budget, Tech Stack, Preferences)"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{hasContext ? 'Context Set' : 'Context'}</span>
          </button>

          {/* Circular Modern Send / Status Button */}
          <button
            type="submit"
            disabled={disabled || !hasContent || isBusy}
            aria-label="Send prompt to council"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isBusy
                ? 'bg-emerald-600 text-white cursor-wait'
                : hasContent
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

