import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { THEME_CLASSES } from '@/constants';
import { auth } from '../firebase';
import { Send, Bot, User, Dices, Shield, ToggleLeft, ToggleRight, Download, Zap, RotateCcw, PlusCircle, Timer, ScrollText, MessageSquare, Book, Volume2, Pencil, FileText, History, ChevronDown, UserPlus, Info, Copy, Check, LogOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { LoreLinker } from './LoreLinker';
import { speak } from '@/lib/audio';
import { cn } from '@/lib/utils';
import { calculateModifier, calculateProficiencyBonus } from '@/lib/dnd';
import { NPCTracker } from './NPCTracker';
import { HUD } from './HUD';
import { Dice3D } from './Dice3D';

export function Chat() {
  const { 
    messages, 
    addMessage, 
    apiKeys,
    apiKey,
    isAIGenerating,
    generateAIResponse,
    sheets,
    activeSheetId,
    requireRolls,
    setRequireRolls,
    rewindToMessage,
    branchFromMessage,
    updateMessage,
    addLoreEntry,
    suggestedLoot,
    addLootToInventory,
    dismissLoot,
    theme,
    showDiceFX,
    multiCharChat,
    setActiveTab,
    setSelectedLoreId,
    showClocks,
    setShowClocks,
    showJournal,
    setShowJournal,
    ttsEnabled,
    ttsVolume,
    selectedVoice,
    ttsProvider,
    isCopilotMode,
    provider,
    sessionSheets,
    isHost,
    aiAutoRespond,
    setAiAutoRespond,
    currentLiveRoleplayId,
    userRoleplays,
    joinedRoleplays,
    savedRoleplays,
    loadRoleplay,
    newRoleplay,
    kokoroUrl,
    lorebook,
    isSaving,
    lastSaved,
    typingUsers,
    setTyping,
    currentRoleplayName,
    isLive,
    promoteToMultiplayer,
    isOocMode,
    setIsOocMode,
    toggleMessageCollapse,
    connectedPlayers,
    joinCode,
    setCurrentRoleplayId,
    setActiveSheetId
  } = useStore();

  const activeRoleplay = [...userRoleplays, ...joinedRoleplays].find(rp => rp.id === currentLiveRoleplayId);
  const currentUserId = auth.currentUser?.uid || '';
  const isAdmin = Boolean(isHost || activeRoleplay?.admins?.includes(auth.currentUser?.uid || ''));
  const isEditor = Boolean(activeRoleplay?.editors?.includes(auth.currentUser?.uid || ''));
  const canEditAIResponses = !isLive || isAdmin || isEditor;
  const canUseOoc = !isLive || isAdmin;
  const isAdventureScoped = Boolean(isLive && currentLiveRoleplayId);
  const characterLookupSheets = isAdventureScoped ? sessionSheets : sheets;
  const canGenerateAiNow = !isLive || (isHost && aiAutoRespond);

  const getEffectiveApiKey = () => {
    const providerKey = apiKeys[provider];
    if (providerKey) return providerKey;
    if (provider === 'gemini') {
      return apiKey || '';
    }
    return '';
  };

  const getGeminiApiKey = () => {
    if (apiKeys.gemini) return apiKeys.gemini;
    if (provider === 'gemini' && apiKey) return apiKey;
    return '';
  };

  const effectiveApiKey = getEffectiveApiKey();
  const geminiApiKey = getGeminiApiKey();
  const [input, setInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const [diceInput, setDiceInput] = useState('1d20');
  const [suggestedLore, setSuggestedLore] = useState<any[]>([]);
  const [activeRoll, setActiveRoll] = useState<{ result: number; type: number } | null>(null);
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);
  const [ttsPlayingId, setTtsPlayingId] = useState<string | null>(null);
  const [showResumeDropdown, setShowResumeDropdown] = useState(false);
  const [copiedJoinCode, setCopiedJoinCode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const lastTypingTimeRef = useRef<number>(0);

  const handleTypingChange = (text: string) => {
    setInput(text);
    
    const isTypingNow = text.length > 0;
    const now = Date.now();
    
    if (isTypingNow) {
      if (!isTypingRef.current || now - lastTypingTimeRef.current > 10000) {
        isTypingRef.current = true;
        lastTypingTimeRef.current = now;
        setTyping(true);
      }
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (isTypingNow) {
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        setTyping(false);
      }, 3000);
    } else if (isTypingRef.current) {
      isTypingRef.current = false;
      setTyping(false);
    }
  };

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      setTyping(false);
    }
  }, [setTyping]);

  const activeTypingUsers = Object.entries(typingUsers as Record<string, { isTyping?: boolean; timestamp: number; name: string }>)
    .filter(([userId, value]) => userId !== currentUserId && value?.isTyping && now - value.timestamp < 60000)
    .map(([, value]) => value);

  const handleLoreLinkClick = (id: string) => {
    setSelectedLoreId(id);
    setActiveTab('lorebook');
  };

  const themeClasses = THEME_CLASSES[theme] || THEME_CLASSES.classic;

  const PLAYER_COLORS = [
    { bg: themeClasses.surface, border: themeClasses.border, text: themeClasses.accent, glow: themeClasses.accent.replace('text-', 'shadow-').replace('/500', '/20') },
    { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', glow: 'shadow-rose-500/20' },
    { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', glow: 'shadow-indigo-500/20' },
    { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', glow: 'shadow-violet-500/20' },
    { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
    { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
  ];

  const getPlayerColor = (id?: string) => {
    if (!id) return PLAYER_COLORS[0];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PLAYER_COLORS[Math.abs(hash) % PLAYER_COLORS.length];
  };

  const normalizeName = (value?: string) =>
    (value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const parseDiceCommand = (command: string) => {
    const match = command.trim().match(/^\/roll\s+(\d+)d(\d+)([+-]\d+)?$/i);
    if (!match) return null;
    const diceCount = Number(match[1]);
    const diceSides = Number(match[2]);
    const modifier = match[3] ? Number(match[3]) : 0;
    if (!Number.isFinite(diceCount) || !Number.isFinite(diceSides) || diceCount <= 0 || diceSides <= 0 || diceCount > 20 || diceSides > 1000) {
      return null;
    }
    return { diceCount, diceSides, modifier };
  };

  const buildDiceCommandMessage = (diceCount: number, diceSides: number, modifier: number) => {
    const rolls = Array.from({ length: diceCount }, () => Math.floor(Math.random() * diceSides) + 1);
    const subtotal = rolls.reduce((sum, roll) => sum + roll, 0);
    const total = subtotal + modifier;
    const modifierLabel = modifier ? ` ${modifier > 0 ? '+' : '-'} ${Math.abs(modifier)}` : '';
    return `**${activeSheet?.name || 'Player'}** rolled **${diceCount}d${diceSides}${modifier ? (modifier > 0 ? `+${modifier}` : modifier) : ''}**\n\nRolls: [${rolls.join(', ')}]\nSubtotal: **${subtotal}**${modifierLabel}\nTotal: **${total}**`;
  };

  const activeSheet =
    characterLookupSheets.find(s => s.id === activeSheetId)
    || characterLookupSheets.find(s => s.ownerId === auth.currentUser?.uid)
    || sheets.find(s => s.id === activeSheetId)
    || sheets.find(s => s.ownerId === auth.currentUser?.uid)
    || characterLookupSheets[0]
    || sheets[0];
  const partyCount = sessionSheets.length > 0 ? sessionSheets.length : (activeSheet ? 1 : 0);
  const partyMembers = sessionSheets.length > 0 ? sessionSheets : (activeSheet ? [activeSheet] : []);
  const adminCount = isLive
    ? partyMembers.filter((sheet) => sheet.ownerId && activeRoleplay?.admins?.includes(sheet.ownerId)).length
    : (activeSheet ? 1 : 0);
  const editorCount = partyMembers.filter((sheet) => sheet.ownerId && activeRoleplay?.editors?.includes(sheet.ownerId)).length;
  const playerCount = Math.max(partyCount - adminCount - editorCount, 0);
  const typingCount = activeTypingUsers.length;
  const readyCount = partyMembers.filter((sheet) => {
    if (!isLive) return true;
    if (sheet.ownerId && (typingUsers as Record<string, { isTyping?: boolean; timestamp?: number }>)[sheet.ownerId]?.isTyping) return false;
    return Boolean(sheet.lastSeen && now - sheet.lastSeen < 120000);
  }).length;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const lastSpokenMessageIdRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const lastAutoReplyMessageIdRef = useRef<string | null>(null);

  const handleSpeak = async (text: string, messageId: string) => {
    const key = ttsProvider === 'gemini' 
      ? (apiKeys.gemini || process.env.GEMINI_API_KEY || '')
      : ttsProvider === 'openai' ? (apiKeys.openai || '') : (apiKeys.kokoro || 'kokoro-internal');
      
    if (!key && ttsProvider !== 'kokoro') {
      alert(`${ttsProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API key is required for TTS. Please configure it in Settings.`);
      return;
    }
    if (ttsLoadingId === messageId || ttsPlayingId === messageId) return; // Prevent duplicate triggers

    try {
      // Clean text from JSON blocks for speech
      const cleanText = text.replace(/```json\n([\s\S]*?)\n```/g, '').trim();
      if (!cleanText) return;

      setTtsLoadingId(messageId);

      await speak({
        text: cleanText,
        apiKey: key,
        voice: selectedVoice,
        volume: ttsVolume,
        provider: ttsProvider,
        kokoroUrl: ttsProvider === 'kokoro' ? kokoroUrl : undefined,
        onEnd: () => setTtsPlayingId(null),
        onError: (err) => {
          setTtsLoadingId(null);
          setTtsPlayingId(null);
          alert(`TTS failed: ${err.message || 'Unknown error'}`);
        }
      });
      
      setTtsPlayingId(messageId);
    } catch (error) {
      console.error("TTS failed:", error);
      setTtsLoadingId(null);
    }
  };

  useEffect(() => {
    if (!currentLiveRoleplayId || !isHost || !aiAutoRespond || isAIGenerating || messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;
    if (lastMessage.id === lastAutoReplyMessageIdRef.current) return;
    if (!['user', 'dice', 'ooc'].includes(lastMessage.role)) return;
    if (lastMessage.senderId === auth.currentUser?.uid) return;

    lastAutoReplyMessageIdRef.current = lastMessage.id;
    generateAIResponse();
  }, [messages, currentLiveRoleplayId, isHost, aiAutoRespond, isAIGenerating, generateAIResponse]);

  useEffect(() => {
    scrollToBottom();
    
    // Check for new lore suggestions in the last message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant') {
      // Auto TTS Logic
      const key = ttsProvider === 'gemini' 
        ? (apiKeys.gemini || process.env.GEMINI_API_KEY || '')
        : ttsProvider === 'openai' ? (apiKeys.openai || '') : (apiKeys.kokoro || 'kokoro-internal');
        
      if (ttsEnabled && (key || ttsProvider === 'kokoro') && lastMessage.id !== lastSpokenMessageIdRef.current) {
        lastSpokenMessageIdRef.current = lastMessage.id;
        handleSpeak(lastMessage.content, lastMessage.id);
      }

      const jsonMatch = lastMessage.content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const updates = JSON.parse(jsonMatch[1]);
          if (updates.newLore && Array.isArray(updates.newLore)) {
            setSuggestedLore(updates.newLore.map((l: any) => ({
              ...l,
              id: l.id || Math.random().toString(36).substring(7)
            })));
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [messages]);

  const handleAddLore = (lore: any) => {
    addLoreEntry(lore);
    setSuggestedLore(prev => prev.filter(l => l.name !== lore.name));
  };

  const canSend = true;

  const handleSend = async (content?: string) => {
    const messageContent = content || input.trim();
    if (!messageContent || !canSend) return;

    const diceCommand = parseDiceCommand(messageContent);
    if (!content) setInput('');
    if (diceCommand) {
      await addMessage({
        role: 'dice',
        content: buildDiceCommandMessage(diceCommand.diceCount, diceCommand.diceSides, diceCommand.modifier),
      });
    } else {
      await addMessage({ 
        role: isOocMode ? 'ooc' : 'user', 
        content: messageContent,
        isCollapsed: false // OOC messages are visible by default, collapsible
      });
    }
    isTypingRef.current = false;
    setTyping(false);
    
    if (isOocMode) setIsOocMode(false); // Toggle off after sending

    // Only generate AI response if we're not a guest in a multiplayer session, and auto-respond is enabled
    if (!isOocMode && canGenerateAiNow) {
      generateAIResponse();
    }
  };

  const handleQuickAction = (action: string) => {
    if (!canSend || isAIGenerating) return;
    setShowQuickActions(false);
    void (async () => {
      await addMessage({ role: 'user', content: action });
    
      // Only generate AI response if we're not a guest in a multiplayer session, and auto-respond is enabled
      if (canGenerateAiNow) {
        generateAIResponse();
      }
    })();
  };

  const handleDownloadText = () => {
    const text = messages.map(m => {
      if (m.role === 'dice' || m.role === 'system') return '';
      const role = m.role === 'user' ? (activeSheet?.name || 'Player') : (m.characterName || 'Game Master');
      return `${role.toUpperCase()}:\n${m.content.replace(/```json\n([\s\S]*?)\n```/g, '').trim()}\n`;
    }).filter(Boolean).join('\n---\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSheet?.name || 'Adventure'}_Logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    let y = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - margin * 2;

    doc.setFontSize(18);
    doc.text(`${activeSheet?.name || 'Adventure'} - Campaign Logs`, margin, y);
    y += 15;

    doc.setFontSize(10);
    messages.forEach(m => {
      if (m.role === 'dice' || m.role === 'system') return;
      
      const role = m.role === 'user' ? (activeSheet?.name || 'Player') : (m.characterName || 'Game Master');
      const content = m.content.replace(/```json\n([\s\S]*?)\n```/g, '').trim();
      
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.text(`${role.toUpperCase()}:`, margin, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(content, maxLineWidth);
      
      // Check if lines will fit on current page
      if (y + (lines.length * 5) > 280) {
        doc.addPage();
        y = 20;
      }
      
      doc.text(lines, margin, y);
      y += (lines.length * 5) + 10;
    });

    doc.save(`${activeSheet?.name || 'Adventure'}_Logs.pdf`);
  };

  const handleExport = () => {
    const novelText = `# ${activeSheet?.name || 'Adventure'}: A Tale of Heroism\n\n` + 
      messages.map(m => {
        if (m.role === 'dice' || m.role === 'system') return '';
        const role = m.role === 'user' ? (activeSheet?.name || 'Player') : (m.characterName || 'Game Master');
        return `### ${role}\n${m.content.replace(/```json\n([\s\S]*?)\n```/g, '').trim()}\n`;
      }).filter(Boolean).join('\n\n');

    const blob = new Blob([novelText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSheet?.name || 'Adventure'}_Novel.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleManualRoll = () => {
    if (!diceInput.trim()) return;
    
    if (showDiceFX) {
      const diceBtn = document.activeElement as HTMLElement;
      if (diceBtn) {
        diceBtn.style.transform = 'scale(1.2) rotate(10deg)';
        setTimeout(() => {
          diceBtn.style.transform = 'scale(1) rotate(0deg)';
        }, 200);
      }
    }

    const match = diceInput.toLowerCase().match(/(\d+)d6/);
    if (!match) {
      alert("Invalid dice format. Use something like '1d6' or '3d6'");
      return;
    }

    const count = parseInt(match[1]) || 1;
    handleBitDRoll(count, 'Manual Roll');
    setDiceInput('1d6');
  };

  const handleBitDRoll = (poolSize: number, label?: string) => {
    if (showDiceFX) {
      const diceBtn = document.activeElement as HTMLElement;
      if (diceBtn) {
        diceBtn.style.transform = 'scale(1.2) rotate(10deg)';
        setTimeout(() => {
          diceBtn.style.transform = 'scale(1) rotate(0deg)';
        }, 200);
      }
    }

    const rolls = [];
    let isZeroDice = false;
    let numDice = poolSize;

    if (poolSize <= 0) {
      isZeroDice = true;
      numDice = 2;
    }

    for (let i = 0; i < numDice; i++) {
      rolls.push(Math.floor(Math.random() * 6) + 1);
    }

    let result = 0;
    let outcome = '';
    
    if (isZeroDice) {
      result = Math.min(...rolls);
    } else {
      result = Math.max(...rolls);
    }

    const sixes = rolls.filter(r => r === 6).length;
    
    if (sixes >= 2 && !isZeroDice) {
      outcome = '**Critical Success!** You do it with increased effect.';
    } else if (result === 6) {
      outcome = '**Full Success!** You do it.';
    } else if (result >= 4) {
      outcome = '**Partial Success.** You do it, but there is a consequence.';
    } else {
      outcome = '**Bad Outcome.** Things go poorly.';
    }

    const rollDetails = `[${rolls.join(', ')}]`;
    const poolText = isZeroDice ? '0d (Rolled 2, took lowest)' : `${poolSize}d`;
    const rollName = label ? `rolled **${label}**` : `rolled an action`;
    
    const message = `**${activeSheet?.name || 'Player'}** ${rollName} with **${poolText}**\n\nResult: ${rollDetails} ➔ **${result}**\n${outcome}`;
    
    setActiveRoll({ result, type: 6 });

    addMessage({
      role: 'dice',
      content: message
    });
    if (canGenerateAiNow) {
      generateAIResponse();
    }
    
    setShowDiceRoller(false);
  };

  const handleSaveEdit = () => {
    if (editingMessageId && editContent.trim()) {
      updateMessage(editingMessageId, editContent);
      setEditingMessageId(null);
    }
  };

  const parseRollPrompts = (content: string) => {
    const prompts: { label: string; roll: string; type: 'action' | 'raw' }[] = [];
    
    // BitD Actions
    ['Hunt', 'Study', 'Survey', 'Tinker', 'Finesse', 'Prowl', 'Skirmish', 'Wreck', 'Attune', 'Command', 'Consort', 'Sway'].forEach(action => {
      const regex = new RegExp(`roll (?:a|an)? ${action}|${action} roll`, 'i');
      if (regex.test(content)) {
        prompts.push({ label: `${action} Roll`, roll: action.toLowerCase(), type: 'action' });
      }
    });

    // Raw dice notation (e.g. 2d6)
    const diceRegex = /roll (\d+d6)/gi;
    let match;
    while ((match = diceRegex.exec(content)) !== null) {
      prompts.push({ label: match[1], roll: match[1], type: 'raw' });
    }

    // Deduplicate
    return prompts.filter((v, i, a) => a.findIndex(t => t.label === v.label) === i);
  };

  const handlePromptRoll = (prompt: { label: string; roll: string; type: 'action' | 'raw' }) => {
    if (showDiceFX) {
      // Trigger a simple visual feedback for dice roll
      const diceBtn = document.activeElement;
      if (diceBtn) {
        diceBtn.classList.add('animate-ping');
        setTimeout(() => diceBtn.classList.remove('animate-ping'), 500);
      }
    }

    if (prompt.type === 'raw') {
      const match = prompt.roll.toLowerCase().match(/(\d+)d6/);
      if (match) {
        const count = parseInt(match[1]) || 1;
        handleBitDRoll(count, 'Custom Roll');
      }
    } else if (prompt.type === 'action' && activeSheet?.type === 'bitd') {
      const action = prompt.roll.toLowerCase();
      const rating = (activeSheet.bitd?.actions as any)?.[action] || 0;
      handleBitDRoll(rating, prompt.label);
    }
  };

  const handleBranch = (msgId: string) => {
    const name = prompt("Enter a name for this branch:");
    if (name) {
      branchFromMessage(msgId, name);
      alert(`Branched to "${name}". You can find it in the Roleplays tab.`);
    }
  };

  const handleCopyJoinCode = async () => {
    const code = joinCode || currentLiveRoleplayId;
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopiedJoinCode(true);
    setTimeout(() => setCopiedJoinCode(false), 2000);
  };

  const handleLeaveSession = () => {
    setActiveSheetId(null);
    setCurrentRoleplayId(null);
  };

  const isLastAssistantTurn = (msgId: string) => {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length === 0) return false;
    
    // If multi-character chat is on, we might have a group of assistant messages at the end
    const lastTurnMessages: string[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        lastTurnMessages.push(messages[i].id);
      } else if (messages[i].role === 'user' || messages[i].role === 'dice') {
        break;
      }
    }
    return lastTurnMessages.includes(msgId);
  };

  return (
    <div className={cn(
      "flex h-full pt-16 md:pt-0 relative transition-colors duration-500",
      (theme === 'parchment' || theme === 'sepia') ? "bg-orange-50/90" : "bg-transparent"
    )}>
      {/* HUD Rail - Left Side */}
      <div className="w-72 hidden xl:flex flex-col gap-4 p-4 overflow-y-auto border-r border-zinc-800/50 bg-zinc-950/20 z-20 shrink-0">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-500" />
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Session Status</h3>
            </div>
            <span className={cn(
              "px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest",
              isLive ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            )}>
              {isLive ? (isHost ? 'Hosted MP' : 'Joined MP') : 'Solo'}
            </span>
          </div>
          <div className="text-xs text-zinc-400 space-y-1">
            <p><span className="text-zinc-500">Character:</span> {activeSheet?.name || 'None attached'}</p>
            <p><span className="text-zinc-500">AI:</span> {canGenerateAiNow ? 'Ready' : 'Waiting on host'}</p>
            {!isLive && (
              <p><span className="text-zinc-500">Autosave:</span> {isSaving ? 'Saving...' : lastSaved ? `Saved ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not saved yet'}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-zinc-500" />
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Party Panel</h3>
          <span className="ml-auto text-[10px] uppercase tracking-widest text-zinc-600">
            {partyCount} {partyCount === 1 ? 'member' : 'members'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">Current Focus</div>
            <div className="mt-1 text-sm font-bold text-zinc-100 truncate">
              {activeSheet?.name || 'No character'}
            </div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 truncate">
              {activeSheet?.bitd?.playbook || activeSheet?.charClass || activeSheet?.race || 'Adventure overview'}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">Table Summary</div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-sm font-black text-zinc-100">{readyCount}</div>
                <div className="text-[9px] uppercase tracking-widest text-zinc-500">Ready</div>
              </div>
              <div>
                <div className="text-sm font-black text-blue-300">{typingCount}</div>
                <div className="text-[9px] uppercase tracking-widest text-zinc-500">Typing</div>
              </div>
              <div>
                <div className="text-sm font-black text-amber-300">{adminCount + editorCount}</div>
                <div className="text-[9px] uppercase tracking-widest text-zinc-500">Leads</div>
              </div>
            </div>
          </div>
        </div>
        {isLive && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[10px] font-black">Session Controls</span>
              <span className="px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-400 border-green-500/30">
                Live
              </span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 flex items-center justify-between gap-2">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-zinc-500">Join Code</div>
                <div className="text-sm font-mono font-black text-zinc-100 tracking-[0.25em]">
                  {joinCode || currentLiveRoleplayId || '------'}
                </div>
              </div>
              <button
                onClick={handleCopyJoinCode}
                className="p-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all"
                title="Copy join code"
              >
                {copiedJoinCode ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-zinc-500 leading-relaxed">
              This adventure owns its own party, permissions, lorebook, and synced chat state.
            </p>
            <button
              onClick={handleLeaveSession}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all font-bold uppercase tracking-widest text-[10px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              Leave Session
            </button>
          </div>
        )}
        {isLive && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[10px] font-black">Session Presence</span>
              <span className="text-zinc-500 text-[10px] uppercase tracking-widest">
                {connectedPlayers.length} connected
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
              <span className="px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {adminCount} admin{adminCount === 1 ? '' : 's'}
              </span>
              <span className="px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {editorCount} editor{editorCount === 1 ? '' : 's'}
              </span>
              <span className="px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {playerCount} player{playerCount === 1 ? '' : 's'}
              </span>
            </div>
            {activeTypingUsers.length > 0 ? (
              <p className="text-blue-300">
                {activeTypingUsers.map((user) => user.name).join(', ')} {activeTypingUsers.length === 1 ? 'is' : 'are'} typing...
              </p>
            ) : (
              <p className="text-zinc-500">No one is typing right now.</p>
            )}
          </div>
        )}
        {sessionSheets.length > 0 ? (
          sessionSheets.map((sheet) => (
            <HUD key={sheet.id} sheet={sheet} isCompact={sessionSheets.length > 2} />
          ))
        ) : (
          <HUD sheet={activeSheet} />
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <NPCTracker />
        
        {/* Chat Header */}
      <div className="h-14 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", themeClasses.border, themeClasses.bg)}>
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-100 tracking-tight">{currentRoleplayName || 'Adventure'}</h2>
              {isCopilotMode && (
                <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[8px] font-black text-blue-400 uppercase tracking-widest">Copilot</span>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Session Active</p>
          </div>

          {savedRoleplays.filter((rp: any) => !rp.promotedToRoleplayId).length > 0 && (
            <div className="relative ml-4">
              <button
                onClick={() => setShowResumeDropdown(!showResumeDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-300 transition-all group"
              >
                <History className="w-3.5 h-3.5 text-amber-500" />
                <span>Resume Adventure</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-500 transition-transform", showResumeDropdown && "rotate-180")} />
              </button>

              {showResumeDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-2 border-b border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Saved Adventures</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {Array.from(new Map((savedRoleplays as Array<{ id: string; name: string; updatedAt: number; promotedToRoleplayId?: string }>).filter(rp => !rp.promotedToRoleplayId).map(rp => [rp.id, rp])).values()).map((rp) => (
                      <button
                        key={rp.id}
                        onClick={() => {
                          loadRoleplay(rp.id);
                          setShowResumeDropdown(false);
                        }}
                        className="w-full p-3 text-left hover:bg-zinc-800 border-b border-zinc-800 last:border-0 group transition-colors"
                      >
                        <div className="font-bold text-zinc-200 group-hover:text-amber-500 transition-colors truncate">{rp.name}</div>
                        <div className="text-[10px] text-zinc-500">Last played: {new Date(rp.updatedAt).toLocaleDateString()}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={() => {
                const newValue = !aiAutoRespond;
                setAiAutoRespond(newValue);
                if (newValue && !isAIGenerating) {
                  const lastMessage = messages[messages.length - 1];
                  if (lastMessage && lastMessage.role !== 'assistant') {
                    generateAIResponse();
                  }
                }
              }}
              className={cn(
                "p-2 rounded-lg border transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest",
                aiAutoRespond 
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                  : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300"
              )}
              title={aiAutoRespond ? "AI Auto-Respond: ON" : "AI Auto-Respond: OFF"}
            >
              <Bot className="w-4 h-4" />
              <span className="hidden md:inline">Auto-AI</span>
            </button>
          )}
          {!isLive && (
            <button
              onClick={async () => {
                try {
                  await promoteToMultiplayer();
                  alert("Adventure promoted to Multiplayer! You can now invite others.");
                } catch (e) {
                  alert("Failed to promote adventure: " + (e as Error).message);
                }
              }}
              className="p-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
              title="Invite to Multiplayer"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden md:inline">Invite</span>
            </button>
          )}
          <button
            onClick={() => setShowClocks(!showClocks)}
            className={cn(
              "p-2 rounded-lg border transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest",
              showClocks 
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500" 
                : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Timer className="w-4 h-4" />
            <span className="hidden md:inline">Clocks</span>
          </button>
            <button
              onClick={() => setShowJournal(!showJournal)}
              className={cn(
                "p-2 rounded-lg border transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest",
                showJournal 
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500" 
                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden md:inline">Notes</span>
            </button>

          <div className="flex items-center gap-1 bg-zinc-800/50 p-1 rounded-lg border border-zinc-700/50">
            <button
              onClick={() => {
                if (confirm("Are you sure you want to start a new adventure? This will clear the current session.")) {
                  newRoleplay();
                }
              }}
              className="p-1.5 rounded-md hover:bg-zinc-700 text-amber-500 hover:text-amber-400 transition-all"
              title="New Adventure"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-zinc-700 mx-0.5" />
            <button
              onClick={handleDownloadText}
              className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-all"
              title="Download as Text"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadPDF}
              className="p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-all"
              title="Download as PDF"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          
          {/* Auto-save Indicator */}
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-zinc-800/30 border border-zinc-700/30">
            {isSaving ? (
              <>
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-500/60">Saving</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full" />
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-500/40">
                  {lastSaved ? `Saved ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saved'}
                </span>
              </>
            )}
          </div>

          <div className="w-px h-6 bg-zinc-800 mx-1" />
          <button
            onClick={handleExport}
            className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all"
            title="Export Adventure"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeRoll && (
        <Dice3D 
          result={activeRoll.result} 
          diceType={activeRoll.type} 
          onComplete={() => setActiveRoll(null)} 
        />
      )}
      
      {/* Export Button */}
      {messages.length > 1 && (
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
          <button
            onClick={handleExport}
            className="h-10 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-lg"
            title="Export as Novel"
          >
            <Download className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:block">Export Novel</span>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.map((msg) => {
          if (msg.role === 'ooc') console.log('Rendering OOC message:', msg);
          return (
            <div
              key={msg.id}
              className={cn(
                'flex gap-4 max-w-4xl mx-auto',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0 border overflow-hidden shadow-sm',
              msg.role === 'user' ? (() => {
                const playerColor = getPlayerColor(msg.sheetId);
                return `${playerColor.bg} ${playerColor.border}`;
              })() : 
              msg.role === 'assistant' ? (msg.type === 'character' ? 'bg-indigo-600 border-indigo-500' : 'bg-zinc-800 border-zinc-700') :
              msg.role === 'dice' ? 'bg-indigo-600 border-indigo-500' :
              'bg-red-900 border-red-800'
            )}>
              {msg.role === 'user' ? (() => {
                const messageSheet =
                  characterLookupSheets.find(s => s.ownerId === msg.senderId)
                  || characterLookupSheets.find(s => s.id === msg.sheetId)
                  || (!isAdventureScoped ? sheets.find(s => s.ownerId === msg.senderId) : null)
                  || (!isAdventureScoped ? sheets.find(s => s.id === msg.sheetId) : null)
                  || (msg.senderId === currentUserId ? activeSheet : null);
                const avatarUrl = messageSheet?.avatarUrl || (msg.senderId === currentUserId ? activeSheet?.avatarUrl : undefined);
                return avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-5 h-5 text-white" />
                );
              })() : 
               msg.role === 'assistant' ? (() => {
                 const normalizedCharacterName = normalizeName(msg.characterName);
                 const charSheet =
                   characterLookupSheets.find(s => s.id === msg.sheetId)
                   || characterLookupSheets.find(s => normalizeName(s.name) === normalizedCharacterName)
                   || (!isAdventureScoped ? sheets.find(s => normalizeName(s.name) === normalizedCharacterName) : null);
                 const loreEntry = lorebook.find((l) =>
                   normalizeName(l.name) === normalizedCharacterName
                   && (l.category || '').trim().toLowerCase() === 'npc'
                  );
                 const fallbackLoreEntry = loreEntry || lorebook.find((l) => {
                   const loreName = normalizeName(l.name);
                   return loreName && normalizedCharacterName && (
                     loreName.includes(normalizedCharacterName) || normalizedCharacterName.includes(loreName)
                   );
                 });
                 const avatarUrl = charSheet?.avatarUrl || fallbackLoreEntry?.avatarUrl || fallbackLoreEntry?.imageUrl;
                 
                 if (avatarUrl) {
                   return <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />;
                 }
                 
                 if (msg.characterName) {
                   return <span className="text-xs font-bold text-white uppercase">{msg.characterName.substring(0, 2)}</span>;
                 }
                 
                 return <Bot className="w-5 h-5 text-amber-500" />;
               })() :
               msg.role === 'dice' ? <Dices className="w-5 h-5 text-white" /> :
               <Shield className="w-5 h-5 text-white" />}
            </div>
            
            <div className={cn(
              'px-6 py-4 rounded-2xl group relative shadow-md transition-all duration-300',
              editingMessageId === msg.id ? 'w-full max-w-3xl' : 'max-w-[80%]',
              msg.role === 'user' ? (() => {
                const playerColor = getPlayerColor(msg.sheetId);
                return (theme === 'parchment' || theme === 'sepia') 
                  ? 'bg-orange-200/50 border border-orange-300 text-orange-950 rounded-tr-none'
                  : `${playerColor.bg} border ${playerColor.border} text-zinc-100 rounded-tr-none shadow-lg ${playerColor.glow}`;
              })() : 
              msg.role === 'assistant' ? (
                msg.type === 'character'
                  ? 'bg-zinc-800/90 border-l-4 border-indigo-500 text-zinc-100 rounded-tl-none'
                  : (theme === 'parchment' || theme === 'sepia')
                  ? 'bg-white/80 border border-orange-200 text-orange-900 shadow-sm rounded-tl-none'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none'
              ) :
              msg.role === 'dice' ? 'bg-indigo-900/30 border border-indigo-500/30 text-indigo-200 font-mono rounded-tl-none' :
              msg.role === 'ooc' ? 'bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm italic rounded-tl-none' :
              'bg-red-900/20 border border-red-800/30 text-red-200 text-sm italic rounded-tl-none'
            )}>
              {msg.role === 'ooc' && (
                <button
                  onClick={() => toggleMessageCollapse(msg.id)}
                  className="text-[10px] uppercase tracking-widest font-black mb-1 opacity-50 hover:text-amber-500"
                >
                  {msg.isCollapsed ? '[Expand OOC]' : '[Collapse OOC]'}
                </button>
              )}
              {(msg.role === 'assistant' && !msg.isCollapsed && (msg.characterName || msg.type === 'narrator')) && (
                <div className="text-[10px] uppercase tracking-widest font-black mb-1 opacity-50">
                  {msg.characterName || 'Narrator'}
                </div>
              )}
              {editingMessageId === msg.id ? (
                <div className="space-y-3 w-full">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="block w-full bg-zinc-950/90 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm leading-relaxed focus:outline-none focus:border-amber-500 min-h-[260px] resize-y"
                    rows={Math.max(8, editContent.split('\n').length + 1)}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingMessageId(null)}
                      className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className={cn("px-3 py-1 text-xs text-white rounded", themeClasses.bg, themeClasses.hover)}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {msg.role === 'assistant' ? (
                    <div className={cn(
                      "prose prose-invert max-w-none",
                      (theme === 'parchment' || theme === 'sepia') ? "prose-orange text-orange-900" : themeClasses.prose
                    )}>
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p>
                              {React.Children.map(children, child => 
                                typeof child === 'string' ? <LoreLinker text={child} onLinkClick={handleLoreLinkClick} /> : child
                              )}
                            </p>
                          ),
                          li: ({ children }) => (
                            <li>
                              {React.Children.map(children, child => 
                                typeof child === 'string' ? <LoreLinker text={child} onLinkClick={handleLoreLinkClick} /> : child
                              )}
                            </li>
                          )
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className={cn(
                      "whitespace-pre-wrap leading-relaxed",
                      msg.role === 'ooc' && msg.isCollapsed && "hidden"
                    )}>
                      <LoreLinker text={msg.content} onLinkClick={handleLoreLinkClick} />
                    </p>
                  )}

                  {/* Roll Prompts */}
                  {msg.role === 'assistant' && !isAIGenerating && isLastAssistantTurn(msg.id) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => generateAIResponse('Continue the scene naturally from the current moment without repeating prior narration.')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 shadow-sm",
                          (theme === 'parchment' || theme === 'sepia')
                            ? "bg-orange-100 border-orange-300 text-orange-900 hover:bg-orange-200"
                            : "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                        )}
                      >
                        <Bot className="w-3 h-3" />
                        Continue Scene
                      </button>
                      <button
                        onClick={() => {
                          const previousPlayerMessage = [...messages]
                            .reverse()
                            .find((entry) => ['user', 'dice', 'ooc'].includes(entry.role) && entry.timestamp! < (msg.timestamp || Number.MAX_SAFE_INTEGER));
                          if (previousPlayerMessage) {
                            rewindToMessage(previousPlayerMessage.id);
                            setTimeout(() => generateAIResponse(), 0);
                          }
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 shadow-sm",
                          (theme === 'parchment' || theme === 'sepia')
                            ? "bg-orange-100 border-orange-300 text-orange-900 hover:bg-orange-200"
                            : "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                        )}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Regenerate
                      </button>
                      {parseRollPrompts(msg.content).map((prompt, idx) => (
                        <button
                          key={`${prompt.label}-${idx}`}
                          onClick={() => handlePromptRoll(prompt)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 shadow-sm",
                            (theme === 'parchment' || theme === 'sepia')
                              ? "bg-orange-100 border-orange-300 text-orange-900 hover:bg-orange-200"
                              : "bg-indigo-900/30 border-indigo-500/30 text-indigo-300 hover:bg-indigo-800/50"
                          )}
                        >
                          <Dices className="w-3 h-3" />
                          Roll {prompt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Message Actions */}
              {msg.id !== 'welcome' && !isAIGenerating && (
                <div className={cn(
                  "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
                  msg.role === 'user' ? "-left-24" : "-right-40"
                )}>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleSpeak(msg.content, msg.id)}
                      disabled={ttsLoadingId === msg.id}
                      className={cn(
                        "p-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-400 hover:text-blue-400 hover:bg-zinc-700 shadow-md",
                        ttsPlayingId === msg.id && "text-blue-400 border-blue-500/50"
                      )}
                      title="Read out loud"
                    >
                      {ttsLoadingId === msg.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  {(((msg.role === 'user' || msg.role === 'ooc') && msg.senderId === auth.currentUser?.uid) || (msg.role === 'assistant' && canEditAIResponses)) && (
                    <button
                      onClick={() => {
                        setEditingMessageId(msg.id);
                        setEditContent(msg.content);
                      }}
                      className="p-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-400 hover:text-amber-400 hover:bg-zinc-700 shadow-md"
                      title="Edit Message"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleBranch(msg.id)}
                    className="p-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-400 hover:text-emerald-400 hover:bg-zinc-700 shadow-md"
                    title="Branch from here"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => rewindToMessage(msg.id)}
                    className="p-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-400 hover:text-red-400 hover:bg-zinc-700 shadow-md"
                    title="Rewind to this point"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
        {isAIGenerating && (
          <div className="flex gap-4 max-w-4xl mx-auto">
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-amber-500 animate-pulse" />
            </div>
            <div className="px-6 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
              <span className="text-sm font-medium text-amber-400">Oracle is thinking...</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-zinc-900 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto relative flex flex-col gap-2">
          {showDiceRoller && (
            <div className="absolute bottom-full mb-2 right-0 bg-zinc-800 border border-zinc-700 p-3 rounded-xl shadow-xl flex flex-col gap-3 z-10 min-w-[200px]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={diceInput}
                  onChange={(e) => setDiceInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualRoll()}
                  placeholder="1d6"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-100 focus:outline-none focus:border-amber-500 text-sm"
                />
                <button
                  onClick={handleManualRoll}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium transition-colors"
                >
                  Roll
                </button>
              </div>
              
              <div className="border-t border-zinc-700 pt-2">
                <div className="text-xs text-zinc-400 mb-2 font-medium">Quick Rolls</div>
                <div className="flex flex-wrap gap-2">
                  {['0d6', '1d6', '2d6', '3d6', '4d6'].map(dice => (
                    <button
                      key={dice}
                      onClick={() => {
                        const count = parseInt(dice.charAt(0));
                        handleBitDRoll(count, 'Quick Roll');
                      }}
                      className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded text-xs transition-colors"
                    >
                      {dice}
                    </button>
                  ))}
                </div>
              </div>
              
              {activeSheet?.type === 'bitd' && activeSheet?.bitd && (
                <>
                  <div className="border-t border-zinc-700 pt-2">
                    <div className="text-xs text-zinc-400 mb-2 font-medium">Action Ratings</div>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                      {(Object.entries(activeSheet.bitd.actions) as Array<[string, number]>).map(([action, rating]) => (
                        <button
                          key={action}
                          onClick={() => handleBitDRoll(rating, action.charAt(0).toUpperCase() + action.slice(1))}
                          className="px-2 py-1 bg-indigo-900/30 hover:bg-indigo-800/50 text-indigo-300 border border-indigo-500/30 rounded text-xs transition-colors capitalize flex items-center gap-1"
                        >
                          {action} <span className="text-indigo-500 font-bold ml-1">{rating}d</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <div className="relative flex items-center">
            {/* Typing Indicators */}
            {activeTypingUsers.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                </div>
                <span className="text-[10px] text-zinc-400 font-medium">
                  {activeTypingUsers.map(u => u.name).join(', ')} {activeTypingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}

            {showQuickActions && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-20">
                <div className="p-2 border-b border-zinc-800 bg-zinc-900/50">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Quick Actions</span>
                </div>
                <div className="p-1 flex flex-col">
                  <button onClick={() => handleQuickAction("I look around to see what I can perceive.")} className="text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-amber-400 rounded-lg transition-colors">Look Around</button>
                  <button onClick={() => handleQuickAction("I search the area for any useful items or loot.")} className="text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-amber-400 rounded-lg transition-colors">Scavenge for Loot</button>
                  <button onClick={() => handleQuickAction("I check my inventory and equipment.")} className="text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-amber-400 rounded-lg transition-colors">Check Inventory</button>
                  <button onClick={() => handleQuickAction("I wait and see what happens next.")} className="text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-amber-400 rounded-lg transition-colors">Wait</button>
                  <button onClick={() => handleQuickAction("I try to talk to anyone nearby.")} className="text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-amber-400 rounded-lg transition-colors">Talk</button>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className={cn(
                "absolute left-2 p-2 rounded-lg transition-colors z-10",
                showQuickActions ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-amber-400 hover:bg-zinc-800"
              )}
              title="Quick Actions"
            >
              <Zap className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowDiceRoller(!showDiceRoller)}
              className={cn(
                "absolute left-12 p-2 rounded-lg transition-colors z-10",
                showDiceRoller ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800"
              )}
              title="Roll Dice"
            >
              <Dices className="w-5 h-5" />
            </button>
            {canUseOoc && (
              <button
                onClick={() => setIsOocMode(!isOocMode)}
                className={cn(
                  "absolute left-44 p-2 rounded-lg transition-colors z-10 flex items-center gap-1.5",
                  isOocMode ? "text-amber-500 hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800"
                )}
                title={isOocMode ? "OOC Mode: ON" : "OOC Mode: OFF"}
              >
                <Info className="w-5 h-5" />
                <span className="text-xs font-medium uppercase tracking-wider hidden sm:block">
                  {isOocMode ? 'OOC' : 'IC'}
                </span>
              </button>
            )}
            <button
              onClick={() => setRequireRolls(!requireRolls)}
              className={cn(
                "absolute left-24 p-2 rounded-lg transition-colors z-10 flex items-center gap-1.5",
                requireRolls ? "text-amber-500 hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800"
              )}
              title={requireRolls ? "Rolls: ON" : "Rolls: OFF"}
            >
              {requireRolls ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              <span className="text-xs font-medium uppercase tracking-wider hidden sm:block">
                {requireRolls ? 'Rolls' : 'Story'}
              </span>
            </button>
            <textarea
              value={input}
              onChange={(e) => handleTypingChange(e.target.value)}
              onFocus={() => input.length > 0 && handleTypingChange(input)}
              onBlur={() => {
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                isTypingRef.current = false;
                setTyping(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                  isTypingRef.current = false;
                  setTyping(false);
                  handleSend();
                }
              }}
              placeholder={canSend ? "Describe your action..." : `Please set your ${provider} API key in Settings first.`}
              disabled={!canSend || isAIGenerating}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 pl-[16rem] sm:pl-[18rem] pr-14 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none h-14"
              rows={1}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || !canSend || isAIGenerating}
              className="absolute right-2 p-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-colors z-10"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
