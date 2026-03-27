import React from 'react';
import { useStore } from '../store/useStore';
import { Pencil, Trash2, Plus, Save, History, Sparkles, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Notes() {
  const { notes, setNotes } = useStore();
  const [localNotes, setLocalNotes] = React.useState(notes);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  const handleSave = () => {
    setIsSaving(true);
    setNotes(localNotes);
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border-l border-zinc-800 w-80">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <Pencil className="w-4 h-4 text-amber-500" />
            Quick Notes
          </h2>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "p-1.5 rounded-lg transition-all border flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest",
              isSaving 
                ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-500" 
                : "bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 border-amber-500/20"
            )}
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            {isSaving ? 'Saved' : 'Save'}
          </button>
        </div>
        <p className="text-[10px] text-zinc-500 leading-relaxed italic">
          Jot down clues, names, or reminders for your adventure.
        </p>
      </div>

      <div className="flex-1 p-4">
        <textarea
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={handleSave}
          placeholder="Start typing your notes here..."
          className="w-full h-full bg-transparent border-none focus:ring-0 text-zinc-200 text-sm resize-none placeholder:text-zinc-700 font-sans leading-relaxed"
        />
      </div>
      
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center gap-2 text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
          <FileText className="w-3 h-3" />
          Auto-saves on blur
        </div>
      </div>
    </div>
  );
}
