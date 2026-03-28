import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Users, Copy, Check, LogIn, Plus, Shield, Globe, Zap, History, Trash2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Multiplayer() {
  const {
    currentLiveRoleplayId,
    setCurrentRoleplayId,
    createRoleplay,
    joinRoleplay,
    joinCode: activeJoinCode,
    userRoleplays,
    joinedRoleplays,
    archiveRoleplay,
    deleteRoleplay,
    destroyRoleplay,
    fetchUserRoleplays,
    setActiveTab
  } = useStore();
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeRoleplay = userRoleplays.find((rp) => rp.id === currentLiveRoleplayId)
    || joinedRoleplays.find((rp) => rp.id === currentLiveRoleplayId);

  useEffect(() => {
    fetchUserRoleplays();
  }, [fetchUserRoleplays]);

  const handleHost = async () => {
    setLoading(true);
    setError(null);
    try {
      const id = await createRoleplay('New Adventure');
      setCurrentRoleplayId(id);
      setActiveTab('chat');
    } catch (err: any) {
      setError(err.message || 'Failed to create roleplay.');
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
      setActiveTab('chat');
    } catch (err: any) {
      setError(err.message || 'Failed to join roleplay.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    const code = activeJoinCode || currentLiveRoleplayId;
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <h2 className="text-2xl font-serif font-bold text-zinc-100">Multiplayer</h2>
          </div>
          <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Create or Join</span>
        </div>

        {currentLiveRoleplayId && activeRoleplay && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Current Live Adventure</p>
                <h3 className="text-lg font-bold text-zinc-100">{activeRoleplay.name}</h3>
                <p className="text-sm text-zinc-500">
                  Live-session controls now stay inside the adventure, so each session keeps its own party and permissions in context.
                </p>
              </div>
              <button
                onClick={copyToClipboard}
                className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 hover:text-amber-500 transition-all border border-zinc-700"
                title="Copy join code"
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950/80">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Join Code</p>
                <p className="text-sm font-mono font-black tracking-[0.25em] text-zinc-100">
                  {activeJoinCode || currentLiveRoleplayId}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('chat')}
                className="px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-all flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Return to Adventure
              </button>
            </div>
          </div>
        )}

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Plus className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Host a Session</h3>
                <p className="text-sm text-zinc-500">Create a new multiplayer adventure and invite your table in one step.</p>
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

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <LogIn className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Join a Session</h3>
                <p className="text-sm text-zinc-500">Enter a 6-digit session code to join an existing live adventure.</p>
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

          <div className="space-y-6">
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
                          onClick={() => {
                            setCurrentRoleplayId(rp.id);
                            setActiveTab('chat');
                          }}
                          className="px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600 text-amber-500 hover:text-white rounded-lg text-xs font-bold transition-all"
                        >
                          Open Adventure
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
                          onClick={() => {
                            setCurrentRoleplayId(rp.id);
                            setActiveTab('chat');
                          }}
                          className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-lg text-xs font-bold transition-all"
                        >
                          Open Adventure
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

          <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 flex gap-4">
            <Zap className="w-6 h-6 text-blue-500 shrink-0" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-blue-400">Adventure-Scoped Multiplayer</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Create or join a live adventure here, then manage that adventure&apos;s party, permissions, and synced state from inside the adventure itself.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
