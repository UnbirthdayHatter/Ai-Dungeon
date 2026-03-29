import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Dices, X, Sparkles, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dice3D } from './Dice3D';

export function DiceRoller() {
  const [isOpen, setIsOpen] = useState(false);
  const [diceCount, setDiceCount] = useState(1);
  const [activeRoll, setActiveRoll] = useState<{ results: number[]; total: number; diceType: number; label?: string; highlight?: 'highest' | 'lowest' | 'sum'; buildMessage: (resolvedResults: number[]) => string } | null>(null);
  const { addMessage, sheets, activeSheetId, generateAIResponse, isLive, isHost, aiAutoRespond, diceSkin } = useStore();

  const activeSheet = sheets.find((s) => s.id === activeSheetId) || sheets[0];

  const completeRoll = (resolvedResults: number[]) => {
    if (!activeRoll) return;
    addMessage({
      role: 'dice',
      content: activeRoll.buildMessage(resolvedResults)
    });
    if (!isLive || (isHost && aiAutoRespond)) {
      generateAIResponse();
    }
    setActiveRoll(null);
    setIsOpen(false);
  };

  const handleBitDRoll = (poolSize: number, label?: string) => {
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

    const sixes = rolls.filter((r) => r === 6).length;

    if (sixes >= 2 && !isZeroDice) {
      outcome = '**Critical Success!** You do it with increased effect.';
    } else if (result === 6) {
      outcome = '**Full Success!** You do it.';
    } else if (result >= 4) {
      outcome = '**Partial Success.** You do it, but there is a consequence.';
    } else {
      outcome = '**Bad Outcome.** Things go poorly.';
    }

    setActiveRoll({
      results: rolls,
      total: result,
      diceType: 6,
      label: label || 'Action Roll',
      highlight: isZeroDice ? 'lowest' : 'highest',
      buildMessage: (resolvedResults) => {
        const actualResult = isZeroDice ? Math.min(...resolvedResults) : Math.max(...resolvedResults);
        const actualSixes = resolvedResults.filter((r) => r === 6).length;
        const actualOutcome =
          actualSixes >= 2 && !isZeroDice
            ? '**Critical Success!** You do it with increased effect.'
            : actualResult === 6
              ? '**Full Success!** You do it.'
              : actualResult >= 4
                ? '**Partial Success.** You do it, but there is a consequence.'
                : '**Bad Outcome.** Things go poorly.';
        const rollDetails = `[${resolvedResults.join(', ')}]`;
        const poolText = isZeroDice ? '0d (Rolled 2, took lowest)' : `${poolSize}d`;
        const rollName = label ? `rolled **${label}**` : 'rolled an action';
        return `**${activeSheet?.name || 'Player'}** ${rollName} with **${poolText}**\n\nResult: ${rollDetails} -> **${actualResult}**\n${actualOutcome}`;
      },
    });
  };

  const quickPools = [0, 1, 2, 3, 4];
  const skinAccent = {
    classic: 'from-amber-500/20 to-orange-500/10 border-amber-500/20 text-amber-300',
    default: 'from-amber-500/20 to-orange-500/10 border-amber-500/20 text-amber-300',
    obsidian: 'from-zinc-700/40 to-zinc-900/40 border-zinc-600/30 text-zinc-200',
    ivory: 'from-stone-100/20 via-amber-100/10 to-stone-400/10 border-amber-200/30 text-amber-100',
    celestial: 'from-indigo-500/20 to-violet-500/10 border-indigo-400/30 text-indigo-200',
    bloodstone: 'from-red-600/20 to-rose-900/10 border-red-500/30 text-red-200',
    emerald: 'from-emerald-500/20 to-teal-500/10 border-emerald-400/30 text-emerald-200',
    night: 'from-slate-500/20 to-slate-900/20 border-slate-400/25 text-slate-100',
    sapphire: 'from-blue-500/20 to-cyan-500/10 border-blue-400/30 text-blue-200',
    amethyst: 'from-purple-500/20 to-fuchsia-500/10 border-purple-400/30 text-purple-200',
    rosegold: 'from-rose-400/20 to-orange-400/10 border-rose-300/30 text-rose-200',
    aurora: 'from-emerald-400/20 to-indigo-500/10 border-cyan-400/30 text-cyan-200',
    voidfire: 'from-violet-500/20 to-purple-500/10 border-violet-400/30 text-violet-200',
    toxic: 'from-lime-500/20 to-green-500/10 border-lime-400/30 text-lime-200',
    glitchpop: 'from-fuchsia-500/20 to-cyan-500/10 border-pink-400/30 text-pink-200',
    wacky: 'from-cyan-500/20 via-fuchsia-500/10 to-lime-500/20 border-cyan-400/30 text-cyan-100',
    tester1: 'from-rose-500/20 via-fuchsia-500/10 to-amber-300/20 border-rose-400/30 text-rose-100',
    bigbrother: 'from-blue-500/20 via-indigo-600/10 to-pink-400/20 border-blue-300/30 text-pink-100',
  }[diceSkin] || 'from-amber-500/20 to-orange-500/10 border-amber-500/20 text-amber-300';

  return (
    <>
      {activeRoll && (
        <Dice3D
          results={activeRoll.results}
          total={activeRoll.total}
          diceType={activeRoll.diceType}
          label={activeRoll.label}
          highlight={activeRoll.highlight}
          onComplete={completeRoll}
        />
      )}
      <div className="fixed bottom-6 right-6 z-50">
        {isOpen ? (
          <div className="w-[22rem] rounded-[1.75rem] border border-zinc-800 bg-zinc-950/95 shadow-2xl backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom-4">
            <div className={cn('p-4 border-b border-zinc-800 bg-gradient-to-br', skinAccent)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] font-black text-zinc-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    Dice Tray
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-zinc-100 flex items-center gap-2">
                    <Dices className="w-5 h-5" />
                    Blades Action Roll
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    Roll a pool directly or tap an action rating from the active character.
                  </p>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-500">Dice Pool</span>
                  <span className="text-xs text-zinc-400">{diceCount <= 0 ? 'Zero-dice roll' : `${diceCount}d6`}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDiceCount((current) => Math.max(0, current - 1))}
                    className="w-10 h-10 rounded-xl border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-center">
                    <div className="text-3xl font-black text-zinc-100">{diceCount}</div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mt-1">Dice</div>
                  </div>
                  <button
                    onClick={() => setDiceCount((current) => Math.min(6, current + 1))}
                    className="w-10 h-10 rounded-xl border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => handleBitDRoll(diceCount)}
                  className="w-full mt-4 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-amber-950/30"
                >
                  Roll Pool
                </button>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-500 mb-3">Quick Pools</div>
                <div className="grid grid-cols-5 gap-2">
                  {quickPools.map((pool) => (
                    <button
                      key={pool}
                      onClick={() => handleBitDRoll(pool, 'Quick Roll')}
                      className={cn(
                        'rounded-xl border px-0 py-2.5 text-sm font-black transition-all',
                        pool === diceCount
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                          : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
                      )}
                    >
                      {pool}d
                    </button>
                  ))}
                </div>
              </div>

              {activeSheet?.type === 'bitd' && activeSheet?.bitd && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-500">Action Ratings</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-600">{activeSheet.name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                    {(Object.entries(activeSheet.bitd.actions) as Array<[string, number]>).map(([action, rating]) => (
                      <button
                        key={action}
                        onClick={() => handleBitDRoll(rating, action.charAt(0).toUpperCase() + action.slice(1))}
                        className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-100 px-3 py-2.5 transition-all text-left"
                      >
                        <div className="text-xs font-bold capitalize">{action}</div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-indigo-300 mt-1">{rating}d6</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-1 text-[11px] leading-relaxed text-zinc-500">
                Blades rolls use the highest die. Zero dice rolls 2d6 and keeps the lowest.
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 rounded-[1.4rem] text-white shadow-2xl flex items-center justify-center transition-all hover:scale-105 border border-white/10 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 shadow-amber-950/30"
          >
            <Dices className="w-6 h-6" />
          </button>
        )}
      </div>
    </>
  );
}
