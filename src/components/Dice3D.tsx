import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import '@3d-dice/dice-box/dist/style.css';
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

const DICE_SKINS: Record<string, { themeColor: string; accent: string; glow: string }> = {
  default: { themeColor: '#f59e0b', accent: '#fde68a', glow: 'rgba(245,158,11,0.35)' },
  obsidian: { themeColor: '#71717a', accent: '#d4d4d8', glow: 'rgba(39,39,42,0.5)' },
  ivory: { themeColor: '#d6d3d1', accent: '#fafaf9', glow: 'rgba(214,211,209,0.35)' },
  celestial: { themeColor: '#6366f1', accent: '#c7d2fe', glow: 'rgba(99,102,241,0.35)' },
  bloodstone: { themeColor: '#b91c1c', accent: '#fecaca', glow: 'rgba(185,28,28,0.35)' },
};

export function Dice3D({ results, diceType, total, label, modifier = 0, highlight = 'sum', onComplete }: Dice3DProps) {
  const { diceSkin } = useStore();
  const containerIdRef = useRef(`dice-box-${Math.random().toString(36).slice(2, 10)}`);
  const completeTimeoutRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<'initializing' | 'rolling' | 'settled' | 'failed'>('initializing');
  const skin = DICE_SKINS[diceSkin] || DICE_SKINS.default;

  const effectiveResults = useMemo(() => (results.length > 0 ? results : [total || 0]), [results, total]);
  const notation = useMemo(() => {
    const diceCount = Math.max(1, effectiveResults.length);
    const modifierPart = modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`;
    return `${diceCount}d${diceType}${modifierPart}`;
  }, [diceType, effectiveResults.length, modifier]);
  const highlightedValue = useMemo(() => {
    if (highlight === 'lowest') return Math.min(...effectiveResults);
    if (highlight === 'highest') return Math.max(...effectiveResults);
    return total ?? effectiveResults.reduce((sum, value) => sum + value, 0);
  }, [effectiveResults, highlight, total]);
  const finalTotal = total ?? effectiveResults.reduce((sum, value) => sum + value, 0);

  useEffect(() => {
    let cancelled = false;
    let diceBox: { init: () => Promise<unknown>; roll: (notation: string) => Promise<unknown>; clear: () => void; onRollComplete?: () => void; updateConfig?: (config: Record<string, unknown>) => Promise<unknown> | unknown } | null = null;

    const finish = () => {
      if (completeTimeoutRef.current) {
        window.clearTimeout(completeTimeoutRef.current);
      }
      completeTimeoutRef.current = window.setTimeout(() => {
        onComplete();
      }, 2400);
    };

    const startRoll = async () => {
      try {
        const module = await import('@3d-dice/dice-box');
        if (cancelled) return;
        const DiceBox = module.default;
        diceBox = new DiceBox(`#${containerIdRef.current}`, {
          assetPath: '/assets/',
          theme: 'default',
          themeColor: skin.themeColor,
          scale: 6,
          gravity: 1.2,
          offscreen: true,
        });
        diceBox.onRollComplete = () => {
          if (cancelled) return;
          setPhase('settled');
          finish();
        };

        await diceBox.init();
        if (cancelled) return;
        if (diceBox.updateConfig) {
          await diceBox.updateConfig({ themeColor: skin.themeColor });
        }
        setPhase('rolling');
        await diceBox.roll(notation);
      } catch (error) {
        console.error('3D dice failed to initialize', error);
        if (cancelled) return;
        setPhase('failed');
        finish();
      }
    };

    startRoll();

    return () => {
      cancelled = true;
      if (completeTimeoutRef.current) {
        window.clearTimeout(completeTimeoutRef.current);
      }
      try {
        diceBox?.clear();
      } catch {
        // Ignore cleanup issues from the dice renderer during unmount.
      }
    };
  }, [notation, onComplete, skin.themeColor]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md overflow-hidden pointer-events-none">
      <div className="pointer-events-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4">
        <div className="text-center space-y-2">
          <div className="text-white/80 font-black text-xs uppercase tracking-[0.45em]">
            {label || `D${diceType} Roll`}
          </div>
          <div className="text-zinc-400 text-sm">
            {effectiveResults.length} {effectiveResults.length === 1 ? 'die' : 'dice'} rolling
            {modifier !== 0 && <span className="ml-2">Modifier {modifier > 0 ? `+${modifier}` : modifier}</span>}
          </div>
        </div>

        <div
          className="relative h-[28rem] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 shadow-[0_0_60px_rgba(0,0,0,0.45)]"
          style={{ boxShadow: `0 0 50px ${skin.glow}` }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />
          <div className="absolute inset-x-6 top-5 z-10 flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-zinc-500">
            <span>Dice Tray</span>
            <span>{notation}</span>
          </div>
          <div id={containerIdRef.current} className="h-full w-full" />

          {phase === 'initializing' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-300">
              Preparing 3D dice...
            </div>
          )}

          {phase === 'failed' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-300">
              3D dice unavailable, showing result summary instead.
            </div>
          )}
        </div>

        <AnimatePresence>
          {phase === 'settled' && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18 }}
              className="rounded-2xl border border-white/10 bg-zinc-950/95 px-8 py-5 text-center shadow-2xl"
            >
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Result</div>
              <div className="flex items-end justify-center gap-3">
                <span className="text-6xl font-black text-white">{finalTotal}</span>
                {modifier !== 0 && (
                  <span className="mb-2 text-lg font-bold text-zinc-400">
                    {modifier > 0 ? `(+${modifier})` : `(${modifier})`}
                  </span>
                )}
              </div>
              {highlight !== 'sum' && (
                <div className="mt-2 text-sm text-zinc-400">
                  Using {highlight === 'highest' ? 'highest' : 'lowest'} die:{' '}
                  <span className="font-bold" style={{ color: skin.accent }}>
                    {highlightedValue}
                  </span>
                </div>
              )}
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm text-zinc-300">
                {effectiveResults.map((value, index) => (
                  <span
                    key={`${value}-${index}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold"
                  >
                    d{diceType}: {value}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
