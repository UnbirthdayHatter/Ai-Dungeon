import { useEffect, useMemo, useState } from 'react';
import { useStore, Sheet } from '@/store/useStore';
import { Wand2, Download, Upload, Plus, User, Sparkles, Loader2, Radio, BookOpen, Shield, Users } from 'lucide-react';

type SetupTarget = {
  key: string;
  id: string;
  kind: 'saved' | 'live';
  label: string;
  subtitle: string;
  disabled?: boolean;
};

export function SetupAdventure() {
  const {
    newRoleplay,
    setSystemRules,
    setContextAndRules,
    setMood,
    mood,
    savedCharacters,
    addCharacterToAdventure,
    addSheet,
    saveRoleplay,
    currentRoleplayName,
    currentRoleplayId,
    activeSheetId,
    sheets,
    sessionSheets,
    setActiveTab,
    setActiveSheet,
    apiKey,
    provider,
    apiKeys,
    savedRoleplays,
    userRoleplays,
    joinedRoleplays,
    loadRoleplay,
    setCurrentRoleplayId,
    isLive,
    isHost,
    applyAdventureSetup,
  } = useStore();

  const [context, setContext] = useState('');
  const [adventureType, setAdventureType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCharacterPopup, setShowCharacterPopup] = useState(false);
  const [selectedTargetKey, setSelectedTargetKey] = useState<string>('');

  const setupTargets = useMemo<SetupTarget[]>(() => {
    const soloTargets = savedRoleplays
      .filter((rp: any) => !rp.archived && !rp.promotedToRoleplayId)
      .map((rp) => ({
        key: `saved:${rp.id}`,
        id: rp.id,
        kind: 'saved' as const,
        label: rp.name,
        subtitle: 'Solo adventure',
      }));

    const hostedTargets = userRoleplays
      .filter((rp) => !rp.archived)
      .map((rp) => ({
        key: `live:${rp.id}`,
        id: rp.id,
        kind: 'live' as const,
        label: rp.name,
        subtitle: 'Hosted multiplayer session',
      }));

    const joinedTargets = joinedRoleplays
      .filter((rp) => !rp.archived)
      .map((rp) => ({
        key: `live:${rp.id}`,
        id: rp.id,
        kind: 'live' as const,
        label: rp.name,
        subtitle: 'Joined multiplayer session',
        disabled: true,
      }));

    return [...hostedTargets, ...joinedTargets, ...soloTargets];
  }, [joinedRoleplays, savedRoleplays, userRoleplays]);

  useEffect(() => {
    if (currentRoleplayId) {
      setSelectedTargetKey(`${isLive ? 'live' : 'saved'}:${currentRoleplayId}`);
    } else if (!selectedTargetKey && setupTargets.length > 0) {
      setSelectedTargetKey(setupTargets[0].key);
    }
  }, [currentRoleplayId, isLive, selectedTargetKey, setupTargets]);

  const selectedTarget = setupTargets.find((target) => target.key === selectedTargetKey) || null;
  const canGenerate = !isGenerating && (!isLive || isHost);
  const activeCharacterPool = isLive ? sessionSheets : sheets;
  const activeCharacter = activeCharacterPool.find((sheet) => sheet.id === activeSheetId) || activeCharacterPool[0] || null;
  const targetStatusLabel = selectedTarget?.disabled
    ? 'Read-only joined multiplayer'
    : selectedTarget?.kind === 'live'
      ? 'Hosted multiplayer'
      : 'Solo save';
  const targetStatusTone = selectedTarget?.disabled
    ? 'text-zinc-400 border-zinc-700 bg-zinc-800/60'
    : selectedTarget?.kind === 'live'
      ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
      : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';

  const switchTarget = (targetKey: string) => {
    setSelectedTargetKey(targetKey);
    const target = setupTargets.find((item) => item.key === targetKey);
    if (!target || target.disabled) return;
    if (target.kind === 'saved') {
      loadRoleplay(target.id);
    } else {
      setCurrentRoleplayId(target.id);
    }
  };

  const handleCreateTarget = async (multiplayer: boolean) => {
    await newRoleplay(multiplayer);
  };

  const handleGenerate = async () => {
    if (!selectedTarget) {
      alert('Select an adventure target before generating a campaign.');
      return;
    }
    if (selectedTarget.kind === 'live' && !isHost) {
      alert('Only the host can run setup for a multiplayer session.');
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `Generate a Blades in the Dark campaign based on the following:
      Mood/Tone: ${mood}
      Context/Rules: ${context}
      Adventure Type: ${adventureType}
      
      Return as JSON: { "setting": "...", "plotHook": "...", "initialScene": "..." }`;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: apiKeys[provider] || (provider === 'gemini' ? apiKeys.gemini || apiKey || undefined : apiKey || undefined),
          systemPrompt: 'You generate concise RPG campaign setup JSON only.',
          messages: [{ role: 'user', content: prompt }],
          responseMimeType: 'application/json',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.text) {
        throw new Error(data?.error?.message || 'Failed to generate adventure.');
      }

      const generated = JSON.parse(data.text || '{}');
      const nextSystemRules = `Setting: ${generated.setting}\n\nPlot Hook: ${generated.plotHook}`;
      const nextContextAndRules = `Initial Scene: ${generated.initialScene}`;
      const nextMessages = [
        {
          role: 'assistant' as const,
          content: `Adventure generated: ${generated.setting}\n\n${generated.plotHook}\n\n${generated.initialScene}`,
        },
        {
          role: 'assistant' as const,
          content: 'The adventure is online and ready. The crew stands at the edge of the opening scene, with the pressure of the job already beginning to close in.',
        },
      ];

      setSystemRules(nextSystemRules);
      setContextAndRules(nextContextAndRules);
      await applyAdventureSetup({
        systemRules: nextSystemRules,
        contextAndRules: nextContextAndRules,
        mood,
        messages: nextMessages,
      });
      setActiveTab('chat');
    } catch (e) {
      console.error(e);
      alert('Failed to generate adventure.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewCharacter = () => {
    const newSheet: Sheet = {
      id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      type: 'bitd',
      name: 'New Character',
      bitd: {
        playbook: '',
        crew: '',
        alias: '',
        look: '',
        heritage: '',
        background: '',
        vice: '',
        stress: 0,
        trauma: [],
        harm: { light1: '', light2: '', medium1: '', medium2: '', severe: '', fatal: '' },
        healingClock: 0,
        armor: false,
        heavyArmor: false,
        specialArmor: false,
        coin: 0,
        stash: 0,
        playbookXp: 0,
        insightXp: 0,
        prowessXp: 0,
        resolveXp: 0,
        actions: { hunt: 0, study: 0, survey: 0, tinker: 0, finesse: 0, prowl: 0, skirmish: 0, wreck: 0, attune: 0, command: 0, consort: 0, sway: 0 },
        specialAbilities: '',
        friends: '',
        items: '',
        load: 'normal',
      },
      level: 1,
      hp: 10,
      maxHp: 10,
      ac: 10,
      proficiencies: [],
    };
    addSheet(newSheet);
    setActiveSheet(newSheet.id);
    setActiveTab('character');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-8 pt-20 md:pt-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
          <div className="w-12 h-12 bg-indigo-900/30 border border-indigo-500/30 rounded-xl flex items-center justify-center">
            <Wand2 className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-3xl font-serif font-bold text-zinc-100">Setup Adventure</h2>
            <p className="text-zinc-500 mt-1">Pick a target adventure, then generate or revise its opening setup in one place.</p>
          </div>
        </div>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-zinc-100 font-bold uppercase tracking-wider text-sm">
            <BookOpen className="w-4 h-4 text-amber-500" />
            Setup Target
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Adventure to Configure</label>
              <select
                value={selectedTargetKey}
                onChange={(e) => switchTarget(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100"
              >
                {setupTargets.length === 0 && <option value="">No adventures yet</option>}
                {setupTargets.map((target) => (
                  <option key={target.key} value={target.key}>
                    {target.label} - {target.subtitle}{target.disabled ? ' (view only)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500">
                {selectedTarget
                  ? `${selectedTarget.label} is the current setup target. ${selectedTarget.kind === 'live' ? 'Changes apply to the live multiplayer session.' : 'Changes apply to the solo save.'}`
                  : 'Create or select an adventure target to begin.'}
              </p>
              {selectedTarget?.disabled && (
                <p className="text-xs text-amber-500">
                  Joined multiplayer sessions are view-only here. Switch to a hosted session or a solo save to apply setup changes.
                </p>
              )}
            </div>
            <div className="flex md:flex-col gap-2">
              <button
                onClick={() => handleCreateTarget(false)}
                className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Solo
              </button>
              <button
                onClick={() => handleCreateTarget(true)}
                className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Radio className="w-4 h-4" />
                New Multiplayer
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {selectedTarget?.kind === 'live' ? <Users className="w-4 h-4 text-amber-500" /> : <BookOpen className="w-4 h-4 text-emerald-500" />}
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Current Target</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${targetStatusTone}`}>
                  {targetStatusLabel}
                </span>
              </div>
              <div>
                <p className="text-lg font-bold text-zinc-100">{selectedTarget?.label || currentRoleplayName || 'No adventure selected'}</p>
                <p className="text-sm text-zinc-500 mt-1">
                  {selectedTarget?.disabled
                    ? 'You can inspect setup here, but only the host can overwrite this live session.'
                    : selectedTarget?.kind === 'live'
                      ? 'Generated setup will replace the opening state of this multiplayer session for everyone in it.'
                      : 'Generated setup will replace the opening state of this solo save.'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Character</p>
              </div>
              {activeCharacter ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center">
                    {activeCharacter.avatarUrl ? (
                      <img src={activeCharacter.avatarUrl} alt={activeCharacter.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-zinc-100">{activeCharacter.name || 'Unnamed Character'}</p>
                    <p className="text-sm text-zinc-500">
                      {activeCharacter.bitd?.playbook || activeCharacter.charClass || activeCharacter.type?.toUpperCase() || 'Character sheet ready'}
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">
                      {isLive ? 'This is the currently active attached character for the live session.' : 'This character will be the easiest one to keep in focus while setting up the adventure.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-5 text-sm text-zinc-500">
                  No active character selected yet. Create one or attach an existing sheet before you start the adventure.
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Mood / Tone (Optional)</label>
            <input
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100"
              placeholder="e.g., smoky desperation, tense intrigue, bitter victory"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Context and Rules (Optional)</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 h-32"
              placeholder="e.g., The crew owes a powerful patron, supernatural horror stays subtle, the city is in lockdown..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Character for this Adventure</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleNewCharacter}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-indigo-500 transition-colors"
              >
                <Plus className="w-8 h-8 text-zinc-500" />
                <span className="font-medium text-zinc-100">New Character</span>
                <span className="text-xs text-zinc-500">Create a fresh sheet</span>
              </button>
              <button
                onClick={() => setShowCharacterPopup(true)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-indigo-500 transition-colors"
              >
                <User className="w-8 h-8 text-zinc-500" />
                <span className="font-medium text-zinc-100">Existing Character</span>
                <span className="text-xs text-zinc-500">Select from saved</span>
              </button>
            </div>
          </div>

          {showCharacterPopup && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4">
                <h3 className="text-xl font-bold text-zinc-100">Select Character</h3>
                <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                  {savedCharacters.map((char) => (
                    <button
                      key={char.id}
                      onClick={() => {
                        addCharacterToAdventure(char.id);
                        setShowCharacterPopup(false);
                      }}
                      className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left text-zinc-100"
                    >
                      {char.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowCharacterPopup(false)}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">What kind of adventure are you looking for?</label>
            <textarea
              value={adventureType}
              onChange={(e) => setAdventureType(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 h-32"
              placeholder="e.g., A desperate occult heist in a district under quarantine, or a gang war where every ally comes with strings attached..."
            />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => saveRoleplay(currentRoleplayName || 'New Adventure')}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
            >
              Save Snapshot
            </button>
            <button className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors">
              <Download className="w-5 h-5" />
            </button>
            <button className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors">
              <Upload className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!canGenerate || !selectedTarget}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isGenerating ? 'Generating...' : `Generate Into ${selectedTarget?.label || 'Selected Adventure'}`}
          </button>

          <p className="text-center text-xs text-zinc-500">
            This replaces the selected adventure&apos;s opening setup, rules text, lorebook, and chat history with the newly generated campaign.
          </p>
        </div>
      </div>
    </div>
  );
}
