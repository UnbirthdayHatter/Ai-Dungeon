import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Users, X, Heart, ShieldAlert, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NPCTracker() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentNPCs } = useStore();

  if (currentNPCs.length === 0) return null;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-4 right-16 md:right-28 z-10 p-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg text-amber-500 hover:text-amber-400 hover:bg-zinc-800 transition-all flex items-center gap-2"
        title="NPC Tracker"
      >
        <Users className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:block">NPCs</span>
        <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          {currentNPCs.length}
        </span>
      </button>

      {/* Slide-out Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-80 bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <h2 className="text-lg font-serif font-bold text-amber-500 flex items-center gap-2">
            <Users className="w-5 h-5" /> Current NPCs
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {currentNPCs.map((npc, idx) => {
            const rel = npc.relationship.toLowerCase();
            let Icon = UserMinus;
            let colorClass = "text-zinc-400";
            let bgClass = "bg-zinc-800/50";
            let borderClass = "border-zinc-700";

            if (rel.includes('friend') || rel.includes('ally') || rel.includes('trust')) {
              Icon = Heart;
              colorClass = "text-emerald-400";
              bgClass = "bg-emerald-900/20";
              borderClass = "border-emerald-800/50";
            } else if (rel.includes('hostile') || rel.includes('enemy') || rel.includes('hate')) {
              Icon = ShieldAlert;
              colorClass = "text-red-400";
              bgClass = "bg-red-900/20";
              borderClass = "border-red-800/50";
            }

            return (
              <div
                key={`${npc.id}-${idx}`}
                className={cn(
                  "p-3 rounded-xl border flex items-start gap-3 transition-colors",
                  bgClass,
                  borderClass
                )}
              >
                <div className={cn("p-2 rounded-lg bg-zinc-950/50", colorClass)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-medium text-zinc-200">{npc.name}</h3>
                  <p className={cn("text-xs mt-0.5", colorClass)}>{npc.relationship}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
