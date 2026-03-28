import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/store/useStore';

interface TesterDicePrototypeProps {
  results: number[];
  diceType: number;
  total?: number;
  label?: string;
  modifier?: number;
  highlight?: 'highest' | 'lowest' | 'sum';
  onComplete: (resolvedResults: number[]) => void;
}

const FACE_LAYOUTS = [
  { name: 'front', transform: 'translateZ(var(--depth))', bgPosition: '22% 24%' },
  { name: 'back', transform: 'rotateY(180deg) translateZ(var(--depth))', bgPosition: '74% 62%' },
  { name: 'right', transform: 'rotateY(90deg) translateZ(var(--depth))', bgPosition: '86% 30%' },
  { name: 'left', transform: 'rotateY(-90deg) translateZ(var(--depth))', bgPosition: '14% 68%' },
  { name: 'top', transform: 'rotateX(90deg) translateZ(var(--depth))', bgPosition: '48% 12%' },
  { name: 'bottom', transform: 'rotateX(-90deg) translateZ(var(--depth))', bgPosition: '52% 86%' },
] as const;

function getFrontFacingRotation(value: number) {
  const normalized = ((value - 1) % 6 + 6) % 6;
  switch (normalized + 1) {
    case 1:
      return { rotateX: 0, rotateY: 0 };
    case 2:
      return { rotateX: 0, rotateY: -90 };
    case 3:
      return { rotateX: 90, rotateY: 0 };
    case 4:
      return { rotateX: -90, rotateY: 0 };
    case 5:
      return { rotateX: 0, rotateY: 90 };
    case 6:
      return { rotateX: 0, rotateY: 180 };
    default:
      return { rotateX: 0, rotateY: 0 };
  }
}

function getVisibleValue(face: string, value: number, diceType: number) {
  if (face !== 'front') {
    return face === 'top' ? '✦' : '';
  }
  return Math.max(1, Math.min(diceType, value)).toString();
}

export function TesterDicePrototype({
  results,
  diceType,
  total,
  label,
  modifier = 0,
  highlight = 'sum',
  onComplete,
}: TesterDicePrototypeProps) {
  const { dice3DScale, dice3DAutoCloseMs } = useStore();
  const [phase, setPhase] = useState<'rolling' | 'settled'>('rolling');
  const onCompleteRef = useRef(onComplete);
  const settleTimeoutRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const effectiveResults = useMemo(() => (results.length > 0 ? results : [total || 0]), [results, total]);

  const notation = useMemo(() => {
    const diceCount = Math.max(1, effectiveResults.length);
    const modifierPart = modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`;
    return `${diceCount}d${diceType}${modifierPart}`;
  }, [diceType, effectiveResults.length, modifier]);

  const displayHighlightedValue = highlight === 'lowest'
    ? Math.min(...effectiveResults)
    : highlight === 'highest'
      ? Math.max(...effectiveResults)
      : effectiveResults.reduce((sum, value) => sum + value, 0) + modifier;
  const displayTotal = highlight === 'sum'
    ? effectiveResults.reduce((sum, value) => sum + value, 0) + modifier
    : displayHighlightedValue;

  const dieSize = useMemo(() => Math.round(88 + dice3DScale * 18), [dice3DScale]);
  const dieDepth = useMemo(() => Math.round(dieSize * 0.24), [dieSize]);
  const dieBlueprints = useMemo(() => effectiveResults.map((value, index) => {
    const baseRotation = getFrontFacingRotation(value);
    return {
      id: `${value}-${index}`,
      value,
      initial: {
        rotateX: -450 - index * 90,
        rotateY: 280 + index * 115,
        rotateZ: -35 + index * 18,
        x: index % 2 === 0 ? -90 - index * 18 : 90 + index * 16,
        y: index % 2 === 0 ? -20 + index * 8 : 24 - index * 7,
      },
      settled: {
        rotateX: baseRotation.rotateX,
        rotateY: baseRotation.rotateY,
        rotateZ: -8 + index * 7,
        x: 0,
        y: 0,
      },
    };
  }), [effectiveResults]);

  useEffect(() => {
    setPhase('rolling');
    if (settleTimeoutRef.current) window.clearTimeout(settleTimeoutRef.current);
    if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);

    settleTimeoutRef.current = window.setTimeout(() => {
      setPhase('settled');
      closeTimeoutRef.current = window.setTimeout(() => {
        onCompleteRef.current(effectiveResults);
      }, dice3DAutoCloseMs);
    }, 1650);

    return () => {
      if (settleTimeoutRef.current) window.clearTimeout(settleTimeoutRef.current);
      if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
    };
  }, [dice3DAutoCloseMs, effectiveResults]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/40 backdrop-blur-md pointer-events-none">
      <div className="pointer-events-auto flex w-full max-w-[110rem] flex-col items-center gap-6 px-4">
        <div className="space-y-2 text-center">
          <div className="text-xs font-black uppercase tracking-[0.45em] text-white/80">
            {label || `D${diceType} Roll`}
          </div>
          <div className="text-sm text-zinc-400">
            {effectiveResults.length} {effectiveResults.length === 1 ? 'die' : 'dice'} rolling
            {modifier !== 0 && <span className="ml-2">Modifier {modifier > 0 ? `+${modifier}` : modifier}</span>}
          </div>
        </div>

        <div className="relative h-[40rem] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#14110f] shadow-[0_0_60px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.06),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(71,85,105,0.22),transparent_34%),linear-gradient(180deg,rgba(25,19,16,0.92),rgba(17,13,11,0.96))]" />
          <div className="absolute inset-0 opacity-20 mix-blend-soft-light" style={{ backgroundImage: "url('/assets/themes/tester1/diffuse-light.png')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div className="absolute inset-x-6 top-5 z-10 flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-zinc-500">
            <span>Tester Tray</span>
            <span>{notation}</span>
          </div>

          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            {Array.from({ length: 10 }).map((_, index) => (
              <motion.div
                key={`tester-glow-${index}`}
                className="absolute rounded-full blur-3xl"
                style={{
                  left: `${6 + ((index * 11) % 84)}%`,
                  top: `${12 + ((index * 7) % 62)}%`,
                  width: `${120 + (index % 3) * 54}px`,
                  height: `${40 + (index % 2) * 18}px`,
                  background: index % 2 === 0
                    ? 'radial-gradient(circle, rgba(148,163,184,0.16), rgba(71,85,105,0.08), transparent 72%)'
                    : 'radial-gradient(circle, rgba(245,158,11,0.08), rgba(71,85,105,0.04), transparent 74%)',
                }}
                animate={{ x: [0, 18, -10, 0], opacity: [0.1, 0.24, 0.12], scaleX: [0.82, 1.12, 0.9] }}
                transition={{ duration: 3.4 + (index % 4) * 0.3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.18 }}
              />
            ))}
          </div>

          <div
            className="relative z-20 flex h-full items-center justify-center gap-12 px-10"
            style={{ perspective: '1600px' }}
          >
            {dieBlueprints.map((die, index) => (
              <motion.div
                key={die.id}
                className="relative"
                style={{ width: dieSize, height: dieSize }}
                initial={die.initial}
                animate={phase === 'rolling' ? {
                  rotateX: [die.initial.rotateX, die.initial.rotateX - 220, die.initial.rotateX - 420],
                  rotateY: [die.initial.rotateY, die.initial.rotateY + 180, die.initial.rotateY + 420],
                  rotateZ: [die.initial.rotateZ, die.initial.rotateZ + 22, die.initial.rotateZ - 18],
                  x: [die.initial.x, die.initial.x * 0.35, die.initial.x * 0.12],
                  y: [die.initial.y, die.initial.y - 16, die.initial.y + 6],
                } : die.settled}
                transition={phase === 'rolling'
                  ? { duration: 1.55, ease: [0.18, 0.76, 0.24, 1] }
                  : { duration: 0.5, ease: 'easeOut' }}
              >
                <div
                  className="relative h-full w-full"
                  style={{
                    transformStyle: 'preserve-3d',
                    ['--depth' as any]: `${dieDepth}px`,
                  }}
                >
                  {FACE_LAYOUTS.map((face) => (
                    <div
                      key={`${die.id}-${face.name}`}
                      className="absolute inset-0 overflow-hidden rounded-[1.35rem] border border-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"
                      style={{
                        transform: face.transform,
                        backgroundImage: face.name === 'front'
                          ? "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.03)), url('/assets/themes/tester1/diffuse-light.png')"
                          : face.name === 'top'
                            ? "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.05)), url('/assets/themes/tester1/diffuse-light.png')"
                            : "linear-gradient(180deg, rgba(17,24,39,0.16), rgba(0,0,0,0.08)), url('/assets/themes/tester1/diffuse-light.png')",
                        backgroundSize: 'cover',
                        backgroundPosition: face.bgPosition,
                        boxShadow: face.name === 'front'
                          ? '0 0 24px rgba(148,163,184,0.15), inset 0 0 22px rgba(255,255,255,0.08)'
                          : 'inset 0 0 16px rgba(255,255,255,0.04)',
                      }}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.16),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.16))]" />
                      {getVisibleValue(face.name, die.value, diceType) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span
                            className={face.name === 'top' ? 'text-lg font-black text-white/55' : 'text-[2.35rem] font-black text-slate-50'}
                            style={{
                              textShadow: face.name === 'top'
                                ? '0 0 12px rgba(255,255,255,0.22)'
                                : '0 2px 3px rgba(0,0,0,0.35), 0 0 16px rgba(255,255,255,0.18)',
                            }}
                          >
                            {getVisibleValue(face.name, die.value, diceType)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <motion.div
                  className="pointer-events-none absolute inset-[-18%] -z-10 rounded-full blur-2xl"
                  style={{ background: 'radial-gradient(circle, rgba(148,163,184,0.22), rgba(71,85,105,0.04), transparent 72%)' }}
                  animate={{ opacity: [0.2, 0.42, 0.24], scale: [0.84, 1.12, 0.9] }}
                  transition={{ duration: 2.2 + index * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
            ))}
          </div>
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
                <span className="text-6xl font-black text-white">{displayTotal}</span>
                {modifier !== 0 && (
                  <span className="mb-2 text-lg font-bold text-zinc-400">
                    {modifier > 0 ? `(+${modifier})` : `(${modifier})`}
                  </span>
                )}
              </div>
              {highlight !== 'sum' && (
                <div className="mt-2 text-sm text-zinc-400">
                  Using {highlight === 'highest' ? 'highest' : 'lowest'} die:{' '}
                  <span className="font-bold text-slate-200">
                    {displayHighlightedValue}
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
