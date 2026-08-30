import React, { useEffect } from 'react';
import { useCouncilStore } from '../state/council-store';
import { PromptInput } from './components/PromptInput';
import { ProviderBadge } from './components/ProviderBadge';
import { CouncilVerdict } from './components/CouncilVerdict';
import { OriginalResponses } from './components/OriginalResponses';
import { ProviderId } from '../types';
import { ExtensionMessage } from '../messaging/message-types';
import { Crown, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

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
    <div className="flex flex-col min-h-screen bg-dark-900 text-gray-100 p-4 space-y-4 max-w-lg mx-auto">
      <header className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-900/30">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              AI Council <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-purple-950 text-purple-300 border border-purple-800/60 rounded">v0.1</span>
            </h1>
            <p className="text-xs text-gray-400">Multi-Model Decision Support Layer</p>
          </div>
        </div>
        <button
          onClick={checkStatus}
          title="Refresh Tab Status"
          className="p-2 text-gray-400 hover:text-white bg-dark-800 hover:bg-dark-700 border border-gray-800 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      <section className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Council Members</span>
          <span className="text-[11px] text-gray-500">Requires logged-in browser tabs</span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <ProviderBadge provider={providers.chatgpt} onOpenTab={() => handleOpenTab('chatgpt')} />
          <ProviderBadge provider={providers.claude} onOpenTab={() => handleOpenTab('claude')} />
          <ProviderBadge provider={providers.gemini} onOpenTab={() => handleOpenTab('gemini')} />
        </div>
      </section>

      <section>
        <PromptInput onSubmit={handleStartRun} />
      </section>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-300 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {(runStatus === 'running' || runStatus === 'synthesizing') && (
        <div className="flex items-center justify-center p-4 bg-dark-800/40 border border-gray-800/80 rounded-2xl gap-3 text-xs text-purple-300 animate-pulse">
          <Sparkles className="w-4 h-4 animate-spin text-purple-400" />
          <span>
            {runStatus === 'running'
              ? 'Collecting reasoning from ChatGPT & Claude...'
              : 'Gemini is synthesizing cross-model consensus & disagreements...'}
          </span>
        </div>
      )}

      {synthesis && <CouncilVerdict synthesis={synthesis} />}

      <OriginalResponses responses={modelResponses} />

      {runStatus === 'completed' && (
        <button
          onClick={reset}
          className="w-full py-2 bg-dark-800 hover:bg-dark-700 text-gray-400 hover:text-white text-xs font-medium rounded-xl border border-gray-800 transition-colors"
        >
          New Council Decision
        </button>
      )}
    </div>
  );
};

export default App;
