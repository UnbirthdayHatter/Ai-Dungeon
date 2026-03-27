import { useState, useMemo, useEffect } from 'react';
import { useStore, LoreEntry } from '@/store/useStore';
import { auth } from '../firebase';
import { Plus, Trash2, Search, BookOpen, Upload, User, ChevronRight, Folder, Sparkles, Loader2, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Lorebook() {
  const { 
    lorebook, 
    addLoreEntry, 
    updateLoreEntry, 
    deleteLoreEntry, 
    selectedLoreId, 
    setSelectedLoreId, 
    generatePortrait, 
    moveLoreEntry,
    userRoleplays,
    joinedRoleplays,
    savedRoleplays,
    archiveRoleplay,
    setCurrentRoleplayId,
    loadRoleplay,
    setActiveTab,
    currentRoleplayId,
    isHost,
    refreshRoleplayCollections
  } = useStore();

  const activeRoleplay = [...userRoleplays, ...joinedRoleplays].find(rp => rp.id === currentRoleplayId);
  const canEdit = Boolean(isHost || activeRoleplay?.admins?.includes(auth.currentUser?.uid || ''));
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | 'All'>('All');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (currentRoleplayId) {
      refreshRoleplayCollections(currentRoleplayId);
    }
  }, [currentRoleplayId, refreshRoleplayCollections]);

  const categories = ['All', 'Folder', 'NPC', 'Location', 'Lore', 'Monster', 'Quest', 'Item', 'Faction', 'Archive'];

  const filteredLore = useMemo(() => {
    if (!lorebook) return [];
    
    if (activeCategory === 'Archive') {
      const allRoleplays = Array.from(new Map([...userRoleplays, ...joinedRoleplays, ...savedRoleplays].map(rp => [rp.id, rp])).values());
      return allRoleplays
        .filter(rp => rp.archived)
        .filter(rp => rp.name.toLowerCase().includes(search.toLowerCase()))
        .map(rp => ({
          id: rp.id,
          name: rp.name,
          category: 'Archive',
          description: `Archived adventure: ${rp.name}. Last played: ${new Date(rp.updatedAt).toLocaleDateString()}`,
          isAdventure: true
        })) as any[];
    }

    return lorebook.filter(entry => {
      if (!entry || !entry.name) return false;
      const matchesSearch = entry.name.toLowerCase().includes(search.toLowerCase()) || 
                            (entry.description && entry.description.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = activeCategory === 'All' || entry.category === activeCategory;
      const matchesFolder = search ? true : (entry.parentId === currentFolderId || (currentFolderId === null && !entry.parentId));
      return matchesSearch && matchesCategory && matchesFolder;
    });
  }, [lorebook, search, activeCategory, currentFolderId]);

  const breadcrumbs = useMemo(() => {
    if (!lorebook) return [];
    const crumbs = [];
    let current = lorebook.find(e => e.id === currentFolderId);
    while (current) {
      crumbs.unshift(current);
      current = lorebook.find(e => e.id === current.parentId);
    }
    return crumbs;
  }, [lorebook, currentFolderId]);

  const selectedEntry = useMemo(() => {
    if (activeCategory === 'Archive' && selectedLoreId) {
      const allRoleplays = Array.from(new Map([...userRoleplays, ...joinedRoleplays, ...savedRoleplays].map(rp => [rp.id, rp])).values());
      const rp = allRoleplays.find(r => r.id === selectedLoreId);
      if (rp) {
        return {
          id: rp.id,
          name: rp.name,
          category: 'Archive',
          description: `This is an archived adventure. You can restore it to continue playing or view its details here.`,
          isAdventure: true
        };
      }
    }
    if (!lorebook) return null;
    return lorebook.find(e => e.id === selectedLoreId) || null;
  }, [lorebook, selectedLoreId, activeCategory, userRoleplays, joinedRoleplays, savedRoleplays]);

  const handleCreateNew = (category?: string) => {
    const newEntry: Omit<LoreEntry, 'id'> = {
      category: category || (activeCategory === 'All' ? 'NPC' : activeCategory),
      name: category === 'Folder' ? 'New Folder' : 'New Entry',
      description: '',
      parentId: currentFolderId
    };
    const id = addLoreEntry(newEntry);
    setSelectedLoreId(id);
  };

  const handleEntryClick = (entry: any) => {
    if (entry.category === 'Folder') {
      setCurrentFolderId(entry.id);
      setSelectedLoreId(null);
    } else if (entry.isAdventure) {
      // Special handling for archived adventures
      setSelectedLoreId(entry.id);
    } else {
      setSelectedLoreId(entry.id);
    }
  };

  const handleAvatarUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateLoreEntry(id, { avatarUrl: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGeneratePortrait = async () => {
    if (!selectedEntry) return;
    setIsGenerating(true);
    try {
      let categoryInstructions = '';
      if (selectedEntry.category === 'Location') {
        categoryInstructions = ' scenic, not focusing on people';
      } else if (selectedEntry.category === 'NPC') {
        categoryInstructions = ' a close up portrait with a blurry background';
      }
      
      const fullPrompt = `${selectedEntry.name}: ${selectedEntry.description}${categoryInstructions}`;
      await generatePortrait(selectedEntry.id, fullPrompt);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-zinc-950 overflow-hidden pt-16 md:pt-0">
      {/* Sidebar List */}
      <div className="w-full md:w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
        <div className="p-4 border-b border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-500" />
              Lorebook
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => handleCreateNew('Folder')}
                disabled={!canEdit}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="New Folder"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleCreateNew()}
                disabled={!canEdit}
                className="p-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="New Entry"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat, idx) => (
              <button
                key={`${cat}-${idx}`}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all border',
                  activeCategory === cat
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                    : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Breadcrumbs */}
          {!search && (
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 overflow-x-auto no-scrollbar py-1">
              <button 
                onClick={() => setCurrentFolderId(null)}
                className={cn("hover:text-zinc-300 transition-colors", !currentFolderId && "text-amber-500 font-bold")}
              >
                ROOT
              </button>
              {breadcrumbs.map((crumb) => (
                <div key={crumb.id} className="flex items-center gap-1">
                  <ChevronRight className="w-2 h-2" />
                  <button 
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className={cn("hover:text-zinc-300 transition-colors whitespace-nowrap", currentFolderId === crumb.id && "text-amber-500 font-bold")}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredLore.map((entry, idx) => (
            <button
              key={`${entry.id}-${idx}`}
              onClick={() => handleEntryClick(entry)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all group relative",
                selectedLoreId === entry.id 
                  ? "bg-amber-500/10 border border-amber-500/20" 
                  : "hover:bg-zinc-800/50 border border-transparent"
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden flex-shrink-0">
                {entry.avatarUrl ? (
                  <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    {entry.category === 'Folder' ? <Folder className="w-5 h-5 text-amber-500/50" /> : <BookOpen className="w-5 h-5" />}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  selectedLoreId === entry.id ? "text-amber-500" : "text-zinc-300"
                )}>
                  {entry.name}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  {entry.category}
                </p>
              </div>
              <ChevronRight className={cn(
                "w-4 h-4 text-zinc-600 transition-transform",
                selectedLoreId === entry.id || entry.category === 'Folder' ? "translate-x-0 text-amber-500" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
              )} />
            </button>
          ))}

          {filteredLore.length === 0 && (
            <div className="py-8 text-center text-zinc-600">
              <p className="text-xs">No entries found</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-zinc-950 overflow-y-auto">
        {selectedEntry ? (
          <div className="max-w-4xl mx-auto w-full p-6 md:p-12 space-y-8">
            {(selectedEntry as any).isAdventure ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
                  <div className="space-y-1">
                    <h2 className="text-4xl font-serif font-bold text-zinc-100">{selectedEntry.name}</h2>
                    <p className="text-sm text-zinc-500 uppercase tracking-widest font-bold">Archived Adventure</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => archiveRoleplay(selectedEntry.id, false)}
                      className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-900/20"
                    >
                      Restore Adventure
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to permanently delete this adventure?')) {
                          useStore.getState().deleteRoleplay(selectedEntry.id);
                          setSelectedLoreId(null);
                        }
                      }}
                      className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-amber-500" />
                      Adventure Details
                    </h3>
                    <div className="space-y-2 text-sm text-zinc-400">
                      <p><span className="text-zinc-500">Status:</span> Archived</p>
                      <p><span className="text-zinc-500">Last Played:</span> {new Date((userRoleplays.find(r => r.id === selectedEntry.id) || savedRoleplays.find(r => r.id === selectedEntry.id))?.updatedAt || 0).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => {
                        const isSaved = savedRoleplays.some(r => r.id === selectedEntry.id);
                        if (isSaved) loadRoleplay(selectedEntry.id);
                        else setCurrentRoleplayId(selectedEntry.id);
                        setActiveTab('chat');
                      }}
                      className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-bold transition-all border border-zinc-700"
                    >
                      View Chat History
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  {/* Avatar Upload */}
                  <div className="relative w-32 h-32 md:w-48 md:h-48 bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden group flex-shrink-0">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleAvatarUpload(selectedEntry.id, e)} 
                      className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                      title="Upload Portrait" 
                    />
                    {(selectedEntry as any).avatarUrl ? (
                      <img src={(selectedEntry as any).avatarUrl} alt={selectedEntry.name} className="w-full h-full object-cover" />
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

                  <div className="flex-1 space-y-4 w-full">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedEntry.category}
                          onChange={(e) => updateLoreEntry(selectedEntry.id, { category: e.target.value })}
                          className="text-xs font-bold uppercase tracking-widest bg-amber-500/10 text-amber-500 rounded-full px-4 py-1.5 border border-amber-500/20 focus:outline-none focus:ring-1 focus:ring-amber-500/50 cursor-pointer"
                        >
                          {categories.filter(c => c !== 'All' && c !== 'Archive').map((cat, idx) => (
                            <option key={`${cat}-${idx}`} value={cat}>{cat}</option>
                          ))}
                        </select>

                        <select
                          value={(selectedEntry as any).parentId || ''}
                          onChange={(e) => moveLoreEntry(selectedEntry.id, e.target.value || null)}
                          className="text-[10px] font-bold uppercase tracking-widest bg-zinc-900 text-zinc-400 rounded-full px-3 py-1 border border-zinc-800 focus:outline-none cursor-pointer"
                        >
                          <option value="">No Folder</option>
                          {lorebook.filter(e => e.category === 'Folder' && e.id !== selectedEntry.id).map(folder => (
                            <option key={folder.id} value={folder.id}>{folder.name}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          deleteLoreEntry(selectedEntry.id);
                          setSelectedLoreId(null);
                        }}
                        className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleGeneratePortrait}
                        disabled={isGenerating || selectedEntry.category === 'Folder'}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-900/20"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        Generate Portrait
                      </button>
                    </div>

                    <input
                      type="text"
                      value={selectedEntry.name}
                      onChange={(e) => updateLoreEntry(selectedEntry.id, { name: e.target.value })}
                      className="w-full text-4xl md:text-5xl font-serif font-bold bg-transparent border-none focus:outline-none text-zinc-100 placeholder:text-zinc-800"
                      placeholder="Entry Name"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-zinc-500 border-b border-zinc-800 pb-2">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Description & Lore</span>
                  </div>
                  <textarea
                    value={selectedEntry.description}
                    onChange={(e) => updateLoreEntry(selectedEntry.id, { description: e.target.value })}
                    className="w-full min-h-[400px] bg-transparent text-zinc-300 leading-relaxed focus:outline-none resize-none text-lg placeholder:text-zinc-800"
                    placeholder="Write the history, details, and secrets of this entry..."
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6 border border-zinc-800">
              <BookOpen className="w-10 h-10 opacity-20" />
            </div>
            <h3 className="text-xl font-serif font-bold text-zinc-400 mb-2">Select an entry</h3>
            <p className="max-w-xs text-sm">Choose a lore entry from the sidebar or create a new one to start building your world.</p>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => handleCreateNew('Folder')}
                className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-full transition-all border border-zinc-800"
              >
                <Plus className="w-4 h-4" />
                New Folder
              </button>
              <button
                onClick={() => handleCreateNew()}
                className="flex items-center gap-2 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full transition-all border border-zinc-700"
              >
                <Plus className="w-4 h-4" />
                Create New Entry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
