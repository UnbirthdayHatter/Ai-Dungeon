import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Users, Copy, Check, LogIn, Plus, Shield, Globe, Zap, History, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/firebase';

export function Multiplayer() {
  const { 
    currentRoleplayId, 
    setCurrentRoleplayId, 
    createRoleplay, 
    joinRoleplay, 
    activeSheetId, 
    sheets, 
    joinCode: activeJoinCode, 
    sessionSheets, 
    userRoleplays,
    savedRoleplays,
    loadRoleplay,
    hostSavedRoleplay,
    renameRoleplay,
    removeSheetFromRoleplay,
    togglePlayerPermission,
    isHost,
    joinedRoleplays,
    archiveRoleplay,
    deleteRoleplay,
    destroyRoleplay,
    fetchUserRoleplays
  } = useStore();
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [showAdventures, setShowAdventures] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');

  const activeRoleplay = userRoleplays.find(rp => rp.id === currentRoleplayId) || joinedRoleplays.find(rp => rp.id === currentRoleplayId);
  const getRoleLabel = (ownerId?: string) => {
    if (!ownerId) return 'Player';
    if (ownerId === auth.currentUser?.uid) return 'You';
    if (activeRoleplay?.admins?.includes(ownerId)) return 'Admin';
    if (activeRoleplay?.editors?.includes(ownerId)) return 'Editor';
    return 'Player';
  };

  useEffect(() => {
    fetchUserRoleplays();
  }, [fetchUserRoleplays]);

  const handleRename = async () => {
    if (!currentRoleplayId || !newName.trim()) return;
    try {
      await renameRoleplay(currentRoleplayId, newName.trim());
      setIsRenaming(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];

  const handleHost = async () => {
    setLoading(true);
    setError(null);
    try {
      const id = await createRoleplay('New Adventure');
      setCurrentRoleplayId(id);
    } catch (err: any) {
      setError(err.message || 'Failed to create roleplay.');
    } finally {
      setLoading(false);
    }
  };

  const handleHostSaved = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await hostSavedRoleplay(id);
      setShowAdventures(false);
    } catch (err: any) {
      setError(err.message || 'Failed to host adventure.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.length !== 6) {
      setError('Join code must be 6 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await joinRoleplay(joinCode);
    } catch (err: any) {
      setError(err.message || 'Failed to join roleplay.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const code = activeJoinCode || currentRoleplayId;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const leaveSession = async () => {
    if (currentRoleplayId && activeSheetId) {
      await removeSheetFromRoleplay(currentRoleplayId, activeSheetId);
    }
    setCurrentRoleplayId(null);
    setJoinCode('');
  };

  const handleArchive = async (id: string, archived: boolean) => {
    try {
      await archiveRoleplay(id, archived);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this session from your list? This will not delete the session for other players.')) {
      deleteRoleplay(id);
    }
  };

  const handleDestroy = async (id: string) => {
    if (confirm('CRITICAL: Are you sure you want to PERMANENTLY DESTROY this session for everyone? This cannot be undone.')) {
      try {
        await destroyRoleplay(id);
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/50 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-amber-500" />
            <h2 className="text-2xl font-serif font-bold text-zinc-100">
              {currentRoleplayId && activeRoleplay ? activeRoleplay.name : 'Multiplayer Session'}
            </h2>
          </div>
          {currentRoleplayId && isHost && !isRenaming && (
            <button
              onClick={() => {
                setNewName(activeRoleplay?.name || '');
                setIsRenaming(true);
              }}
              className="text-xs text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wider"
            >
              Rename Adventure
            </button>
          )}
        </div>

        {isRenaming && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-zinc-100 focus:outline-none focus:border-amber-500/50"
              placeholder="Enter new adventure name..."
            />
            <button
              onClick={handleRename}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-all"
            >
              Save
            </button>
            <button
              onClick={() => setIsRenaming(false)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl font-bold transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        {!currentRoleplayId ? (
          <div className="space-y-8">
            {/* Session Management Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create Session */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Plus className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">Host a Session</h3>
                  <p className="text-sm text-zinc-500">Create a new session and share the code with your friends.</p>
                </div>
                <div className="mt-auto pt-4">
                  {error && <p className="text-xs text-red-500 text-center mb-2">{error}</p>}
                  <button
                    onClick={handleHost}
                    disabled={loading}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Globe className="w-4 h-4" />
                    {loading ? 'Creating...' : 'Create Session'}
                  </button>
                </div>
              </div>

              {/* Join Session */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <LogIn className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">Join a Session</h3>
                  <p className="text-sm text-zinc-500">Enter a 6-digit session code to join an existing game.</p>
                </div>
                <form onSubmit={handleJoin} className="mt-auto space-y-3 pt-4">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    maxLength={6}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-[0.5em] text-zinc-100 focus:outline-none focus:border-blue-500/50"
                  />
                  {error && <p className="text-xs text-red-500 text-center">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-bold transition-all border border-zinc-700 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    {loading ? 'Joining...' : 'Join Game'}
                  </button>
                </form>
              </div>
            </div>

            {/* Organized Session Lists */}
            <div className="space-y-6">
              {/* Hosted Sessions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Hosted Sessions
                  </h3>
                  <span className="text-xs text-zinc-600">{userRoleplays.length} Total</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {userRoleplays.length === 0 ? (
                    <div className="p-8 bg-zinc-900/30 border border-zinc-800/50 border-dashed rounded-2xl text-center">
                      <p className="text-sm text-zinc-600 italic">You haven't hosted any sessions yet.</p>
                    </div>
                  ) : (
                    userRoleplays.sort((a, b) => b.updatedAt - a.updatedAt).map((rp) => (
                      <div key={rp.id} className={cn(
                        "group p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-amber-500/30 transition-all flex items-center justify-between",
                        rp.archived && "opacity-60 grayscale-[0.5]"
                      )}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-zinc-100 truncate group-hover:text-amber-500 transition-colors">{rp.name}</h4>
                            {rp.archived && <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded uppercase font-bold">Archived</span>}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-[10px] text-zinc-500 font-mono">CODE: {rp.joinCode}</span>
                            <span className="text-[10px] text-zinc-600">Updated: {new Date(rp.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentRoleplayId(rp.id)}
                            className="px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600 text-amber-500 hover:text-white rounded-lg text-xs font-bold transition-all"
                          >
                            Resume
                          </button>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleArchive(rp.id, !rp.archived)}
                              className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                              title={rp.archived ? "Unarchive" : "Archive"}
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDestroy(rp.id)}
                              className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"
                              title="Destroy Session"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Joined Sessions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Joined Sessions
                  </h3>
                  <span className="text-xs text-zinc-600">{joinedRoleplays.length} Total</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {joinedRoleplays.length === 0 ? (
                    <div className="p-8 bg-zinc-900/30 border border-zinc-800/50 border-dashed rounded-2xl text-center">
                      <p className="text-sm text-zinc-600 italic">You haven't joined any sessions yet.</p>
                    </div>
                  ) : (
                    joinedRoleplays.sort((a, b) => b.updatedAt - a.updatedAt).map((rp) => (
                      <div key={rp.id} className="group p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-blue-500/30 transition-all flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-zinc-100 truncate group-hover:text-blue-500 transition-colors">{rp.name}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-[10px] text-zinc-500 font-mono">CODE: {rp.joinCode}</span>
                            <span className="text-[10px] text-zinc-600">Updated: {new Date(rp.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentRoleplayId(rp.id)}
                            className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-lg text-xs font-bold transition-all"
                          >
                            Join
                          </button>
                          <button
                            onClick={() => handleDelete(rp.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            title="Remove from List"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
              
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Session Code</p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-3xl font-mono font-black text-white tracking-widest select-all">
                    {activeJoinCode || currentRoleplayId}
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 hover:text-amber-500 transition-all border border-zinc-700"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-500 text-xs font-bold uppercase tracking-wider">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live Sync Active
                </div>
                <p className="text-sm text-zinc-400 max-w-md">
                  Your game state is being synchronized in real-time. Other players with this code can see your rolls and chat.
                </p>
              </div>

              <div className="pt-6 border-t border-zinc-800">
                <button
                  onClick={leaveSession}
                  className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl text-sm font-bold transition-all"
                >
                  Leave Session
                </button>
              </div>
            </div>

            {/* Connected Players */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Connected Players</h3>
              <div className="grid grid-cols-1 gap-3">
                {sessionSheets.map((sheet) => (
                  <div key={sheet.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30 overflow-hidden">
                        {sheet.avatarUrl ? (
                          <img src={sheet.avatarUrl} alt={sheet.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Shield className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-100">
                          {sheet.name || 'Unknown Hero'} 
                          {sheet.ownerId === auth.currentUser?.uid && ' (You)'}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest",
                            sheet.ownerId === auth.currentUser?.uid
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : activeRoleplay?.admins?.includes(sheet.ownerId || '')
                                ? "bg-red-500/10 text-red-400 border-red-500/30"
                                : activeRoleplay?.editors?.includes(sheet.ownerId || '')
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
                          )}>
                            {getRoleLabel(sheet.ownerId)}
                          </span>
                          <span className="text-[10px] text-zinc-600">
                            {sheet.ownerId === auth.currentUser?.uid ? 'Reserved to your character slot' : 'Reserved to another player'}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                          {sheet.charClass || 'Adventurer'} • Level {sheet.level || 1}
                        </p>
                      </div>
                    </div>

                    {isHost && sheet.ownerId !== auth.currentUser?.uid && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePlayerPermission(currentRoleplayId!, sheet.ownerId!, 'admin')}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                            activeRoleplay?.admins?.includes(sheet.ownerId)
                              ? "bg-red-500/20 border-red-500/50 text-red-500"
                              : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-400"
                          )}
                          title="Toggle Admin Permissions"
                        >
                          Admin
                        </button>
                        <button
                          onClick={() => togglePlayerPermission(currentRoleplayId!, sheet.ownerId!, 'editor')}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                            activeRoleplay?.editors?.includes(sheet.ownerId)
                              ? "bg-amber-500/20 border-amber-500/50 text-amber-500"
                              : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-400"
                          )}
                          title="Toggle Edit Permissions"
                        >
                          Editor
                        </button>
                        <button
                          onClick={() => togglePlayerPermission(currentRoleplayId!, sheet.ownerId!, 'viewer')}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                            !activeRoleplay?.editors?.includes(sheet.ownerId) && !activeRoleplay?.admins?.includes(sheet.ownerId)
                              ? "bg-zinc-500/20 border-zinc-500/50 text-zinc-500"
                              : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-400"
                          )}
                          title="Set to Viewer"
                        >
                          Viewer
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove ${sheet.name} from the session?`)) {
                              removeSheetFromRoleplay(currentRoleplayId!, sheet.id);
                            }
                          }}
                          className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                
                {sessionSheets.length === 0 && (
                  <div className="bg-zinc-900/30 border border-zinc-800/50 border-dashed rounded-xl p-4 flex items-center justify-center col-span-full">
                    <p className="text-xs text-zinc-600 italic">Waiting for players to join...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Features Info */}
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 flex gap-4">
              <Zap className="w-6 h-6 text-blue-500 shrink-0" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-blue-400">Real-time Sync</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Multiplayer mode syncs messages, combat state, character sheets, and the lorebook for this single adventure.
                  Each attached character stays reserved to one player inside this adventure, so they do not cross over into other adventures or other players' slots.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
