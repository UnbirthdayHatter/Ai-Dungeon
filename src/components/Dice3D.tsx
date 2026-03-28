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
  onComplete: (resolvedResults: number[]) => void;
}

const DICE_SKINS: Record<string, { theme: string; themeColor: string; accent: string; glow: string }> = {
  classic: { theme: 'default', themeColor: '#f59e0b', accent: '#fde68a', glow: 'rgba(245,158,11,0.35)' },
  default: { theme: 'sunforged', themeColor: '#f59e0b', accent: '#fde68a', glow: 'rgba(245,158,11,0.35)' },
  obsidian: { theme: 'obsidian', themeColor: '#71717a', accent: '#d4d4d8', glow: 'rgba(39,39,42,0.5)' },
  ivory: { theme: 'ivory', themeColor: '#d6d3d1', accent: '#fafaf9', glow: 'rgba(214,211,209,0.35)' },
  celestial: { theme: 'celestial', themeColor: '#6366f1', accent: '#c7d2fe', glow: 'rgba(99,102,241,0.35)' },
  bloodstone: { theme: 'bloodstone', themeColor: '#b91c1c', accent: '#fecaca', glow: 'rgba(185,28,28,0.35)' },
  emerald: { theme: 'emerald', themeColor: '#10b981', accent: '#a7f3d0', glow: 'rgba(16,185,129,0.35)' },
  sapphire: { theme: 'sapphire', themeColor: '#2563eb', accent: '#bfdbfe', glow: 'rgba(37,99,235,0.35)' },
  amethyst: { theme: 'amethyst', themeColor: '#9333ea', accent: '#e9d5ff', glow: 'rgba(147,51,234,0.35)' },
  rosegold: { theme: 'rosegold', themeColor: '#fb7185', accent: '#fecdd3', glow: 'rgba(251,113,133,0.35)' },
  aurora: { theme: 'aurora', themeColor: '#34d399', accent: '#a7f3d0', glow: 'rgba(52,211,153,0.35)' },
  voidfire: { theme: 'voidfire', themeColor: '#f97316', accent: '#fdba74', glow: 'rgba(249,115,22,0.45)' },
  toxic: { theme: 'toxic', themeColor: '#84cc16', accent: '#d9f99d', glow: 'rgba(132,204,22,0.45)' },
  glitchpop: { theme: 'glitchpop', themeColor: '#ec4899', accent: '#f9a8d4', glow: 'rgba(236,72,153,0.45)' },
};

function getDiceCanvasMotion(diceSkin: string, glow: string) {
  switch (diceSkin) {
    case 'celestial':
      return {
        style: {
          filter: 'brightness(1.08) saturate(1.22) drop-shadow(0 0 12px rgba(125,211,252,0.16))',
        },
        animate: {
          filter: [
            'brightness(0.98) saturate(1.08) drop-shadow(0 0 10px rgba(125,211,252,0.10))',
            'brightness(1.16) saturate(1.34) drop-shadow(0 0 18px rgba(165,180,252,0.24))',
            'brightness(1.04) saturate(1.18) drop-shadow(0 0 12px rgba(125,211,252,0.14))',
          ],
          scale: [1, 1.01, 1],
        },
        transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' as const },
      };
    case 'toxic':
      return {
        style: {
          filter: 'brightness(1.02) saturate(1.2) drop-shadow(0 0 14px rgba(132,204,22,0.18))',
        },
        animate: {
          filter: [
            'brightness(0.96) saturate(1.08) hue-rotate(-4deg) drop-shadow(0 0 10px rgba(132,204,22,0.10))',
            'brightness(1.14) saturate(1.38) hue-rotate(6deg) drop-shadow(0 0 20px rgba(163,230,53,0.22))',
            'brightness(1.02) saturate(1.2) hue-rotate(0deg) drop-shadow(0 0 14px rgba(132,204,22,0.16))',
          ],
          scale: [1, 1.008, 1],
        },
        transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' as const },
      };
    case 'bloodstone':
      return {
        style: {
          filter: 'brightness(1.02) saturate(1.14) contrast(1.04) drop-shadow(0 0 14px rgba(185,28,28,0.18))',
        },
        animate: {
          filter: [
            'brightness(0.98) saturate(1.06) contrast(1.02) drop-shadow(0 0 10px rgba(120,20,20,0.1))',
            'brightness(1.14) saturate(1.24) contrast(1.1) drop-shadow(0 0 18px rgba(251,191,36,0.14))',
            'brightness(1.04) saturate(1.16) contrast(1.06) drop-shadow(0 0 14px rgba(185,28,28,0.16))',
          ],
          scale: [1, 1.008, 1],
        },
        transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
      };
    case 'voidfire':
      return {
        style: {
          filter: 'brightness(1.04) saturate(1.22) contrast(1.08) hue-rotate(10deg) drop-shadow(0 0 14px rgba(168,85,247,0.22))',
        },
        animate: {
          filter: [
            'brightness(0.96) saturate(1.08) contrast(1.02) hue-rotate(4deg) drop-shadow(0 0 10px rgba(168,85,247,0.12))',
            'brightness(1.16) saturate(1.3) contrast(1.14) hue-rotate(18deg) drop-shadow(0 0 22px rgba(249,115,22,0.18))',
            'brightness(1.02) saturate(1.16) contrast(1.08) hue-rotate(10deg) drop-shadow(0 0 14px rgba(217,70,239,0.18))',
          ],
          x: [0, 1.2, -1.2, 0],
        },
        transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' as const },
      };
    case 'glitchpop':
      return {
        style: {
          filter: 'brightness(1.08) saturate(1.42) contrast(1.08) drop-shadow(0 0 12px rgba(236,72,153,0.18))',
        },
        animate: {
          filter: [
            'brightness(1.02) saturate(1.24) contrast(1.02) hue-rotate(-10deg) drop-shadow(0 0 8px rgba(34,211,238,0.14))',
            'brightness(1.22) saturate(1.58) contrast(1.14) hue-rotate(12deg) drop-shadow(0 0 22px rgba(236,72,153,0.24))',
            'brightness(1.1) saturate(1.3) contrast(1.08) hue-rotate(0deg) drop-shadow(0 0 14px rgba(250,204,21,0.16))',
          ],
          x: [0, 1.5, -1.5, 0],
        },
        transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' as const },
      };
    default:
      return {
        style: {
          filter: `drop-shadow(0 0 10px ${glow})`,
        },
      };
  }
}

function ToxicRipple({
  left,
  top,
  width,
  delay,
  duration,
  rotate = 0,
}: {
  left: string;
  top: string;
  width: number;
  delay: number;
  duration: number;
  rotate?: number;
}) {
  const height = Math.round(width * 0.5);

  return (
    <motion.div
      className="absolute"
      style={{
        left,
        top,
        width: `${width}px`,
        height: `${height}px`,
        rotate: `${rotate}deg`,
        transformOrigin: 'center center',
      }}
      animate={{
        scale: [0.76, 1.08, 1.16],
        opacity: [0, 0.9, 0],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeOut' }}
    >
      <svg viewBox="0 0 200 100" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id="toxic-ripple-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(190,242,100,0.85)" />
            <stop offset="50%" stopColor="rgba(74,222,128,0.45)" />
            <stop offset="100%" stopColor="rgba(74,222,128,0)" />
          </radialGradient>
          <filter id="toxic-ripple-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse
          cx="100"
          cy="50"
          rx="16"
          ry="8"
          fill="url(#toxic-ripple-core)"
          opacity="0.55"
          filter="url(#toxic-ripple-glow)"
        />

        <path
          d="M100 50m-18 0a18 9 0 1 0 36 0a18 9 0 1 0-36 0"
          fill="none"
          stroke="rgba(132,204,22,0.42)"
          strokeWidth="2"
          strokeDasharray="26 14 18 22"
          strokeLinecap="round"
          filter="url(#toxic-ripple-glow)"
        />
        <path
          d="M100 50m-42 0c0-12 18-22 42-22s42 10 42 22-18 22-42 22-42-10-42-22z"
          fill="none"
          stroke="rgba(74,222,128,0.34)"
          strokeWidth="2.5"
          strokeDasharray="42 20 14 18 24 22"
          strokeLinecap="round"
          filter="url(#toxic-ripple-glow)"
        />
        <path
          d="M100 50m-74 0c0-21 32-38 74-38s74 17 74 38-32 38-74 38-74-17-74-38z"
          fill="none"
          stroke="rgba(56,189,248,0.16)"
          strokeWidth="2.5"
          strokeDasharray="58 34 16 26 40 28"
          strokeLinecap="round"
          filter="url(#toxic-ripple-glow)"
        />
      </svg>
    </motion.div>
  );
}

export function Dice3D({ results, diceType, total, label, modifier = 0, highlight = 'sum', onComplete }: Dice3DProps) {
  const { diceSkin, dice3DScale, dice3DAutoCloseMs } = useStore();
  const containerIdRef = useRef(`dice-box-${Math.random().toString(36).slice(2, 10)}`);
  const trayRef = useRef<HTMLDivElement | null>(null);
  const completeTimeoutRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const resolvedResultsRef = useRef<number[]>(results);
  const settledRef = useRef(false);
  const [phase, setPhase] = useState<'initializing' | 'rolling' | 'settled' | 'failed'>('initializing');
  const skin = DICE_SKINS[diceSkin] || DICE_SKINS.default;

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    resolvedResultsRef.current = results;
  }, [results]);

  const effectiveResults = useMemo(() => (results.length > 0 ? results : [total || 0]), [results, total]);
  const notation = useMemo(() => {
    const diceCount = Math.max(1, effectiveResults.length);
    const modifierPart = modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`;
    return `${diceCount}d${diceType}${modifierPart}`;
  }, [diceType, effectiveResults.length, modifier]);
  const diceCanvasMotion = useMemo(() => getDiceCanvasMotion(diceSkin, skin.glow), [diceSkin, skin.glow]);
  const displayResults = resolvedResultsRef.current.length > 0 ? resolvedResultsRef.current : effectiveResults;
  const displayHighlightedValue = highlight === 'lowest'
    ? Math.min(...displayResults)
    : highlight === 'highest'
      ? Math.max(...displayResults)
      : displayResults.reduce((sum, value) => sum + value, 0) + modifier;
  const displayTotal = highlight === 'sum'
    ? displayResults.reduce((sum, value) => sum + value, 0) + modifier
    : displayHighlightedValue;

  useEffect(() => {
    let cancelled = false;
    let diceBox: { init: () => Promise<unknown>; roll: (notation: string) => Promise<unknown>; clear: () => void; onRollComplete?: (results?: unknown) => void; updateConfig?: (config: Record<string, unknown>) => Promise<unknown> | unknown } | null = null;
    let resizeObserver: ResizeObserver | null = null;
    settledRef.current = false;
    resolvedResultsRef.current = results;

    const finish = () => {
      if (settledRef.current) return;
      settledRef.current = true;
      if (completeTimeoutRef.current) {
        window.clearTimeout(completeTimeoutRef.current);
      }
      completeTimeoutRef.current = window.setTimeout(() => {
        onCompleteRef.current(resolvedResultsRef.current);
      }, dice3DAutoCloseMs);
    };

    const parseDiceBoxResults = (rawResults: unknown): number[] => {
      if (!Array.isArray(rawResults)) return effectiveResults;
      return rawResults.flatMap((group: any) =>
        Array.isArray(group?.rolls)
          ? group.rolls
              .map((roll: any) => Number(roll?.value))
              .filter((value: number) => Number.isFinite(value))
          : []
      );
    };

    const startRoll = async () => {
      try {
        const module = await import('@3d-dice/dice-box');
        if (cancelled) return;
        const DiceBox = module.default;
        diceBox = new DiceBox(`#${containerIdRef.current}`, {
          assetPath: '/assets/',
          theme: skin.theme,
          themeColor: skin.themeColor,
          scale: dice3DScale,
          gravity: 1.2,
          offscreen: false,
          });
        diceBox.onRollComplete = (rollResults) => {
          if (cancelled) return;
          const parsedResults = parseDiceBoxResults(rollResults);
          if (parsedResults.length > 0) {
            resolvedResultsRef.current = parsedResults;
          }
          setPhase('settled');
          finish();
        };

        await diceBox.init();
        if (cancelled) return;
        if (diceBox.updateConfig) {
          await diceBox.updateConfig({ theme: skin.theme, themeColor: skin.themeColor });
        }
        const syncCanvasResolution = () => {
          const canvas = document.querySelector<HTMLCanvasElement>(`#${containerIdRef.current} canvas`);
          const tray = trayRef.current;
          if (!canvas || !tray) return;
          const ratio = Math.min(window.devicePixelRatio || 1, 2);
          const width = Math.max(1, Math.floor(tray.clientWidth * ratio));
          const height = Math.max(1, Math.floor(tray.clientHeight * ratio));
          canvas.width = width;
          canvas.height = height;
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.display = 'block';
          window.dispatchEvent(new Event('resize'));
        };
        syncCanvasResolution();
        resizeObserver = new ResizeObserver(() => syncCanvasResolution());
        setPhase('rolling');
        if (trayRef.current) {
          resizeObserver.observe(trayRef.current);
        }
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
      resizeObserver?.disconnect();
      try {
        diceBox?.clear();
      } catch {
        // Ignore cleanup issues from the dice renderer during unmount.
      }
    };
  }, [dice3DAutoCloseMs, dice3DScale, effectiveResults, notation, results, skin.theme, skin.themeColor]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md overflow-hidden pointer-events-none">
      <div className="pointer-events-auto flex w-full max-w-[110rem] flex-col items-center gap-6 px-4">
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
          ref={trayRef}
          className="relative h-[40rem] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 shadow-[0_0_60px_rgba(0,0,0,0.45)]"
          style={{ boxShadow: `0 0 50px ${skin.glow}` }}
        >
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />
          {diceSkin === 'celestial' && (
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_24%,rgba(56,189,248,0.15),transparent_22%),radial-gradient(circle_at_72%_18%,rgba(129,140,248,0.18),transparent_24%),radial-gradient(circle_at_50%_82%,rgba(168,85,247,0.18),transparent_28%),linear-gradient(180deg,rgba(9,11,28,0.16),rgba(4,8,22,0.44)_56%,rgba(2,6,23,0.68))]" />
              {Array.from({ length: 4 }).map((_, index) => (
                <motion.div
                  key={`celestial-nebula-${index}`}
                  className="absolute rounded-full blur-3xl"
                  style={{
                    left: `${-6 + index * 22}%`,
                    top: `${8 + (index % 2) * 24}%`,
                    width: `${280 + (index % 2) * 120}px`,
                    height: `${140 + (index % 3) * 36}px`,
                    background: index % 2 === 0
                      ? 'radial-gradient(circle, rgba(56,189,248,0.2), rgba(99,102,241,0.14), rgba(0,0,0,0) 72%)'
                      : 'radial-gradient(circle, rgba(168,85,247,0.22), rgba(99,102,241,0.12), rgba(0,0,0,0) 74%)',
                  }}
                  animate={{ x: [0, 26, -18, 0], y: [0, -10, 12, 0], opacity: [0.2, 0.46, 0.24] }}
                  transition={{ duration: 8 + index * 1.2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.35 }}
                />
              ))}
            </div>
          )}
          {diceSkin === 'celestial' && (
            <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
              {Array.from({ length: 72 }).map((_, index) => (
                <motion.div
                  key={`sparkle-${index}`}
                  className="absolute rounded-full bg-indigo-100/95"
                  style={{
                    left: `${4 + ((index * 17) % 92)}%`,
                    top: `${6 + ((index * 19) % 80)}%`,
                    width: `${index % 11 === 0 ? 12 : index % 7 === 0 ? 8 : index % 4 === 0 ? 5 : 2}px`,
                    height: `${index % 11 === 0 ? 12 : index % 7 === 0 ? 8 : index % 4 === 0 ? 5 : 2}px`,
                    boxShadow: index % 9 === 0
                      ? '0 0 22px rgba(103,232,249,0.9), 0 0 34px rgba(165,180,252,0.42)'
                      : index % 4 === 0
                        ? '0 0 16px rgba(191,219,254,0.74)'
                        : '0 0 10px rgba(165,180,252,0.48)',
                  }}
                  animate={{
                    opacity: [0.04, index % 11 === 0 ? 1 : index % 4 === 0 ? 0.92 : 0.58, 0.08],
                    scale: [0.58, index % 11 === 0 ? 2.3 : index % 4 === 0 ? 1.75 : 1.18, 0.7],
                  }}
                  transition={{ duration: 0.9 + (index % 6) * 0.34, repeat: Infinity, delay: index * 0.03 }}
                />
              ))}
              {Array.from({ length: 18 }).map((_, index) => (
                <motion.div
                  key={`star-halo-${index}`}
                  className="absolute rounded-full blur-xl"
                  style={{
                    left: `${8 + ((index * 13) % 84)}%`,
                    top: `${10 + ((index * 23) % 72)}%`,
                    width: `${22 + (index % 3) * 10}px`,
                    height: `${22 + (index % 3) * 10}px`,
                    background: index % 2 === 0
                      ? 'radial-gradient(circle, rgba(103,232,249,0.22), rgba(129,140,248,0.08), transparent 70%)'
                      : 'radial-gradient(circle, rgba(191,219,254,0.2), rgba(168,85,247,0.08), transparent 72%)',
                  }}
                  animate={{ opacity: [0.06, 0.24, 0.08], scale: [0.8, 1.18, 0.88] }}
                  transition={{ duration: 2.2 + (index % 4) * 0.35, repeat: Infinity, delay: index * 0.16 }}
                />
              ))}
              {Array.from({ length: 14 }).map((_, index) => (
                <motion.div
                  key={`star-streak-${index}`}
                  className="absolute h-[2px] rounded-full"
                  style={{
                    left: `${10 + ((index * 11) % 78)}%`,
                    top: `${12 + ((index * 9) % 64)}%`,
                    width: `${46 + (index % 3) * 22}px`,
                    background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(191,219,254,0.88), rgba(255,255,255,0))',
                    rotate: `${-24 + (index % 5) * 11}deg`,
                    boxShadow: '0 0 12px rgba(125,211,252,0.28)',
                  }}
                  animate={{ opacity: [0, 0.62, 0], x: [0, 18, 30], y: [0, -6, -10] }}
                  transition={{ duration: 2.8 + (index % 3) * 0.4, repeat: Infinity, delay: index * 0.4 }}
                />
              ))}
              {Array.from({ length: 10 }).map((_, index) => (
                <motion.div
                  key={`star-cross-${index}`}
                  className="absolute"
                  style={{
                    left: `${8 + ((index * 15) % 84)}%`,
                    top: `${10 + ((index * 21) % 72)}%`,
                    width: `${14 + (index % 3) * 5}px`,
                    height: `${14 + (index % 3) * 5}px`,
                  }}
                  animate={{ opacity: [0.02, 0.8, 0.04], scale: [0.8, 1.3, 0.86], rotate: [0, 45, 90] }}
                  transition={{ duration: 1.4 + (index % 3) * 0.28, repeat: Infinity, delay: index * 0.18 }}
                >
                  <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-100/80 to-transparent shadow-[0_0_12px_rgba(103,232,249,0.55)]" />
                  <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gradient-to-r from-transparent via-indigo-100/80 to-transparent shadow-[0_0_12px_rgba(165,180,252,0.5)]" />
                </motion.div>
              ))}
              <svg className="absolute inset-0 h-full w-full opacity-45" viewBox="0 0 100 100" preserveAspectRatio="none">
                <g stroke="rgba(165,180,252,0.22)" strokeWidth="0.22" fill="none">
                  <path d="M18 28 L27 22 L39 30 L48 26" />
                  <path d="M63 24 L72 18 L80 25 L88 22" />
                  <path d="M22 66 L31 60 L41 68 L50 64" />
                </g>
              </svg>
            </div>
          )}
          {diceSkin === 'bloodstone' && (
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(127,29,29,0.22),transparent_34%),radial-gradient(circle_at_20%_18%,rgba(185,28,28,0.16),transparent_24%),linear-gradient(180deg,rgba(18,6,6,0.12),rgba(24,6,6,0.5)_56%,rgba(11,3,3,0.82))]" />
              <svg className="absolute inset-0 h-full w-full opacity-90" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <filter id="bloodstone-crack-glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="0.7" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <g fill="none" strokeLinecap="round" filter="url(#bloodstone-crack-glow)">
                  <path d="M6 90 L14 84 L19 79 L25 81 L31 73 L37 75 L43 66 L49 68 L55 60 L62 63 L69 54 L76 57 L84 48 L91 50 L97 44" stroke="rgba(251,191,36,0.64)" strokeWidth="0.48" />
                  <path d="M8 68 L15 63 L22 59 L27 52 L35 54 L41 47 L47 49 L53 41 L60 44 L66 35 L73 37 L79 28 L88 30" stroke="rgba(245,158,11,0.46)" strokeWidth="0.34" />
                  <path d="M20 96 L26 87 L33 85 L38 78 L45 79 L51 71 L57 73 L64 65 L70 66 L76 58 L83 60" stroke="rgba(254,240,138,0.34)" strokeWidth="0.28" />
                  <path d="M58 100 L61 91 L67 87 L71 79 L77 76 L81 67 L88 63 L92 54" stroke="rgba(251,191,36,0.34)" strokeWidth="0.24" />
                </g>
              </svg>
            </div>
          )}
          {diceSkin === 'bloodstone' && (
            <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
              {Array.from({ length: 12 }).map((_, index) => (
                <motion.div
                  key={`ember-${index}`}
                  className="absolute h-3 w-3 rounded-full bg-red-400/40 blur-sm"
                  style={{
                    left: `${12 + ((index * 11) % 76)}%`,
                    bottom: `${6 + ((index * 9) % 28)}%`,
                  }}
                  animate={{ opacity: [0.1, 0.55, 0.12], y: [0, -16, -6] }}
                  transition={{ duration: 2.2 + (index % 4) * 0.3, repeat: Infinity, delay: index * 0.1 }}
                />
              ))}
              {Array.from({ length: 8 }).map((_, index) => (
                <motion.div
                  key={`bloodstone-glow-${index}`}
                  className="absolute rounded-full blur-2xl"
                  style={{
                    left: `${10 + ((index * 13) % 78)}%`,
                    bottom: `${8 + ((index * 7) % 22)}%`,
                    width: `${90 + (index % 3) * 28}px`,
                    height: `${36 + (index % 2) * 10}px`,
                    background: index % 2 === 0
                      ? 'radial-gradient(circle, rgba(239,68,68,0.2), rgba(185,28,28,0.08), transparent 72%)'
                      : 'radial-gradient(circle, rgba(251,191,36,0.18), rgba(120,53,15,0.08), transparent 74%)',
                  }}
                  animate={{ opacity: [0.08, 0.3, 0.1], scale: [0.84, 1.18, 0.92], x: [0, 8, -4, 0] }}
                  transition={{ duration: 2.6 + (index % 3) * 0.28, repeat: Infinity, delay: index * 0.14 }}
                />
              ))}
            </div>
          )}
          {diceSkin === 'aurora' && (
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-90">
              {Array.from({ length: 5 }).map((_, index) => (
                <motion.div
                  key={`aurora-${index}`}
                  className="absolute left-[-10%] h-40 w-[60%] rounded-full blur-3xl"
                  style={{
                    top: `${8 + index * 14}%`,
                    background: index % 2 === 0
                      ? 'linear-gradient(90deg, rgba(34,197,94,0.04), rgba(45,212,191,0.28), rgba(99,102,241,0.18), transparent)'
                      : 'linear-gradient(90deg, rgba(59,130,246,0.02), rgba(168,85,247,0.24), rgba(45,212,191,0.18), transparent)',
                  }}
                  animate={{ x: ['-5%', '18%', '-2%'], opacity: [0.35, 0.65, 0.4], rotate: [-4, 3, -2] }}
                  transition={{ duration: 7 + index, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
                />
              ))}
            </div>
          )}
          {diceSkin === 'voidfire' && (
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(88,28,135,0.28),transparent_34%),radial-gradient(circle_at_18%_18%,rgba(76,29,149,0.24),transparent_24%),radial-gradient(circle_at_78%_24%,rgba(124,58,237,0.18),transparent_22%),linear-gradient(180deg,rgba(12,5,24,0.24),rgba(18,8,32,0.62)_58%,rgba(7,3,16,0.9))]" />
              {Array.from({ length: 8 }).map((_, index) => (
                <motion.div
                  key={`voidfire-goo-${index}`}
                  className="absolute rounded-full blur-2xl"
                  style={{
                    left: `${-8 + index * 14}%`,
                    bottom: `${2 + ((index * 5) % 16)}%`,
                    width: `${220 + (index % 3) * 70}px`,
                    height: `${56 + (index % 2) * 20}px`,
                    background: index % 2 === 0
                      ? 'radial-gradient(circle, rgba(88,28,135,0.28), rgba(91,33,182,0.12), transparent 72%)'
                      : 'radial-gradient(circle, rgba(76,29,149,0.26), rgba(31,11,58,0.08), transparent 74%)',
                  }}
                  animate={{ x: [0, 14, -8, 0], opacity: [0.1, 0.26, 0.12], scaleX: [0.88, 1.1, 0.94] }}
                  transition={{ duration: 3.4 + (index % 4) * 0.3, repeat: Infinity, delay: index * 0.18, ease: 'easeInOut' }}
                />
              ))}
              {Array.from({ length: 14 }).map((_, index) => (
                <motion.div
                  key={`voidfire-${index}`}
                  className="absolute h-24 w-24 rounded-full blur-2xl"
                  style={{
                    left: `${6 + ((index * 7) % 84)}%`,
                    bottom: `${-4 + ((index * 5) % 22)}%`,
                    background: index % 2 === 0
                      ? 'radial-gradient(circle, rgba(249,115,22,0.26), rgba(168,85,247,0.18), transparent 70%)'
                      : 'radial-gradient(circle, rgba(217,70,239,0.28), rgba(249,115,22,0.1), transparent 72%)',
                  }}
                  animate={{ y: [0, -80, -20], opacity: [0.15, 0.6, 0.08], scale: [0.8, 1.4, 0.9] }}
                  transition={{ duration: 2.8 + (index % 4) * 0.35, repeat: Infinity, delay: index * 0.12 }}
                />
              ))}
            </div>
          )}
          {diceSkin === 'voidfire' && (
            <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
              {Array.from({ length: 12 }).map((_, index) => (
                <motion.div
                  key={`voidfire-trail-${index}`}
                  className="absolute h-14 rounded-full blur-lg"
                  style={{
                    right: `${-2 + (index % 3) * 2}%`,
                    top: `${16 + ((index * 6) % 58)}%`,
                    width: `${110 + (index % 4) * 34}px`,
                    background: index % 2 === 0
                      ? 'linear-gradient(90deg, rgba(147,51,234,0), rgba(168,85,247,0.34), rgba(196,181,253,0.16), rgba(0,0,0,0))'
                      : 'linear-gradient(90deg, rgba(217,70,239,0), rgba(217,70,239,0.3), rgba(129,140,248,0.16), rgba(0,0,0,0))',
                    rotate: `${-18 + (index % 5) * 7}deg`,
                  }}
                  animate={{ x: [0, -120, -36], opacity: [0, 0.46, 0], scaleX: [0.82, 1.2, 0.94] }}
                  transition={{ duration: 1.4 + (index % 4) * 0.18, repeat: Infinity, delay: index * 0.1 }}
                />
              ))}
              {Array.from({ length: 10 }).map((_, index) => (
                <motion.div
                  key={`voidfire-ember-${index}`}
                  className="absolute rounded-full blur-md"
                  style={{
                    left: `${10 + ((index * 11) % 78)}%`,
                    bottom: `${10 + ((index * 7) % 22)}%`,
                    width: `${12 + (index % 3) * 8}px`,
                    height: `${12 + (index % 4) * 7}px`,
                    background: index % 2 === 0
                      ? 'radial-gradient(circle, rgba(216,180,254,0.82), rgba(147,51,234,0.34), rgba(147,51,234,0) 74%)'
                      : 'radial-gradient(circle, rgba(129,140,248,0.58), rgba(91,33,182,0.26), rgba(91,33,182,0) 74%)',
                    boxShadow: index % 2 === 0
                      ? '0 0 14px rgba(216,180,254,0.24)'
                      : '0 0 14px rgba(168,85,247,0.22)',
                  }}
                  animate={{ y: [0, -22, -6], opacity: [0.08, 0.64, 0.12], scale: [0.7, 1.24, 0.84] }}
                  transition={{ duration: 1.8 + (index % 3) * 0.2, repeat: Infinity, delay: index * 0.12 }}
                />
              ))}
              {Array.from({ length: 8 }).map((_, index) => (
                <motion.div
                  key={`voidfire-smoke-${index}`}
                  className="absolute rounded-full blur-2xl"
                  style={{
                    left: `${8 + ((index * 13) % 80)}%`,
                    bottom: `${18 + ((index * 6) % 18)}%`,
                    width: `${96 + (index % 3) * 26}px`,
                    height: `${44 + (index % 4) * 12}px`,
                    background: index % 2 === 0
                      ? 'radial-gradient(circle, rgba(76,29,149,0.22), rgba(30,27,75,0.08), transparent 74%)'
                      : 'radial-gradient(circle, rgba(88,28,135,0.2), rgba(24,24,27,0.06), transparent 76%)',
                  }}
                  animate={{
                    x: [0, 18, -10, 0],
                    y: [0, -26, -8, 0],
                    opacity: [0.08, 0.28, 0.1],
                    scale: [0.88, 1.18, 0.94],
                  }}
                  transition={{ duration: 3.1 + (index % 3) * 0.32, repeat: Infinity, ease: 'easeInOut', delay: index * 0.18 }}
                />
              ))}
            </div>
          )}
          {diceSkin === 'toxic' && (
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(163,230,53,0.22),transparent_38%),radial-gradient(circle_at_20%_0%,rgba(74,222,128,0.16),transparent_24%),linear-gradient(180deg,rgba(9,20,6,0.18),rgba(10,28,8,0.44)_58%,rgba(16,56,10,0.62))]" />
              <ToxicRipple left="12%" top="18%" width={240} delay={0} duration={2.6} rotate={-6} />
              <ToxicRipple left="58%" top="14%" width={300} delay={0.45} duration={3} rotate={4} />
              <ToxicRipple left="28%" top="48%" width={340} delay={0.95} duration={3.2} rotate={-3} />
              <ToxicRipple left="68%" top="54%" width={220} delay={1.35} duration={2.4} rotate={7} />
              {Array.from({ length: 6 }).map((_, index) => (
                <motion.div
                  key={`toxic-wave-${index}`}
                  className="absolute rounded-full blur-md"
                  style={{
                    left: `${6 + index * 14}%`,
                    bottom: `${10 + ((index * 6) % 18)}%`,
                    width: `${180 + (index % 3) * 60}px`,
                    height: `${36 + (index % 2) * 10}px`,
                    background: index % 2 === 0
                      ? 'radial-gradient(circle, rgba(163,230,53,0.2), rgba(132,204,22,0.06), transparent 72%)'
                      : 'radial-gradient(circle, rgba(74,222,128,0.18), rgba(22,163,74,0.06), transparent 72%)',
                  }}
                  animate={{
                    scaleX: [0.86, 1.08, 0.94],
                    opacity: [0.08, 0.24, 0.1],
                    x: [0, 12, -8, 0],
                  }}
                  transition={{ duration: 3.4 + (index % 3) * 0.35, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 }}
                />
              ))}
            </div>
          )}
          {diceSkin === 'toxic' && (
            <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
              {Array.from({ length: 12 }).map((_, index) => (
                <motion.div
                  key={`toxic-${index}`}
                  className="absolute rounded-full blur-xl"
                  style={{
                    left: `${8 + ((index * 9) % 78)}%`,
                    top: `${18 + ((index * 11) % 58)}%`,
                    width: `${36 + (index % 3) * 18}px`,
                    height: `${22 + (index % 4) * 14}px`,
                    background: 'radial-gradient(circle, rgba(163,230,53,0.38), rgba(132,204,22,0.18), transparent 72%)',
                  }}
                  animate={{ scale: [0.9, 1.2, 0.95], opacity: [0.18, 0.46, 0.2] }}
                  transition={{ duration: 1.9 + (index % 3) * 0.2, repeat: Infinity, delay: index * 0.14 }}
                />
              ))}
              {Array.from({ length: 16 }).map((_, index) => (
                <motion.div
                  key={`toxic-splatter-${index}`}
                  className="absolute rounded-full"
                  style={{
                    left: `${4 + ((index * 7) % 90)}%`,
                    bottom: `${6 + ((index * 9) % 26)}%`,
                    width: `${10 + (index % 4) * 8}px`,
                    height: `${10 + (index % 5) * 7}px`,
                    background: index % 3 === 0
                      ? 'radial-gradient(circle, rgba(190,242,100,0.78), rgba(132,204,22,0.42), rgba(132,204,22,0) 74%)'
                      : 'radial-gradient(circle, rgba(74,222,128,0.68), rgba(22,163,74,0.36), rgba(22,163,74,0) 72%)',
                    boxShadow: '0 0 14px rgba(163,230,53,0.18)',
                  }}
                  animate={{
                    scale: [0.72, 1.22, 0.86],
                    opacity: [0.12, 0.68, 0.16],
                    y: [0, -12, -4],
                  }}
                  transition={{ duration: 1.6 + (index % 4) * 0.16, repeat: Infinity, delay: index * 0.08 }}
                />
              ))}
              {Array.from({ length: 10 }).map((_, index) => (
                <motion.div
                  key={`toxic-vapor-${index}`}
                  className="absolute rounded-full blur-2xl"
                  style={{
                    left: `${10 + ((index * 11) % 76)}%`,
                    bottom: `${14 + ((index * 6) % 22)}%`,
                    width: `${80 + (index % 3) * 28}px`,
                    height: `${38 + (index % 4) * 12}px`,
                    background: index % 2 === 0
                      ? 'radial-gradient(circle, rgba(163,230,53,0.2), rgba(101,163,13,0.08), transparent 72%)'
                      : 'radial-gradient(circle, rgba(74,222,128,0.18), rgba(22,163,74,0.06), transparent 74%)',
                  }}
                  animate={{
                    x: [0, 18, -10, 0],
                    y: [0, -20, -8, 0],
                    opacity: [0.08, 0.28, 0.1],
                  }}
                  transition={{ duration: 3.2 + (index % 3) * 0.3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.17 }}
                />
              ))}
            </div>
          )}
          {diceSkin === 'glitchpop' && (
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_24%,rgba(236,72,153,0.18),transparent_22%),radial-gradient(circle_at_74%_18%,rgba(34,211,238,0.18),transparent_24%),radial-gradient(circle_at_48%_82%,rgba(250,204,21,0.16),transparent_26%),linear-gradient(180deg,rgba(12,4,18,0.18),rgba(16,8,24,0.5)_56%,rgba(8,4,16,0.82))]" />
              {Array.from({ length: 7 }).map((_, index) => (
                <motion.div
                  key={`glitch-floor-${index}`}
                  className="absolute rounded-full blur-2xl"
                  style={{
                    left: `${-4 + index * 14}%`,
                    bottom: `${6 + ((index * 5) % 18)}%`,
                    width: `${180 + (index % 3) * 70}px`,
                    height: `${44 + (index % 2) * 16}px`,
                    background: index % 3 === 0
                      ? 'radial-gradient(circle, rgba(236,72,153,0.18), rgba(99,102,241,0.06), transparent 72%)'
                      : index % 3 === 1
                        ? 'radial-gradient(circle, rgba(34,211,238,0.18), rgba(59,130,246,0.06), transparent 72%)'
                        : 'radial-gradient(circle, rgba(250,204,21,0.16), rgba(236,72,153,0.05), transparent 72%)',
                  }}
                  animate={{ x: [0, 18, -10, 0], opacity: [0.08, 0.24, 0.1], scaleX: [0.88, 1.08, 0.94] }}
                  transition={{ duration: 2.8 + (index % 4) * 0.3, repeat: Infinity, delay: index * 0.14, ease: 'easeInOut' }}
                />
              ))}
              {Array.from({ length: 12 }).map((_, index) => (
                <motion.div
                  key={`glitch-disc-${index}`}
                  className="absolute rounded-full border blur-[1px]"
                  style={{
                    left: `${8 + ((index * 13) % 82)}%`,
                    top: `${16 + ((index * 17) % 62)}%`,
                    width: `${24 + (index % 4) * 12}px`,
                    height: `${24 + (index % 4) * 12}px`,
                    borderColor: index % 3 === 0
                      ? 'rgba(236,72,153,0.4)'
                      : index % 3 === 1
                        ? 'rgba(34,211,238,0.4)'
                        : 'rgba(250,204,21,0.36)',
                    boxShadow: index % 3 === 0
                      ? '0 0 18px rgba(236,72,153,0.16)'
                      : index % 3 === 1
                        ? '0 0 18px rgba(34,211,238,0.14)'
                        : '0 0 16px rgba(250,204,21,0.12)',
                  }}
                  animate={{ opacity: [0.08, 0.34, 0.1], scale: [0.8, 1.22, 0.9] }}
                  transition={{ duration: 1.9 + (index % 3) * 0.25, repeat: Infinity, delay: index * 0.08 }}
                />
              ))}
            </div>
          )}
          {diceSkin === 'glitchpop' && (
            <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
              {Array.from({ length: 14 }).map((_, index) => (
                <motion.div
                  key={`glitch-afterimage-${index}`}
                  className="absolute h-16 rounded-full blur-xl"
                  style={{
                    right: `${-2 + (index % 3) * 3}%`,
                    top: `${18 + ((index * 5) % 56)}%`,
                    width: `${120 + (index % 4) * 36}px`,
                    background: index % 3 === 0
                      ? 'linear-gradient(90deg, rgba(236,72,153,0), rgba(236,72,153,0.32), rgba(236,72,153,0))'
                      : index % 3 === 1
                        ? 'linear-gradient(90deg, rgba(34,211,238,0), rgba(34,211,238,0.28), rgba(34,211,238,0))'
                        : 'linear-gradient(90deg, rgba(250,204,21,0), rgba(250,204,21,0.24), rgba(250,204,21,0))',
                    rotate: `${-14 + (index % 5) * 6}deg`,
                  }}
                  animate={{ x: [0, -120, -40], opacity: [0, 0.34, 0], scaleX: [0.8, 1.18, 0.92] }}
                  transition={{ duration: 1.2 + (index % 4) * 0.18, repeat: Infinity, delay: index * 0.09 }}
                />
              ))}
              {Array.from({ length: 26 }).map((_, index) => (
                <motion.div
                  key={`glitch-${index}`}
                  className="absolute h-3 rounded-full blur-[1px]"
                  style={{
                    left: `${((index * 13) % 90)}%`,
                    top: `${8 + ((index * 17) % 76)}%`,
                    width: `${60 + (index % 4) * 36}px`,
                    background: index % 3 === 0
                      ? 'linear-gradient(90deg, rgba(236,72,153,0.0), rgba(236,72,153,0.85), transparent)'
                      : index % 3 === 1
                        ? 'linear-gradient(90deg, rgba(34,211,238,0.0), rgba(34,211,238,0.85), transparent)'
                        : 'linear-gradient(90deg, rgba(250,204,21,0.0), rgba(250,204,21,0.8), transparent)',
                  }}
                  animate={{ x: [0, 18, -10, 0], opacity: [0.18, 0.82, 0.16], scaleX: [0.9, 1.18, 0.88] }}
                  transition={{ duration: 0.9 + (index % 4) * 0.16, repeat: Infinity, delay: index * 0.04 }}
                />
              ))}
              {Array.from({ length: 20 }).map((_, index) => (
                <motion.div
                  key={`glitch-spark-${index}`}
                  className="absolute rounded-full"
                  style={{
                    left: `${4 + ((index * 19) % 92)}%`,
                    top: `${8 + ((index * 23) % 78)}%`,
                    width: `${index % 5 === 0 ? 9 : 4}px`,
                    height: `${index % 5 === 0 ? 9 : 4}px`,
                    background: index % 3 === 0
                      ? 'rgba(236,72,153,0.88)'
                      : index % 3 === 1
                        ? 'rgba(34,211,238,0.84)'
                        : 'rgba(250,204,21,0.84)',
                    boxShadow: index % 3 === 0
                      ? '0 0 16px rgba(236,72,153,0.54)'
                      : index % 3 === 1
                        ? '0 0 16px rgba(34,211,238,0.5)'
                        : '0 0 16px rgba(250,204,21,0.46)',
                  }}
                  animate={{ opacity: [0.08, 0.9, 0.14], scale: [0.7, 1.5, 0.82] }}
                  transition={{ duration: 0.8 + (index % 4) * 0.15, repeat: Infinity, delay: index * 0.05 }}
                />
              ))}
            </div>
          )}
          <div className="absolute inset-x-6 top-5 z-10 flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-zinc-500">
            <span>Dice Tray</span>
            <span>{notation}</span>
          </div>
          <motion.div
            id={containerIdRef.current}
            className="relative z-20 h-full w-full"
            style={diceCanvasMotion.style}
            animate={{
              ...(diceCanvasMotion.animate || {}),
              opacity: phase === 'settled' ? 0.35 : 1,
            }}
            transition={diceCanvasMotion.transition}
          />

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
                  <span className="font-bold" style={{ color: skin.accent }}>
                    {displayHighlightedValue}
                  </span>
                </div>
              )}
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm text-zinc-300">
                {displayResults.map((value, index) => (
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
