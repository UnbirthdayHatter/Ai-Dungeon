import React from 'react';
import { Book, Dices, Shield, Zap, Skull, Clock, Users, Coins } from 'lucide-react';

export function BitDRules() {
  return (
    <div className="space-y-8 text-zinc-300 max-w-4xl mx-auto pb-12">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-black text-zinc-100 tracking-tighter uppercase">Blades in the Dark</h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          You are a scoundrel on the haunted streets of Doskvol. Play to find out if your crew can thrive amidst the rival factions, corrupt watch, and vengeful ghosts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Resolution */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 text-amber-500 mb-2">
            <Dices className="w-6 h-6" />
            <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-100">The Action Roll</h2>
          </div>
          <p className="text-sm">When you attempt something risky, roll a pool of <strong>d6s</strong> equal to your Action rating (0 to 4).</p>
          <ul className="space-y-2 text-sm bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50">
            <li className="flex items-start gap-2">
              <span className="font-bold text-emerald-400 min-w-[40px]">Two 6s</span>
              <span><strong>Critical Success!</strong> You do it with increased effect.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-emerald-500 min-w-[40px]">6</span>
              <span><strong>Full Success.</strong> You do it.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-amber-500 min-w-[40px]">4/5</span>
              <span><strong>Partial Success.</strong> You do it, but there's a consequence (harm, reduced effect, complication).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-red-500 min-w-[40px]">1-3</span>
              <span><strong>Bad Outcome.</strong> Things go poorly. You suffer a consequence.</span>
            </li>
          </ul>
          <div className="text-xs text-zinc-500 italic mt-2">
            *If you have <strong>0d</strong>, roll 2d6 and take the <strong>lowest</strong> result. You cannot roll a critical on 0d.
          </div>
        </div>

        {/* Position & Effect */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 text-blue-500 mb-2">
            <Shield className="w-6 h-6" />
            <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-100">Position & Effect</h2>
          </div>
          <p className="text-sm">Before you roll, the GM sets your Position (how dangerous it is) and Effect (how much you'll achieve).</p>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Position</h3>
              <ul className="text-sm space-y-1">
                <li><span className="text-emerald-400 font-medium">Controlled:</span> Safe.</li>
                <li><span className="text-amber-400 font-medium">Risky:</span> Standard danger.</li>
                <li><span className="text-red-400 font-medium">Desperate:</span> Extreme danger.</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Effect</h3>
              <ul className="text-sm space-y-1">
                <li><span className="text-emerald-400 font-medium">Great:</span> Achieve more.</li>
                <li><span className="text-zinc-300 font-medium">Standard:</span> Normal result.</li>
                <li><span className="text-zinc-500 font-medium">Limited:</span> Achieve less.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Stress & Pushing */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 text-purple-500 mb-2">
            <Zap className="w-6 h-6" />
            <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-100">Stress & Pushing</h2>
          </div>
          <p className="text-sm">Stress is a resource you spend to succeed and survive. You have 9 Stress boxes.</p>
          <ul className="space-y-2 text-sm list-disc pl-4">
            <li><strong>Push Yourself:</strong> Take 2 stress to get <strong>+1d</strong> to your roll OR <strong>+1 Effect</strong> level.</li>
            <li><strong>Assist:</strong> Take 1 stress to give an ally <strong>+1d</strong> on their roll.</li>
            <li><strong>Lead a Group Action:</strong> Roll for everyone. You take 1 stress for every ally who rolls a 1-3.</li>
          </ul>
          <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Trauma</h3>
            <p className="text-xs text-zinc-400">If you mark your 9th stress box, you suffer a Trauma and are taken out of the action. Clear all your stress. If you get 4 Traumas, your character retires.</p>
          </div>
        </div>

        {/* Resistance & Armor */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 text-emerald-500 mb-2">
            <Shield className="w-6 h-6" />
            <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-100">Resistance & Armor</h2>
          </div>
          <p className="text-sm">When you suffer a consequence, you can choose to <strong>Resist</strong> it.</p>
          <ul className="space-y-2 text-sm list-disc pl-4">
            <li><strong>Resistance Roll:</strong> Roll the appropriate Attribute (Insight, Prowess, or Resolve). You take <strong>6 minus your highest die result</strong> in Stress. The consequence is reduced or avoided entirely.</li>
            <li><strong>Armor:</strong> You can mark an Armor box to reduce or avoid a consequence instead of rolling resistance. Armor is restored during downtime.</li>
          </ul>
        </div>

        {/* Clocks */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 text-cyan-500 mb-2">
            <Clock className="w-6 h-6" />
            <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-100">Progress Clocks</h2>
          </div>
          <p className="text-sm">The GM uses circles divided into segments (clocks) to track complex obstacles, approaching danger, or long-term projects.</p>
          <ul className="space-y-2 text-sm list-disc pl-4">
            <li><strong>Danger Clocks:</strong> Fill when you get partial successes or bad outcomes. When full, something bad happens.</li>
            <li><strong>Racing Clocks:</strong> Two opposed clocks. First to fill wins.</li>
            <li><strong>Project Clocks:</strong> Track long-term goals during downtime.</li>
          </ul>
        </div>

        {/* Harm */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 text-red-500 mb-2">
            <Skull className="w-6 h-6" />
            <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-100">Harm</h2>
          </div>
          <p className="text-sm">When you take physical or mental damage, you mark Harm.</p>
          <ul className="space-y-2 text-sm">
            <li><span className="font-bold text-red-500">Level 3 (Severe):</span> You need help to act. If you take more, it becomes Fatal.</li>
            <li><span className="font-bold text-orange-500">Level 2 (Moderate):</span> You take <strong>-1d</strong> to all rolls.</li>
            <li><span className="font-bold text-yellow-500">Level 1 (Lesser):</span> You have <strong>reduced effect</strong>.</li>
          </ul>
          <p className="text-xs text-zinc-500 mt-2">Harm is healed by starting a Recovery project clock during downtime.</p>
        </div>
      </div>
    </div>
  );
}
