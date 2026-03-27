import React, { useState } from 'react';
import { useStore, Clock } from '../store/useStore';
import { Timer, Plus, Trash2, ChevronRight, ChevronLeft, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ClockTracker() {
  const { clocks, addClock, updateClock, deleteClock } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSegments, setNewSegments] = useState<4 | 6 | 8>(4);
  const [newType, setNewType] = useState<'danger' | 'progress' | 'fortune'>('progress');

  const handleAddClock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addClock({
      name: newName,
      segments: newSegments,
      filled: 0,
      type: newType
    });
    setNewName('');
    setIsAdding(false);
  };

  const renderClock = (clock: Clock) => {
    const segments = Array.from({ length: clock.segments });
    const angleStep = 360 / clock.segments;

    return (
      <div key={clock.id} className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl group relative hover:border-zinc-700 transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {clock.type === 'danger' && <AlertCircle className="w-4 h-4 text-red-500" />}
            {clock.type === 'progress' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            {clock.type === 'fortune' && <Info className="w-4 h-4 text-blue-500" />}
            <span className="text-sm font-bold text-zinc-200 truncate max-w-[140px]">{clock.name}</span>
          </div>
          <button
            onClick={() => deleteClock(clock.id)}
            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-500 transition-opacity"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-6">
          {/* Visual Clock */}
          <div className="relative w-20 h-20">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {/* Background circle */}
              <circle cx="50" cy="50" r="45" fill="none" className="stroke-zinc-800" strokeWidth="2" />
              
              {/* Segments */}
              {segments.map((_, i) => {
                const startAngle = i * angleStep;
                const endAngle = (i + 1) * angleStep;
                const x1 = 50 + 45 * Math.cos((startAngle * Math.PI) / 180);
                const y1 = 50 + 45 * Math.sin((startAngle * Math.PI) / 180);
                const x2 = 50 + 45 * Math.cos((endAngle * Math.PI) / 180);
                const y2 = 50 + 45 * Math.sin((endAngle * Math.PI) / 180);
                
                const isFilled = i < clock.filled;
                const color = clock.type === 'danger' ? 'fill-red-500/40' : clock.type === 'progress' ? 'fill-emerald-500/40' : 'fill-blue-500/40';
                const strokeColor = clock.type === 'danger' ? 'stroke-red-500' : clock.type === 'progress' ? 'stroke-emerald-500' : 'stroke-blue-500';

                return (
                  <path
                    key={i}
                    d={`M 50 50 L ${x1} ${y1} A 45 45 0 0 1 ${x2} ${y2} Z`}
                    className={cn(
                      "transition-all duration-300 cursor-pointer",
                      isFilled ? color : "fill-transparent",
                      isFilled ? strokeColor : "stroke-zinc-800"
                    )}
                    strokeWidth="1"
                    onClick={() => updateClock(clock.id, { filled: isFilled ? i : i + 1 })}
                  />
                );
              })}
              
              {/* Center dot */}
              <circle cx="50" cy="50" r="2" className="fill-zinc-700" />
            </svg>
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-zinc-500">{clock.filled}/{clock.segments}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => updateClock(clock.id, { filled: Math.min(clock.segments, clock.filled + 1) })}
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 rounded-lg border border-zinc-700 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => updateClock(clock.id, { filled: Math.max(0, clock.filled - 1) })}
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 rounded-lg border border-zinc-700 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border-l border-zinc-800 w-80">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <Timer className="w-4 h-4 text-amber-500" />
          Progress Clocks
        </h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={cn(
            "p-1.5 rounded-lg transition-all",
            isAdding ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isAdding && (
          <form onSubmit={handleAddClock} className="p-4 bg-zinc-950 border border-amber-500/30 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Clock Name</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Guards Alerted"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[4, 6, 8].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNewSegments(s as 4 | 6 | 8)}
                  className={cn(
                    "py-1.5 rounded-lg text-xs font-bold border transition-all",
                    newSegments === s ? "bg-amber-500/20 border-amber-500 text-amber-500" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                  )}
                >
                  {s} Segs
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['danger', 'progress', 'fortune'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewType(t)}
                  className={cn(
                    "py-1.5 rounded-lg text-[10px] font-bold border capitalize transition-all",
                    newType === t 
                      ? (t === 'danger' ? "bg-red-500/20 border-red-500 text-red-500" : t === 'progress' ? "bg-emerald-500/20 border-emerald-500 text-emerald-500" : "bg-blue-500/20 border-blue-500 text-blue-500")
                      : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg text-xs font-bold uppercase transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold uppercase transition-all shadow-lg shadow-amber-900/20"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {clocks.map(renderClock)}

        {clocks.length === 0 && !isAdding && (
          <div className="py-12 text-center">
            <Timer className="w-8 h-8 text-zinc-800 mx-auto mb-2 opacity-20" />
            <p className="text-xs text-zinc-600 font-medium uppercase tracking-widest">No active clocks</p>
            <p className="text-[10px] text-zinc-700 mt-1">Create a clock to track progress or danger</p>
          </div>
        )}
      </div>
    </div>
  );
}
