import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';

interface Dice3DProps {
  results: number[];
  diceType: number;
  total?: number;
  label?: string;
  modifier?: number;
  highlight?: 'highest' | 'lowest' | 'sum';
  onComplete: () => void;
}

const DICE_SKINS: Record<string, { colors: [string, string, string]; edge: string; glow: string; pip: string }> = {
  default: { colors: ['#fbbf24', '#d97706', '#78350f'], edge: '#fde68a', glow: 'rgba(245,158,11,0.55)', pip: '#fffaf0' },
  obsidian: { colors: ['#52525b', '#18181b', '#09090b'], edge: '#a1a1aa', glow: 'rgba(24,24,27,0.65)', pip: '#fafafa' },
  ivory: { colors: ['#fafaf9', '#d6d3d1', '#a8a29e'], edge: '#ffffff', glow: 'rgba(214,211,209,0.55)', pip: '#18181b' },
  celestial: { colors: ['#818cf8', '#4338ca', '#1e1b4b'], edge: '#c7d2fe', glow: 'rgba(79,70,229,0.6)', pip: '#f8fafc' },
  bloodstone: { colors: ['#b91c1c', '#7f1d1d', '#450a0a'], edge: '#fca5a5', glow: 'rgba(127,29,29,0.6)', pip: '#fff5f5' },
};

export function Dice3D({ results, diceType, total, label, modifier = 0, highlight = 'sum', onComplete }: Dice3DProps) {
  const [isRolling, setIsRolling] = useState(true);
  const { diceSkin } = useStore();
  const skin = DICE_SKINS[diceSkin] || DICE_SKINS.default;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRolling(false);
      const finishTimer = setTimeout(() => {
        onComplete();
      }, 2200);
      return () => clearTimeout(finishTimer);
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const effectiveResults = results.length > 0 ? results : [total || 0];
  const highlightedValue = useMemo(() => {
    if (highlight === 'lowest') return Math.min(...effectiveResults);
    if (highlight === 'highest') return Math.max(...effectiveResults);
    return total ?? effectiveResults.reduce((sum, value) => sum + value, 0);
  }, [effectiveResults, highlight, total]);

  const heading = label || `D${diceType} Roll`;
  const finalTotal = total ?? effectiveResults.reduce((sum, value) => sum + value, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 backdrop-blur-md overflow-hidden pointer-events-none">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {effectiveResults.map((_, i) => (
          <motion.div
            key={`spark-${i}`}
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{
              opacity: [0, 0.45, 0],
              scale: [0.2, 1.25, 0.3],
              x: [0, (i - effectiveResults.length / 2) * 90],
              y: [0, (i % 2 === 0 ? -1 : 1) * 110],
            }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.08 }}
            className="absolute left-1/2 top-1/2 w-3 h-3 rounded-full blur-sm"
            style={{ backgroundColor: skin.colors[0] }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-8 pointer-events-auto px-6">
        <div className="text-center space-y-2">
          <div className="text-white/80 font-black text-xs uppercase tracking-[0.45em]">{heading}</div>
          <div className="text-zinc-400 text-sm">
            {effectiveResults.length} {effectiveResults.length === 1 ? 'die' : 'dice'} rolled
            {modifier !== 0 && <span className="ml-2">Modifier {modifier > 0 ? `+${modifier}` : modifier}</span>}
          </div>
        </div>

        <div
          className="grid gap-5 justify-center"
          style={{ gridTemplateColumns: `repeat(${Math.min(effectiveResults.length, 4)}, minmax(0, 7rem))` }}
        >
          {effectiveResults.map((value, index) => {
            const isHighlightedDie = highlight !== 'sum' && value === highlightedValue;
            return (
              <motion.div
                key={`${value}-${index}`}
                animate={{
                  rotateX: isRolling ? [0, 720, 1440] : 0,
                  rotateY: isRolling ? [0, 540, 1080] : 0,
                  rotateZ: isRolling ? [0, 360, 720] : 0,
                  scale: isRolling ? [0.9, 1.15, 1] : isHighlightedDie ? [1, 1.08, 1] : 1,
                  y: isRolling ? [0, -45, 0] : 0,
                }}
                transition={{ duration: 1.35, ease: 'easeInOut', delay: index * 0.05 }}
                className="relative w-28 h-28 rounded-[1.6rem] border-2 flex items-center justify-center shadow-2xl"
                style={{
                  transformStyle: 'preserve-3d',
                  borderColor: isHighlightedDie ? skin.edge : `${skin.edge}55`,
                  background: `linear-gradient(145deg, ${skin.colors[0]}, ${skin.colors[1]} 55%, ${skin.colors[2]})`,
                  boxShadow: isHighlightedDie
                    ? `0 0 45px ${skin.glow}, inset 0 0 0 1px rgba(255,255,255,0.18)`
                    : `0 0 24px ${skin.glow}, inset 0 0 0 1px rgba(255,255,255,0.12)`,
                }}
              >
                <div
                  className="absolute inset-2 rounded-[1.1rem] border"
                  style={{ borderColor: `${skin.edge}33` }}
                />
                <motion.span
                  initial={{ scale: 0.6 }}
                  animate={{ scale: isRolling ? 0.7 : 1 }}
                  className="text-5xl font-black drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
                  style={{ color: skin.pip }}
                >
                  {isRolling ? '?' : value}
                </motion.span>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {!isRolling && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="text-center rounded-2xl border border-zinc-700 bg-zinc-950/90 px-8 py-5 shadow-2xl"
            >
              <div className="text-[10px] uppercase tracking-[0.4em] font-black text-zinc-500 mb-2">Result</div>
              <div className="flex items-end justify-center gap-3">
                <span className="text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  {finalTotal}
                </span>
                {modifier !== 0 && (
                  <span className="text-lg font-bold text-zinc-400 mb-2">
                    {modifier > 0 ? `(+${modifier})` : `(${modifier})`}
                  </span>
                )}
              </div>
              {highlight !== 'sum' && (
                <div className="mt-2 text-sm text-zinc-400">
                  Using {highlight === 'highest' ? 'highest' : 'lowest'} die: <span className="font-bold text-zinc-200">{highlightedValue}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
