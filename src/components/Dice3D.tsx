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
  const settledRef = useRef(false);
  const [phase, setPhase] = useState<'initializing' | 'rolling' | 'settled' | 'failed'>('initializing');
  const skin = DICE_SKINS[diceSkin] || DICE_SKINS.default;

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

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
    let resizeObserver: ResizeObserver | null = null;
    settledRef.current = false;

    const finish = () => {
      if (settledRef.current) return;
      settledRef.current = true;
      if (completeTimeoutRef.current) {
        window.clearTimeout(completeTimeoutRef.current);
      }
      completeTimeoutRef.current = window.setTimeout(() => {
        onCompleteRef.current();
      }, dice3DAutoCloseMs);
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
        diceBox.onRollComplete = () => {
          if (cancelled) return;
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
  }, [dice3DAutoCloseMs, dice3DScale, notation, skin.theme, skin.themeColor]);

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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />
          {diceSkin === 'celestial' && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
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
              {Array.from({ length: 24 }).map((_, index) => (
                <motion.div
                  key={`sparkle-${index}`}
                  className="absolute rounded-full bg-indigo-100/90"
                  style={{
                    left: `${4 + ((index * 17) % 92)}%`,
                    top: `${6 + ((index * 19) % 80)}%`,
                    width: `${index % 5 === 0 ? 8 : index % 3 === 0 ? 5 : 3}px`,
                    height: `${index % 5 === 0 ? 8 : index % 3 === 0 ? 5 : 3}px`,
                    boxShadow: index % 4 === 0
                      ? '0 0 16px rgba(191,219,254,0.7)'
                      : '0 0 10px rgba(165,180,252,0.45)',
                  }}
                  animate={{
                    opacity: [0.12, index % 4 === 0 ? 1 : 0.72, 0.16],
                    scale: [0.72, index % 4 === 0 ? 1.7 : 1.3, 0.84],
                  }}
                  transition={{ duration: 1.6 + (index % 4) * 0.5, repeat: Infinity, delay: index * 0.07 }}
                />
              ))}
              {Array.from({ length: 8 }).map((_, index) => (
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
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
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
            </div>
          )}
          {diceSkin === 'aurora' && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-90">
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
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {Array.from({ length: 14 }).map((_, index) => (
                <motion.div
                  key={`voidfire-${index}`}
                  className="absolute h-24 w-24 rounded-full blur-2xl"
                  style={{
                    left: `${6 + ((index * 7) % 84)}%`,
                    bottom: `${-4 + ((index * 5) % 22)}%`,
                    background: index % 2 === 0
                      ? 'radial-gradient(circle, rgba(249,115,22,0.35), rgba(168,85,247,0.12), transparent 70%)'
                      : 'radial-gradient(circle, rgba(217,70,239,0.3), rgba(249,115,22,0.08), transparent 72%)',
                  }}
                  animate={{ y: [0, -80, -20], opacity: [0.15, 0.6, 0.08], scale: [0.8, 1.4, 0.9] }}
                  transition={{ duration: 2.8 + (index % 4) * 0.35, repeat: Infinity, delay: index * 0.12 }}
                />
              ))}
            </div>
          )}
          {diceSkin === 'toxic' && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
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
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {Array.from({ length: 18 }).map((_, index) => (
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
                  animate={{ x: [0, 18, -10, 0], opacity: [0.18, 0.75, 0.2], scaleX: [0.9, 1.12, 0.92] }}
                  transition={{ duration: 0.95 + (index % 4) * 0.18, repeat: Infinity, delay: index * 0.05 }}
                />
              ))}
            </div>
          )}
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
