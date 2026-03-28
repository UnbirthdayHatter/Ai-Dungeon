import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db, doc, onSnapshot, setDoc, updateDoc, collection, query, orderBy, serverTimestamp, getDoc, addDoc, auth, deleteDoc, handleFirestoreError, OperationType } from '../firebase';
import { cleanObject, debounce, throttle } from '../lib/utils';

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'dice' | 'ooc';
  content: string;
  characterName?: string; // For multi-character responses
  type?: 'narrator' | 'character';
  sheetId?: string; // For multiplayer avatar syncing
  senderId?: string; // For identifying who sent the message
  timestamp?: number;
  isCollapsed?: boolean; // For OOC messages
};

export type SheetType = 'bitd' | 'custom';

export type BitDStats = {
  playbook: string;
  crew: string;
  alias: string;
  look: string;
  heritage: string;
  background: string;
  vice: string;
  stress: number;
  trauma: string[];
  harm: {
    light1: string;
    light2: string;
    medium1: string;
    medium2: string;
    severe: string;
    fatal: string;
  };
  healingClock: number;
  armor: boolean;
  heavyArmor: boolean;
  specialArmor: boolean;
  coin: number;
  stash: number;
  playbookXp: number;
  insightXp: number;
  prowessXp: number;
  resolveXp: number;
  actions: {
    hunt: number;
    study: number;
    survey: number;
    tinker: number;
    finesse: number;
    prowl: number;
    skirmish: number;
    wreck: number;
    attune: number;
    command: number;
    consort: number;
    sway: number;
  };
  specialAbilities: string;
  friends: string;
  items: string;
  load: 'light' | 'normal' | 'heavy';
};

export type ProviderType = 'deepseek' | 'openai' | 'anthropic' | 'openrouter' | 'gemini' | 'custom' | 'kokoro';

export type CustomStat = {
  id: string;
  name: string;
  value: number;
};

export type CurrentNPC = {
  id: string;
  name: string;
  relationship: string;
};

export type Spell = {
  id: string;
  name: string;
  level: number;
  description: string;
  damage?: string;
  type?: string;
};

export type Ability = {
  id: string;
  name: string;
  description: string;
  uses?: number;
  maxUses?: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  description?: string;
  weight?: number;
};

export type CharacterNote = {
  id: string;
  title: string;
  content: string;
};

export type Sheet = {
  id: string;
  type: SheetType;
  name: string;
  avatarUrl?: string;
  
  // BitD fields
  bitd?: BitDStats;

  // D&D 5e fields (legacy)
  race?: string;
  charClass?: string;
  level?: number;
  hp?: number;
  maxHp?: number;
  ac?: number;
  stats?: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  proficiencies?: string[];
  inventory?: string; // Legacy
  inventoryItems?: InventoryItem[];
  gold?: number;
  backstory?: string;
  appearance?: string;
  spells?: Spell[];
  abilities?: Ability[];
  notes?: CharacterNote[];
  
  // Custom fields
  customStats?: CustomStat[];
  customText?: string;
  ownerId?: string;
  lastSeen?: number;
  archived?: boolean;
};

export type LoreEntry = {
  id: string;
  category: string;
  name: string;
  description: string;
  avatarUrl?: string;
  imageUrl?: string;
  imageLocked?: boolean;
  parentId?: string | null;
  coordinates?: { x: number; y: number };
};

export type Clock = {
  id: string;
  name: string;
  segments: 4 | 6 | 8;
  filled: number;
  type: 'danger' | 'progress' | 'fortune';
};

export type SavedRoleplay = {
  id: string;
  name: string;
  messages: Message[];
  systemRules: string;
  mood: string;
  visualStyle?: string;
  lorebook: LoreEntry[];
  currentNPCs: CurrentNPC[];
  updatedAt: number;
  requireRolls?: boolean;
  ambientAudioUrl?: string;
  backgroundImageUrl?: string;
  sheets?: Sheet[];
  quests?: Quest[];
  timeline?: TimelineEntry[];
  combat?: CombatState;
  clocks?: Clock[];
  notes?: string;
  archived?: boolean;
  isPublic?: boolean;
  promotedToRoleplayId?: string;
};

export type RoleplaySummary = {
  id: string;
  name: string;
  ownerId?: string;
  joinCode?: string;
  updatedAt: number;
  archived?: boolean;
  editors?: string[];
  admins?: string[];
};

export type WorldPreset = {
  id: string;
  name: string;
  systemRules: string;
  contextAndRules: string;
  mood: string;
  visualStyle: string;
};

export type AiRulesPreset = 'classic' | 'strict_player_agency' | 'custom';

export type TypingUser = {
  isTyping: boolean;
  timestamp: number;
  name: string;
};

export type SheetTemplate = {
  id: string;
  name: string;
  type: SheetType;
  customStats?: CustomStat[];
  customText?: string;
};

export type ThemeType = 'classic' | 'forest' | 'blood' | 'arcane' | 'parchment' | 'midnight' | 'sepia';

export type Quest = {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'failed';
};

export type TimelineEntry = {
  id: string;
  date: string;
  event: string;
  description: string;
};

export type Combatant = {
  id: string;
  name: string;
  initiative: number;
  hp: number;
  maxHp: number;
  isPlayer: boolean;
  sheetId?: string;
};

export type CombatState = {
  active: boolean;
  turnIndex: number;
  combatants: Combatant[];
};

export type TabType = 'chat' | 'character' | 'lorebook' | 'settings' | 'setup' | 'roleplays' | 'multiplayer' | 'map';

export type AppState = any;

const defaultSystemRules = 'You are a collaborative tabletop RPG narrator.';
const SOUNDSCAPES: Record<string, string> = {};
const makeId = () => Math.random().toString(36).substring(2, 11);
const readStorageValue = (key: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback;
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};
const writeStorageValue = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore local persistence failures.
  }
};
const AI_RULE_PRESETS: Record<Exclude<AiRulesPreset, 'custom'>, string> = {
  classic: `ENDINGS:
- End your response after the present beat of action.
- Leave room for the player to answer, speak, or act next.

CHARACTER CONTROL:
- Never write the player's dialogue or lock in their choices.
- Keep control of NPCs, the environment, scene pressure, and consequences.

WRITING STYLE:
- Write in third person.
- Stay grounded in what is explicit in the scene.
- Avoid meta commentary and visible system jargon unless mechanics are enabled elsewhere in the prompt.`,
  strict_player_agency: `ENDINGS:
- End your response after describing the current outcome, environment, pressure, or NPC behavior.
- Do not ask "What do you do?", "How do you proceed?", or "What is your next move?"
- Do not prompt the player for their next action.
- Leave space for the player to choose what happens through their own character.

CHARACTER CONTROL:
- Never write for the user's character.
- Do not write their dialogue, actions, thoughts, feelings, reactions, body language, decisions, or intentions.
- Do not assume anything about the user's character.
- Never state what they feel, want, think, notice, remember, realize, or intend unless the user explicitly wrote it.
- Do not force outcomes onto the user's character.
- Do not make them comply, hesitate, step back, lean in, blush, freeze, panic, trust, submit, agree, or otherwise react unless the user explicitly says they do.
- Do not put words in the user's mouth.
- Never generate dialogue for the user's character.
- Do not describe automatic reactions for the user's character.
- Even small reactions such as flinching, shivering, swallowing, staring, stiffening, relaxing, or going silent must not be invented by the AI.
- Only control NPCs, the environment, and external events.
- The AI may write its own characters, scene details, atmosphere, world events, and visible consequences external to the user's character.
- When referring to the user's character, use only what is explicit.
- Only mention details the user has directly stated or that are plainly visible and already established in the scene.
- When uncertain, do less.
- If there is any doubt whether something belongs to the user's character, do not write it.

WRITING STYLE:
- Always write in third person.
- Narration, description, and character actions must be written in third person.
- Leave room for the user to respond.
- End replies in a way that leaves the user free to choose what their character says or does next.
- Do not soft-force.
- Avoid phrasing that pressures or implies the user's character must react in a certain way, such as "drawing them in," "making them shiver," "forcing them to pause," or "leaving them speechless."
- Respond only to what is on the page.
- Treat only explicit roleplay text from the user as canon. Do not invent off-screen actions, motives, or reactions for their character.`,
};
const getAiRulesText = (preset: AiRulesPreset, customRules: string) =>
  preset === 'custom'
    ? (customRules.trim() || AI_RULE_PRESETS.strict_player_agency)
    : AI_RULE_PRESETS[preset];
const userSheetWriteQueue = new Map<string, ReturnType<typeof debounce>>();
const roleplaySheetWriteQueue = new Map<string, ReturnType<typeof debounce>>();
const savedRoleplayWriteQueue = new Map<string, ReturnType<typeof debounce>>();

const getUserSheetWriter = (sheetId: string) => {
  if (!userSheetWriteQueue.has(sheetId)) {
    userSheetWriteQueue.set(sheetId, debounce((userId: string, payload: Sheet) => {
      setDoc(doc(db, 'users', userId, 'sheets', sheetId), cleanObject(payload), { merge: true } as any).catch(console.error);
    }, 800));
  }
  return userSheetWriteQueue.get(sheetId)! as (userId: string, payload: Sheet) => void;
};

const getRoleplaySheetWriter = (roleplayId: string, sheetId: string) => {
  const key = `${roleplayId}:${sheetId}`;
  if (!roleplaySheetWriteQueue.has(key)) {
    roleplaySheetWriteQueue.set(key, debounce((payload: Sheet) => {
      setDoc(doc(db, 'roleplays', roleplayId, 'sheets', sheetId), cleanObject(payload), { merge: true } as any).catch(console.error);
    }, 800));
  }
  return roleplaySheetWriteQueue.get(key)! as (payload: Sheet) => void;
};

const getSavedRoleplayWriter = (roleplayId: string) => {
  if (!savedRoleplayWriteQueue.has(roleplayId)) {
    savedRoleplayWriteQueue.set(roleplayId, debounce((userId: string, payload: SavedRoleplay) => {
      setDoc(doc(db, 'users', userId, 'savedRoleplays', roleplayId), cleanObject(payload), { merge: true } as any).catch(console.error);
    }, 1200));
  }
  return savedRoleplayWriteQueue.get(roleplayId)! as (userId: string, payload: SavedRoleplay) => void;
};

const sortMessagesByTimeline = (messages: Message[]) =>
  [...messages].sort((a, b) => {
    const timeDiff = (a.timestamp || 0) - (b.timestamp || 0);
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });

const syncSavedRoleplayMessages = (savedRoleplays: SavedRoleplay[], roleplayId: string | null, messages: Message[]) =>
  roleplayId
    ? savedRoleplays.map((roleplay) =>
        roleplay.id === roleplayId
          ? { ...roleplay, messages, updatedAt: Date.now() }
          : roleplay
      )
    : savedRoleplays;

const GENERIC_ADVENTURE_NAMES = new Set([
  'new adventure',
  'untitled adventure',
]);

const isGenericAdventureName = (name?: string | null) => {
  const normalized = (name || '').trim().toLowerCase();
  return !normalized || GENERIC_ADVENTURE_NAMES.has(normalized) || normalized.startsWith('adventure log - ');
};

const sanitizeAdventureTitle = (rawTitle?: string | null) => {
  const cleaned = (rawTitle || '')
    .replace(/^[`"'“”'\s]+|[`"'“”'\s]+$/g, '')
    .replace(/^title\s*:\s*/i, '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
  return cleaned.slice(0, 60).trim();
};

const buildAdventureTitleFallback = (mood?: string, firstLine?: string) => {
  const moodTitle = (mood || '').trim();
  const lead = (firstLine || '')
    .replace(/^[\[\](){}"'`]+|[\[\](){}"'`]+$/g, '')
    .trim()
    .slice(0, 42);
  if (lead) return lead;
  if (moodTitle) return `${moodTitle} Adventure`.slice(0, 60);
  return 'Untitled Adventure';
};

const syncSavedRoleplaySheets = (savedRoleplays: SavedRoleplay[], roleplayId: string | null, sheets: Sheet[]) =>
  roleplayId
    ? savedRoleplays.map((roleplay) =>
        roleplay.id === roleplayId
          ? { ...roleplay, sheets, updatedAt: Date.now() }
          : roleplay
      )
    : savedRoleplays;

let activeRoleplaySyncCleanup: (() => void) | null = null;

const postPresenceUpdate = async (payload: { roleplayId: string; userId?: string; name?: string; isTyping?: boolean; isAIGenerating?: boolean }) => {
  await fetch('/api/presence/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(console.error);
};

const writeTypingPresence = throttle((roleplayId: string, userId: string, payload: TypingUser) => {
  postPresenceUpdate({ roleplayId, userId, name: payload.name, isTyping: true });
}, 10000);

export const useStore = create<any>()((set, get) => ({
  apiKey: '',
  apiKeys: {} as Record<ProviderType, string>,
  provider: 'gemini' as ProviderType,
  customEndpointUrl: '',
  kokoroUrl: '',
  activeTab: 'chat' as TabType,
  selectedLoreId: null,
  theme: 'classic' as ThemeType,
  systemRules: defaultSystemRules,
  contextAndRules: '',
  mood: '',
  visualStyle: '',
  sheets: [] as Sheet[],
  sessionSheets: [] as Sheet[],
  savedCharacters: [] as Sheet[],
  activeSheetId: null,
  lorebook: [] as LoreEntry[],
  currentNPCs: [] as CurrentNPC[],
  messages: [{ id: 'welcome', role: 'assistant', content: 'Welcome to your new adventure. The slate is clean. Where would you like to begin?' }] as Message[],
  quests: [] as Quest[],
  timeline: [] as TimelineEntry[],
  combat: { active: false, turnIndex: 0, combatants: [] },
  clocks: [] as Clock[],
  notes: '',
  soundscapesEnabled: false,
  ttsEnabled: false,
  ttsVolume: 1,
  selectedVoice: 'alloy',
  ttsProvider: 'gemini',
  diceSkin: 'classic',
  isCopilotMode: false,
  isOocMode: false,
  sessionId: null,
  pendingUpdates: {},
  showClocks: false,
  showJournal: false,
  savedRoleplays: [] as SavedRoleplay[],
  sheetTemplates: [] as SheetTemplate[],
  worldPresets: [] as WorldPreset[],
  aiAutoRespond: true,
  aiEditEnabled: false,
  isHost: false,
  admins: [],
  editors: [],
  userRoleplays: [] as RoleplaySummary[],
  joinedRoleplays: [] as RoleplaySummary[],
  connectedPlayers: [] as { id: string; name: string; permissions?: { role: 'admin' | 'editor' | 'viewer' } }[],
  currentRoleplayId: null,
  currentSaveRoleplayId: null,
  currentLiveRoleplayId: null,
  currentRoleplayName: 'New Adventure',
  joinCode: null,
  isLive: false,
  multiCharChat: false,
  aiRulesPreset: readStorageValue('aiRulesPreset', 'strict_player_agency') as AiRulesPreset,
  customAiRules: readStorageValue('customAiRules', ''),
  requireRolls: false,
  suggestedLoot: [] as any[],
  isAIGenerating: false,
  isSaving: false,
  lastSaved: null,
  typingUsers: {} as Record<string, TypingUser>,
  showDiceFX: true,
  ambientAudioUrl: '',
  backgroundImageUrl: '',
  isAudioPlaying: false,

  queueUpdate: (path: string, data: any, type: 'set' | 'update') => set((state: any) => ({
    pendingUpdates: { ...state.pendingUpdates, [path]: { data, type } }
  })),
  syncPendingUpdates: async () => {},
  setApiKey: (key: string) => set({ apiKey: key }),
  setApiKeys: (keys: Partial<Record<ProviderType, string>>) => set((state: any) => ({ apiKeys: { ...state.apiKeys, ...keys } })),
  setProvider: (provider: ProviderType) => set({ provider }),
  setCustomEndpointUrl: (url: string) => set({ customEndpointUrl: url }),
  setKokoroUrl: (url: string) => set({ kokoroUrl: url }),
  setActiveTab: (tab: TabType) => set({ activeTab: tab }),
  setSelectedLoreId: (id: string | null) => set({ selectedLoreId: id }),
  setShowClocks: (show: boolean) => set({ showClocks: show }),
  setShowJournal: (show: boolean) => set({ showJournal: show }),
  setNotes: (notes: string) => set({ notes }),
  generatePortrait: async (id: string, prompt: string) => {
    const state = get();
    const apiKey = state.apiKeys.gemini || state.apiKey || undefined;
    const tonePromptParts = [
      state.mood ? `Adventure mood and tone: ${state.mood}.` : '',
      state.visualStyle ? `Preferred campaign visual style: ${state.visualStyle}.` : '',
      state.systemRules ? `Adventure setup and themes: ${state.systemRules}.` : '',
      state.contextAndRules ? `Current adventure context: ${state.contextAndRules}.` : '',
    ].filter(Boolean);
    const themedPrompt = [
      prompt,
      tonePromptParts.length > 0
        ? `Match the visual tone, fashion, atmosphere, lighting, and genre cues of this adventure. ${tonePromptParts.join(' ')}`
        : 'Match the visual tone of the current adventure and keep the portrait consistent with its setting and atmosphere.',
      'Portrait only, no text, no UI, no watermark.',
    ].join(' ');
    const response = await fetch('/api/ai/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: themedPrompt, apiKey }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.imageUrl) {
      throw new Error(data?.error?.message || 'Failed to generate portrait.');
    }
    get().updateLoreEntry(id, { avatarUrl: data.imageUrl as string, imageUrl: data.imageUrl as string });
  },
  setTheme: (theme: ThemeType) => set({ theme }),
  setSystemRules: (rules: string) => {
    const state = get();
    set({ systemRules: rules });
    if (state.currentLiveRoleplayId && state.isHost) {
      updateDoc(doc(db, 'roleplays', state.currentLiveRoleplayId), { systemRules: rules, updatedAt: Date.now() }).catch(console.error);
    }
  },
  setContextAndRules: (rules: string) => {
    const state = get();
    set({ contextAndRules: rules });
    if (state.currentLiveRoleplayId && state.isHost) {
      updateDoc(doc(db, 'roleplays', state.currentLiveRoleplayId), { contextAndRules: rules, updatedAt: Date.now() }).catch(console.error);
    }
  },
  setMood: (mood: string) => {
    const state = get();
    set({ mood });
    if (state.currentLiveRoleplayId && state.isHost) {
      updateDoc(doc(db, 'roleplays', state.currentLiveRoleplayId), { mood, updatedAt: Date.now() }).catch(console.error);
    }
  },
  setVisualStyle: (visualStyle: string) => {
    const state = get();
    set({ visualStyle });
    if (state.currentLiveRoleplayId && state.isHost) {
      updateDoc(doc(db, 'roleplays', state.currentLiveRoleplayId), { visualStyle, updatedAt: Date.now() }).catch(console.error);
    }
  },
  setCurrentRoleplayId: (id: string | null) => {
    if (!id) {
      if (activeRoleplaySyncCleanup) {
        activeRoleplaySyncCleanup();
        activeRoleplaySyncCleanup = null;
      }
      set({
        currentRoleplayId: null,
        currentSaveRoleplayId: null,
        currentLiveRoleplayId: null,
        currentRoleplayName: 'New Adventure',
        joinCode: null,
        isLive: false,
        isHost: false,
        sessionSheets: [],
      });
      return;
    }
    const state = get();
    const roleplay = state.userRoleplays.find((rp: RoleplaySummary) => rp.id === id) || state.joinedRoleplays.find((rp: RoleplaySummary) => rp.id === id);
    set({
      currentRoleplayId: id,
      currentSaveRoleplayId: roleplay ? null : id,
      currentLiveRoleplayId: roleplay ? id : null,
      currentRoleplayName: roleplay?.name || state.currentRoleplayName,
      joinCode: roleplay?.joinCode || state.joinCode,
      isLive: Boolean(roleplay),
      isHost: roleplay?.ownerId === auth.currentUser?.uid,
      aiAutoRespond: roleplay ? true : state.aiAutoRespond,
    });
  },
  createRoleplay: async (name: string) => {
    await get().newRoleplay(true);
    const nextId = get().currentLiveRoleplayId || get().currentRoleplayId || makeId();
    const nextName = name || 'New Adventure';
    set({ currentRoleplayName: nextName });
    if (nextId && nextName !== 'New Adventure') {
      await get().renameRoleplay(nextId, nextName);
    }
    return nextId;
  },
  archiveRoleplay: async (id: string, archived: boolean) => set((state: any) => ({
    savedRoleplays: state.savedRoleplays.map((rp: SavedRoleplay) => rp.id === id ? { ...rp, archived } : rp),
    userRoleplays: state.userRoleplays.map((rp: RoleplaySummary) => rp.id === id ? { ...rp, archived } : rp),
    joinedRoleplays: state.joinedRoleplays.map((rp: RoleplaySummary) => rp.id === id ? { ...rp, archived } : rp),
  })),
  removeSheetFromRoleplay: async (roleplayId: string, sheetId: string) => {
    if (roleplayId) {
      deleteDoc(doc(db, 'roleplays', roleplayId, 'sheets', sheetId)).catch(console.error);
    }
    set((state: any) => {
      const nextSessionSheets = state.sessionSheets.filter((sheet: Sheet) => sheet.id !== sheetId);
      const nextSheets = state.sheets.filter((sheet: Sheet) => sheet.id !== sheetId);
      return {
        sessionSheets: nextSessionSheets,
        sheets: state.isLive ? nextSessionSheets : nextSheets,
        activeSheetId: state.activeSheetId === sheetId ? (nextSessionSheets[0]?.id || nextSheets[0]?.id || null) : state.activeSheetId,
      };
    });
  },
  togglePlayerPermission: async (roleplayId: string, userId: string, permission: 'admin' | 'editor' | 'viewer') => {
    set((state: any) => {
      const updateRoleplay = (rp: RoleplaySummary) => {
        if (rp.id !== roleplayId) return rp;
        const admins = (rp.admins || []).filter((id: string) => id !== userId);
        const editors = (rp.editors || []).filter((id: string) => id !== userId);
        if (permission === 'admin') admins.push(userId);
        if (permission === 'editor') editors.push(userId);
        if (rp.ownerId && !admins.includes(rp.ownerId)) admins.push(rp.ownerId);
        return { ...rp, admins, editors };
      };
      const nextState = {
        userRoleplays: state.userRoleplays.map(updateRoleplay),
        joinedRoleplays: state.joinedRoleplays.map(updateRoleplay),
      };
      const roleplay = nextState.userRoleplays.find((rp: RoleplaySummary) => rp.id === roleplayId) || nextState.joinedRoleplays.find((rp: RoleplaySummary) => rp.id === roleplayId);
      if (roleplay) {
        updateDoc(doc(db, 'roleplays', roleplayId), {
          admins: Array.from(new Set([...(roleplay.admins || []), roleplay.ownerId].filter(Boolean) as string[])),
          editors: roleplay.editors || [],
        }).catch(console.error);
      }
      return nextState;
    });
  },
  joinRoleplay: async (joinCode: string) => {
    const { getDocs, where, query } = await import('firebase/firestore');
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in to join.');
    const snapshot = await getDocs(query(collection(db, 'roleplays'), where('joinCode', '==', joinCode.toUpperCase())));
    if (snapshot.empty) {
      throw new Error('Session not found.');
    }
    const roleplayDoc = snapshot.docs[0];
    const data = roleplayDoc.data() as RoleplaySummary & Record<string, unknown>;
    const joinedRoleplay: RoleplaySummary = {
      id: roleplayDoc.id,
      name: data.name || 'Joined Adventure',
      joinCode: data.joinCode || joinCode.toUpperCase(),
      updatedAt: data.updatedAt || Date.now(),
      archived: data.archived,
      editors: data.editors || [],
      admins: Array.from(new Set([...(data.admins || []), data.ownerId].filter(Boolean) as string[])),
      ownerId: data.ownerId,
    };
    await setDoc(doc(db, 'users', user.uid, 'joinedRoleplays', roleplayDoc.id), cleanObject(joinedRoleplay), { merge: true } as any).catch(console.error);
    set((state: any) => ({
      joinedRoleplays: state.joinedRoleplays.some((rp: RoleplaySummary) => rp.id === joinedRoleplay.id)
        ? state.joinedRoleplays.map((rp: RoleplaySummary) => rp.id === joinedRoleplay.id ? joinedRoleplay : rp)
        : [...state.joinedRoleplays, joinedRoleplay],
      currentRoleplayId: joinedRoleplay.id,
      currentSaveRoleplayId: null,
      currentLiveRoleplayId: joinedRoleplay.id,
      currentRoleplayName: joinedRoleplay.name,
      joinCode: joinedRoleplay.joinCode,
      isLive: true,
      isHost: data.ownerId === user.uid,
      aiEditEnabled: Boolean((data as any).aiEditEnabled),
      aiAutoRespond: true,
    }));
  },
  syncRoleplay: (id: string) => {
    if (activeRoleplaySyncCleanup) {
      activeRoleplaySyncCleanup();
      activeRoleplaySyncCleanup = null;
    }
    const unsubscribers: Array<() => void> = [];
    get().refreshRoleplayCollections(id).catch(console.error);

    unsubscribers.push(onSnapshot(doc(db, 'roleplays', id), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as RoleplaySummary & Record<string, unknown>;
      const currentUserId = auth.currentUser?.uid;
      set((state: any) => {
        const sessionSheets = state.sessionSheets as Sheet[];
        const activeSheetId = state.activeSheetId
          || sessionSheets.find((sheet) => sheet.ownerId === currentUserId)?.id
          || sessionSheets[0]?.id
          || null;
        return {
          currentRoleplayId: id,
          currentSaveRoleplayId: null,
          currentLiveRoleplayId: id,
          currentRoleplayName: data.name || state.currentRoleplayName,
          joinCode: data.joinCode || state.joinCode,
          mood: data.mood || '',
          visualStyle: data.visualStyle || '',
          systemRules: data.systemRules || state.systemRules,
          contextAndRules: data.contextAndRules || '',
          combat: data.combat || state.combat,
          notes: data.notes || '',
          currentNPCs: data.currentNPCs || [],
          aiEditEnabled: Boolean((data as any).aiEditEnabled),
          isLive: true,
          isHost: data.ownerId === currentUserId,
          admins: Array.from(new Set([...(data.admins || []), data.ownerId].filter(Boolean) as string[])),
          editors: data.editors || [],
          activeSheetId,
        };
      });
    }));

    const presenceSource = new EventSource(`/api/presence/stream/${id}`);
    presenceSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { typingUsers?: Record<string, TypingUser>; isAIGenerating?: boolean };
        set({
          typingUsers: payload.typingUsers || {},
          isAIGenerating: Boolean(payload.isAIGenerating),
        });
      } catch (error) {
        console.error('Failed to parse presence payload:', error);
      }
    };
    unsubscribers.push(() => presenceSource.close());

    unsubscribers.push(onSnapshot(collection(db, 'roleplays', id, 'messages'), (snap) => {
      const messages = sortMessagesByTimeline(snap.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }))
      );
      set({ messages });
    }));

    unsubscribers.push(onSnapshot(collection(db, 'roleplays', id, 'sheets'), (snap) => {
      const sessionSheets = snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) })) as Sheet[];
      const currentUserId = auth.currentUser?.uid;
      set((state: any) => ({
        sessionSheets,
        sheets: sessionSheets,
        connectedPlayers: sessionSheets.map((sheet) => ({ id: sheet.ownerId || sheet.id, name: sheet.name || 'Unknown Hero' })),
        activeSheetId: state.activeSheetId && sessionSheets.some((sheet) => sheet.id === state.activeSheetId)
          ? state.activeSheetId
          : sessionSheets.find((sheet) => sheet.ownerId === currentUserId)?.id || sessionSheets[0]?.id || null,
      }));
    }));

    const cleanup = () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
    activeRoleplaySyncCleanup = cleanup;
    return cleanup;
  },
  setQuests: (quests: Quest[]) => set({ quests }),
  addQuest: (quest: Quest) => set((state: any) => ({ quests: [...state.quests, quest] })),
  updateQuest: (id: string, updates: Partial<Quest>) => set((state: any) => ({ quests: state.quests.map((quest: Quest) => quest.id === id ? { ...quest, ...updates } : quest) })),
  setTimeline: (timeline: TimelineEntry[]) => set({ timeline }),
  addTimelineEntry: (entry: TimelineEntry) => set((state: any) => ({ timeline: [...state.timeline, entry] })),
  setCombat: (combat: Partial<CombatState>) => set((state: any) => ({ combat: { ...state.combat, ...combat } })),
  setClocks: (clocks: Clock[]) => set({ clocks }),
  addClock: (clock: Omit<Clock, 'id'>) => set((state: any) => ({ clocks: [...state.clocks, { id: makeId(), ...clock }] })),
  updateClock: (id: string, updates: Partial<Clock>) => set((state: any) => ({ clocks: state.clocks.map((clock: Clock) => clock.id === id ? { ...clock, ...updates } : clock) })),
  deleteClock: (id: string) => set((state: any) => ({ clocks: state.clocks.filter((clock: Clock) => clock.id !== id) })),
  setSoundscapesEnabled: (enabled: boolean) => set({ soundscapesEnabled: enabled }),
  setTtsEnabled: (enabled: boolean) => set({ ttsEnabled: enabled }),
  setTtsVolume: (volume: number) => set({ ttsVolume: volume }),
  setSelectedVoice: (voice: string) => set({ selectedVoice: voice }),
  setTtsProvider: (provider: 'gemini' | 'openai' | 'kokoro') => set({ ttsProvider: provider }),
  setDiceSkin: (skin: string) => set({ diceSkin: skin }),
  setIsCopilotMode: (enabled: boolean) => set({ isCopilotMode: enabled }),
  setAiRulesPreset: (preset: AiRulesPreset) => {
    writeStorageValue('aiRulesPreset', preset);
    set({ aiRulesPreset: preset });
  },
  setCustomAiRules: (rules: string) => {
    writeStorageValue('customAiRules', rules);
    set({ customAiRules: rules });
  },
  setIsOocMode: (enabled: boolean) => set({ isOocMode: enabled }),
  setSessionId: (id: string | null) => set({ sessionId: id }),
  fetchUserSheets: async () => {
    const { getDocs } = await import('firebase/firestore');
    const user = auth.currentUser;
    if (!user) return;
    const snapshot = await getDocs(collection(db, 'users', user.uid, 'sheets'));
    const savedCharacters = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) })) as Sheet[];
    set({ savedCharacters });
  },
  fetchUserRoleplays: async () => {
    const { getDocs, where, query } = await import('firebase/firestore');
    const user = auth.currentUser;
    if (!user) return;
    const ownedSnapshot = await getDocs(query(collection(db, 'roleplays'), where('ownerId', '==', user.uid)));
    const joinedSnapshot = await getDocs(collection(db, 'users', user.uid, 'joinedRoleplays'));
    const savedSnapshot = await getDocs(collection(db, 'users', user.uid, 'savedRoleplays'));
    const userRoleplays = ownedSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as RoleplaySummary) })) as RoleplaySummary[];
    const joinedRoleplays = joinedSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as RoleplaySummary) })) as RoleplaySummary[];
    const savedRoleplays = savedSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) })) as SavedRoleplay[];
    set({ userRoleplays, joinedRoleplays, savedRoleplays });
  },
  refreshRoleplayCollections: async (roleplayId?: string) => {
    const id = roleplayId || get().currentLiveRoleplayId;
    if (!id) return;
    const { getDocs } = await import('firebase/firestore');
    const [loreSnap, questSnap, timelineSnap] = await Promise.all([
      getDocs(collection(db, 'roleplays', id, 'lorebook')),
      getDocs(collection(db, 'roleplays', id, 'quests')),
      getDocs(collection(db, 'roleplays', id, 'timeline')),
    ]);
    set({
      lorebook: loreSnap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) })),
      quests: questSnap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) })),
      timeline: timelineSnap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) })),
    });
  },
  fetchUserConfig: async () => {},
  saveWorldPreset: (name: string) => set((state: any) => ({ worldPresets: [...state.worldPresets, { id: makeId(), name, systemRules: state.systemRules, contextAndRules: state.contextAndRules, mood: state.mood, visualStyle: state.visualStyle }] })),
  loadWorldPreset: (id: string) => set((state: any) => {
    const preset = state.worldPresets.find((item: WorldPreset) => item.id === id);
    return preset ? { systemRules: preset.systemRules, contextAndRules: preset.contextAndRules, mood: preset.mood, visualStyle: preset.visualStyle || '' } : {};
  }),
  deleteWorldPreset: (id: string) => set((state: any) => ({ worldPresets: state.worldPresets.filter((item: WorldPreset) => item.id !== id) })),
  addSheet: (sheet: Sheet) => {
    const user = auth.currentUser;
    const nextSheet = { ...sheet, ownerId: sheet.ownerId || user?.uid };
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'sheets', nextSheet.id), cleanObject(nextSheet)).catch(console.error);
    }
    set((state: any) => ({
      savedCharacters: state.savedCharacters.some((item: Sheet) => item.id === nextSheet.id) ? state.savedCharacters : [...state.savedCharacters, nextSheet],
      sheets: [...state.sheets, nextSheet],
      savedRoleplays: syncSavedRoleplaySheets(state.savedRoleplays, state.currentSaveRoleplayId, [...state.sheets, nextSheet]),
      activeSheetId: nextSheet.id,
    }));
  },
  updateSheet: (id: string, updates: Partial<Sheet>) => {
    const state = get();
    const user = auth.currentUser;
    const existing = state.savedCharacters.find((sheet: Sheet) => sheet.id === id) || state.sessionSheets.find((sheet: Sheet) => sheet.id === id) || state.sheets.find((sheet: Sheet) => sheet.id === id);
    const nextSheet = existing ? { ...existing, ...updates, lastSeen: Date.now() } : null;
    if (user && nextSheet && JSON.stringify(existing) !== JSON.stringify(nextSheet)) {
      getUserSheetWriter(id)(user.uid, { ...nextSheet, archived: nextSheet.archived || false });
      if (state.isLive && state.currentLiveRoleplayId && state.sessionSheets.some((sheet: Sheet) => sheet.id === id)) {
        getRoleplaySheetWriter(state.currentLiveRoleplayId, id)(nextSheet);
      }
    }
    set((current: any) => ({
      savedCharacters: current.savedCharacters.map((sheet: Sheet) => sheet.id === id ? { ...sheet, ...updates } : sheet),
      sheets: current.sheets.map((sheet: Sheet) => sheet.id === id ? { ...sheet, ...updates } : sheet),
      sessionSheets: current.sessionSheets.map((sheet: Sheet) => sheet.id === id ? { ...sheet, ...updates, lastSeen: Date.now() } : sheet),
      savedRoleplays: syncSavedRoleplaySheets(
        current.savedRoleplays,
        current.currentSaveRoleplayId,
        current.sheets.map((sheet: Sheet) => sheet.id === id ? { ...sheet, ...updates } : sheet)
      ),
    }));
  },
  deleteSheet: (id: string) => {
    const state = get();
    const user = auth.currentUser;
    if (user) {
      deleteDoc(doc(db, 'users', user.uid, 'sheets', id)).catch(console.error);
      if (state.currentLiveRoleplayId) {
        deleteDoc(doc(db, 'roleplays', state.currentLiveRoleplayId, 'sheets', id)).catch(console.error);
      }
    }
    set((current: any) => ({
      savedCharacters: current.savedCharacters.filter((sheet: Sheet) => sheet.id !== id),
      sheets: current.sheets.filter((sheet: Sheet) => sheet.id !== id),
      sessionSheets: current.sessionSheets.filter((sheet: Sheet) => sheet.id !== id),
      savedRoleplays: syncSavedRoleplaySheets(
        current.savedRoleplays,
        current.currentSaveRoleplayId,
        current.sheets.filter((sheet: Sheet) => sheet.id !== id)
      ),
      activeSheetId: current.activeSheetId === id ? null : current.activeSheetId,
    }));
  },
  archiveSheet: (id: string, archived: boolean) => set((state: any) => ({ savedCharacters: state.savedCharacters.map((sheet: Sheet) => sheet.id === id ? { ...sheet, archived } : sheet) })),
  copySheet: async (id: string) => {
    const state = get();
    const sheet = state.savedCharacters.find((item: Sheet) => item.id === id) || state.sheets.find((item: Sheet) => item.id === id);
    if (!sheet) return;
    const copy = { ...sheet, id: makeId(), name: `${sheet.name || 'Character'} Copy` };
    get().addSheet(copy);
  },
  saveSheetAsTemplate: (sheetId: string, templateName: string) => set((state: any) => {
    const sheet = state.savedCharacters.find((item: Sheet) => item.id === sheetId) || state.sheets.find((item: Sheet) => item.id === sheetId);
    if (!sheet) return {};
    return { sheetTemplates: [...state.sheetTemplates, { id: makeId(), name: templateName, type: sheet.type, customStats: sheet.customStats, customText: sheet.customText }] };
  }),
  deleteTemplate: (id: string) => set((state: any) => ({ sheetTemplates: state.sheetTemplates.filter((item: SheetTemplate) => item.id !== id) })),
  createSheetFromTemplate: (templateId: string) => {
    const template = get().sheetTemplates.find((item: SheetTemplate) => item.id === templateId);
    if (!template) return;
    get().addSheet({ id: makeId(), name: template.name, type: template.type, customStats: template.customStats || [], customText: template.customText || '', level: 1, hp: 10, maxHp: 10, ac: 10 });
  },
  addLoreEntry: (entry: any) => {
    const id = makeId();
    const state = get();
    const nextEntry = { id, ...entry };
    set((current: any) => ({ lorebook: [...current.lorebook, nextEntry] }));
    if (state.currentLiveRoleplayId) {
      setDoc(doc(db, 'roleplays', state.currentLiveRoleplayId, 'lorebook', id), cleanObject(nextEntry), { merge: true } as any).catch(console.error);
    }
    return id;
  },
  updateLoreEntry: (id: string, updates: any) => {
    const state = get();
    const currentEntry = state.lorebook.find((entry: LoreEntry) => entry.id === id);
    const nextEntry = currentEntry ? { ...currentEntry, ...updates } : null;
    set((current: any) => ({ lorebook: current.lorebook.map((entry: LoreEntry) => entry.id === id ? { ...entry, ...updates } : entry) }));
    if (state.currentLiveRoleplayId && nextEntry) {
      setDoc(doc(db, 'roleplays', state.currentLiveRoleplayId, 'lorebook', id), cleanObject(nextEntry), { merge: true } as any).catch(console.error);
    }
  },
  deleteLoreEntry: (id: string) => {
    const state = get();
    set((current: any) => ({ lorebook: current.lorebook.filter((entry: LoreEntry) => entry.id !== id), selectedLoreId: current.selectedLoreId === id ? null : current.selectedLoreId }));
    if (state.currentLiveRoleplayId) {
      deleteDoc(doc(db, 'roleplays', state.currentLiveRoleplayId, 'lorebook', id)).catch(console.error);
    }
  },
  setLorebook: (entries: any[]) => set({ lorebook: entries }),
  moveLoreEntry: (id: string, parentId: string) => {
    const state = get();
    const currentEntry = state.lorebook.find((entry: LoreEntry) => entry.id === id);
    const nextEntry = currentEntry ? { ...currentEntry, parentId } : null;
    set((current: any) => ({ lorebook: current.lorebook.map((entry: LoreEntry) => entry.id === id ? { ...entry, parentId } : entry) }));
    if (state.currentLiveRoleplayId && nextEntry) {
      setDoc(doc(db, 'roleplays', state.currentLiveRoleplayId, 'lorebook', id), cleanObject(nextEntry), { merge: true } as any).catch(console.error);
    }
  },
  setCurrentNPCs: (npcs: any[]) => set({ currentNPCs: npcs }),
  addMessage: async (message: any) => {
    const state = get();
    const defaultSheetId = ['user', 'dice', 'ooc'].includes(message.role) ? (message.sheetId || state.activeSheetId || undefined) : undefined;
    const defaultSenderId = message.role === 'assistant' ? undefined : (message.senderId || auth.currentUser?.uid);
    const nextMessage = { id: message.id || makeId(), timestamp: message.timestamp || Date.now(), sheetId: defaultSheetId, senderId: defaultSenderId, ...message };
    if (state.isLive && state.currentLiveRoleplayId) {
      set((current: any) => ({
        messages: sortMessagesByTimeline([
          ...current.messages.filter((item: Message) => item.id !== nextMessage.id),
          nextMessage,
        ]),
      }));
      await setDoc(doc(db, 'roleplays', state.currentLiveRoleplayId, 'messages', nextMessage.id), cleanObject(nextMessage));
      return;
    }
    set((current: any) => ({
      messages: sortMessagesByTimeline([...current.messages, nextMessage]),
      savedRoleplays: syncSavedRoleplayMessages(
        current.savedRoleplays,
        current.currentSaveRoleplayId,
        sortMessagesByTimeline([...current.messages, nextMessage])
      ),
      lastSaved: Date.now(),
    }));
  },
  updateMessage: async (id: string, content: string) => {
    const state = get();
    const nextMessages = state.messages.map((message: Message) => message.id === id ? { ...message, content } : message);
    set((current: any) => ({
      messages: nextMessages,
      savedRoleplays: syncSavedRoleplayMessages(current.savedRoleplays, current.currentSaveRoleplayId, nextMessages),
    }));
    if (state.isLive && state.currentLiveRoleplayId) {
      await setDoc(doc(db, 'roleplays', state.currentLiveRoleplayId, 'messages', id), { content }, { merge: true } as any).catch(console.error);
    }
  },
  toggleMessageCollapse: (id: string) => set((state: any) => ({ messages: state.messages.map((message: Message) => message.id === id ? { ...message, isCollapsed: !message.isCollapsed } : message) })),
  clearMessages: () => set({ messages: [] }),
  rewindToMessage: (id: string) => set((state: any) => {
    const index = state.messages.findIndex((message: Message) => message.id === id);
    return index === -1 ? {} : { messages: state.messages.slice(0, index + 1) };
  }),
  branchFromMessage: (_id: string, branchName: string) => set({ currentRoleplayName: branchName }),
  saveRoleplay: (name: string) => {
    const state = get();
    const user = auth.currentUser;
    const id = state.currentSaveRoleplayId || makeId();
    const existingSaved = state.savedRoleplays.find((item: SavedRoleplay) => item.id === id);
    const saved = {
      id,
      name,
      messages: state.messages,
      systemRules: state.systemRules,
      mood: state.mood,
      visualStyle: state.visualStyle,
      lorebook: state.lorebook,
      currentNPCs: state.currentNPCs,
      updatedAt: Date.now(),
      sheets: state.isLive ? state.sessionSheets : state.sheets,
      quests: state.quests,
      timeline: state.timeline,
      combat: state.combat,
      clocks: state.clocks,
      notes: state.notes,
      promotedToRoleplayId: existingSaved?.promotedToRoleplayId,
    };
    if (user) {
      getSavedRoleplayWriter(id)(user.uid, saved);
    }
    set((current: any) => ({
      savedRoleplays: [...current.savedRoleplays.filter((item: SavedRoleplay) => item.id !== id), saved],
      currentRoleplayId: id,
      currentSaveRoleplayId: id,
      currentLiveRoleplayId: null,
      currentRoleplayName: name,
      lastSaved: Date.now(),
    }));
  },
  forkRoleplay: async (id: string, name: string) => {
    const state = get();
    const user = auth.currentUser;
    const roleplay = state.savedRoleplays.find((item: SavedRoleplay) => item.id === id);
    if (!roleplay) return null;
    const forkId = makeId();
    const now = Date.now();
    const forkedRoleplay: SavedRoleplay = {
      ...roleplay,
      id: forkId,
      name,
      updatedAt: now,
      promotedToRoleplayId: undefined,
    };
    if (user) {
      getSavedRoleplayWriter(forkId)(user.uid, forkedRoleplay);
    }
    set((current: any) => ({
      savedRoleplays: [...current.savedRoleplays.filter((item: SavedRoleplay) => item.id !== forkId), forkedRoleplay],
      currentRoleplayId: forkId,
      currentSaveRoleplayId: forkId,
      currentLiveRoleplayId: null,
      currentRoleplayName: name,
      messages: forkedRoleplay.messages || [],
      systemRules: forkedRoleplay.systemRules || defaultSystemRules,
      mood: forkedRoleplay.mood || '',
      visualStyle: forkedRoleplay.visualStyle || '',
      lorebook: forkedRoleplay.lorebook || [],
      currentNPCs: forkedRoleplay.currentNPCs || [],
      quests: forkedRoleplay.quests || [],
      timeline: forkedRoleplay.timeline || [],
      combat: forkedRoleplay.combat || { active: false, turnIndex: 0, combatants: [] },
      clocks: forkedRoleplay.clocks || [],
      notes: forkedRoleplay.notes || '',
      sheets: forkedRoleplay.sheets || [],
      sessionSheets: forkedRoleplay.sheets || [],
      activeSheetId: forkedRoleplay.sheets?.[0]?.id || null,
      isLive: false,
      lastSaved: now,
    }));
    return forkId;
  },
  loadRoleplay: (id: string) => set((state: any) => {
    if (activeRoleplaySyncCleanup) {
      activeRoleplaySyncCleanup();
      activeRoleplaySyncCleanup = null;
    }
    const roleplay = state.savedRoleplays.find((item: SavedRoleplay) => item.id === id);
    if (!roleplay) return {};
    return {
      currentRoleplayId: roleplay.id,
      currentSaveRoleplayId: roleplay.id,
      currentLiveRoleplayId: null,
      currentRoleplayName: roleplay.name,
      messages: roleplay.messages || [],
      systemRules: roleplay.systemRules || defaultSystemRules,
      mood: roleplay.mood || '',
      visualStyle: roleplay.visualStyle || '',
      lorebook: roleplay.lorebook || [],
      currentNPCs: roleplay.currentNPCs || [],
      quests: roleplay.quests || [],
      timeline: roleplay.timeline || [],
      combat: roleplay.combat || { active: false, turnIndex: 0, combatants: [] },
      clocks: roleplay.clocks || [],
      notes: roleplay.notes || '',
      sheets: roleplay.sheets || [],
      sessionSheets: roleplay.sheets || [],
      activeSheetId: roleplay.sheets?.[0]?.id || null,
      isLive: false,
      isHost: false,
      joinCode: null,
      typingUsers: {},
      isAIGenerating: false,
      connectedPlayers: [],
      admins: [],
      editors: [],
    };
  }),
  applyAdventureSetup: async ({
    systemRules,
    contextAndRules,
    mood,
    visualStyle,
    messages,
  }: {
    systemRules: string;
    contextAndRules: string;
    mood: string;
    visualStyle: string;
    messages: Array<Omit<Message, 'id'>>;
  }) => {
    const state = get();
    const user = auth.currentUser;
    const now = Date.now();
    const seededMessages = messages.map((message, index) => ({
      id: makeId(),
      timestamp: now + index,
      ...message,
    })) as Message[];
    const resetCombat = { active: false, turnIndex: 0, combatants: [] };

    set({
      systemRules,
      contextAndRules,
      mood,
      visualStyle,
      messages: seededMessages,
      lorebook: [],
      currentNPCs: [],
      quests: [],
      timeline: [],
      combat: resetCombat,
      clocks: [],
      notes: '',
      lastSaved: now,
    });

    if (state.isLive && state.currentLiveRoleplayId) {
      const { getDocs } = await import('firebase/firestore');
      const [messageSnap, loreSnap, questSnap, timelineSnap] = await Promise.all([
        getDocs(collection(db, 'roleplays', state.currentLiveRoleplayId, 'messages')),
        getDocs(collection(db, 'roleplays', state.currentLiveRoleplayId, 'lorebook')),
        getDocs(collection(db, 'roleplays', state.currentLiveRoleplayId, 'quests')),
        getDocs(collection(db, 'roleplays', state.currentLiveRoleplayId, 'timeline')),
      ]);

      await Promise.all([
        ...messageSnap.docs.map((docSnap) => deleteDoc(doc(db, 'roleplays', state.currentLiveRoleplayId, 'messages', docSnap.id)).catch(console.error)),
        ...loreSnap.docs.map((docSnap) => deleteDoc(doc(db, 'roleplays', state.currentLiveRoleplayId, 'lorebook', docSnap.id)).catch(console.error)),
        ...questSnap.docs.map((docSnap) => deleteDoc(doc(db, 'roleplays', state.currentLiveRoleplayId, 'quests', docSnap.id)).catch(console.error)),
        ...timelineSnap.docs.map((docSnap) => deleteDoc(doc(db, 'roleplays', state.currentLiveRoleplayId, 'timeline', docSnap.id)).catch(console.error)),
      ]);

      await updateDoc(doc(db, 'roleplays', state.currentLiveRoleplayId), {
        systemRules,
        contextAndRules,
        mood,
        visualStyle,
        currentNPCs: [],
        combat: resetCombat,
        clocks: [],
        notes: '',
        updatedAt: now,
      }).catch(console.error);

      await Promise.all(
        seededMessages.map((message) =>
          setDoc(doc(db, 'roleplays', state.currentLiveRoleplayId!, 'messages', message.id), cleanObject(message)).catch(console.error)
        )
      );
      return;
    }

    const saveId = state.currentSaveRoleplayId || makeId();
    const existingSaved = state.savedRoleplays.find((item: SavedRoleplay) => item.id === saveId);
    const saved: SavedRoleplay = {
      id: saveId,
      name: state.currentRoleplayName || 'New Adventure',
      messages: seededMessages,
      systemRules,
      mood,
      visualStyle,
      lorebook: [],
      currentNPCs: [],
      updatedAt: now,
      sheets: state.sheets,
      quests: [],
      timeline: [],
      combat: resetCombat,
      clocks: [],
      notes: '',
      promotedToRoleplayId: existingSaved?.promotedToRoleplayId,
    };
    if (user) {
      getSavedRoleplayWriter(saveId)(user.uid, saved);
    }
    set((current: any) => ({
      currentRoleplayId: saveId,
      currentSaveRoleplayId: saveId,
      currentLiveRoleplayId: null,
      savedRoleplays: [...current.savedRoleplays.filter((item: SavedRoleplay) => item.id !== saveId), saved],
    }));
  },
  setAiAutoRespond: (autoRespond: boolean) => set({ aiAutoRespond: autoRespond }),
  setAiEditEnabled: (enabled: boolean) => {
    const state = get();
    set({ aiEditEnabled: enabled });
    if (state.currentLiveRoleplayId && state.isHost) {
      updateDoc(doc(db, 'roleplays', state.currentLiveRoleplayId), {
        aiEditEnabled: enabled,
        updatedAt: Date.now(),
      }).catch(console.error);
    }
  },
  setRequireRolls: (requireRolls: boolean) => set({ requireRolls }),
  setActiveSheet: (id: string | null) => set({ activeSheetId: id }),
  addLootToInventory: (loot: any) => set((state: any) => {
    if (!state.activeSheetId) return { suggestedLoot: state.suggestedLoot.filter((item: any) => item.id !== loot.id) };
    return {
      suggestedLoot: state.suggestedLoot.filter((item: any) => item.id !== loot.id),
      sheets: state.sheets.map((sheet: Sheet) => sheet.id === state.activeSheetId ? { ...sheet, inventoryItems: [...(sheet.inventoryItems || []), loot] } : sheet),
      sessionSheets: state.sessionSheets.map((sheet: Sheet) => sheet.id === state.activeSheetId ? { ...sheet, inventoryItems: [...(sheet.inventoryItems || []), loot] } : sheet),
    };
  }),
  dismissLoot: (id: string) => set((state: any) => ({ suggestedLoot: state.suggestedLoot.filter((item: any) => item.id !== id) })),
  setTyping: (isTyping: boolean) => {
    const state = get();
    const userId = auth.currentUser?.uid || 'local';
    const attachedSheet = (state.sessionSheets as Sheet[]).find((sheet) => sheet.ownerId === auth.currentUser?.uid)
      || (state.sheets as Sheet[]).find((sheet) => sheet.id === state.activeSheetId)
      || (state.sheets as Sheet[]).find((sheet) => sheet.ownerId === auth.currentUser?.uid)
      || (state.savedCharacters as Sheet[]).find((sheet) => sheet.id === state.activeSheetId)
      || (state.savedCharacters as Sheet[]).find((sheet) => sheet.ownerId === auth.currentUser?.uid);
    const payload = {
      isTyping,
      timestamp: Date.now(),
      name: attachedSheet?.name || auth.currentUser?.displayName || 'Player'
    };
    if (!state.isLive || !state.currentLiveRoleplayId || !auth.currentUser?.uid) {
      set((current: any) => {
        const nextTypingUsers = { ...current.typingUsers };
        delete nextTypingUsers[userId];
        return { typingUsers: nextTypingUsers };
      });
      return;
    }
    if (state.isLive && state.currentLiveRoleplayId && auth.currentUser?.uid) {
      if (isTyping) {
        writeTypingPresence(state.currentLiveRoleplayId, userId, payload);
      } else {
        postPresenceUpdate({ roleplayId: state.currentLiveRoleplayId, userId, name: payload.name, isTyping: false });
      }
    }
    set((current: any) => {
      const nextTypingUsers = { ...current.typingUsers };
      if (isTyping) {
        nextTypingUsers[userId] = payload;
      } else {
        delete nextTypingUsers[userId];
      }
      return { typingUsers: nextTypingUsers };
    });
  },
  addCharacterToAdventure: async (sheetId: string) => {
    const state = get();
    const user = auth.currentUser;
    const source = state.savedCharacters.find((sheet: Sheet) => sheet.id === sheetId) || state.sheets.find((sheet: Sheet) => sheet.id === sheetId);
    if (!source) return;
    const attached = { ...source, ownerId: user?.uid || source.ownerId, lastSeen: Date.now() };
    set((current: any) => {
      const sessionSheets = current.isLive
        ? [
            ...current.sessionSheets.filter((sheet: Sheet) => sheet.ownerId !== attached.ownerId && sheet.id !== attached.id),
            attached,
          ]
        : current.sessionSheets;
      const nextSoloSheets = current.isLive
        ? current.sheets
        : current.sheets.some((sheet: Sheet) => sheet.id === attached.id)
          ? current.sheets.map((sheet: Sheet) => sheet.id === attached.id ? attached : sheet)
          : [...current.sheets, attached];
      return {
        sessionSheets,
        sheets: current.isLive ? sessionSheets : nextSoloSheets,
        savedRoleplays: current.isLive
          ? current.savedRoleplays
          : syncSavedRoleplaySheets(current.savedRoleplays, current.currentSaveRoleplayId, nextSoloSheets),
        activeSheetId: attached.id,
      };
    });
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'sheets', attached.id), cleanObject(attached), { merge: true } as any).catch(console.error);
    }
    if (state.currentLiveRoleplayId) {
      const previousForOwner = state.sessionSheets.find((sheet: Sheet) => sheet.ownerId === attached.ownerId && sheet.id !== attached.id);
      if (previousForOwner) {
        await deleteDoc(doc(db, 'roleplays', state.currentLiveRoleplayId, 'sheets', previousForOwner.id)).catch(console.error);
      }
      await setDoc(doc(db, 'roleplays', state.currentLiveRoleplayId, 'sheets', attached.id), cleanObject(attached), { merge: true } as any).catch(console.error);
      await updateDoc(doc(db, 'roleplays', state.currentLiveRoleplayId), { updatedAt: Date.now() }).catch(console.error);
    } else if (user && state.currentSaveRoleplayId) {
      const nextSoloSheets = state.sheets.some((sheet: Sheet) => sheet.id === attached.id)
        ? state.sheets.map((sheet: Sheet) => sheet.id === attached.id ? attached : sheet)
        : [...state.sheets, attached];
      getSavedRoleplayWriter(state.currentSaveRoleplayId)(user.uid, {
        ...(state.savedRoleplays.find((roleplay: SavedRoleplay) => roleplay.id === state.currentSaveRoleplayId) || {
          id: state.currentSaveRoleplayId,
          name: state.currentRoleplayName || 'New Adventure',
          messages: state.messages,
          systemRules: state.systemRules,
          mood: state.mood,
          visualStyle: state.visualStyle,
          lorebook: state.lorebook,
          currentNPCs: state.currentNPCs,
          updatedAt: Date.now(),
          quests: state.quests,
          timeline: state.timeline,
          combat: state.combat,
          clocks: state.clocks,
          notes: state.notes,
        }),
        sheets: nextSoloSheets,
        updatedAt: Date.now(),
      } as SavedRoleplay);
    }
  },
  removeCharacterFromAdventure: (sheetId: string) => get().removeSheetFromRoleplay(get().currentLiveRoleplayId || '', sheetId),
  hostSavedRoleplay: async (id) => {
    const state = get();
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in to host.');
    
    const roleplay = state.savedRoleplays.find(r => r.id === id);
    if (!roleplay) throw new Error('Adventure not found.');

    const { addDoc, collection, serverTimestamp, setDoc, doc } = await import('firebase/firestore');
    try {
      // 1. Create the main roleplay doc
      const hostedJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const roleplayRef = await addDoc(collection(db, 'roleplays'), {
        name: roleplay.name,
        ownerId: user.uid,
        ownerName: user.displayName || 'User',
        admins: [user.uid],
        editors: [],
        aiEditEnabled: roleplay.aiEditEnabled || false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        joinCode: hostedJoinCode,
        mood: roleplay.mood || '',
        visualStyle: roleplay.visualStyle || '',
        combat: roleplay.combat || { active: false, turnIndex: 0, combatants: [] },
        systemRules: roleplay.systemRules || '',
        ambientAudioUrl: roleplay.ambientAudioUrl || '',
        backgroundImageUrl: roleplay.backgroundImageUrl || '',
      });

      const newId = roleplayRef.id;

      // 2. Push messages
      if (roleplay.messages) {
        for (const msg of roleplay.messages) {
          await setDoc(doc(db, 'roleplays', newId, 'messages', msg.id), msg);
        }
      }

      // 3. Push lore
      if (roleplay.lorebook) {
        for (const entry of roleplay.lorebook) {
          await setDoc(doc(db, 'roleplays', newId, 'lorebook', entry.id), entry);
        }
      }

      // 4. Push sheets
      if (roleplay.sheets) {
        for (const sheet of roleplay.sheets) {
          await setDoc(doc(db, 'roleplays', newId, 'sheets', sheet.id), sheet);
        }
      }
      
      // 5. Push quests
      if (roleplay.quests) {
        for (const quest of roleplay.quests) {
          await setDoc(doc(db, 'roleplays', newId, 'quests', quest.id), quest);
        }
      }

      // 6. Push timeline
      if (roleplay.timeline) {
        for (const entry of roleplay.timeline) {
          await setDoc(doc(db, 'roleplays', newId, 'timeline', entry.id), entry);
        }
      }

      set((state: any) => ({
        currentRoleplayId: newId,
        currentSaveRoleplayId: null,
        currentLiveRoleplayId: newId,
        currentRoleplayName: roleplay.name,
        joinCode: hostedJoinCode,
        isLive: true,
        isHost: true,
        savedRoleplays: state.savedRoleplays.map((saved: SavedRoleplay) =>
          saved.id === id ? { ...saved, promotedToRoleplayId: newId } : saved
        ),
        userRoleplays: state.userRoleplays.some((rp: RoleplaySummary) => rp.id === newId)
          ? state.userRoleplays
          : [...state.userRoleplays, { id: newId, name: roleplay.name, ownerId: user.uid, joinCode: hostedJoinCode, updatedAt: Date.now(), admins: [user.uid], editors: [] }]
      }));
      await setDoc(doc(db, 'users', user.uid, 'savedRoleplays', id), { promotedToRoleplayId: newId }, { merge: true } as any).catch(console.error);
      return newId;
    } catch (e) {
      console.error("Failed to host saved roleplay:", e);
      throw e;
    }
  },
  deleteRoleplay: (id) => {
    const state = get();
    const user = auth.currentUser;
    if (state.currentSaveRoleplayId === id || state.currentLiveRoleplayId === id || state.currentRoleplayId === id) {
      set({ currentRoleplayId: null, currentSaveRoleplayId: null, currentLiveRoleplayId: null, joinCode: null });
    }
    if (user) {
      // If it's a saved roleplay (local to user)
      deleteDoc(doc(db, 'users', user.uid, 'savedRoleplays', id)).catch(console.error);
      
      // If it's a joined roleplay (remove from user's joined list)
      deleteDoc(doc(db, 'users', user.uid, 'joinedRoleplays', id)).catch(console.error);

      // We NO LONGER delete from the global 'roleplays' collection here
      // to ensure that one person's deletion doesn't affect others.
    }
    set((state) => ({
      savedRoleplays: state.savedRoleplays.filter(r => r.id !== id),
      userRoleplays: state.userRoleplays.filter(r => r.id !== id),
      joinedRoleplays: state.joinedRoleplays.filter(r => r.id !== id)
    }));
  },
  destroyRoleplay: async (id) => {
    const state = get();
    const user = auth.currentUser;
    if (!user) return;

    // Only the owner should be able to destroy a roleplay
    const rp = state.userRoleplays.find(r => r.id === id);
    if (!rp || rp.ownerId !== user.uid) {
      throw new Error("Only the host can permanently destroy a session.");
    }

    try {
      await deleteDoc(doc(db, 'roleplays', id));
      // Also remove from user's lists
      get().deleteRoleplay(id);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `roleplays/${id}`);
    }
  },
  renameRoleplay: async (id, newName) => {
    const state = get();
    const user = auth.currentUser;
    
    // 1. Update in local state lists
    set((state) => ({
      savedRoleplays: state.savedRoleplays.map(r => r.id === id ? { ...r, name: newName } : r),
      userRoleplays: state.userRoleplays.map(r => r.id === id ? { ...r, name: newName } : r),
      joinedRoleplays: state.joinedRoleplays.map(r => r.id === id ? { ...r, name: newName } : r),
      currentRoleplayName: state.currentSaveRoleplayId === id || state.currentLiveRoleplayId === id || state.currentRoleplayId === id
        ? newName
        : state.currentRoleplayName
    }));

    // 2. Update in Firestore
    if (user) {
      // Update in savedRoleplays
      const savedRef = doc(db, 'users', user.uid, 'savedRoleplays', id);
      const savedDoc = await getDoc(savedRef);
      if (savedDoc.exists()) {
        updateDoc(savedRef, { name: newName }).catch(console.error);
      }

      // Update in global roleplays if we're host
      const roleplayRef = doc(db, 'roleplays', id);
      const roleplayDoc = await getDoc(roleplayRef);
      if (roleplayDoc.exists() && roleplayDoc.data().ownerId === user.uid) {
        updateDoc(roleplayRef, { name: newName }).catch(console.error);
      }
      
      // Update in joinedRoleplays for other users? 
      // Usually we don't have access to other users' collections.
      // But we can update it in OUR joined list if we have it there.
      const joinedRef = doc(db, 'users', user.uid, 'joinedRoleplays', id);
      const joinedDoc = await getDoc(joinedRef);
      if (joinedDoc.exists()) {
        updateDoc(joinedRef, { name: newName }).catch(console.error);
      }
    }
  },
  autoNameCurrentAdventure: async (seedText?: string, force = false) => {
    const state = get();
    const targetId = state.currentLiveRoleplayId || state.currentSaveRoleplayId;
    const shouldRename = force || isGenericAdventureName(state.currentRoleplayName);
    if (!shouldRename) return state.currentRoleplayName;

    const transcriptSeed = [
      seedText || '',
      state.systemRules || '',
      state.contextAndRules || '',
      ...state.messages.slice(0, 4).map((message: Message) => message.content || ''),
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim()
      .slice(0, 2000);

    let nextTitle = '';
    if (transcriptSeed) {
      try {
        const provider = state.provider || 'gemini';
        const effectiveApiKey = state.apiKeys?.[provider]
          || (provider === 'gemini' ? state.apiKeys?.gemini || state.apiKey || undefined : state.apiKey || undefined);

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider,
            apiKey: effectiveApiKey,
            customEndpointUrl: state.customEndpointUrl,
            systemPrompt: 'You create short, evocative tabletop adventure titles. Return only one title, no quotes, no punctuation beyond what belongs in the title, and keep it under 6 words.',
            messages: [{
              role: 'user',
              content: `Create a short title for this adventure.\n\n${transcriptSeed}`,
            }],
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data?.text) {
          nextTitle = sanitizeAdventureTitle(data.text);
        }
      } catch (error) {
        console.error('Failed to auto-name adventure:', error);
      }
    }

    if (!nextTitle) {
      const firstNarrativeLine = (seedText || state.contextAndRules || state.messages[0]?.content || '')
        .split('\n')
        .find((line: string) => line.trim().length > 0);
      nextTitle = buildAdventureTitleFallback(state.mood, firstNarrativeLine);
    }

    if (!targetId) {
      set({ currentRoleplayName: nextTitle });
      return nextTitle;
    }

    await get().renameRoleplay(targetId, nextTitle);
    return nextTitle;
  },
  newRoleplay: async (isMultiplayer = false) => {
    const state = get();
    const user = auth.currentUser;
    if (activeRoleplaySyncCleanup) {
      activeRoleplaySyncCleanup();
      activeRoleplaySyncCleanup = null;
    }
    
    // Auto-save only solo adventures before starting a new one.
    // Live multiplayer sessions are already persisted and should not be cloned into solo saves.
    if (!state.isLive && state.messages.length > 1) {
      const date = new Date().toLocaleDateString();
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const logName = `Adventure Log - ${date} ${time}`;
      state.saveRoleplay(logName);
    }

    let newId = null;

    if (isMultiplayer && user) {
      try {
        const liveJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const roleplayRef = await addDoc(collection(db, 'roleplays'), {
          name: 'New Adventure',
          ownerId: user.uid,
          ownerName: user.displayName || 'User',
          admins: [user.uid],
          editors: [],
          aiEditEnabled: false,
          joinCode: liveJoinCode,
          updatedAt: Date.now(),
          createdAt: Date.now(),
          isPublic: false,
          activeSheetId: null,
          sheets: [],
          lorebook: [],
          quests: [],
          timeline: [],
          clocks: [],
          combat: { active: false, turnIndex: 0, combatants: [] },
          messages: [{
            id: 'welcome',
            role: 'assistant' as const,
            content: 'Welcome to your new adventure. The slate is clean. Where would you like to begin?',
          }],
        });
        newId = roleplayRef.id;
        // Update the doc with its own ID for convenience
        await updateDoc(roleplayRef, { id: roleplayRef.id });

        // Add to user's roleplays list so it shows in sidebar
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userRoleplays = userData.userRoleplays || [];
          await updateDoc(userDocRef, {
            userRoleplays: [...userRoleplays, {
              id: newId,
              name: 'New Adventure',
              updatedAt: Date.now()
            }]
          });
        }
        set((current: any) => ({
          userRoleplays: current.userRoleplays.some((rp: RoleplaySummary) => rp.id === newId)
            ? current.userRoleplays
            : [...current.userRoleplays, { id: newId, name: 'New Adventure', ownerId: user.uid, joinCode: liveJoinCode, updatedAt: Date.now(), admins: [user.uid], editors: [] }]
        }));
      } catch (e) {
        console.error("Failed to create new roleplay in Firestore:", e);
      }
    }

    const nextRoleplayId = newId || Math.random().toString(36).substring(7);
    const cleanState = {
      messages: [{
        id: 'welcome',
        role: 'assistant' as const,
        content: 'Welcome to your new adventure. The slate is clean. Where would you like to begin?',
      }],
      mood: '',
      visualStyle: '',
      lorebook: [],
      currentNPCs: [],
      quests: [],
      timeline: [],
      notes: '',
      clocks: [],
      combat: { active: false, turnIndex: 0, combatants: [] },
      contextAndRules: '',
      systemRules: defaultSystemRules,
      currentRoleplayId: nextRoleplayId,
      currentSaveRoleplayId: isMultiplayer ? null : nextRoleplayId,
      currentLiveRoleplayId: isMultiplayer ? newId : null,
      currentRoleplayName: 'New Adventure',
      sessionId: null,
      isHost: isMultiplayer,
      isLive: isMultiplayer,
      aiAutoRespond: true,
      activeSheetId: null,
      sheets: []
    };

    set(cleanState);
    
    if (isMultiplayer && newId) {
      state.syncRoleplay(newId);
    } else if (!isMultiplayer) {
      // For solo, save it immediately so it appears in sidebar
      state.saveRoleplay('New Adventure');
    }
  },

  promoteToMultiplayer: async () => {
    const state = get();
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in to promote to multiplayer.');
    const sourceSavedRoleplayId = state.savedRoleplays.some((rp: SavedRoleplay) => rp.id === state.currentSaveRoleplayId)
      ? state.currentSaveRoleplayId
      : null;

    try {
      const promotedJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const roleplayRef = await addDoc(collection(db, 'roleplays'), {
        name: state.currentRoleplayName || 'New Adventure',
        ownerId: user.uid,
        ownerName: user.displayName || 'User',
        admins: [user.uid],
        editors: [],
        aiEditEnabled: state.aiEditEnabled || false,
        joinCode: promotedJoinCode,
        updatedAt: Date.now(),
        createdAt: Date.now(),
        isPublic: false,
        activeSheetId: state.activeSheetId,
        sheets: state.sheets.map(s => ({ ...s })),
        lorebook: state.lorebook.map(e => ({ ...e })),
        quests: state.quests.map(q => ({ ...q })),
        timeline: state.timeline.map(t => ({ ...t })),
        clocks: state.clocks.map(c => ({ ...c })),
        combat: { ...state.combat },
        messages: state.messages.map(m => ({ ...m })),
        notes: state.notes,
        mood: state.mood,
        visualStyle: state.visualStyle,
        systemRules: state.systemRules,
        contextAndRules: state.contextAndRules
      });

      await updateDoc(roleplayRef, { id: roleplayRef.id });
      
      // Sync with the new live roleplay
      state.syncRoleplay(roleplayRef.id);
      set((current: any) => ({
        savedRoleplays: sourceSavedRoleplayId
          ? current.savedRoleplays.map((saved: SavedRoleplay) =>
              saved.id === sourceSavedRoleplayId ? { ...saved, promotedToRoleplayId: roleplayRef.id } : saved
            )
          : current.savedRoleplays,
        userRoleplays: current.userRoleplays.some((rp: RoleplaySummary) => rp.id === roleplayRef.id)
          ? current.userRoleplays
          : [...current.userRoleplays, { id: roleplayRef.id, name: state.currentRoleplayName || 'New Adventure', ownerId: user.uid, joinCode: promotedJoinCode, updatedAt: Date.now(), admins: [user.uid], editors: [] }]
      }));
      if (sourceSavedRoleplayId) {
        await setDoc(doc(db, 'users', user.uid, 'savedRoleplays', sourceSavedRoleplayId), { promotedToRoleplayId: roleplayRef.id }, { merge: true } as any).catch(console.error);
      }
      
      // Also add to user's roleplays list so it shows in sidebar
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRoleplays = userData.userRoleplays || [];
        if (!userRoleplays.some((rp: RoleplaySummary) => rp.id === roleplayRef.id)) {
          await updateDoc(userDocRef, {
            userRoleplays: [...userRoleplays, {
              id: roleplayRef.id,
              name: state.currentRoleplayName || 'New Adventure',
              updatedAt: Date.now()
            }]
          });
        }
      }
    } catch (e) {
      console.error("Failed to promote roleplay to multiplayer:", e);
      throw e;
    }
  },

  generateAIResponse: async (promptOverride?: string) => {
    const state = get();

    if (state.currentLiveRoleplayId) {
      postPresenceUpdate({ roleplayId: state.currentLiveRoleplayId, isAIGenerating: true });
    }
    set({ isAIGenerating: true });

    try {
      const activeSheet = state.sheets.find(s => s.id === state.activeSheetId) || state.sheets[0];
      
      const charContext = state.multiCharChat ? `
CHARACTER SHEETS (MULTIPLAYER):
${state.sheets.map(sheet => `
---
Name: ${sheet?.name || 'Unknown'}
${sheet?.type === 'bitd' ? `
Playbook: ${sheet?.bitd?.playbook} | Crew: ${sheet?.bitd?.crew}
Alias: ${sheet?.bitd?.alias} | Look: ${sheet?.bitd?.look}
Heritage: ${sheet?.bitd?.heritage} | Background: ${sheet?.bitd?.background}
Stress: ${sheet?.bitd?.stress}/9 | Trauma: ${sheet?.bitd?.trauma?.join(', ')}
Harm: Lvl 3: ${sheet?.bitd?.harm?.severe || 'None'}, Lvl 2: ${sheet?.bitd?.harm?.medium1 || 'None'}, ${sheet?.bitd?.harm?.medium2 || 'None'}, Lvl 1: ${sheet?.bitd?.harm?.light1 || 'None'}, ${sheet?.bitd?.harm?.light2 || 'None'}
Actions: 
  Insight: Hunt ${sheet?.bitd?.actions?.hunt}, Study ${sheet?.bitd?.actions?.study}, Survey ${sheet?.bitd?.actions?.survey}, Tinker ${sheet?.bitd?.actions?.tinker}
  Prowess: Finesse ${sheet?.bitd?.actions?.finesse}, Prowl ${sheet?.bitd?.actions?.prowl}, Skirmish ${sheet?.bitd?.actions?.skirmish}, Wreck ${sheet?.bitd?.actions?.wreck}
  Resolve: Attune ${sheet?.bitd?.actions?.attune}, Command ${sheet?.bitd?.actions?.command}, Consort ${sheet?.bitd?.actions?.consort}, Sway ${sheet?.bitd?.actions?.sway}
` : `
Custom Stats: ${sheet?.customStats?.map(s => `${s.name}: ${s.value}`).join(', ')}
`}
Inventory: ${sheet?.inventory || ''}
Backstory: ${sheet?.backstory || ''}
Appearance: ${sheet?.appearance || ''}
${sheet?.customText || ''}
---
`).join('\n')}
` : `
CHARACTER SHEET:
Name: ${activeSheet?.name || 'Unknown'}
${activeSheet?.type === 'bitd' ? `
Playbook: ${activeSheet?.bitd?.playbook} | Crew: ${activeSheet?.bitd?.crew}
Alias: ${activeSheet?.bitd?.alias} | Look: ${activeSheet?.bitd?.look}
Heritage: ${activeSheet?.bitd?.heritage} | Background: ${activeSheet?.bitd?.background}
Stress: ${activeSheet?.bitd?.stress}/9 | Trauma: ${activeSheet?.bitd?.trauma?.join(', ')}
Harm: Lvl 3: ${activeSheet?.bitd?.harm?.severe || 'None'}, Lvl 2: ${activeSheet?.bitd?.harm?.medium1 || 'None'}, ${activeSheet?.bitd?.harm?.medium2 || 'None'}, Lvl 1: ${activeSheet?.bitd?.harm?.light1 || 'None'}, ${activeSheet?.bitd?.harm?.light2 || 'None'}
Actions: 
  Insight: Hunt ${activeSheet?.bitd?.actions?.hunt}, Study ${activeSheet?.bitd?.actions?.study}, Survey ${activeSheet?.bitd?.actions?.survey}, Tinker ${activeSheet?.bitd?.actions?.tinker}
  Prowess: Finesse ${activeSheet?.bitd?.actions?.finesse}, Prowl ${activeSheet?.bitd?.actions?.prowl}, Skirmish ${activeSheet?.bitd?.actions?.skirmish}, Wreck ${activeSheet?.bitd?.actions?.wreck}
  Resolve: Attune ${activeSheet?.bitd?.actions?.attune}, Command ${activeSheet?.bitd?.actions?.command}, Consort ${activeSheet?.bitd?.actions?.consort}, Sway ${activeSheet?.bitd?.actions?.sway}
` : `
Custom Stats: ${activeSheet?.customStats?.map(s => `${s.name}: ${s.value}`).join(', ')}
`}
Inventory: ${activeSheet?.inventory || ''}
Backstory: ${activeSheet?.backstory || ''}
Appearance: ${activeSheet?.appearance || ''}
${activeSheet?.customText || ''}
`;

      const loreContext = state.lorebook.length > 0 
        ? `\nLOREBOOK:\n${state.lorebook.map(l => `[${l.category}] ${l.name}: ${l.description}`).join('\n')}`
        : '';

      const moodContext = state.mood ? `\nCRITICAL MOOD/TONE INSTRUCTION:\nThe mood and tone of this roleplay is: "${state.mood}". You must adapt your writing style, descriptions, and NPC behaviors to heavily reflect this mood.` : '';

      const contextAndRulesContext = state.contextAndRules ? `\n\nADDITIONAL CONTEXT AND RULES:\n${state.contextAndRules}` : '';

      const rollContext = state.requireRolls 
        ? `\nGAME MECHANICS (ROLLS ENABLED):
Use Blades in the Dark style and structure.
Frame scenes, risks, consequences, opportunities, and action in a way that fits Blades in the Dark.
Use fiction first. Describe what is happening in the scene first. Only after that, if needed, introduce mechanics in narrator text.
Only call for rolls when the outcome is uncertain and meaningful. Do not ask for rolls constantly. Let simple conversation, setup, and low-stakes actions happen naturally.
When a roll is needed, present it as narrator text only. State the action that fits best and, if relevant, the position, effect, and stakes. Keep this concise and outside of dialogue.
Only the narrator handles mechanics. Rolls, action choices, position, effect, consequences, resistance, clocks, stress, harm, and all other mechanics must only be introduced by narrator text, never by characters.
Never put mechanics in dialogue. No character may ask for a roll, mention a stat, discuss a check, or refer to game systems out loud.
Keep character dialogue fully in-world. Characters must speak naturally as people in the scene. They must never say game terms like "roll," "check," "Skirmish," "Prowl," "position," "effect," "stress," or any other mechanical language.
NPCs may create pressure, but never ask for rolls. NPCs may threaten, bargain, stall, attack, lie, or demand things, but they must never tell the player to roll or speak in meta terms.
Do not resolve the action until the player provides the roll result.
When the roll result is provided, interpret it using Blades in the Dark principles:
- 6: full success
- 4/5: partial success with consequence
- 1-3: bad outcome
Narrate consequences in-world. After a roll, describe outcomes, complications, danger, progress, or harm through scene narration, not through character speech about mechanics.`
        : `\nGAME MECHANICS (ROLLS DISABLED):
Use Blades in the Dark style and structure.
Do not ask the player to roll dice for any reason.
Resolve actions narratively through scene framing, risks, consequences, opportunities, pressure, and payoff, without using visible mechanics in the response.
Keep character dialogue fully in-world and never put mechanics in dialogue.`;

      /* Legacy prompt block retained only as inert historical reference.

STRICT CHARACTER CONTROL POLICY:
- NEVER write for the user’s character.
- Do not write their dialogue, actions, thoughts, feelings, reactions, body language, decisions, or intentions.
- Do not assume anything about the user’s character.
- Never state what they feel, want, think, notice, remember, realize, or intend unless the user explicitly wrote it.
- Do not force outcomes onto the user’s character.
- Do not make them comply, hesitate, step back, lean in, blush, freeze, panic, trust, submit, agree, or otherwise react unless the user explicitly says they do.
- Do not put words in the user’s mouth.
- Never generate dialogue for the user’s character.
- Do not describe automatic reactions for the user’s character (flinching, shivering, swallowing, staring, stiffening, relaxing, or going silent).
- Only control NPCs, the environment, and external events.
- When referring to the user’s character, use only what is explicit. Only mention details the user has directly stated or that are plainly visible and already established in the scene.
- When uncertain, do less. If there is any doubt whether something belongs to the user’s character, do not write it.

WRITING STYLE:
- Always write in third person. Narration, description, and character actions must be written in third person.
- Leave room for the user to respond. End replies in a way that leaves the user free to choose what their character says or does next.
- Do not soft-force. Avoid phrasing that pressures or implies the user’s character must react in a certain way (e.g., "drawing them in", "making them shiver").
- Respond only to what is on the page. Treat only explicit roleplay text from the user as canon. Do not invent off-screen actions, motives, or reactions for their character.

BLADES IN THE DARK FORMAT:
- Frame scenes, risks, consequences, opportunities, and action in a way that fits Blades in the Dark.
- Keep character dialogue fully in-world. Characters must speak naturally. They must NEVER say game terms like "roll", "check", "Skirmish", "Prowl", "position", "effect", "stress", or any other mechanical language.
- Only the narrator handles mechanics. Rolls, action choices, position, effect, consequences, resistance, clocks, stress, harm, and all other mechanics must only be introduced by narrator text, never by characters.
- Use fiction first. Describe what is happening in the scene first. Only after that, if needed, introduce mechanics in narrator text.
- Narrate consequences in-world. Describe outcomes, complications, danger, progress, or harm through scene narration, not through character speech about mechanics.
- NPCs may create pressure, but never ask for rolls. They may threaten, bargain, stall, attack, lie, or demand things, but they must never tell the player to roll or speak in meta terms. */

      const responseRulesContext = `\n\nAI RESPONSE RULES (${state.aiRulesPreset.replaceAll('_', ' ').toUpperCase()}):
${getAiRulesText(state.aiRulesPreset, state.customAiRules)}`;

      const multiplayerContext = state.isLive
        ? `\n\nMULTIPLAYER SESSION RULES:
This session may include multiple human players at once.
Treat each attached player character as controlled by a different real person unless the transcript explicitly states otherwise.
Never merge multiple player characters into one protagonist.
Never decide speech, thoughts, movement, agreement, consent, reactions, or outcomes for any player-controlled character.
When one player acts, do not invent simultaneous reactions or choices for the other player characters.
Keep the scene readable: be clear about which NPC is addressing which character and who is physically present.
Respond to the party as a living scene, but leave every player-controlled character free to answer for themselves.
Current attached player characters:
${(state.sessionSheets as Sheet[]).map((sheet) => `- ${sheet.name || 'Unknown Character'}`).join('\n') || '- No attached player characters yet.'}`
        : '';

      const stateUpdateContext = `\n\nSTATE UPDATES:
If the player's HP changes, their inventory changes, or the NPCs in the current scene change, you MUST append a JSON block at the very end of your response.
CRITICAL: Whenever a new character is introduced, or an unnamed character is given a name, or you mention a character that is NOT already in the LOREBOOK provided above, you MUST add them to the 'newLore' array with a description. This is mandatory for every single character introduction.
Format it exactly like this:
\`\`\`json
{
  "hpDelta": -2,
  "inventoryChanges": ["+ Iron Sword", "- 10 gp"],
  "newLore": [{"category": "NPC", "name": "Garrick", "description": "A burly blacksmith"}],
  "currentNPCs": [{"name": "Garrick", "relationship": "Friendly"}]
}
\`\`\`
Only include the fields that have changed. For currentNPCs, list ALL NPCs currently present in the scene.
CRITICAL: The JSON block MUST be at the very end of your response, OUTSIDE of any character tags like [Narrator]: or [Character]:.
${state.multiCharChat ? `\nMULTI-CHARACTER DIALOGUE:
When multiple characters are speaking, or when the narrator is describing the scene, you MUST use the following format to separate them:
[Narrator]: The description of the scene or the narrator's voice.
[Character Name]: "The character's dialogue."
[Another Character]: "Their dialogue."
The narrator should handle all story progression, environment descriptions, and roll requests. Characters should only handle their own dialogue and immediate actions.` : ''}`;

      const copilotContext = state.isCopilotMode 
        ? `\n\nCOPILOT MODE ACTIVE:
You are acting as a Co-Game Master. The player is the primary narrator. 
Your role is to:
1. Provide mechanical support (handling rolls, tracking HP, initiative).
2. Offer creative suggestions for the story, NPCs, or environment.
3. React to the player's narration and fill in the blanks.
4. Keep the story moving if the player gets stuck.
Do not take over the narrative; instead, support and enhance the player's vision.`
        : '';

      const systemPrompt = `${state.systemRules}\n\n${charContext}\n${loreContext}${moodContext}${contextAndRulesContext}${rollContext}${responseRulesContext}${multiplayerContext}${stateUpdateContext}${copilotContext}`;
      
      const rawMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
        ...state.messages
          .filter(m => m.role !== 'system' && m.id !== 'welcome')
          .map((m) => {
            const speakerSheet = (state.sessionSheets as Sheet[]).find((sheet) => sheet.id === m.sheetId)
              || (state.sessionSheets as Sheet[]).find((sheet) => sheet.ownerId === m.senderId)
              || (state.savedCharacters as Sheet[]).find((sheet) => sheet.id === m.sheetId)
              || (state.savedCharacters as Sheet[]).find((sheet) => sheet.ownerId === m.senderId);
            const speakerName = speakerSheet?.name || m.characterName || 'Player';
            const speakerPrefix = state.isLive && (m.role === 'user' || m.role === 'dice' || m.role === 'ooc')
              ? `[${m.role === 'ooc' ? 'OOC' : m.role === 'dice' ? 'Dice' : 'Player'}: ${speakerName}] `
              : '';
            return {
              role: (m.role === 'dice' || m.role === 'ooc' ? 'user' : m.role) as 'user' | 'assistant' | 'system',
              content: `${speakerPrefix}${m.content}`,
            };
          })
      ];

      // Combine consecutive messages of the same role
      const combinedMessages = rawMessages.reduce((acc, curr) => {
        const shouldMerge = acc.length > 0
          && acc[acc.length - 1].role === curr.role
          && !(state.isLive && curr.role === 'user');
        if (shouldMerge) {
          acc[acc.length - 1].content += '\n\n' + curr.content;
        } else {
          acc.push({ ...curr });
        }
        return acc;
      }, [] as { role: 'user' | 'assistant' | 'system'; content: string }[]);

      const requestMessages = promptOverride
        ? [
            ...combinedMessages,
            { role: 'user' as const, content: promptOverride },
          ]
        : combinedMessages;

      const apiKey = state.apiKeys[state.provider] || (state.provider === 'gemini' ? state.apiKeys.gemini || state.apiKey || '' : state.apiKey || '');
      if (state.provider === 'custom' && !state.customEndpointUrl) {
        throw new Error(`Custom endpoint URL is missing. Please configure it in Settings.`);
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: state.provider,
          apiKey: apiKey || undefined,
          customEndpointUrl: state.customEndpointUrl || undefined,
          systemPrompt,
          messages: requestMessages,
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('API Error Details:', data);
        throw new Error(data?.error?.message || `API request failed: ${response.status} ${response.statusText}`);
      }

      const aiResponse = data?.text || '';
      if (!aiResponse) {
        throw new Error('The AI returned an empty response.');
      }
      
      // Parse JSON block if present
      let cleanResponse = aiResponse;
      // More robust regex to catch JSON blocks even without newlines or with different spacing
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const updates = JSON.parse(jsonMatch[1]);
          cleanResponse = aiResponse.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
          
          set((s) => {
            const newState = { ...s };
            
            if (updates.hpDelta && s.activeSheetId) {
              const sheetIndex = s.sheets.findIndex(sh => sh.id === s.activeSheetId);
              if (sheetIndex !== -1) {
                const newSheets = [...s.sheets];
                const newHp = Math.max(0, Math.min(newSheets[sheetIndex].maxHp || 100, (newSheets[sheetIndex].hp || 0) + updates.hpDelta));
                newSheets[sheetIndex] = {
                  ...newSheets[sheetIndex],
                  hp: newHp
                };
                newState.sheets = newSheets;
                
                if (s.currentLiveRoleplayId) {
                  updateDoc(doc(db, 'roleplays', s.currentLiveRoleplayId, 'sheets', s.activeSheetId), { hp: newHp });
                }
              }
            }
            
            if (updates.inventoryChanges && s.activeSheetId) {
              const sheetIndex = s.sheets.findIndex(sh => sh.id === s.activeSheetId);
              if (sheetIndex !== -1) {
                const newSheets = [...s.sheets];
                const currentInv = newSheets[sheetIndex].inventory || '';
                const newInv = currentInv + (currentInv ? '\n' : '') + updates.inventoryChanges.join('\n');
                newSheets[sheetIndex] = {
                  ...newSheets[sheetIndex],
                  inventory: newInv
                };
                
                if (s.currentLiveRoleplayId) {
                  updateDoc(doc(db, 'roleplays', s.currentLiveRoleplayId, 'sheets', s.activeSheetId), { inventory: newInv });
                }
                
                // Also handle structured loot suggestions
                const lootItems = updates.inventoryChanges
                  .filter((change: string) => change.startsWith('+'))
                  .map((change: string) => {
                    const name = change.substring(1).trim();
                    return {
                      id: Math.random().toString(36).substring(7),
                      name,
                      quantity: 1
                    };
                  });
                
                if (lootItems.length > 0) {
                  newState.suggestedLoot = [...s.suggestedLoot, ...lootItems];
                }
                
                newState.sheets = newSheets;
              }
            }

            if (updates.newLore && Array.isArray(updates.newLore)) {
              const newLoreEntries = updates.newLore
                .filter((l: any) => l.name && !s.lorebook.some(existing => existing.name.toLowerCase() === l.name.toLowerCase()))
                .map((l: any) => {
                  const id = Math.random().toString(36).substring(7);
                  const entry = {
                    id,
                    category: l.category || 'NPC',
                    name: l.name || 'Unknown',
                    description: l.description || '',
                    parentId: null
                  };
                  
                  if (s.currentLiveRoleplayId) {
                    setDoc(doc(db, 'roleplays', s.currentLiveRoleplayId, 'lorebook', id), cleanObject(entry));
                  }

                  if ((entry.category || '').toLowerCase() === 'npc') {
                    const portraitPrompt = `${entry.name}: ${entry.description || 'A character portrait'} a close up portrait with a blurry background`;
                    get().generatePortrait(entry.id, portraitPrompt).catch((error: unknown) => {
                      console.error('Auto-generating NPC portrait failed:', error);
                    });
                  }
                  
                  return entry;
                });
                
              if (newLoreEntries.length > 0) {
                newState.lorebook = [...s.lorebook, ...newLoreEntries];
              }
            }

            if (updates.currentNPCs && Array.isArray(updates.currentNPCs)) {
              const newNPCs = updates.currentNPCs.map((n: any) => ({
                id: Math.random().toString(36).substring(7),
                name: n.name || 'Unknown',
                relationship: n.relationship || 'Neutral'
              }));
              newState.currentNPCs = newNPCs;
              
              if (s.currentLiveRoleplayId) {
                updateDoc(doc(db, 'roleplays', s.currentLiveRoleplayId), { currentNPCs: newNPCs });
              }
            }

            if (updates.notes && typeof updates.notes === 'string') {
              const newNotes = s.notes ? `${s.notes}\n\n${updates.notes}` : updates.notes;
              newState.notes = newNotes;
              if (s.currentLiveRoleplayId) {
                updateDoc(doc(db, 'roleplays', s.currentLiveRoleplayId), { notes: newNotes });
              }
            }

            if (updates.combat) {
              const newCombat = {
                ...s.combat,
                ...updates.combat,
                combatants: updates.combat.combatants ? updates.combat.combatants.map((c: any) => ({
                  id: Math.random().toString(36).substring(7),
                  ...c
                })) : s.combat.combatants
              };
              newState.combat = newCombat;
              
              if (s.currentLiveRoleplayId) {
                updateDoc(doc(db, 'roleplays', s.currentLiveRoleplayId), { combat: newCombat });
              }
            }

            if (updates.soundscape && s.soundscapesEnabled) {
              const url = SOUNDSCAPES[updates.soundscape];
              if (url) {
                newState.ambientAudioUrl = url;
                newState.isAudioPlaying = true;
              }
            }

            return newState;
          });
        } catch (e) {
          console.error("Failed to parse AI state updates:", e);
        }
      }

      const taggedSegments = Array.from(
        cleanResponse.matchAll(/\[(Narrator|[^\]]+)\]:\s*([\s\S]*?)(?=\n\s*\[(Narrator|[^\]]+)\]:|$)/g)
      );
      const shouldSplitTaggedResponse = state.multiCharChat || taggedSegments.length > 0;

      if (shouldSplitTaggedResponse) {
        const newMessages: Omit<Message, 'id'>[] = taggedSegments
          .map((match) => {
            const name = (match[1] || '').trim();
            const content = (match[2] || '').trim();
            if (!content) return null;
            return {
              role: 'assistant' as const,
              content,
              characterName: /^narrator$/i.test(name) ? undefined : name,
              type: /^narrator$/i.test(name) ? 'narrator' as const : 'character' as const,
            };
          })
          .filter(Boolean) as Omit<Message, 'id'>[];

        if (newMessages.length > 0) {
          const baseTime = Date.now();
          newMessages.forEach((msg, index) => {
            get().addMessage({ ...msg, timestamp: baseTime + index });
          });
        } else {
          get().addMessage({ role: 'assistant', content: cleanResponse.replace(/\[(Narrator|[^\]]+)\]:\s*/g, '').trim() || cleanResponse });
        }
      } else {
        get().addMessage({ role: 'assistant', content: cleanResponse });
      }

      if (isGenericAdventureName(get().currentRoleplayName)) {
        void get().autoNameCurrentAdventure(cleanResponse);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      get().addMessage({ role: 'system', content: `Error communicating with the oracle: ${errorMessage}` });
    } finally {
      set({ isAIGenerating: false });
      const s = get();
      if (s.currentLiveRoleplayId) {
        postPresenceUpdate({ roleplayId: s.currentLiveRoleplayId, isAIGenerating: false });
      }
    }
  }
}));
