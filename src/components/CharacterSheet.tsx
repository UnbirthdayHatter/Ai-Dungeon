import { BitDSheet } from './BitDSheet';
import { BitDRules } from './BitDRules';
import { useStore, Sheet, SheetType } from '@/store/useStore';
import { Shield, Heart, Sword, User, Book, Backpack, Dices, Plus, Upload, Download, Trash2, ChevronDown, ChevronRight, Archive, Wand2, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function CharacterSheet() {
  const { 
    sheets, 
    savedCharacters,
    sessionSheets,
    currentRoleplayId,
    isLive,
    activeSheetId, 
    setActiveSheet, 
    updateSheet, 
    addSheet, 
    deleteSheet,
    archiveSheet,
    copySheet,
    addCharacterToAdventure,
    removeCharacterFromAdventure
  } = useStore();
  
  const isAdventureScoped = Boolean(currentRoleplayId && isLive);
  const scopedSheets = isAdventureScoped ? sessionSheets : sheets;
  const activeSheet =
    scopedSheets.find(s => s.id === activeSheetId)
    || (!isAdventureScoped ? savedCharacters.find(s => s.id === activeSheetId) : null)
    || scopedSheets[0]
    || (!isAdventureScoped ? savedCharacters[0] : null);

  const [newProficiency, setNewProficiency] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showManager, setShowManager] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [activeTab, setActiveTabState] = useState<'active' | 'saved' | 'rules'>('active');

  const resizeImage = (base64Str: string, maxWidth: number = 500, maxHeight: number = 500): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleGenerateAvatar = async () => {
    if (!activeSheet) return;
    
    setIsGeneratingAvatar(true);
    try {
      let prompt = `A portrait of a tabletop RPG character. `;
      if (activeSheet.type === 'bitd') {
        prompt += `Blades in the Dark setting, dark fantasy, steampunk, scoundrel. `;
        if (activeSheet.bitd?.playbook) prompt += `Playbook: ${activeSheet.bitd.playbook}. `;
        if (activeSheet.bitd?.look) prompt += `Look: ${activeSheet.bitd.look}. `;
        if (activeSheet.bitd?.heritage) prompt += `Heritage: ${activeSheet.bitd.heritage}. `;
      } else {
        if (activeSheet.race) prompt += `${activeSheet.race} `;
        if (activeSheet.charClass) prompt += `${activeSheet.charClass}. `;
      }
      if (activeSheet.name) prompt += `Name: ${activeSheet.name}. `;
      prompt += `High quality, digital art, fantasy character portrait, dramatic lighting.`;

      const response = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.imageUrl) {
        throw new Error(data?.error?.message || 'Failed to generate portrait.');
      }
      const resizedImage = await resizeImage(data.imageUrl);
      updateSheet(activeSheet.id, { avatarUrl: resizedImage });
    } catch (error) {
      console.error('Failed to generate avatar:', error);
      alert('Failed to generate avatar. Please try again.');
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleStatChange = (stat: keyof NonNullable<Sheet['stats']>, value: string) => {
    if (!activeSheet) return;
    const numValue = parseInt(value) || 0;
    updateSheet(activeSheet.id, {
      stats: {
        ...activeSheet.stats,
        [stat]: numValue
      }
    });
  };

  const calculateModifier = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const updateField = (field: keyof Sheet, value: any) => {
    if (!activeSheet) return;
    updateSheet(activeSheet.id, { [field]: value });
  };

  const handleRoll = (name: string, modifier: number) => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + modifier;
    const modStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
    
    window.dispatchEvent(new CustomEvent('chat-message', {
      detail: {
        role: 'system',
        content: `rolled ${name}: **${total}** (1d20${modStr} = ${roll}${modStr})`
      }
    }));
  };

  const addProficiency = () => {
    if (!activeSheet || !newProficiency.trim()) return;
    updateSheet(activeSheet.id, {
      proficiencies: [...(activeSheet.proficiencies || []), newProficiency.trim()]
    });
    setNewProficiency('');
  };

  const removeProficiency = (prof: string) => {
    if (!activeSheet) return;
    updateSheet(activeSheet.id, {
      proficiencies: (activeSheet.proficiencies || []).filter(p => p !== prof)
    });
  };

  const addCustomStat = () => {
    if (!activeSheet) return;
    const newStat = {
      id: Math.random().toString(36).substring(2, 9),
      name: 'New Stat',
      value: 10
    };
    updateSheet(activeSheet.id, {
      customStats: [...(activeSheet.customStats || []), newStat]
    });
  };

  const updateCustomStat = (id: string, updates: Partial<{ name: string; value: number }>) => {
    if (!activeSheet) return;
    updateSheet(activeSheet.id, {
      customStats: (activeSheet.customStats || []).map(stat => 
        stat.id === id ? { ...stat, ...updates } : stat
      )
    });
  };

  const removeCustomStat = (id: string) => {
    if (!activeSheet) return;
    updateSheet(activeSheet.id, {
      customStats: (activeSheet.customStats || []).filter(stat => stat.id !== id)
    });
  };

  const addInventoryItem = () => {
    if (!activeSheet) return;
    const newItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: '',
      quantity: 1,
      description: ''
    };
    updateSheet(activeSheet.id, {
      inventoryItems: [...(activeSheet.inventoryItems || []), newItem]
    });
  };

  const updateInventoryItem = (id: string, updates: Partial<{ name: string; quantity: number; description: string }>) => {
    if (!activeSheet) return;
    updateSheet(activeSheet.id, {
      inventoryItems: (activeSheet.inventoryItems || []).map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    });
  };

  const removeInventoryItem = (id: string) => {
    if (!activeSheet) return;
    updateSheet(activeSheet.id, {
      inventoryItems: (activeSheet.inventoryItems || []).filter(item => item.id !== id)
    });
  };

  const handleInventoryChange = (id: string, field: 'name' | 'quantity' | 'description', value: string | number) => {
    updateInventoryItem(id, { [field]: value });
  };

  const addNote = () => {
    if (!activeSheet) return;
    const newNote = {
      id: Math.random().toString(36).substring(2, 9),
      title: 'New Note',
      content: '',
      createdAt: Date.now()
    };
    updateSheet(activeSheet.id, {
      notes: [...(activeSheet.notes || []), newNote]
    });
    setExpandedNotes(prev => ({ ...prev, [newNote.id]: true }));
  };

  const updateNote = (id: string, updates: Partial<{ title: string; content: string }>) => {
    if (!activeSheet) return;
    updateSheet(activeSheet.id, {
      notes: (activeSheet.notes || []).map(note => 
        note.id === id ? { ...note, ...updates } : note
      )
    });
  };

  const deleteNote = (id: string) => {
    if (!activeSheet) return;
    updateSheet(activeSheet.id, {
      notes: (activeSheet.notes || []).filter(note => note.id !== id)
    });
  };

  const handleNewSheet = (type: SheetType) => {
    const newSheet: Sheet = {
      id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      type,
      name: 'New Character',
      bitd: type === 'bitd' ? {
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
        load: 'normal'
      } : undefined,
      stats: type === 'custom' ? undefined : { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      proficiencies: [],
      customStats: type === 'custom' ? [{ id: '1', name: 'Deviancy', value: 10 }] : [],
      level: 1,
      hp: 10,
      maxHp: 10,
      ac: 10,
    };
    addSheet(newSheet);
    setActiveSheet(newSheet.id);
    if (isAdventureScoped) {
      void addCharacterToAdventure(newSheet.id);
    }
    setActiveTabState('active');
  };

  const { sheetTemplates, saveSheetAsTemplate, deleteTemplate, createSheetFromTemplate } = useStore();
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const handleSaveTemplate = () => {
    if (!activeSheet || !templateName.trim()) return;
    saveSheetAsTemplate(activeSheet.id, templateName.trim());
    setTemplateName('');
  };

  const handleExport = () => {
    if (!activeSheet) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeSheet, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `${activeSheet.name || 'character'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedSheet = JSON.parse(event.target?.result as string);
          // Ensure it has a new ID to avoid conflicts
          importedSheet.id = Math.random().toString(36).substring(2, 15);
          addSheet(importedSheet);
        } catch (error) {
          console.error("Failed to parse imported sheet", error);
          alert("Invalid character sheet file.");
        }
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeSheet) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const resizedImage = await resizeImage(event.target?.result as string);
        updateSheet(activeSheet.id, { avatarUrl: resizedImage });
      };
      reader.readAsDataURL(file);
    }
  };

  if (!activeSheet && scopedSheets.length === 0 && (!isAdventureScoped ? savedCharacters.length === 0 : true)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-zinc-400">
        <User className="w-16 h-16 mb-4 text-zinc-600" />
        <h2 className="text-xl font-serif font-bold text-zinc-200 mb-2">No Characters Found</h2>
        <p className="mb-6">{isAdventureScoped ? 'Attach or create a character for this adventure to get started.' : 'Create a new character to get started.'}</p>
        <button 
          onClick={() => handleNewSheet('bitd')} 
          className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-900/20"
        >
          <Plus className="w-5 h-5" /> Create Character
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-8 pt-20 md:pt-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTabState('active')}
            className={cn(
              "px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap",
              activeTab === 'active' 
                ? "bg-zinc-800 text-amber-500 border-b-2 border-amber-500" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            )}
          >
            Active Character
          </button>
          <button
            onClick={() => setActiveTabState('saved')}
            className={cn(
              "px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap",
              activeTab === 'saved' 
                ? "bg-zinc-800 text-amber-500 border-b-2 border-amber-500" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            )}
          >
            Saved Characters
          </button>
          <button
            onClick={() => setActiveTabState('rules')}
            className={cn(
              "px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap",
              activeTab === 'rules' 
                ? "bg-zinc-800 text-amber-500 border-b-2 border-amber-500" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            )}
          >
            Rules Reference
          </button>
        </div>

        {activeTab === 'rules' && <BitDRules />}

        {activeTab === 'saved' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-bold text-zinc-100">Saved Characters</h2>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showArchived} 
                    onChange={(e) => setShowArchived(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-950 checked:bg-amber-500"
                  />
                  Show Archived
                </label>
                <button 
                  onClick={() => handleNewSheet('bitd')} 
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-bold transition-all"
                >
                  <Plus className="w-4 h-4" /> New Character
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedCharacters
                .filter(s => showArchived || !s.archived)
                .map(char => {
                  const isInAdventure = sessionSheets.some(s => s.id === char.id);
                  const isActive = activeSheetId === char.id;
                  return (
                    <div key={char.id} className={cn(
                      "flex flex-col gap-3 p-4 rounded-xl border transition-all",
                      isActive ? "bg-amber-900/20 border-amber-500/50" : isInAdventure ? "bg-indigo-900/20 border-indigo-500/50" : "bg-zinc-900 border-zinc-800",
                      char.archived && "opacity-60"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {char.avatarUrl ? (
                            <img src={char.avatarUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-zinc-800" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                              <User className="w-6 h-6 text-zinc-700" />
                            </div>
                          )}
                          <div>
                            <div className="text-zinc-100 font-bold text-lg">{char.name || 'Unnamed'}</div>
                            <div className="text-sm text-zinc-500">
                              {char.type === 'bitd' ? (char.bitd?.playbook || 'No Playbook') : char.type}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => archiveSheet(char.id, !char.archived)}
                            className="p-2 text-zinc-500 hover:text-amber-500 hover:bg-zinc-800 rounded-lg transition-colors"
                            title={char.archived ? "Unarchive" : "Archive"}
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => copySheet(char.id)}
                            className="p-2 text-zinc-500 hover:text-indigo-500 hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Copy Character"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this character permanently?')) {
                                deleteSheet(char.id);
                                if (activeSheetId === char.id) {
                                  setActiveSheet(scopedSheets.find(s => s.id !== char.id)?.id || null);
                                }
                              }
                            }}
                            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Delete Permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => {
                            if (!isInAdventure) {
                              addCharacterToAdventure(char.id);
                            }
                            setActiveSheet(char.id);
                            setActiveTabState('active');
                          }}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                            isActive 
                              ? "bg-amber-600 text-white" 
                              : isInAdventure 
                                ? "bg-indigo-600 text-white hover:bg-indigo-500"
                                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          )}
                        >
                          {isActive ? "Currently Active" : isInAdventure ? "Switch to Character" : "Add to Adventure & Switch"}
                        </button>
                        {isInAdventure && !isActive && (
                          <button
                            onClick={() => {
                              if (confirm('Remove this character from the current adventure? They will still be saved in your character list.')) {
                                removeCharacterFromAdventure(char.id);
                              }
                            }}
                            className="px-3 py-2 bg-zinc-800 hover:bg-red-900/30 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                            title="Remove from current adventure"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              
              {savedCharacters.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-2xl">
                  <User className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-500">No saved characters yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'active' && activeSheet && (
          <>
            {/* Character Identity */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 border-b border-zinc-800 pb-8">
              <div className="relative w-32 h-32 bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden group flex-shrink-0">
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" title="Upload Avatar" />
                {activeSheet.avatarUrl ? (
                  <img src={activeSheet.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <User className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Upload Portrait</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1 w-full space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={activeSheet.name || ''}
                      onChange={(e) => updateSheet(activeSheet.id, { name: e.target.value })}
                      className="text-4xl md:text-5xl font-serif font-bold bg-transparent border-none focus:outline-none text-zinc-100 placeholder:text-zinc-800 w-full text-center md:text-left"
                      placeholder="Character Name"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleNewSheet('bitd')}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-900/20"
                    >
                      <Plus className="w-4 h-4" /> New Character
                    </button>
                    <button
                      onClick={handleGenerateAvatar}
                      disabled={isGeneratingAvatar}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/20"
                    >
                      {isGeneratingAvatar ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4" />
                      )}
                      Generate Portrait
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {activeSheet.type === 'bitd' ? (
              <BitDSheet sheet={activeSheet} />
            ) : (
              <div className="p-8 text-center text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <p className="mb-4">This character uses a legacy system ({activeSheet.type}).</p>
                <p>Blades in the Dark is now the default system.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
