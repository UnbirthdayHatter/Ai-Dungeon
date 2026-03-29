import { useStore, ProviderType, ThemeType, AiRulesPreset } from '@/store/useStore';
import { THEME_CLASSES } from '@/constants';
import { cn } from '@/lib/utils';
import { auth } from '@/firebase';
import { 
  Key, 
  Settings as SettingsIcon, 
  Trash2, 
  Save, 
  Plus, 
  Upload, 
  Download, 
  Image as ImageIcon, 
  Music, 
  Palette,
  PlayCircle,
  Dices,
  Mic,
  Volume2,
  UserPlus,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { useState, useRef } from 'react';

const THEMES: { id: ThemeType; name: string; color: string }[] = [
  { id: 'classic', name: 'Classic (Amber)', color: 'bg-amber-500' },
  { id: 'forest', name: 'Forest (Emerald)', color: 'bg-emerald-500' },
  { id: 'blood', name: 'Blood (Red)', color: 'bg-red-600' },
  { id: 'arcane', name: 'Arcane (Indigo)', color: 'bg-indigo-500' },
  { id: 'parchment', name: 'Parchment (Sepia)', color: 'bg-orange-200' },
  { id: 'midnight', name: 'Midnight (Blue)', color: 'bg-blue-600' },
  { id: 'sepia', name: 'Antique Sepia', color: 'bg-[#8d6e63]' },
];

const AI_RULESET_OPTIONS: Array<{ id: AiRulesPreset; name: string; description: string }> = [
  {
    id: 'strict_player_agency',
    name: 'Strict Player Agency',
    description: 'Best for collaborative RP. Protects player character control, keeps narration in third person, and leaves clear space for replies.',
  },
  {
    id: 'classic',
    name: 'Classic Narrator',
    description: 'A lighter-touch storyteller preset with fewer hard restrictions.',
  },
  {
    id: 'custom',
    name: 'Custom Rules',
    description: 'Write your own narrator behavior rules. Leave blank to fall back to the strict preset.',
  },
];

const DICE_SKIN_OPTIONS = [
  { id: 'classic', name: 'Classic Amber', preview: 'from-amber-400 via-orange-500 to-amber-700', pip: 'text-amber-50', note: 'original stock finish' },
  { id: 'default', name: 'Sunforged', preview: 'from-amber-400 via-orange-500 to-amber-700', pip: 'text-amber-50', note: 'etched solar texture' },
  { id: 'obsidian', name: 'Obsidian', preview: 'from-zinc-500 via-zinc-800 to-black', pip: 'text-zinc-100', note: 'fractured dark stone' },
  { id: 'ivory', name: 'Kintsugi', preview: 'from-stone-50 via-amber-100 to-stone-300', pip: 'text-amber-900', note: 'marble and gold repair seams' },
  { id: 'celestial', name: 'Starfield', preview: 'from-indigo-300 via-indigo-500 to-violet-700', pip: 'text-indigo-50', note: 'animated space texture' },
  { id: 'bloodstone', name: 'Bloodstone', preview: 'from-rose-400 via-red-600 to-red-950', pip: 'text-rose-50', note: 'veined ember stone' },
  { id: 'emerald', name: 'Emerald', preview: 'from-emerald-300 via-emerald-500 to-teal-800', pip: 'text-emerald-50', note: 'cut gemstone facets' },
  { id: 'night', name: 'Night', preview: 'from-slate-500 via-slate-800 to-black', pip: 'text-slate-100', note: 'dark star-crack glass' },
  { id: 'sapphire', name: 'Sapphire', preview: 'from-sky-300 via-blue-500 to-blue-900', pip: 'text-sky-50', note: 'cut gemstone facets' },
  { id: 'amethyst', name: 'Amethyst', preview: 'from-fuchsia-300 via-purple-500 to-violet-900', pip: 'text-fuchsia-50', note: 'cut gemstone facets' },
  { id: 'rosegold', name: 'Rosegold', preview: 'from-rose-200 via-rose-400 to-orange-500', pip: 'text-rose-50', note: 'filigree metallic grain' },
  { id: 'aurora', name: 'Aurora', preview: 'from-emerald-300 via-cyan-400 to-indigo-700', pip: 'text-cyan-50', note: 'sweeping arctic lights' },
  { id: 'voidfire', name: 'Voidfire', preview: 'from-violet-400 via-purple-700 to-zinc-950', pip: 'text-violet-50', note: 'arcane spellfire and smoke' },
  { id: 'toxic', name: 'Toxic', preview: 'from-lime-300 via-green-500 to-zinc-900', pip: 'text-lime-50', note: 'radioactive sludge glow' },
  { id: 'glitchpop', name: 'Glitchpop', preview: 'from-cyan-300 via-fuchsia-500 to-yellow-400', pip: 'text-fuchsia-50', note: 'neon data corruption' },
  { id: 'wacky', name: 'Wacky', preview: 'from-cyan-300 via-fuchsia-500 to-lime-300', pip: 'text-white', note: 'chaotic rainbow test skin' },
  { id: 'tester1', name: 'Tester1', preview: 'from-rose-500 via-fuchsia-500 to-amber-300', pip: 'text-white', note: 'private experimental skin', private: true },
] as const;

function canAccessPrivateDiceSkins() {
  const identity = `${auth.currentUser?.displayName || ''} ${auth.currentUser?.email || ''}`.toLowerCase();
  return identity.includes('unbirthdayhatter');
}

export function Settings() {
  const canSeePrivateDiceSkins = canAccessPrivateDiceSkins();
  const visibleDiceSkinOptions = DICE_SKIN_OPTIONS.filter((skin) => !('private' in skin) || canSeePrivateDiceSkins);
  const { 
    apiKeys, 
    setApiKeys, 
    provider, 
    setProvider, 
    customEndpointUrl, 
    setCustomEndpointUrl,
    requireRolls,
    setRequireRolls,
    ambientAudioUrl,
    setAmbientAudioUrl,
    backgroundImageUrl,
    setBackgroundImageUrl,
    theme,
    setTheme,
    showDiceFX,
    setShowDiceFX,
    multiCharChat,
    setMultiCharChat,
    soundscapesEnabled,
    setSoundscapesEnabled,
    ttsEnabled,
    setTtsEnabled,
    ttsVolume,
    setTtsVolume,
    selectedVoice,
    setSelectedVoice,
    ttsProvider,
    setTtsProvider,
    diceSkin,
    setDiceSkin,
    dice3DScale,
    setDice3DScale,
    dice3DAutoCloseMs,
    setDice3DAutoCloseMs,
    isCopilotMode,
    setIsCopilotMode,
    worldPresets,
    saveWorldPreset,
    loadWorldPreset,
    deleteWorldPreset,
    systemRules,
    setSystemRules,
    mood,
    setMood,
    visualStyle,
    setVisualStyle,
    isHost,
    kokoroUrl,
    setKokoroUrl,
    aiRulesPreset,
    setAiRulesPreset,
    customAiRules,
    setCustomAiRules
  } = useStore();
  
  const themeClasses = THEME_CLASSES[theme] || THEME_CLASSES.classic;
  
  const [localAudioUrl, setLocalAudioUrl] = useState(ambientAudioUrl || '');
  const [localBgUrl, setLocalBgUrl] = useState(backgroundImageUrl || '');
  const [newPresetName, setNewPresetName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setBackgroundImageUrl(base64String);
        setLocalBgUrl(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const providers: { id: ProviderType; name: string }[] = [
    { id: 'gemini', name: 'Gemini' },
    { id: 'deepseek', name: 'DeepSeek' },
    { id: 'openai', name: 'OpenAI' },
    { id: 'anthropic', name: 'Anthropic' },
    { id: 'openrouter', name: 'OpenRouter' },
    { id: 'custom', name: 'Custom' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/50 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <SettingsIcon className="w-6 h-6 text-amber-500" />
          <h2 className="text-2xl font-serif font-bold text-zinc-100">Settings & Configuration</h2>
        </div>

        {/* Theme Selection */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-100 font-bold uppercase tracking-wider text-sm">
            <Palette className="w-4 h-4 text-amber-500" />
            Visual Theme
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                  theme === t.id 
                    ? cn("bg-zinc-800 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]", themeClasses.border)
                    : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                )}
              >
                <div className={`w-8 h-8 rounded-full ${t.color} shadow-inner`} />
                <span className="text-xs font-medium text-zinc-300">{t.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Immersion Settings */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-zinc-100 font-bold uppercase tracking-wider text-sm">
            <ImageIcon className="w-4 h-4 text-amber-500" />
            Immersion & Atmosphere
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 md:col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase">Campaign Visual Style</label>
              <input
                type="text"
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                placeholder="e.g. gritty noir oil painting, painterly occult fantasy, anime cyberpunk neon"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-amber-500/50"
              />
              <p className="text-[10px] text-zinc-500">
                Shared art direction for portraits and world images. Leave blank to let the current adventure tone guide visuals on its own.
              </p>
            </div>

            {/* Background Image */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-zinc-500 uppercase">Background Image</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localBgUrl}
                  onChange={(e) => setLocalBgUrl(e.target.value)}
                  onBlur={() => setBackgroundImageUrl(localBgUrl)}
                  placeholder="Image URL..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-amber-500 transition-colors"
                  title="Upload Image"
                >
                  <Upload className="w-5 h-5" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <p className="text-[10px] text-zinc-500">Subtle background image to set the scene. Supports URLs and local uploads.</p>
            </div>

            {/* Ambient Audio */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-zinc-500 uppercase">Ambient Audio (YouTube/Direct)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localAudioUrl}
                  onChange={(e) => setLocalAudioUrl(e.target.value)}
                  placeholder="YouTube URL or Audio Link..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  onClick={() => setAmbientAudioUrl(localAudioUrl)}
                  className="p-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white transition-colors"
                  title="Load/Test Audio"
                >
                  <PlayCircle className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] text-zinc-500">Looping background audio. Use YouTube links for "Tavern Ambience", etc.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-100 font-bold uppercase tracking-wider text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            AI Narration Rules
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase">Ruleset Preset</label>
              <select
                value={aiRulesPreset}
                onChange={(e) => setAiRulesPreset(e.target.value as AiRulesPreset)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-amber-500/50"
              >
                {AI_RULESET_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
              <p className="text-xs text-zinc-500">
                {AI_RULESET_OPTIONS.find((option) => option.id === aiRulesPreset)?.description}
              </p>
              <p className="text-[10px] text-zinc-600">
                Multiplayer handling is added automatically when a live session is active, so the AI knows there are multiple human players in the scene.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase">
                {aiRulesPreset === 'custom' ? 'Custom Narration Rules' : 'Active Rules Preview'}
              </label>
              <textarea
                value={aiRulesPreset === 'custom'
                  ? customAiRules
                  : AI_RULESET_OPTIONS.find((option) => option.id === aiRulesPreset)?.id === 'classic'
                    ? `ENDINGS:\n- End on the present beat and leave space for the player.\n\nCHARACTER CONTROL:\n- Do not take over player choices.\n- Control NPCs, pressure, and the world around them.\n\nWRITING STYLE:\n- Write in third person and stay grounded in what is explicit.`
                    : `ENDINGS:\n- End after the current beat without prompting the player.\n\nCHARACTER CONTROL:\n- Never write the player's dialogue, thoughts, reactions, intentions, or decisions.\n- Only control NPCs, the world, and visible external consequences.\n\nWRITING STYLE:\n- Always write in third person.\n- Leave room for the user to respond and avoid soft-forcing.`
                }
                onChange={(e) => {
                  if (aiRulesPreset === 'custom') setCustomAiRules(e.target.value);
                }}
                readOnly={aiRulesPreset !== 'custom'}
                className="w-full min-h-44 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-amber-500/50 read-only:text-zinc-400"
                placeholder="Write custom AI narration rules here..."
              />
            </div>
          </div>
        </section>

        {/* AI Provider Settings */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-zinc-100 font-bold uppercase tracking-wider text-sm">
            <Key className="w-4 h-4 text-amber-500" />
            AI Provider Configuration
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                    provider === p.id
                      ? 'bg-amber-600 border-amber-500 text-white shadow-lg'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {provider === 'custom' ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase">Custom Endpoint URL</label>
                  <input
                    type="text"
                    value={customEndpointUrl}
                    onChange={(e) => setCustomEndpointUrl(e.target.value)}
                    placeholder="https://your-api-endpoint.com/v1/chat/completions"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase">
                  {provider.toUpperCase()} API Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKeys[provider]}
                    onChange={(e) => setApiKeys({ [provider]: e.target.value })}
                    placeholder={`Leave blank to use the shared ${provider} key, or enter your own...`}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-amber-500/50 pr-12"
                  />
                  <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                </div>
                <p className="text-[10px] text-zinc-500">Leave this blank to use the app&apos;s shared key. If you enter your own key, it overrides the shared key for your browser only.</p>
                <p className="text-[10px] text-zinc-600">Your personal API key is stored locally in your browser so you can keep using your own quota when the shared key is low.</p>
                {provider === 'gemini' && !apiKeys.gemini && (
                  <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-[10px] text-amber-400">
                      <span className="font-bold">Note:</span> The shared Gemini key has a limited quota. If you experience "Resource Exhausted" or "Spending Cap" errors, add your own Gemini key here to override it.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Gameplay Mechanics */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-100 font-bold uppercase tracking-wider text-sm">
            <Dices className="w-4 h-4 text-amber-500" />
            Gameplay Mechanics
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-zinc-100 font-bold">Require Dice Rolls</h4>
                <p className="text-xs text-zinc-500">When enabled, the AI will wait for you to roll dice for skill checks and combat.</p>
              </div>
              <button
                onClick={() => setRequireRolls(!requireRolls)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  requireRolls ? 'bg-amber-600' : 'bg-zinc-800'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  requireRolls ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-800 pt-6">
              <div>
                <h4 className="text-zinc-100 font-bold">Dice Roll FX</h4>
                <p className="text-xs text-zinc-500">Show the cinematic dice tray when rolling from chat or the dice console.</p>
              </div>
              <button
                onClick={() => setShowDiceFX(!showDiceFX)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  showDiceFX ? 'bg-amber-600' : 'bg-zinc-800'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  showDiceFX ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800 pt-6">
              <div>
                <h4 className="text-zinc-100 font-bold">Multi-Character Chat</h4>
                <p className="text-xs text-zinc-500">AI splits responses into separate boxes for different characters and narrator.</p>
              </div>
              <button
                onClick={() => setMultiCharChat(!multiCharChat)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  multiCharChat ? 'bg-amber-600' : 'bg-zinc-800'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  multiCharChat ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800 pt-6">
              <div>
                <h4 className="text-zinc-100 font-bold">AI Copilot Mode</h4>
                <p className="text-xs text-zinc-500">The AI acts as a co-GM, offering suggestions and handling mechanics while you narrate.</p>
              </div>
              <button
                onClick={() => setIsCopilotMode(!isCopilotMode)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  isCopilotMode ? 'bg-amber-600' : 'bg-zinc-800'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  isCopilotMode ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* Audio & Voice */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-100 font-bold uppercase tracking-wider text-sm">
            <Volume2 className="w-4 h-4 text-amber-500" />
            Audio & Voice
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-zinc-100 font-bold">Dynamic Soundscapes</h4>
                <p className="text-xs text-zinc-500">Automatically update ambient audio based on the current scene and mood.</p>
              </div>
              <button
                onClick={() => setSoundscapesEnabled(!soundscapesEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  soundscapesEnabled ? 'bg-amber-600' : 'bg-zinc-800'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  soundscapesEnabled ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800 pt-6">
              <div>
                <h4 className="text-zinc-100 font-bold">Narrate All AI Replies</h4>
                <p className="text-xs text-zinc-500">The AI Dungeon Master will automatically speak all its responses aloud.</p>
              </div>
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  ttsEnabled ? 'bg-amber-600' : 'bg-zinc-800'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  ttsEnabled ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>

            <div className="space-y-2 border-t border-zinc-800 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">TTS Provider</label>
                  <div className="flex gap-2">
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
                          "flex-1 px-3 py-2 rounded-lg text-xs font-bold capitalize border transition-all",
                          ttsProvider === p 
                            ? "bg-amber-500/10 border-amber-500 text-amber-500" 
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Selected Voice</label>
                    <button
                      onClick={async () => {
                        const { speak } = await import('@/lib/audio');
                        const key = ttsProvider === 'gemini' 
                          ? (apiKeys.gemini || process.env.GEMINI_API_KEY || '')
                          : ttsProvider === 'openai' ? (apiKeys.openai || '') : (apiKeys.kokoro || 'kokoro-internal');
                        
                        if (!key && ttsProvider !== 'kokoro') {
                          alert(`${ttsProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API key is required for TTS. Please configure it above.`);
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
                      className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 hover:text-amber-400 uppercase tracking-wider transition-colors"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      Test Voice
                    </button>
                  </div>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-amber-500/50"
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
              </div>

              <div className="pt-4 space-y-2 border-t border-zinc-800/50">
                {ttsProvider === 'kokoro' && (
                  <div className="space-y-4 mb-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Kokoro API URL (Optional)</label>
                      <input
                        type="text"
                        value={kokoroUrl}
                        onChange={(e) => setKokoroUrl(e.target.value)}
                        placeholder="e.g. https://your-render-url.onrender.com/api/v1/audio/speech"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Kokoro API Key (Optional)</label>
                      <input
                        type="password"
                        value={apiKeys.kokoro || ''}
                        onChange={(e) => setApiKeys({ kokoro: e.target.value })}
                        placeholder="Leave blank to use system default"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-zinc-500 uppercase">AI Voice Volume</label>
                  <span className="text-xs font-mono text-zinc-400">{Math.round(ttsVolume * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-zinc-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={ttsVolume}
                    onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* World Presets */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-100 font-bold uppercase tracking-wider text-sm">
            <BookOpen className="w-4 h-4 text-amber-500" />
            World Presets
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="New preset name..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  onClick={() => {
                    if (newPresetName.trim()) {
                      saveWorldPreset(newPresetName.trim());
                      setNewPresetName('');
                    }
                  }}
                  disabled={!newPresetName.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Current
                </button>
              </div>

              {worldPresets.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase">Saved Presets</h4>
                  <div className="grid gap-2">
                    {worldPresets.map(preset => (
                      <div key={preset.id} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                        <div>
                          <div className="font-medium text-zinc-200">{preset.name}</div>
                          <div className="text-xs text-zinc-500 truncate max-w-xs">
                            {[preset.mood, preset.visualStyle].filter(Boolean).join(' · ') || 'No mood or style specified'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (confirm('Load this preset? This will overwrite your current system rules, mood, and visual style.')) {
                                loadWorldPreset(preset.id);
                              }
                            }}
                            className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Load Preset"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this preset?')) {
                                deleteWorldPreset(preset.id);
                              }
                            }}
                            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Delete Preset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Customization */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-100 font-bold uppercase tracking-widest text-sm">
            <SettingsIcon className="w-4 h-4 text-amber-500" />
            Customization
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <p className="text-[10px] text-zinc-500">
              Hosts, admins, and editors can edit AI responses in multiplayer. Admins can also use OOC mode and edit the lorebook.
            </p>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase">Dice Skin</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {visibleDiceSkinOptions.map((skin) => (
                  <button
                    key={skin.id}
                    onClick={() => setDiceSkin(skin.id)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all",
                      diceSkin === skin.id
                        ? "bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_18px_rgba(245,158,11,0.12)]"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className={cn("h-12 w-12 rounded-2xl border border-white/15 bg-gradient-to-br shadow-lg", skin.preview)} />
                        <div className={cn("absolute inset-0 flex items-center justify-center text-xl font-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]", skin.pip)}>
                          20
                        </div>
                        {skin.id === 'celestial' && (
                          <>
                            <span className="absolute -right-0.5 top-1 h-1.5 w-1.5 rounded-full bg-indigo-100 shadow-[0_0_8px_rgba(224,231,255,0.85)]" />
                            <span className="absolute left-1 top-0.5 h-1 w-1 rounded-full bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.85)]" />
                          </>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold">{skin.name}</div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{skin.note}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500">
                These skins now use dedicated texture themes in the 3D roller. Celestial and Bloodstone also get animated tray effects for extra flair.
              </p>
            </div>

            <div className="space-y-3 border-t border-zinc-800 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-zinc-100 font-bold">3D Dice Tray Size</h4>
                  <p className="text-xs text-zinc-500">Increase this if you want bigger dice in the tray.</p>
                </div>
                <span className="text-xs font-mono text-zinc-400">{dice3DScale.toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="5"
                max="24"
                step="1"
                value={dice3DScale}
                onChange={(e) => setDice3DScale(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div className="space-y-3 border-t border-zinc-800 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-zinc-100 font-bold">3D Dice Result Linger</h4>
                  <p className="text-xs text-zinc-500">How long the result stays on screen before the tray closes.</p>
                </div>
                <span className="text-xs font-mono text-zinc-400">{(dice3DAutoCloseMs / 1000).toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="1200"
                max="6000"
                step="200"
                value={dice3DAutoCloseMs}
                onChange={(e) => setDice3DAutoCloseMs(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-red-500 font-bold uppercase tracking-widest text-sm">
            <Trash2 className="w-4 h-4" />
            Danger Zone
          </div>
          <div className="bg-red-950/20 border border-red-900/50 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-red-400">Wipe All Data</h3>
                <p className="text-xs text-red-500/70 mt-1">Permanently delete all saved roleplays and characters. This action cannot be undone.</p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you absolutely sure you want to wipe ALL your saved roleplays and characters? This cannot be undone!')) {
                    const state = useStore.getState();
                    
                    // Delete all saved roleplays
                    state.savedRoleplays.forEach(rp => {
                      state.deleteRoleplay(rp.id);
                    });
                    
                    // Delete all joined roleplays
                    state.joinedRoleplays.forEach(rp => {
                      state.deleteRoleplay(rp.id);
                    });
                    
                    // Delete all saved characters
                    state.savedCharacters.forEach(char => {
                      state.deleteSheet(char.id);
                    });
                    
                    alert('All data has been wiped.');
                  }
                }}
                className="px-4 py-2 bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white font-bold rounded-xl transition-colors text-sm"
              >
                Wipe Data
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
