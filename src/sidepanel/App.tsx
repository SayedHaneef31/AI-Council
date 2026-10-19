import React, { useEffect, useRef, useState } from 'react';
import { useCouncilStore } from '../state/council-store';
import { PromptInput } from './components/PromptInput';
import { ProviderBadge } from './components/ProviderBadge';
import { ConsolidatedResponse } from './components/ConsolidatedResponse';
import { OriginalResponses } from './components/OriginalResponses';
import { LiveSynthesisProgress } from './components/LiveSynthesisProgress';
import { ProviderId, ConversationTurn } from '../types';
import { ExtensionMessage } from '../messaging/message-types';
import { Layers, RefreshCw, AlertCircle, User, Sparkles, PlusCircle, Zap, Code2, Cpu, ShieldCheck, ArrowUpRight } from 'lucide-react';

export const App: React.FC = () => {
  const {
    prompt,
    setPrompt,
    context,
    providers,
    turns,
    streamingResponses,
    startTurn,
    clearChat,
    updateFromPartialState,
  } = useCouncilStore();

  const [selectedProvider, setSelectedProvider] = useState<ProviderId | null>(null);
  const latestTurnRef = useRef<HTMLDivElement>(null);

  const checkStatus = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'CHECK_PROVIDER_STATUS' }, (response) => {
        if (response && response.statuses) {
          const currentStore = useCouncilStore.getState();
          updateFromPartialState({
            providers: {
              chatgpt: {
                ...currentStore.providers.chatgpt,
                status: currentStore.providers.chatgpt.pendingQuestion || currentStore.providers.chatgpt.status === 'awaiting_input'
                  ? 'awaiting_input'
                  : response.statuses.chatgpt.status,
                isFresh: response.statuses.chatgpt.isFresh,
              },
              claude: {
                ...currentStore.providers.claude,
                status: currentStore.providers.claude.pendingQuestion || currentStore.providers.claude.status === 'awaiting_input'
                  ? 'awaiting_input'
                  : response.statuses.claude.status,
                isFresh: response.statuses.claude.isFresh,
              },
              gemini: {
                ...currentStore.providers.gemini,
                status: currentStore.providers.gemini.pendingQuestion || currentStore.providers.gemini.status === 'awaiting_input'
                  ? 'awaiting_input'
                  : response.statuses.gemini.status,
                isFresh: response.statuses.gemini.isFresh,
              },
            },
          });
        }
      });
    }
  };

  useEffect(() => {
    checkStatus();

    // Notify background to verify session & automatically open new chat tabs on first launch
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'INIT_EXTENSION_SESSION' });
    }

    // Listen for runtime broadcasts
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const listener = (msg: ExtensionMessage) => {
        if (msg.type === 'COUNCIL_STATE_UPDATE') {
          updateFromPartialState(msg.state);
        } else if (msg.type === 'PROVIDER_STATUS_RESPONSE' && msg.statuses) {
          updateFromPartialState({
            providers: {
              chatgpt: { ...providers.chatgpt, status: msg.statuses.chatgpt.status, isFresh: msg.statuses.chatgpt.isFresh },
              claude: { ...providers.claude, status: msg.statuses.claude.status, isFresh: msg.statuses.claude.isFresh },
              gemini: { ...providers.gemini, status: msg.statuses.gemini.status, isFresh: msg.statuses.gemini.isFresh },
            },
          });
        }
      };
      chrome.runtime.onMessage.addListener(listener);

      // Automatic live polling every 2.5s to ensure instant detection of open/close tabs
      const timer = setInterval(() => {
        checkStatus();
      }, 2500);

      return () => {
        chrome.runtime.onMessage.removeListener(listener);
        clearInterval(timer);
      };
    }
  }, []);

  // When a new turn is added, gently bring the new question into view without aggressive bottom jumping
  useEffect(() => {
    if (turns.length > 0) {
      latestTurnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [turns.length]);

  const handleStartRun = (promptText?: string, contextText?: string) => {
    const activePrompt = promptText || prompt;
    const activeContext = contextText !== undefined ? contextText : context;
    if (!activePrompt.trim()) return;

    startTurn(activePrompt, activeContext);

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'START_COUNCIL_RUN',
        prompt: activePrompt,
        context: activeContext,
      });
    }
  };

  const handleOpenTab = (providerId: ProviderId, forceNewChat: boolean = false) => {
    const urls: Record<ProviderId, string> = {
      chatgpt: 'https://chatgpt.com',
      claude: 'https://claude.ai/new',
      gemini: 'https://gemini.google.com/app',
    };
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'OPEN_SINGLE_PROVIDER_TAB',
        provider: providerId,
        forceNewChat,
      });
    } else if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: urls[providerId], active: false });
    } else {
      window.open(urls[providerId], '_blank');
    }
  };

  const handleOpenAllTabs = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'OPEN_PROVIDER_TABS', forceNewChat: true });
    } else {
      handleOpenTab('chatgpt', true);
      handleOpenTab('claude', true);
      handleOpenTab('gemini', true);
    }
  };

  const samplePrompts = [
    {
      category: 'Architecture Trade-offs',
      title: 'Next.js App Router vs Vite SPA',
      desc: 'Evaluate performance, SSR costs, and build complexity for SaaS dashboards.',
      prompt: 'Synthesize the architectural trade-offs of Next.js App Router vs Vite SPA for a SaaS dashboard',
      icon: Code2,
    },
    {
      category: 'Distributed Systems',
      title: 'Rust vs Go for Microservices',
      desc: 'Compare concurrency, memory footprints, and developer ergonomics.',
      prompt: 'Evaluate Rust vs Go for high-throughput distributed microservices',
      icon: Cpu,
    },
    {
      category: 'Clinical Safety Vetting',
      title: 'Surgical Risks & Accreditation',
      desc: 'Cross-reference clinical vetting guidelines and international safety standards.',
      prompt: 'Compare the best clinic vetting criteria and surgical risks for hair transplants in Delhi NCR',
      icon: ShieldCheck,
    },
  ];

  // Only render turns that have been actively sent (never unsubmitted drafts)
  const activeTurns: ConversationTurn[] = turns;
  const isConversationActive = activeTurns.length > 0;
  const hasUnavailableProviders =
    providers.chatgpt.status === 'unavailable' ||
    providers.claude.status === 'unavailable' ||
    providers.gemini.status === 'unavailable';

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 md:px-10 lg:px-12 py-3.5 shadow-xs">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                AI Council <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">Workspace</span>
              </h1>
            </div>
          </div>

          {/* Model Status Indicators - only in navbar when conversation is active */}
          <div className="flex items-center gap-2.5">
            {isConversationActive && (
              <>
                {hasUnavailableProviders && (
                  <button
                    onClick={handleOpenAllTabs}
                    title="Open new chat in all 3 AI tabs"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 transition-colors shadow-xs cursor-pointer mr-1"
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Open All (1-Click)</span>
                  </button>
                )}
                <button
                  onClick={clearChat}
                  title="Start a new conversation"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shadow-xs cursor-pointer mr-1"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">New Chat</span>
                </button>
                <ProviderBadge provider={providers.chatgpt} onOpenTab={(fresh) => handleOpenTab('chatgpt', fresh)} variant="compact" />
                <ProviderBadge provider={providers.claude} onOpenTab={(fresh) => handleOpenTab('claude', fresh)} variant="compact" />
                <ProviderBadge provider={providers.gemini} onOpenTab={(fresh) => handleOpenTab('gemini', fresh)} variant="compact" />
              </>
            )}
            <button
              onClick={checkStatus}
              title="Refresh Tab Status"
              className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area - Fanned Out Across Widescreen */}
      <main className={`flex-1 px-6 md:px-10 lg:px-12 max-w-6xl w-full mx-auto flex flex-col justify-start ${isConversationActive ? 'space-y-8 pb-36 pt-6' : 'pb-16'}`}>
        {/* HERO IDLE STATE: Fanned Out, Balanced, Spacious */}
        {!isConversationActive && (
          <div className="w-full flex flex-col animate-fadeIn">
            {/* Initial 100vh Viewport Screen: Top Section + Blank Space + PromptInput docked to bottom */}
            <div className="flex flex-col min-h-[calc(100vh-4.25rem)] justify-between pt-5 md:pt-8">
              {/* Top Section: Title & AI Connection Cards */}
              <div className="space-y-5 md:space-y-7 w-full">
                {/* Title & Header */}
                <div className="text-center space-y-2.5 max-w-3xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-xs font-semibold text-emerald-800 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Multi-Model Parallel Intelligence
                  </div>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
                    AI Council Decision Workstation
                  </h2>
                  <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    Query ChatGPT &amp; Claude simultaneously across your open tabs, then synthesize a consolidated, citation-backed verdict via Gemini.
                  </p>
                </div>

                {/* Provider Connectivity Status Grid - Spans All 3 Columns */}
                <div className="space-y-3 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 w-full">
                    <ProviderBadge provider={providers.chatgpt} onOpenTab={(fresh) => handleOpenTab('chatgpt', fresh)} variant="card" />
                    <ProviderBadge provider={providers.claude} onOpenTab={(fresh) => handleOpenTab('claude', fresh)} variant="card" />
                    <ProviderBadge provider={providers.gemini} onOpenTab={(fresh) => handleOpenTab('gemini', fresh)} variant="card" />
                  </div>

                  {hasUnavailableProviders && (
                    <button
                      type="button"
                      onClick={handleOpenAllTabs}
                      className="w-full py-2.5 px-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs hover:shadow-sm cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-emerald-600" />
                      <span>Open All AI Tabs in Background (1-Click)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Generous blank space pushing the input field exactly to the bottom edge */}
              <div className="flex-1 min-h-[36px]" />

              {/* Top part of Unified White Card: Docked flush to the bottom edge of initial viewport */}
              <div className="w-full bg-white border-t border-x border-slate-200/90 rounded-t-2xl p-5 md:p-6 shadow-sm">
                <PromptInput onSubmitPrompt={handleStartRun} />
              </div>
            </div>

            {/* Bottom part of Unified White Card: Starts right at the divider, strictly below the initial fold */}
            <div className="w-full bg-white border-b border-x border-slate-200/90 rounded-b-2xl shadow-sm mb-16 overflow-hidden">
              <div className="p-5 md:p-6 pt-5 border-t border-slate-100 bg-slate-50/30 space-y-3.5">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 px-0.5">
                  <span>Suggested Council Inquiries</span>
                  <span className="text-[10px] font-normal normal-case text-slate-400">Click any card to load query</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 w-full">
                  {samplePrompts.map((sp, idx) => {
                    const IconComp = sp.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPrompt(sp.prompt)}
                        className="group text-left p-4 rounded-xl bg-white hover:bg-emerald-50/50 border border-slate-200/80 hover:border-emerald-200 transition-all duration-200 shadow-xs hover:shadow-sm flex flex-col justify-between cursor-pointer space-y-2.5"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 group-hover:text-emerald-700 group-hover:border-emerald-200 transition-colors">
                            <IconComp className="w-3 h-3 text-emerald-600" />
                            {sp.category}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 transition-colors line-clamp-1">
                            {sp.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {sp.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE MULTI-TURN CONVERSATION FEED */}
        {isConversationActive && (
          <div className="space-y-8 flex-1">
            {activeTurns.map((turn, index) => (
              <div
                key={turn.id || index}
                ref={index === activeTurns.length - 1 ? latestTurnRef : undefined}
                className="space-y-5 animate-fadeIn border-b border-slate-200 pb-8 last:border-b-0"
              >
                {/* User Prompt Message */}
                <div className="flex items-start justify-end gap-3">
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl rounded-tr-sm p-5 max-w-3xl shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs text-emerald-800 font-bold mb-1">
                      <span>YOU</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {new Date(turn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">{turn.userPrompt}</p>
                    {turn.userContext && (
                      <div className="mt-2 pt-2 border-t border-emerald-200/60 text-xs text-slate-600 italic">
                        Constraints: {turn.userContext}
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-800 shadow-xs">
                    <User className="w-5 h-5" />
                  </div>
                </div>

                {/* Turn In-Progress Multi-Model Live Progress Radar */}
                {(turn.runStatus === 'running' || turn.runStatus === 'synthesizing') && (
                  <LiveSynthesisProgress
                    runStatus={turn.runStatus}
                    providers={providers}
                    streamingResponses={turn.streamingResponses || streamingResponses}
                  />
                )}

                {/* Turn Error Message */}
                {turn.error && (
                  <div className="flex items-center gap-3 p-5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 shadow-xs">
                    <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
                    <span>{turn.error}</span>
                  </div>
                )}

                {/* Consolidated Council Response & Model Evidence */}
                {turn.synthesis && (
                  <div className="space-y-6">
                    <ConsolidatedResponse
                      synthesis={turn.synthesis}
                      onSelectProvider={(p) => setSelectedProvider(p)}
                    />
                    <OriginalResponses
                      responses={turn.modelResponses}
                      selectedProvider={selectedProvider}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modern Floating Bottom Chat Input Bar */}
      {isConversationActive && (
        <footer className="sticky bottom-0 bg-gradient-to-t from-slate-50 via-slate-50/95 to-slate-50/60 backdrop-blur-sm p-4 md:pb-6 z-20">
          <div className="max-w-5xl w-full mx-auto space-y-2">
            <PromptInput onSubmitPrompt={handleStartRun} isFollowUp={true} />
            <div className="flex items-center justify-between px-3 text-[11px] text-slate-400">
              <span>Parallel query across ChatGPT &amp; Claude • Synthesized via Gemini</span>
              <button
                type="button"
                onClick={clearChat}
                className="text-slate-500 hover:text-slate-800 font-semibold transition-colors hover:underline cursor-pointer"
              >
                + New conversation
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
