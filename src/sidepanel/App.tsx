import React, { useEffect } from 'react';
import { useCouncilStore } from '../state/council-store';
import { PromptInput } from './components/PromptInput';
import { ProviderBadge } from './components/ProviderBadge';
import { CouncilVerdict } from './components/CouncilVerdict';
import { OriginalResponses } from './components/OriginalResponses';
import { ProviderId } from '../types';
import { ExtensionMessage } from '../messaging/message-types';
import { Layers, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const { prompt, context, runStatus, providers, synthesis, error, updateFromPartialState, reset } = useCouncilStore();

  const checkStatus = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'CHECK_PROVIDER_STATUS' }, (response) => {
        if (response && response.statuses) {
          updateFromPartialState({
            providers: {
              chatgpt: { ...providers.chatgpt, status: response.statuses.chatgpt.status },
              claude: { ...providers.claude, status: response.statuses.claude.status },
              gemini: { ...providers.gemini, status: response.statuses.gemini.status },
            },
          });
        }
      });
    }
  };

  useEffect(() => {
    checkStatus();

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const listener = (msg: ExtensionMessage) => {
        if (msg.type === 'COUNCIL_STATE_UPDATE') {
          updateFromPartialState(msg.state);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => {
        chrome.runtime.onMessage.removeListener(listener);
      };
    }
  }, []);

  const handleStartRun = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'START_COUNCIL_RUN',
        prompt,
        context,
      });
    }
  };

  const handleOpenTab = (providerId: ProviderId) => {
    const urls: Record<ProviderId, string> = {
      chatgpt: 'https://chatgpt.com',
      claude: 'https://claude.ai',
      gemini: 'https://gemini.google.com',
    };
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: urls[providerId] });
    } else {
      window.open(urls[providerId], '_blank');
    }
  };

  const modelResponses = {
    chatgpt: providers.chatgpt.response,
    claude: providers.claude.response,
    gemini: providers.gemini.response,
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 p-4 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-slate-100 flex items-center gap-2">
              AI Council <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-900 text-emerald-400 border border-slate-800 rounded">v0.1</span>
            </h1>
            <p className="text-[11px] text-slate-400">Multi-AI Decision Orchestrator</p>
          </div>
        </div>
        <button
          onClick={checkStatus}
          title="Refresh Tab Status"
          className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-md transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Provider Readiness */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Models</span>
          <span className="text-[10px] text-slate-500">Authenticated tabs</span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <ProviderBadge provider={providers.chatgpt} onOpenTab={() => handleOpenTab('chatgpt')} />
          <ProviderBadge provider={providers.claude} onOpenTab={() => handleOpenTab('claude')} />
          <ProviderBadge provider={providers.gemini} onOpenTab={() => handleOpenTab('gemini')} />
        </div>
      </section>

      {/* Prompt Form */}
      <section>
        <PromptInput onSubmit={handleStartRun} />
      </section>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Progress Indicator */}
      {(runStatus === 'running' || runStatus === 'synthesizing') && (
        <div className="flex items-center justify-center p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg gap-2.5 text-xs text-sky-400">
          <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
          <span>
            {runStatus === 'running'
              ? 'Dispatching prompt to ChatGPT & Claude tabs...'
              : 'Synthesizing verdict & disagreements via Gemini...'}
          </span>
        </div>
      )}

      {/* Verdict Output */}
      {synthesis && <CouncilVerdict synthesis={synthesis} />}

      {/* Raw Responses Drawer */}
      <OriginalResponses responses={modelResponses} />

      {/* Reset */}
      {runStatus === 'completed' && (
        <button
          onClick={reset}
          className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-lg border border-slate-800 transition-colors"
        >
          New Decision Query
        </button>
      )}
    </div>
  );
};

export default App;
