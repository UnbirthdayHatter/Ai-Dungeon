import { BookOpen, Settings, Shield, MessageSquare, Dices, Menu, X, Wand2, FolderOpen, Play, Pause, Volume2, VolumeX, RotateCcw, Music, Users, Map, ChevronDown, ChevronRight, History, Globe, Pencil, Check, Plus } from 'lucide-react';
import { speak } from '@/lib/audio';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useStore, TabType } from '@/store/useStore';
import { THEME_CLASSES } from '@/constants';
import { auth, db, doc, deleteDoc } from '@/firebase';

type Tab = 'chat' | 'character' | 'lorebook' | 'settings' | 'setup' | 'roleplays';

interface SidebarProps {
  activeTab: TabType;
}

export function Sidebar({ activeTab }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedTabs, setExpandedTabs] = useState<Record<string, boolean>>({ chat: true, multiplayer: true });
  const [isAudioExpanded, setIsAudioExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const { 
    ambientAudioUrl, 
    isAudioPlaying, 
    setIsAudioPlaying, 
    audioVolume, 
    setAudioVolume,
    setAmbientAudioUrl,
    isAudioLoading,
    setActiveTab,
    apiKeys,
    apiKey,
    ttsEnabled,
    setTtsEnabled,
    ttsVolume,
    setTtsVolume,
    selectedVoice,
    setSelectedVoice,
    ttsProvider,
    setTtsProvider,
    theme,
    savedRoleplays,
    userRoleplays,
    joinedRoleplays,
    setCurrentRoleplayId,
    loadRoleplay,
    hostSavedRoleplay,
    deleteRoleplay,
    archiveRoleplay,
    renameRoleplay,
    newRoleplay,
    currentRoleplayId,
    kokoroUrl
  } = useStore();
  const themeClasses = THEME_CLASSES[theme] || THEME_CLASSES.classic;

  const tabs = [
    { id: 'chat', icon: MessageSquare, label: 'Adventure' },
    { id: 'character', icon: Shield, label: 'Character' },
    { id: 'lorebook', icon: BookOpen, label: 'Lorebook' },
    { id: 'map', icon: Map, label: 'World Map' },
    { id: 'setup', icon: Wand2, label: 'Setup' },
    { id: 'multiplayer', icon: Users, label: 'Multiplayer' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ] as const;

  const sortedSaved = Array.from(new globalThis.Map((savedRoleplays as Array<{ id: string; name: string; archived?: boolean; updatedAt?: number }>).map(rp => [rp.id, rp])).values())
    .filter(rp => !rp.archived && !(rp as any).promotedToRoleplayId)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    
  const sortedMultiplayer = Array.from(new globalThis.Map(([...userRoleplays, ...joinedRoleplays] as Array<{ id: string; name: string; archived?: boolean; updatedAt?: number }>).map(rp => [rp.id, rp])).values())
    .filter(rp => !rp.archived)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200"
      >
        <Menu className="w-5 h-5" />
      </button>

      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-64 border-r flex flex-col h-full transition-transform duration-300 ease-in-out",
        themeClasses.sidebar,
        themeClasses.border,
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className={cn("text-2xl font-serif font-bold flex items-center gap-2", themeClasses.accent)}>
              <Dices className="w-6 h-6" />
              AI Dungeon
            </h1>
            <p className={cn("text-xs mt-1 uppercase tracking-wider", themeClasses.muted)}>DeepSeek Powered</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className={cn("md:hidden p-2 transition-colors", themeClasses.muted, themeClasses.hover.replace('hover:', 'hover:'))}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 md:mt-0 overflow-y-auto overflow-x-hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isExpandable = tab.id === 'chat' || tab.id === 'multiplayer';
            const isExpanded = expandedTabs[tab.id];
            const subItems = tab.id === 'chat' ? sortedSaved : (tab.id === 'multiplayer' ? sortedMultiplayer : []);

            return (
              <div key={tab.id} className="space-y-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'flex-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                      isActive
                        ? cn(themeClasses.navActive, 'font-medium')
                        : cn(themeClasses.muted, themeClasses.navHover)
                    )}
                  >
                    <Icon className={cn('w-5 h-5', isActive ? themeClasses.accent : themeClasses.muted)} />
                    <span className="flex-1 text-left">{tab.label}</span>
                  </button>
                  {isExpandable && (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          newRoleplay(tab.id === 'multiplayer');
                          setActiveTab('chat');
                        }}
                        className={cn("p-2 rounded-lg transition-colors hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200")}
                        title={tab.id === 'multiplayer' ? "New Multiplayer Adventure" : "New Solo Adventure"}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      {subItems.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedTabs(prev => ({ ...prev, [tab.id]: !prev[tab.id] }));
                          }}
                          className={cn("p-2 rounded-lg transition-colors", themeClasses.muted, themeClasses.navHover)}
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {isExpandable && isExpanded && subItems.length > 0 && (
                  <div className={cn("ml-9 space-y-0.5 border-l pl-2 max-h-[400px] overflow-y-auto overflow-x-hidden custom-scrollbar", themeClasses.border)}>
                    {subItems.map((item) => {
                      const isMultiplayerTab = tab.id === 'multiplayer';
                      const isOwned = !isMultiplayerTab || userRoleplays.some(r => r.id === item.id);
                      const isCurrent = currentRoleplayId === item.id;
                      
                      return (
                        <div key={item.id} className="group relative min-w-0 pr-2">
                          {editingId === item.id ? (
                            <div className="flex-1 flex items-center gap-1 px-2 py-1">
                              <input
                                autoFocus
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    renameRoleplay(item.id, editName);
                                    setEditingId(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingId(null);
                                  }
                                }}
                                className={cn("flex-1 bg-zinc-800 text-[10px] px-2 py-0.5 rounded border border-zinc-700 outline-none", themeClasses.accent)}
                              />
                              <button
                                onClick={() => {
                                  renameRoleplay(item.id, editName);
                                  setEditingId(null);
                                }}
                                className="p-1 text-green-500 hover:text-green-400"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  if (isMultiplayerTab) {
                                    setCurrentRoleplayId(item.id);
                                    setActiveTab('chat'); // User requested to show chat not multiplayer page
                                  } else {
                                    loadRoleplay(item.id);
                                    setActiveTab('chat');
                                  }
                                  setIsOpen(false);
                                }}
                                className={cn(
                                  "flex w-full min-w-0 items-center gap-2 px-3 py-1 pr-16 text-[10px] rounded-lg transition-all",
                                  isCurrent 
                                    ? themeClasses.navActive
                                    : cn(themeClasses.muted, themeClasses.navHover)
                                )}
                              >
                                <History className={cn("w-2.5 h-2.5", isCurrent ? themeClasses.accent : themeClasses.muted)} />
                                <span className="truncate flex-1 text-left">{item.name}</span>
                              </button>
                            </>
                          )}

                          {editingId !== item.id && (
                            <div className="absolute inset-y-0 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                              {isOwned && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(item.id);
                                    setEditName(item.name);
                                  }}
                                  className={cn("p-1 transition-all", themeClasses.muted, themeClasses.hover.replace('hover:', 'hover:'))}
                                  title="Rename"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Archive "${item.name}"? It will be moved to the Lorebook Archive.`)) {
                                    archiveRoleplay(item.id, true);
                                  }
                                }}
                                className={cn("p-1 transition-all", themeClasses.muted, themeClasses.hover.replace('hover:', 'hover:'))}
                                title="Archive Adventure"
                              >
                                <FolderOpen className="w-3 h-3" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                                    deleteRoleplay(item.id);
                                  }
                                }}
                                className="p-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg border border-red-500/20 transition-all"
                                title="Delete"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        
        {/* Audio & Voice Controls */}
        <div className={cn("mx-4 mb-4 p-3 rounded-xl border", themeClasses.sidebar, themeClasses.border)}>
          <button 
            onClick={() => setIsAudioExpanded(!isAudioExpanded)}
            className="w-full flex items-center justify-between mb-2 group"
          >
            <div className="flex items-center gap-2">
              <Volume2 className={cn("w-4 h-4 transition-colors", themeClasses.muted, "group-hover:" + themeClasses.primary)} />
              <span className={cn("text-xs font-bold uppercase tracking-widest", themeClasses.muted)}>Audio Settings</span>
            </div>
            <ChevronDown className={cn("w-4 h-4 transition-transform", themeClasses.muted, isAudioExpanded && "rotate-180")} />
          </button>

          {isAudioExpanded && (
            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Ambient Audio Player */}
              {ambientAudioUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className={cn(
                        "p-1.5 rounded-lg",
                        isAudioPlaying ? themeClasses.navActive : "bg-zinc-700 text-zinc-500"
                      )}>
                        <Music className={cn("w-3.5 h-3.5", isAudioLoading && "animate-pulse")} />
                      </div>
                      <span className={cn("text-[10px] font-medium truncate uppercase tracking-tighter", themeClasses.muted)}>
                        {isAudioLoading ? 'Loading Audio...' : 'Ambient Audio'}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const currentUrl = ambientAudioUrl;
                        setAmbientAudioUrl('');
                        setTimeout(() => setAmbientAudioUrl(currentUrl || ''), 100);
                      }}
                      className={cn("p-1 transition-colors", themeClasses.muted, themeClasses.hover.replace('hover:', 'hover:'))}
                      title="Refresh Audio"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsAudioPlaying(!isAudioPlaying)}
                      className={cn("p-2 rounded-lg transition-colors", themeClasses.button)}
                    >
                      {isAudioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>

                    <div className="flex-1 flex items-center gap-2 px-2">
                      <button
                        onClick={() => setAudioVolume(audioVolume === 0 ? 0.5 : 0)}
                        className={cn("transition-colors", themeClasses.muted, themeClasses.hover.replace('hover:', 'hover:'))}
                      >
                        {audioVolume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={audioVolume}
                        onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                        className={cn("flex-1 h-1 rounded-lg appearance-none cursor-pointer", themeClasses.bg.replace('bg-', 'accent-'))}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-2 opacity-50">
                  <Music className={cn("w-3.5 h-3.5", themeClasses.muted)} />
                  <span className={cn("text-[10px] font-medium uppercase tracking-tighter", themeClasses.muted)}>No Ambient Audio</span>
                </div>
              )}
              
              {/* TTS Controls */}
              <div className={cn("pt-4 border-t", themeClasses.border)}>
                <div className="flex items-center justify-between mb-4">
                  <span className={cn("text-xs font-medium uppercase tracking-tighter", themeClasses.muted)}>
                    Narrate All AI Replies
                  </span>
                  <button
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className={cn("w-8 h-4 rounded-full transition-colors relative", ttsEnabled ? themeClasses.bg : 'bg-zinc-700')}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                      ttsEnabled ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className={cn("text-xs font-medium uppercase tracking-tighter", themeClasses.muted)}>
                    Test AI Voice
                  </span>
                  <button
                    onClick={async () => {
                      const key = ttsProvider === 'gemini' 
                        ? (apiKeys.gemini || apiKey || process.env.GEMINI_API_KEY || '')
                        : ttsProvider === 'openai' ? (apiKeys.openai || '') : 'kokoro-internal';
                        
                      if (!key && ttsProvider !== 'kokoro') {
                        alert(`${ttsProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API key is required for TTS. Please configure it in Settings.`);
                        return;
                      }
                      await speak({
                        text: "Greetings, adventurer. The voice synthesis system is currently operational.",
                        apiKey: key,
                        voice: selectedVoice,
                        volume: ttsVolume,
                        provider: ttsProvider,
                        kokoroUrl: ttsProvider === 'kokoro' ? kokoroUrl : undefined,
                        onError: (err) => alert(`TTS failed: ${err.message || 'Unknown error'}`)
                      });
                    }}
                    className={cn("p-1 rounded transition-colors", themeClasses.muted, themeClasses.navHover)}
                    title="Click to test AI voice"
                  >
                    <Volume2 size={14} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className={cn("text-[10px] font-bold uppercase tracking-widest", themeClasses.muted)}>Provider</label>
                      <div className="flex gap-1">
                        {['gemini', 'openai', 'kokoro'].map((p) => (
                          <button
                            key={p}
                            onClick={() => {
                              setTtsProvider(p as any);
                              if (p === 'gemini') setSelectedVoice('Kore');
                              else if (p === 'openai') setSelectedVoice('alloy');
                              else setSelectedVoice('af_heart');
                            }}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[8px] font-bold capitalize border transition-all",
                              ttsProvider === p 
                                ? themeClasses.navActive + " " + themeClasses.border
                                : cn(themeClasses.sidebar, themeClasses.border, themeClasses.muted, themeClasses.navHover)
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <select
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className={cn("w-full border rounded-lg px-2 py-2 text-xs focus:outline-none transition-all", themeClasses.input)}
                    >
                      {ttsProvider === 'gemini' ? (
                        <>
                          <option value="Kore">Kore (Balanced)</option>
                          <option value="Fenrir">Fenrir (Deep/Gravelly)</option>
                          <option value="Puck">Puck (Energetic/Light)</option>
                          <option value="Charon">Charon (Mysterious/Slow)</option>
                          <option value="Zephyr">Zephyr (Soft/Whispery)</option>
                        </>
                      ) : ttsProvider === 'openai' ? (
                        <>
                          <option value="alloy">Alloy (Neutral)</option>
                          <option value="echo">Echo (Warm)</option>
                          <option value="fable">Fable (Narrative)</option>
                          <option value="onyx">Onyx (Deep)</option>
                          <option value="nova">Nova (Bright)</option>
                          <option value="shimmer">Shimmer (Soft)</option>
                        </>
                      ) : (
                        <>
                          <option value="af_heart">Heart (Female)</option>
                          <option value="af_bella">Bella (Female)</option>
                          <option value="af_nicole">Nicole (Female)</option>
                          <option value="af_sky">Sky (Female)</option>
                          <option value="am_adam">Adam (Male)</option>
                          <option value="am_michael">Michael (Male)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className={cn("text-[10px] font-bold uppercase tracking-widest", themeClasses.muted)}>Voice Volume</label>
                      <span className={cn("text-[10px] font-mono", themeClasses.muted)}>{Math.round(ttsVolume * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Volume2 className={cn("w-3.5 h-3.5", themeClasses.muted)} />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={ttsVolume}
                        onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                        className={cn("flex-1 h-1.5 rounded-lg appearance-none cursor-pointer", themeClasses.bg.replace('bg-', 'accent-'))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className={cn("p-4 text-xs text-center border-t", themeClasses.muted, themeClasses.border)}>
          Roleplay Assistant v1.0
        </div>
      </div>
    </>
  );
}
