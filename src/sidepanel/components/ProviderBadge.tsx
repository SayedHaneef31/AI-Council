import React from 'react';
import { ProviderRunState } from '../../types';
import { CheckCircle2, AlertTriangle, Loader2, Circle, ExternalLink } from 'lucide-react';

interface Props {
  provider: ProviderRunState;
  onOpenTab?: () => void;
}

export const ProviderBadge: React.FC<Props> = ({ provider, onOpenTab }) => {
  const getStatusBadge = () => {
    switch (provider.status) {
      case 'completed':
        return (
          <span className="flex items-center text-emerald-400 text-xs gap-1 font-medium bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Done
          </span>
        );
      case 'generating':
      case 'sending':
        return (
          <span className="flex items-center text-purple-400 text-xs gap-1 font-medium bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded-full animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
          </span>
        );
      case 'ready':
        return (
          <span className="flex items-center text-indigo-400 text-xs gap-1 font-medium bg-indigo-950/60 border border-indigo-800/50 px-2 py-0.5 rounded-full">
            <Circle className="w-2.5 h-2.5 fill-indigo-400" /> Ready
          </span>
        );
      case 'failed':
      case 'timed_out':
        return (
          <span className="flex items-center text-amber-400 text-xs gap-1 font-medium bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> Failed
          </span>
        );
      case 'unavailable':
      default:
        return (
          <button
            onClick={onOpenTab}
            className="flex items-center text-gray-400 hover:text-white text-xs gap-1 font-medium bg-gray-800/60 border border-gray-700/50 px-2 py-0.5 rounded-full transition-colors"
          >
            <span>Missing</span> <ExternalLink className="w-2.5 h-2.5" />
          </button>
        );
    }
  };

  return (
    <div className="flex items-center justify-between p-2.5 bg-dark-800/80 border border-gray-800 rounded-lg">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            provider.status === 'completed'
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
              : provider.status === 'sending' || provider.status === 'generating'
              ? 'bg-purple-400 animate-ping'
              : provider.status === 'ready'
              ? 'bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.5)]'
              : 'bg-gray-600'
          }`}
        />
        <span className="text-sm font-semibold text-gray-200">{provider.name}</span>
      </div>
      {getStatusBadge()}
    </div>
  );
};
