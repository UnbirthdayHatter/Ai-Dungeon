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
};

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
  aiAutoRespond: false,
  aiEditEnabled: false,
  isHost: false,
  editors: [],
  userRoleplays: [] as RoleplaySummary[],
  joinedRoleplays: [] as RoleplaySummary[],
  connectedPlayers: [] as { id: string; name: string; permissions?: { role: 'admin' | 'editor' | 'viewer' } }[],
  currentRoleplayId: null,
  currentRoleplayName: 'New Adventure',
  joinCode: null,
  isLive: false,
  multiCharChat: false,
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
  generatePortrait: async () => {},
  setTheme: (theme: ThemeType) => set({ theme }),
  setSystemRules: (rules: string) => set({ systemRules: rules }),
  setContextAndRules: (rules: string) => set({ contextAndRules: rules }),
  setMood: (mood: string) => set({ mood }),
  setCurrentRoleplayId: (id: string | null) => {
    if (!id) {
      set({
        currentRoleplayId: null,
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
      currentRoleplayName: roleplay?.name || state.currentRoleplayName,
      joinCode: roleplay?.joinCode || state.joinCode,
      isLive: Boolean(roleplay),
      isHost: roleplay?.ownerId === auth.currentUser?.uid,
    });
  },
  createRoleplay: async (name: string) => {
    await get().newRoleplay(true);
    set({ currentRoleplayName: name || 'New Adventure' });
    return get().currentRoleplayId || makeId();
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
        return { ...rp, admins, editors };
      };
      const nextState = {
        userRoleplays: state.userRoleplays.map(updateRoleplay),
        joinedRoleplays: state.joinedRoleplays.map(updateRoleplay),
      };
      const roleplay = nextState.userRoleplays.find((rp: RoleplaySummary) => rp.id === roleplayId) || nextState.joinedRoleplays.find((rp: RoleplaySummary) => rp.id === roleplayId);
      if (roleplay) {
        updateDoc(doc(db, 'roleplays', roleplayId), {
          admins: roleplay.admins || [],
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
      admins: data.admins || [],
      ownerId: data.ownerId,
    };
    await setDoc(doc(db, 'users', user.uid, 'joinedRoleplays', roleplayDoc.id), joinedRoleplay, { merge: true } as any).catch(console.error);
    set((state: any) => ({
      joinedRoleplays: state.joinedRoleplays.some((rp: RoleplaySummary) => rp.id === joinedRoleplay.id)
        ? state.joinedRoleplays.map((rp: RoleplaySummary) => rp.id === joinedRoleplay.id ? joinedRoleplay : rp)
        : [...state.joinedRoleplays, joinedRoleplay],
      currentRoleplayId: joinedRoleplay.id,
      currentRoleplayName: joinedRoleplay.name,
      joinCode: joinedRoleplay.joinCode,
      isLive: true,
      isHost: data.ownerId === user.uid,
    }));
  },
  syncRoleplay: (id: string) => {
    const unsubscribers: Array<() => void> = [];
    get().refreshRoleplayCollections(id).catch(console.error);

    unsubscribers.push(onSnapshot(doc(db, 'roleplays', id), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as RoleplaySummary & Record<string, unknown>;
      const currentUserId = auth.currentUser?.uid;
      set((state: any) => {
        const sessionSheets = state.sessionSheets as Sheet[];
        const activeSheetId = data.activeSheetId
          || sessionSheets.find((sheet) => sheet.ownerId === currentUserId)?.id
          || sessionSheets[0]?.id
          || state.activeSheetId;
        return {
          currentRoleplayId: id,
          currentRoleplayName: data.name || state.currentRoleplayName,
          joinCode: data.joinCode || state.joinCode,
          mood: data.mood || '',
          systemRules: data.systemRules || state.systemRules,
          contextAndRules: data.contextAndRules || '',
          combat: data.combat || state.combat,
          notes: data.notes || '',
          currentNPCs: data.currentNPCs || [],
          isLive: true,
          isHost: data.ownerId === currentUserId,
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
      const messages = snap.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
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

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
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
    const id = roleplayId || get().currentRoleplayId;
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
  saveWorldPreset: (name: string) => set((state: any) => ({ worldPresets: [...state.worldPresets, { id: makeId(), name, systemRules: state.systemRules, contextAndRules: state.contextAndRules, mood: state.mood }] })),
  loadWorldPreset: (id: string) => set((state: any) => {
    const preset = state.worldPresets.find((item: WorldPreset) => item.id === id);
    return preset ? { systemRules: preset.systemRules, contextAndRules: preset.contextAndRules, mood: preset.mood } : {};
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
      sheets: state.isLive ? state.sheets : [...state.sheets, nextSheet],
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
      if (state.isLive && state.currentRoleplayId && state.sessionSheets.some((sheet: Sheet) => sheet.id === id)) {
        getRoleplaySheetWriter(state.currentRoleplayId, id)(nextSheet);
      }
    }
    set((current: any) => ({
      savedCharacters: current.savedCharacters.map((sheet: Sheet) => sheet.id === id ? { ...sheet, ...updates } : sheet),
      sheets: current.sheets.map((sheet: Sheet) => sheet.id === id ? { ...sheet, ...updates } : sheet),
      sessionSheets: current.sessionSheets.map((sheet: Sheet) => sheet.id === id ? { ...sheet, ...updates, lastSeen: Date.now() } : sheet),
    }));
  },
  deleteSheet: (id: string) => {
    const state = get();
    const user = auth.currentUser;
    if (user) {
      deleteDoc(doc(db, 'users', user.uid, 'sheets', id)).catch(console.error);
      if (state.currentRoleplayId) {
        deleteDoc(doc(db, 'roleplays', state.currentRoleplayId, 'sheets', id)).catch(console.error);
      }
    }
    set((current: any) => ({
      savedCharacters: current.savedCharacters.filter((sheet: Sheet) => sheet.id !== id),
      sheets: current.sheets.filter((sheet: Sheet) => sheet.id !== id),
      sessionSheets: current.sessionSheets.filter((sheet: Sheet) => sheet.id !== id),
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
    set((state: any) => ({ lorebook: [...state.lorebook, { id, ...entry }] }));
    return id;
  },
  updateLoreEntry: (id: string, updates: any) => set((state: any) => ({ lorebook: state.lorebook.map((entry: LoreEntry) => entry.id === id ? { ...entry, ...updates } : entry) })),
  deleteLoreEntry: (id: string) => set((state: any) => ({ lorebook: state.lorebook.filter((entry: LoreEntry) => entry.id !== id), selectedLoreId: state.selectedLoreId === id ? null : state.selectedLoreId })),
  setLorebook: (entries: any[]) => set({ lorebook: entries }),
  moveLoreEntry: (id: string, parentId: string) => set((state: any) => ({ lorebook: state.lorebook.map((entry: LoreEntry) => entry.id === id ? { ...entry, parentId } : entry) })),
  setCurrentNPCs: (npcs: any[]) => set({ currentNPCs: npcs }),
  addMessage: async (message: any) => {
    const state = get();
    const nextMessage = { id: message.id || makeId(), timestamp: message.timestamp || Date.now(), sheetId: message.sheetId || state.activeSheetId || undefined, senderId: message.senderId || auth.currentUser?.uid, ...message };
    if (state.isLive && state.currentRoleplayId) {
      await setDoc(doc(db, 'roleplays', state.currentRoleplayId, 'messages', nextMessage.id), cleanObject(nextMessage));
      return;
    }
    set((current: any) => ({
      messages: [...current.messages, nextMessage],
      lastSaved: Date.now(),
    }));
  },
  updateMessage: async (id: string, content: string) => set((state: any) => ({ messages: state.messages.map((message: Message) => message.id === id ? { ...message, content } : message) })),
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
    const id = state.currentRoleplayId || makeId();
    const saved = {
      id,
      name,
      messages: state.messages,
      systemRules: state.systemRules,
      mood: state.mood,
      lorebook: state.lorebook,
      currentNPCs: state.currentNPCs,
      updatedAt: Date.now(),
      sheets: state.isLive ? state.sessionSheets : state.sheets,
      quests: state.quests,
      timeline: state.timeline,
      combat: state.combat,
      clocks: state.clocks,
      notes: state.notes,
    };
    if (user) {
      getSavedRoleplayWriter(id)(user.uid, saved);
    }
    set((current: any) => ({
      savedRoleplays: [...current.savedRoleplays.filter((item: SavedRoleplay) => item.id !== id), saved],
      currentRoleplayId: id,
      currentRoleplayName: name,
      lastSaved: Date.now(),
    }));
  },
  forkRoleplay: (id: string, name: string) => {
    const roleplay = get().savedRoleplays.find((item: SavedRoleplay) => item.id === id);
    if (!roleplay) return;
    set((state: any) => ({ savedRoleplays: [...state.savedRoleplays, { ...roleplay, id: makeId(), name, updatedAt: Date.now() }] }));
  },
  loadRoleplay: (id: string) => set((state: any) => {
    const roleplay = state.savedRoleplays.find((item: SavedRoleplay) => item.id === id);
    if (!roleplay) return {};
    return {
      currentRoleplayId: roleplay.id,
      currentRoleplayName: roleplay.name,
      messages: roleplay.messages || [],
      systemRules: roleplay.systemRules || defaultSystemRules,
      mood: roleplay.mood || '',
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
    };
  }),
  setAiAutoRespond: (autoRespond: boolean) => set({ aiAutoRespond: autoRespond }),
  setAiEditEnabled: (enabled: boolean) => set({ aiEditEnabled: enabled }),
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
    const payload = { isTyping, timestamp: Date.now(), name: auth.currentUser?.displayName || 'Player' };
    if (state.isLive && state.currentRoleplayId && auth.currentUser?.uid) {
      if (isTyping) {
        writeTypingPresence(state.currentRoleplayId, userId, payload);
      } else {
        postPresenceUpdate({ roleplayId: state.currentRoleplayId, userId, name: payload.name, isTyping: false });
      }
    }
    set((current: any) => ({
      typingUsers: {
        ...current.typingUsers,
        [userId]: payload
      }
    }));
  },
  addCharacterToAdventure: async (sheetId: string) => {
    const state = get();
    const user = auth.currentUser;
    const source = state.savedCharacters.find((sheet: Sheet) => sheet.id === sheetId) || state.sheets.find((sheet: Sheet) => sheet.id === sheetId);
    if (!source) return;
    const attached = { ...source, ownerId: user?.uid || source.ownerId, lastSeen: Date.now() };
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'sheets', attached.id), cleanObject(attached), { merge: true } as any).catch(console.error);
    }
    if (state.currentRoleplayId) {
      await setDoc(doc(db, 'roleplays', state.currentRoleplayId, 'sheets', attached.id), cleanObject(attached), { merge: true } as any);
      await updateDoc(doc(db, 'roleplays', state.currentRoleplayId), { activeSheetId: attached.id, updatedAt: Date.now() }).catch(console.error);
    }
    set((current: any) => {
      const sessionSheets = current.sessionSheets.some((sheet: Sheet) => sheet.id === attached.id)
        ? current.sessionSheets.map((sheet: Sheet) => sheet.id === attached.id ? attached : sheet)
        : [...current.sessionSheets, attached];
      return {
        sessionSheets,
        sheets: current.isLive ? sessionSheets : current.sheets.some((sheet: Sheet) => sheet.id === attached.id) ? current.sheets : [...current.sheets, attached],
        activeSheetId: attached.id,
      };
    });
  },
  removeCharacterFromAdventure: (sheetId: string) => get().removeSheetFromRoleplay(get().currentRoleplayId || '', sheetId),
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        joinCode: hostedJoinCode,
        mood: roleplay.mood || '',
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
        currentRoleplayName: roleplay.name,
        joinCode: hostedJoinCode,
        userRoleplays: state.userRoleplays.some((rp: RoleplaySummary) => rp.id === newId)
          ? state.userRoleplays
          : [...state.userRoleplays, { id: newId, name: roleplay.name, ownerId: user.uid, joinCode: hostedJoinCode, updatedAt: Date.now() }]
      }));
      return newId;
    } catch (e) {
      console.error("Failed to host saved roleplay:", e);
      throw e;
    }
  },
  deleteRoleplay: (id) => {
    const state = get();
    const user = auth.currentUser;
    if (state.currentRoleplayId === id) {
      set({ currentRoleplayId: null, joinCode: null });
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
      currentRoleplayName: state.currentRoleplayId === id ? newName : state.currentRoleplayName
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
  newRoleplay: async (isMultiplayer = false) => {
    const state = get();
    const user = auth.currentUser;
    
    // Auto-save the current adventure before starting a new one
    if (state.messages.length > 1) {
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
            : [...current.userRoleplays, { id: newId, name: 'New Adventure', ownerId: user.uid, joinCode: liveJoinCode, updatedAt: Date.now() }]
        }));
      } catch (e) {
        console.error("Failed to create new roleplay in Firestore:", e);
      }
    }

    const cleanState = {
      messages: [{
        id: 'welcome',
        role: 'assistant' as const,
        content: 'Welcome to your new adventure. The slate is clean. Where would you like to begin?',
      }],
      mood: '',
      lorebook: [],
      currentNPCs: [],
      quests: [],
      timeline: [],
      notes: '',
      clocks: [],
      combat: { active: false, turnIndex: 0, combatants: [] },
      contextAndRules: '',
      systemRules: defaultSystemRules,
      currentRoleplayId: newId || Math.random().toString(36).substring(7),
      currentRoleplayName: 'New Adventure',
      sessionId: null,
      isHost: isMultiplayer,
      isLive: isMultiplayer,
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

    try {
      const promotedJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const roleplayRef = await addDoc(collection(db, 'roleplays'), {
        name: state.currentRoleplayName || 'New Adventure',
        ownerId: user.uid,
        ownerName: user.displayName || 'User',
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
        systemRules: state.systemRules,
        contextAndRules: state.contextAndRules
      });

      await updateDoc(roleplayRef, { id: roleplayRef.id });
      
      // Sync with the new live roleplay
      state.syncRoleplay(roleplayRef.id);
      set((current: any) => ({
        userRoleplays: current.userRoleplays.some((rp: RoleplaySummary) => rp.id === roleplayRef.id)
          ? current.userRoleplays
          : [...current.userRoleplays, { id: roleplayRef.id, name: state.currentRoleplayName || 'New Adventure', ownerId: user.uid, joinCode: promotedJoinCode, updatedAt: Date.now() }]
      }));
      
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

  generateAIResponse: async () => {
    const state = get();
    
    const getEffectiveApiKey = () => {
      if (state.provider === 'gemini') {
        try {
          return state.apiKeys.gemini || state.apiKey || process.env.GEMINI_API_KEY || '';
        } catch (e) {
          return state.apiKeys.gemini || state.apiKey || '';
        }
      }
      return state.apiKeys[state.provider] || state.apiKey || '';
    };

    if (!getEffectiveApiKey()) return;
    
    if (state.currentRoleplayId) {
      postPresenceUpdate({ roleplayId: state.currentRoleplayId, isAIGenerating: true });
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
You are a Game Master. Use Blades in the Dark mechanics.
When the player attempts an action with a chance of failure, you MUST ask them to make an Action Roll (e.g., "Roll Skirmish" or "Roll Prowl").
Only call for rolls when the outcome is uncertain and meaningful. Do not ask for rolls constantly.
When a roll is needed, present it as narrator text ONLY. State the action that fits best and, if relevant, the position, effect, and stakes. Keep this concise and outside of dialogue.
Do not resolve the action until they provide the roll result.
When they provide a roll result, you must interpret it based on the Blades in the Dark rules:
- 6: Critical Success (if multiple 6s) or Full Success. They do it well without consequences.
- 4/5: Partial Success. They do it, but there's a consequence (harm, stress, heat, or a complication).
- 1-3: Bad Outcome. Things go wrong. They don't achieve their goal and face a consequence.

COMBAT MECHANICS:
- Combat in BitD is handled via Action Rolls (Skirmish, Wreck, etc.).
- There is no Initiative roll. The narrative dictates who acts first.
- Track enemy resistance and harm narratively.
- When the player takes harm, describe it vividly and update their harm track if needed.
- NEVER resolve the player's actions without them rolling first.`
        : `\nGAME MECHANICS (ROLLS DISABLED):
You are a collaborative storyteller. Do not ask the player to roll dice for ANY reason.
Resolve all actions narratively based on their character's actions, stress, and the situation. Describe the flow of the story dynamically without using numbers or dice rolls.`;

      const noPromptingContext = `\n\nCRITICAL DIRECTIVE: End your response immediately after describing the outcome of the current action, the environment, or NPC dialogue. DO NOT ask questions like "What do you do?", "How do you proceed?", or "What is your next move?". DO NOT prompt the player for their next action. Let the player decide when and how to react.

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
- NPCs may create pressure, but never ask for rolls. They may threaten, bargain, stall, attack, lie, or demand things, but they must never tell the player to roll or speak in meta terms.`;

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

      const systemPrompt = `${state.systemRules}\n\n${charContext}\n${loreContext}${moodContext}${contextAndRulesContext}${rollContext}${noPromptingContext}${stateUpdateContext}${copilotContext}`;
      
      const rawMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
        ...state.messages
          .filter(m => m.role !== 'system' && m.id !== 'welcome')
          .map(m => ({ role: (m.role === 'dice' ? 'user' : m.role) as 'user' | 'assistant' | 'system', content: m.content }))
      ];

      // Combine consecutive messages of the same role
      const combinedMessages = rawMessages.reduce((acc, curr) => {
        if (acc.length > 0 && acc[acc.length - 1].role === curr.role) {
          acc[acc.length - 1].content += '\n\n' + curr.content;
        } else {
          acc.push({ ...curr });
        }
        return acc;
      }, [] as { role: 'user' | 'assistant' | 'system'; content: string }[]);

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...combinedMessages
      ];

      let endpoint = '';
      let model = '';
      let apiKey = '';

      switch (state.provider) {
        case 'openai':
          endpoint = 'https://api.openai.com/v1/chat/completions';
          model = 'gpt-4o-mini';
          apiKey = state.apiKeys.openai || '';
          break;
        case 'anthropic':
          endpoint = 'https://api.anthropic.com/v1/messages';
          model = 'claude-3-haiku-20240307';
          apiKey = state.apiKeys.anthropic || '';
          break;
        case 'openrouter':
          endpoint = 'https://openrouter.ai/api/v1/chat/completions';
          model = 'gryphe/mythomax-l2-13b';
          apiKey = state.apiKeys.openrouter || '';
          break;
        case 'custom':
          endpoint = state.customEndpointUrl || '';
          model = 'default';
          apiKey = state.apiKeys.custom || '';
          break;
        case 'gemini':
          apiKey = state.apiKeys.gemini || state.apiKey || process.env.GEMINI_API_KEY || '';
          break;
        case 'deepseek':
        default:
          endpoint = 'https://api.deepseek.com/chat/completions';
          model = 'deepseek-chat';
          apiKey = state.apiKeys.deepseek || state.apiKey || '';
          break;
      }

      if (!apiKey) {
        throw new Error(`API key for ${state.provider} is missing. Please configure it in Settings.`);
      }
      if (state.provider === 'custom' && !endpoint) {
        throw new Error(`Custom endpoint URL is missing. Please configure it in Settings.`);
      }

      let response;
      let aiResponse = '';
      if (state.provider === 'gemini') {
        const { GoogleGenAI } = await import("@google/genai");
        const { withRetry } = await import("@/lib/utils");
        const ai = new GoogleGenAI({ apiKey });
        
        const result = await withRetry(() => ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: apiMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
          }
        }));
        
        aiResponse = result?.text || '';
      } else if (state.provider === 'anthropic') {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey.trim(),
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model,
            system: systemPrompt,
            messages: combinedMessages,
            max_tokens: 1000,
            temperature: 0.7,
          })
        });
      } else {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`
          },
          body: JSON.stringify({
            model,
            messages: apiMessages,
            temperature: 0.7,
            max_tokens: 1000,
          })
        });
      }

      if (state.provider !== 'gemini') {
        if (!response || !response.ok) {
          const errorData = await response?.json().catch(() => ({}));
          console.error('API Error Details:', errorData);
          throw new Error(`API request failed: ${response?.status} ${response?.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        if (state.provider === 'anthropic') {
          aiResponse = data.content[0].text;
        } else {
          aiResponse = data.choices[0].message.content;
        }
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
                
                if (s.currentRoleplayId) {
                  updateDoc(doc(db, 'roleplays', s.currentRoleplayId, 'sheets', s.activeSheetId), { hp: newHp });
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
                
                if (s.currentRoleplayId) {
                  updateDoc(doc(db, 'roleplays', s.currentRoleplayId, 'sheets', s.activeSheetId), { inventory: newInv });
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
                  
                  if (s.currentRoleplayId) {
                    setDoc(doc(db, 'roleplays', s.currentRoleplayId, 'lorebook', id), cleanObject(entry));
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
              
              if (s.currentRoleplayId) {
                updateDoc(doc(db, 'roleplays', s.currentRoleplayId), { currentNPCs: newNPCs });
              }
            }

            if (updates.notes && typeof updates.notes === 'string') {
              const newNotes = s.notes ? `${s.notes}\n\n${updates.notes}` : updates.notes;
              newState.notes = newNotes;
              if (s.currentRoleplayId) {
                updateDoc(doc(db, 'roleplays', s.currentRoleplayId), { notes: newNotes });
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
              
              if (s.currentRoleplayId) {
                updateDoc(doc(db, 'roleplays', s.currentRoleplayId), { combat: newCombat });
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

      // Split response into multiple messages if multiCharChat is enabled
      if (state.multiCharChat) {
        const parts = cleanResponse.split(/\[(.*?)\]:/g);
        const newMessages: Omit<Message, 'id'>[] = [];
        
        for (let i = 1; i < parts.length; i += 2) {
          const name = parts[i].trim();
          const content = parts[i + 1]?.trim();
          
          if (content) {
            newMessages.push({
              role: 'assistant',
              content,
              characterName: name === 'Narrator' ? undefined : name,
              type: name === 'Narrator' ? 'narrator' : 'character'
            });
          }
        }
        
        if (newMessages.length > 0) {
          const baseTime = Date.now();
          newMessages.forEach((msg, index) => {
            get().addMessage({ ...msg, timestamp: baseTime + index });
          });
        } else {
          // Fallback if no tags found
          get().addMessage({ role: 'assistant', content: cleanResponse });
        }
      } else {
        get().addMessage({ role: 'assistant', content: cleanResponse });
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      get().addMessage({ role: 'system', content: `Error communicating with the oracle: ${errorMessage}` });
    } finally {
      set({ isAIGenerating: false });
      const s = get();
      if (s.currentRoleplayId) {
        postPresenceUpdate({ roleplayId: s.currentRoleplayId, isAIGenerating: false });
      }
    }
  }
}));
