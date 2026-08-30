import React from 'react';
import { ProviderRunState } from '../../types';
import { CheckCircle2, AlertCircle, Loader2, CheckCircle, ExternalLink } from 'lucide-react';

interface Props {
  provider: ProviderRunState;
  onOpenTab?: () => void;
}

export const ProviderBadge: React.FC<Props> = ({ provider, onOpenTab }) => {
  const getStatusBadge = () => {
    switch (provider.status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-md">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Done
          </span>
        );
      case 'generating':
      case 'sending':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-sky-400 bg-sky-950/70 border border-sky-800/60 px-2 py-0.5 rounded-md">
            <Loader2 className="w-3 h-3 animate-spin text-sky-400" /> Thinking...
          </span>
        );
      case 'ready':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md">
            <CheckCircle className="w-3 h-3 text-emerald-400 fill-emerald-950" /> Ready
          </span>
        );
      case 'failed':
      case 'timed_out':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded-md">
            <AlertCircle className="w-3 h-3 text-rose-400" /> Offline
          </span>
        );
      case 'unavailable':
      default:
        return (
          <button
            onClick={onOpenTab}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 px-2 py-0.5 rounded-md transition-colors"
          >
            <span>Open Tab</span> <ExternalLink className="w-2.5 h-2.5" />
          </button>
        );
    }
  };

  return (
    <div className="flex items-center justify-between p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg hover:border-slate-700/70 transition-all">
      <div className="flex items-center gap-2.5">
        <div
          className={`w-2 h-2 rounded-full ${
            provider.status === 'completed'
              ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
              : provider.status === 'sending' || provider.status === 'generating'
              ? 'bg-sky-400 animate-pulse'
              : provider.status === 'ready'
              ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
              : 'bg-slate-600'
          }`}
        />
        <span className="text-xs font-medium text-slate-200">{provider.name}</span>
      </div>
      {getStatusBadge()}
    </div>
  );
};
