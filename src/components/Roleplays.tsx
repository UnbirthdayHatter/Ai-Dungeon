import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Save, FolderOpen, Trash2, Plus, Clock, MessageSquare } from 'lucide-react';

export function Roleplays() {
  const { savedRoleplays, saveRoleplay, loadRoleplay, deleteRoleplay, newRoleplay, messages, currentRoleplayId } = useStore();
  const [saveName, setSaveName] = useState('');
  const visibleSavedRoleplays = savedRoleplays.filter((rp: any) => !rp.promotedToRoleplayId);

  const handleSave = () => {
    if (!saveName.trim()) return;
    saveRoleplay(saveName.trim());
    setSaveName('');
  };

  const handleLoad = (id: string) => {
    if (confirm('Are you sure you want to load this roleplay? Your current unsaved progress will be lost.')) {
      loadRoleplay(id);
      alert('Roleplay loaded successfully.');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this saved roleplay?')) {
      deleteRoleplay(id);
    }
  };

  const handleNew = () => {
    if (confirm('Are you sure you want to start a new roleplay? Your current unsaved progress will be lost.')) {
      newRoleplay();
      alert('Started a new roleplay.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-8 pt-20 md:pt-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-900/30 border border-emerald-500/30 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-3xl font-serif font-bold text-zinc-100">Roleplays</h2>
              <p className="text-zinc-500 mt-1">Save your current adventure or load a previous one.</p>
            </div>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            New Adventure
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Save className="w-5 h-5 text-amber-500" />
              {currentRoleplayId ? 'Update / Rename Roleplay' : 'Save Current Roleplay'}
            </h3>
            {currentRoleplayId && (
              <button
                onClick={() => handleDelete(currentRoleplayId)}
                className="px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg border border-red-500/20 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Current Save
              </button>
            )}
          </div>
          <div className="flex gap-4">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={currentRoleplayId ? "Rename this roleplay..." : "Enter a name for this save (e.g., 'Curse of Strahd')"}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold rounded-xl transition-colors"
            >
              {currentRoleplayId ? 'Update' : 'Save'}
            </button>
          </div>
          <p className="text-sm text-zinc-500 mt-3">
            {currentRoleplayId 
              ? `Currently syncing to: ${visibleSavedRoleplays.find(r => r.id === currentRoleplayId)?.name || 'Unknown'}`
              : `Currently active: ${messages.length} messages in history.`
            }
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-serif font-bold text-zinc-100">Saved Adventures</h3>
          
          {visibleSavedRoleplays.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl border-dashed">
              <FolderOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">No saved roleplays yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from(new Map((visibleSavedRoleplays as Array<{ id: string; name: string; updatedAt: number; messages: any[]; mood?: string }>).map(rp => [rp.id, rp])).values()).map((rp) => (
                <div key={rp.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-zinc-100 text-lg">{rp.name}</h4>
                      <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(rp.updatedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {rp.messages.length} messages
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {rp.mood && (
                    <div className="text-xs px-2 py-1 bg-zinc-800 text-zinc-300 rounded inline-block w-fit">
                      Mood: {rp.mood}
                    </div>
                  )}

                  <div className="flex gap-2 mt-auto pt-4 border-t border-zinc-800">
                    <button
                      onClick={() => handleLoad(rp.id)}
                      className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      Load
                    </button>
                    <button
                      onClick={async () => {
                        const name = prompt('Enter a name for the forked adventure:', `${rp.name} (Fork)`);
                        if (name) {
                          await useStore.getState().forkRoleplay(rp.id, name);
                          alert('Adventure forked successfully and is now loaded as its own save.');
                        }
                      }}
                      className="px-3 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-500 rounded-lg border border-indigo-500/20 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                      title="Fork Adventure"
                    >
                      <Plus className="w-4 h-4" />
                      Fork
                    </button>
                    <button
                      onClick={() => handleDelete(rp.id)}
                      className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg border border-red-500/20 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                      title="Delete Save"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
