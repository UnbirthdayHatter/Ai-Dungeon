import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Dices, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dice3D } from './Dice3D';

export function DiceRoller() {
  const [isOpen, setIsOpen] = useState(false);
  const [diceCount, setDiceCount] = useState(1);
  const [activeRoll, setActiveRoll] = useState<{ results: number[]; total: number; diceType: number; message: string; label?: string; highlight?: 'highest' | 'lowest' | 'sum' } | null>(null);
  const { addMessage, sheets, activeSheetId, generateAIResponse, isLive, isHost, aiAutoRespond } = useStore();

  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];

  const completeRoll = () => {
    if (!activeRoll) return;
    addMessage({
      role: 'dice',
      content: activeRoll.message
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
      numDice = 2; // Roll 2d6 and take lowest
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
    
    setActiveRoll({
      results: rolls,
      total: result,
      diceType: 6,
      message,
      label: label || 'Action Roll',
      highlight: isZeroDice ? 'lowest' : 'highest',
    });
  };

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
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl w-72 animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Dices className="w-4 h-4 text-amber-500" /> Action Roll
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-sm">Dice Pool:</span>
              <input
                type="number"
                value={diceCount}
                onChange={(e) => setDiceCount(parseInt(e.target.value) || 0)}
                className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-zinc-100 focus:outline-none focus:border-amber-500/50"
                min="0"
                max="6"
              />
              <span className="text-zinc-500 font-bold">d6</span>
            </div>
            
            <button
              onClick={() => handleBitDRoll(diceCount)}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors"
            >
              Roll
            </button>

            {activeSheet?.type === 'bitd' && activeSheet?.bitd && (
              <div className="border-t border-zinc-800 pt-3 mt-3">
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
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-amber-600 hover:bg-amber-500 text-white rounded-full shadow-lg shadow-amber-900/20 flex items-center justify-center transition-transform hover:scale-105"
        >
          <Dices className="w-6 h-6" />
        </button>
      )}
    </div>
    </>
  );
}
