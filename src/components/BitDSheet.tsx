import React from 'react';
import { useStore, Sheet } from '@/store/useStore';
import { Shield, Heart, Sword, Book, Backpack, Dices, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BitDSheetProps {
  sheet: Sheet;
}

export function BitDSheet({ sheet }: BitDSheetProps) {
  const { updateSheet, addMessage, generateAIResponse, currentRoleplayId, isHost, aiAutoRespond } = useStore();
  const bitd = (sheet.bitd || {}) as any;

  const updateBitD = (field: string, value: any) => {
    updateSheet(sheet.id, {
      bitd: { ...bitd, [field]: value }
    });
  };

  const updateAction = (action: string, value: number) => {
    updateSheet(sheet.id, {
      bitd: {
        ...bitd,
        actions: { ...(bitd.actions || {}), [action]: value }
      }
    });
  };

  const handleActionRoll = (actionName: string, rating: number) => {
    const isZero = rating === 0;
    const numDice = isZero ? 2 : rating;
    const rolls = Array.from({ length: numDice }, () => Math.floor(Math.random() * 6) + 1);
    
    let result;
    let highest = Math.max(...rolls);
    let sixes = rolls.filter(r => r === 6).length;

    if (isZero) {
      highest = Math.min(...rolls);
      sixes = 0; // Can't crit on 0d
    }

    if (sixes >= 2 && !isZero) result = 'Critical Success!';
    else if (highest === 6) result = 'Full Success';
    else if (highest >= 4) result = 'Partial Success';
    else result = 'Bad Outcome';

    const rollDetails = `[${rolls.join(', ')}]`;
    const diceStr = isZero ? '0d (Roll 2, keep lowest)' : `${rating}d`;

    addMessage({
      role: 'dice',
      content: `**${sheet.name}** rolled **${actionName}** (${diceStr})\n\nResult: ${rollDetails} -> **${highest}**\n**${result}**`
    });

    if (!currentRoleplayId || (isHost && aiAutoRespond)) {
      generateAIResponse();
    }
  };

  const renderAction = (name: string, key: string) => {
    const rating = bitd.actions?.[key] || 0;
    return (
      <div className="flex items-center justify-between group">
        <button 
          onClick={() => handleActionRoll(name, rating)}
          className="text-sm font-medium text-zinc-300 hover:text-amber-500 transition-colors flex items-center gap-2"
        >
          <Dices className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          {name}
        </button>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(dot => (
            <button
              key={dot}
              onClick={() => updateAction(key, rating === dot ? dot - 1 : dot)}
              className={cn(
                "w-3 h-3 rounded-full border border-zinc-600 transition-colors",
                rating >= dot ? "bg-amber-500 border-amber-500" : "bg-transparent hover:border-amber-500/50"
              )}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderStress = () => {
    const stress = bitd.stress || 0;
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-zinc-100 uppercase tracking-widest">Stress</span>
          <span className="text-xs text-zinc-500">{stress} / 9</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(box => (
            <button
              key={box}
              onClick={() => updateBitD('stress', stress === box ? box - 1 : box)}
              className={cn(
                "flex-1 h-6 border transition-colors",
                stress >= box ? "bg-red-900 border-red-500" : "bg-zinc-900 border-zinc-700 hover:border-red-500/50"
              )}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Playbook</label>
          <input
            type="text"
            value={bitd.playbook || ''}
            onChange={(e) => updateBitD('playbook', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
            placeholder="e.g. Cutter"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Crew</label>
          <input
            type="text"
            value={bitd.crew || ''}
            onChange={(e) => updateBitD('crew', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Alias</label>
          <input
            type="text"
            value={bitd.alias || ''}
            onChange={(e) => updateBitD('alias', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Look</label>
          <input
            type="text"
            value={bitd.look || ''}
            onChange={(e) => updateBitD('look', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Heritage</label>
          <input
            type="text"
            value={bitd.heritage || ''}
            onChange={(e) => updateBitD('heritage', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Background</label>
          <input
            type="text"
            value={bitd.background || ''}
            onChange={(e) => updateBitD('background', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="col-span-2 space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Vice / Purveyor</label>
          <input
            type="text"
            value={bitd.vice || ''}
            onChange={(e) => updateBitD('vice', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Stress & Trauma */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
        {renderStress()}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Trauma</label>
          <input
            type="text"
            value={(bitd.trauma || []).join(', ')}
            onChange={(e) => updateBitD('trauma', e.target.value.split(',').map(s => s.trim()))}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500 text-sm"
            placeholder="Cold, Haunted, Obsessed, Paranoid..."
          />
        </div>
      </div>

      {/* Attributes & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Insight */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest border-b border-zinc-800 pb-2">Insight</h3>
          {renderAction('Hunt', 'hunt')}
          {renderAction('Study', 'study')}
          {renderAction('Survey', 'survey')}
          {renderAction('Tinker', 'tinker')}
        </div>
        
        {/* Prowess */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest border-b border-zinc-800 pb-2">Prowess</h3>
          {renderAction('Finesse', 'finesse')}
          {renderAction('Prowl', 'prowl')}
          {renderAction('Skirmish', 'skirmish')}
          {renderAction('Wreck', 'wreck')}
        </div>

        {/* Resolve */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest border-b border-zinc-800 pb-2">Resolve</h3>
          {renderAction('Attune', 'attune')}
          {renderAction('Command', 'command')}
          {renderAction('Consort', 'consort')}
          {renderAction('Sway', 'sway')}
        </div>
      </div>

      {/* Harm & Healing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest border-b border-zinc-800 pb-2">Harm</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 text-center font-bold text-red-500">3</span>
              <input type="text" value={bitd.harm?.severe || ''} onChange={e => updateBitD('harm', { ...bitd.harm, severe: e.target.value })} className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm text-zinc-100" placeholder="Need Help" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 text-center font-bold text-orange-500">2</span>
              <input type="text" value={bitd.harm?.medium1 || ''} onChange={e => updateBitD('harm', { ...bitd.harm, medium1: e.target.value })} className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm text-zinc-100" placeholder="-1d" />
              <input type="text" value={bitd.harm?.medium2 || ''} onChange={e => updateBitD('harm', { ...bitd.harm, medium2: e.target.value })} className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm text-zinc-100" placeholder="-1d" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 text-center font-bold text-yellow-500">1</span>
              <input type="text" value={bitd.harm?.light1 || ''} onChange={e => updateBitD('harm', { ...bitd.harm, light1: e.target.value })} className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm text-zinc-100" placeholder="Less Effect" />
              <input type="text" value={bitd.harm?.light2 || ''} onChange={e => updateBitD('harm', { ...bitd.harm, light2: e.target.value })} className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm text-zinc-100" placeholder="Less Effect" />
            </div>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest border-b border-zinc-800 pb-2">Healing & Armor</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Healing Clock</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(tick => (
                  <button
                    key={tick}
                    onClick={() => updateBitD('healingClock', bitd.healingClock === tick ? tick - 1 : tick)}
                    className={cn(
                      "w-6 h-6 rounded-full border transition-colors",
                      (bitd.healingClock || 0) >= tick ? "bg-emerald-600 border-emerald-500" : "bg-zinc-900 border-zinc-700 hover:border-emerald-500/50"
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={bitd.armor || false} onChange={e => updateBitD('armor', e.target.checked)} className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500" />
                Armor
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={bitd.heavyArmor || false} onChange={e => updateBitD('heavyArmor', e.target.checked)} className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500" />
                Heavy Armor
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={bitd.specialArmor || false} onChange={e => updateBitD('specialArmor', e.target.checked)} className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500" />
                Special Armor
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Special Abilities & Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Special Abilities</label>
          <textarea
            value={bitd.specialAbilities || ''}
            onChange={(e) => updateBitD('specialAbilities', e.target.value)}
            className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500 text-sm resize-none"
            placeholder="List your special abilities here..."
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Items & Load</label>
            <select
              value={bitd.load || 'normal'}
              onChange={(e) => updateBitD('load', e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
            >
              <option value="light">Light (3)</option>
              <option value="normal">Normal (5)</option>
              <option value="heavy">Heavy (6)</option>
            </select>
          </div>
          <textarea
            value={bitd.items || ''}
            onChange={(e) => updateBitD('items', e.target.value)}
            className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500 text-sm resize-none"
            placeholder="List your items here..."
          />
        </div>
      </div>

      {/* Friends & Rivals */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Friends & Rivals</label>
        <textarea
          value={bitd.friends || ''}
          onChange={(e) => updateBitD('friends', e.target.value)}
          className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500 text-sm resize-none"
          placeholder="List your friends and rivals..."
        />
      </div>
      
      {/* Coin & Stash */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-bold text-zinc-100 uppercase tracking-widest">Coin</span>
          <div className="flex items-center gap-2">
            <button onClick={() => updateBitD('coin', Math.max(0, (bitd.coin || 0) - 1))} className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center justify-center">-</button>
            <span className="w-8 text-center font-bold text-amber-500">{bitd.coin || 0}</span>
            <button onClick={() => updateBitD('coin', Math.min(4, (bitd.coin || 0) + 1))} className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center justify-center">+</button>
          </div>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-bold text-zinc-100 uppercase tracking-widest">Stash</span>
          <div className="flex items-center gap-2">
            <button onClick={() => updateBitD('stash', Math.max(0, (bitd.stash || 0) - 1))} className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center justify-center">-</button>
            <span className="w-8 text-center font-bold text-amber-500">{bitd.stash || 0}</span>
            <button onClick={() => updateBitD('stash', Math.min(40, (bitd.stash || 0) + 1))} className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center justify-center">+</button>
          </div>
        </div>
      </div>
    </div>
  );
}
