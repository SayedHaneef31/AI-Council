import React from 'react';
import { ProviderRunState } from '../../types';
import { CheckCircle2, CheckCircle, Plus, Loader2, RefreshCw, HelpCircle } from 'lucide-react';

interface Props {
  provider: ProviderRunState;
  onOpenTab?: (forceNewChat?: boolean) => void;
  variant?: 'compact' | 'card';
}

export const ProviderBadge: React.FC<Props> = ({ provider, onOpenTab, variant = 'compact' }) => {
  const isOnline =
    provider.status === 'ready' ||
    provider.status === 'completed' ||
    provider.status === 'sending' ||
    provider.status === 'generating' ||
    provider.status === 'awaiting_input';
  const isConnecting = provider.status === 'connecting';
  const isAwaitingInput = provider.status === 'awaiting_input';

  if (variant === 'card') {
    const providerMeta: Record<string, { company: string; model: string; role: string }> = {
      chatgpt: { company: 'OpenAI', model: 'GPT-4o', role: 'Parallel Source' },
      claude: { company: 'Anthropic', model: 'Claude 3.5 Sonnet', role: 'Parallel Source' },
      gemini: { company: 'Google', model: 'Gemini 2.0 Flash', role: 'Consensus Synthesizer' },
    };
    const meta = providerMeta[provider.id] || { company: 'AI Model', model: 'Active', role: 'Council Node' };

    return (
      <div className={`flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 ${
        isAwaitingInput
          ? 'bg-amber-50/50 border-amber-300 shadow-md ring-2 ring-amber-400/20'
          : isOnline
          ? 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md shadow-xs'
          : isConnecting
          ? 'bg-amber-50/40 border-amber-200 hover:shadow-md shadow-xs'
          : 'bg-white/70 border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm'
      }`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full shrink-0 ${
                provider.status === 'completed'
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : provider.status === 'awaiting_input'
                  ? 'bg-amber-500 animate-ping shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                  : provider.status === 'sending' || provider.status === 'generating'
                  ? 'bg-sky-500 animate-pulse'
                  : provider.status === 'ready'
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                  : isConnecting
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-slate-300'
              }`} />
              <div>
                <span className="text-sm font-bold text-slate-900 block leading-tight">{provider.name}</span>
                <span className="text-[11px] font-medium text-slate-400">{meta.company} • {meta.model}</span>
              </div>
            </div>

            {isAwaitingInput ? (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs animate-pulse">
                <HelpCircle className="w-3 h-3 text-amber-600" /> Needs Answer
              </span>
            ) : isOnline ? (
              provider.isFresh === false ? (
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Ongoing Chat
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <CheckCircle className="w-3 h-3 text-emerald-600" /> Connected
                </span>
              )
            ) : isConnecting ? (
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                <Loader2 className="w-3 h-3 animate-spin text-amber-600" /> Loading Tab...
              </span>
            ) : (
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                Tab Closed
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500 leading-relaxed min-h-[1.5rem] flex items-center">
            {provider.status === 'ready' && (
              provider.isFresh === false ? (
                <span className="text-amber-700 font-medium">Prior conversation in tab — fresh chat recommended</span>
              ) : (
                <span className="text-emerald-700 font-medium">Ready for parallel queries</span>
              )
            )}
            {provider.status === 'connecting' && <span className="text-amber-700 font-medium">Tab is loading, awaiting AI interface...</span>}
            {provider.status === 'sending' && <span className="text-sky-700 font-medium">Sending prompt...</span>}
            {provider.status === 'generating' && <span className="text-sky-700 font-medium">Streaming response tokens...</span>}
            {provider.status === 'awaiting_input' && <span className="text-amber-800 font-semibold">Question asked — reply below in AI Council!</span>}
            {provider.status === 'completed' && <span className="text-emerald-700 font-medium">Response verified &amp; ready</span>}
            {provider.status === 'failed' && <span className="text-rose-600 font-medium">{provider.error || 'Execution failed'}</span>}
            {provider.status === 'unavailable' && <span className="text-slate-400">{meta.role} • Open tab to join Council</span>}
          </div>
        </div>

        {/* When connected: Only show Open a Fresh Chat + if an older conversation is detected */}
        {isOnline && provider.isFresh === false && onOpenTab && (
          <button
            type="button"
            onClick={() => onOpenTab(true)}
            title={`Open a fresh new conversation in ${provider.name} in background`}
            className="mt-4 w-full py-2 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:text-emerald-900 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" /> Open a Fresh Chat +
          </button>
        )}

        {/* When not opened: button to open the tab */}
        {!isOnline && !isConnecting && onOpenTab && (
          <button
            type="button"
            onClick={() => onOpenTab(false)}
            title={`Open new ${provider.name} tab in background`}
            className="mt-4 w-full py-2 px-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" /> Open Tab +
          </button>
        )}

        {/* When connecting */}
        {isConnecting && (
          <div className="mt-4 w-full py-2 px-3.5 bg-amber-50/70 text-amber-700 border border-amber-200/60 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 shadow-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" /> Connecting to Tab...
          </div>
        )}
      </div>
    );
  }

  // Compact navbar pill
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all shrink-0 shadow-xs ${
      isAwaitingInput ? 'bg-amber-50 border border-amber-300 ring-2 ring-amber-400/20' : 'bg-white border border-slate-200 hover:border-slate-300'
    }`}>
      <div className={`w-2 h-2 rounded-full shrink-0 ${
        provider.status === 'completed'
          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
          : provider.status === 'awaiting_input'
          ? 'bg-amber-500 animate-ping'
          : provider.status === 'sending' || provider.status === 'generating'
          ? 'bg-sky-500 animate-pulse'
          : provider.status === 'ready'
          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
          : isConnecting
          ? 'bg-amber-500 animate-pulse'
          : 'bg-slate-400'
      }`} />
      <span className="text-xs font-semibold text-slate-700">{provider.name}</span>

      {isAwaitingInput ? (
        <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md animate-pulse">
          <HelpCircle className="w-2.5 h-2.5 text-amber-600" />
          Answer
        </span>
      ) : isOnline ? (
        <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
          {provider.status === 'ready' ? 'Ready' : provider.status === 'completed' ? 'Done' : 'Active'}
        </span>
      ) : isConnecting ? (
        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
          <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-600" />
          Loading
        </span>
      ) : (
        <button
          type="button"
          onClick={() => onOpenTab && onOpenTab(false)}
          className="flex items-center gap-1 text-[10px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
        >
          <span>Open</span> <Plus className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
};

