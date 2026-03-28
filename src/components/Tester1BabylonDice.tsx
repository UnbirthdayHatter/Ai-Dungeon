import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArcRotateCamera,
  Color3,
  DynamicTexture,
  Engine,
  GlowLayer,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
  Vector4,
  type Nullable,
} from '@babylonjs/core';
import { useStore } from '@/store/useStore';

interface Tester1BabylonDiceProps {
  results: number[];
  diceType: number;
  total?: number;
  label?: string;
  modifier?: number;
  highlight?: 'highest' | 'lowest' | 'sum';
  onComplete: (resolvedResults: number[]) => void;
}

const FACE_COUNT = 20;
const ATLAS_COLS = 5;
const ATLAS_ROWS = 4;
const ATLAS_SIZE = 2048;

function createFaceAtlas(scene: Scene) {
  const texture = new DynamicTexture('tester1-lava-atlas', { width: ATLAS_SIZE, height: ATLAS_SIZE }, scene, true);
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
  const cellWidth = ATLAS_SIZE / ATLAS_COLS;
  const cellHeight = ATLAS_SIZE / ATLAS_ROWS;

  ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);

  for (let face = 0; face < FACE_COUNT; face += 1) {
    const col = face % ATLAS_COLS;
    const row = Math.floor(face / ATLAS_COLS);
    const x = col * cellWidth;
    const y = row * cellHeight;
    const inset = 16;
    const fx = x + inset;
    const fy = y + inset;
    const fw = cellWidth - inset * 2;
    const fh = cellHeight - inset * 2;
    const faceNumber = (face + 1).toString();
    const tri = [
      { x: fx + fw * 0.12, y: fy + fh * 0.14 },
      { x: fx + fw * 0.88, y: fy + fh * 0.18 },
      { x: fx + fw * 0.22, y: fy + fh * 0.86 },
    ];
    const centroid = {
      x: (tri[0].x + tri[1].x + tri[2].x) / 3,
      y: (tri[0].y + tri[1].y + tri[2].y) / 3,
    };

    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, cellWidth, cellHeight);

    const rock = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh);
    rock.addColorStop(0, '#090706');
    rock.addColorStop(0.45, '#1a0d08');
    rock.addColorStop(1, '#050404');
    ctx.beginPath();
    ctx.moveTo(tri[0].x, tri[0].y);
    ctx.lineTo(tri[1].x, tri[1].y);
    ctx.lineTo(tri[2].x, tri[2].y);
    ctx.closePath();
    ctx.fillStyle = rock;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tri[0].x, tri[0].y);
    ctx.lineTo(tri[1].x, tri[1].y);
    ctx.lineTo(tri[2].x, tri[2].y);
    ctx.closePath();
    ctx.clip();

    for (let i = 0; i < 28; i += 1) {
      const px = fx + ((i * 97 + face * 29) % Math.floor(fw));
      const py = fy + ((i * 53 + face * 41) % Math.floor(fh));
      const radius = 3 + ((i + face) % 8);
      const glow = ctx.createRadialGradient(px, py, 0, px, py, radius * 2.8);
      glow.addColorStop(0, 'rgba(255, 210, 96, 0.24)');
      glow.addColorStop(0.35, 'rgba(255, 132, 32, 0.18)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, radius * 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i += 1) {
      const startX = fx + fw * (0.08 + (((i * 17 + face * 11) % 70) / 100));
      const startY = fy + fh * (0.08 + (((i * 23 + face * 7) % 72) / 100));
      const endX = startX + fw * (0.14 + (((i * 19 + face * 5) % 16) / 100));
      const endY = startY + fh * (0.1 + (((i * 13 + face * 3) % 18) / 100));
      const midX = (startX + endX) / 2 + (((i % 2 === 0 ? 1 : -1) * fw) / 18);
      const midY = (startY + endY) / 2 + (((i % 3 === 0 ? -1 : 1) * fh) / 20);

      ctx.strokeStyle = 'rgba(255, 136, 28, 0.22)';
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 220, 140, 0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.floor(cellWidth * 0.26)}px Georgia, serif`;
    ctx.shadowBlur = 26;
    ctx.shadowColor = 'rgba(255, 164, 48, 0.95)';
    ctx.fillStyle = '#fff0c7';
    ctx.fillText(faceNumber, centroid.x, centroid.y);
    ctx.shadowBlur = 0;

    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 208, 128, 0.14)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(tri[0].x, tri[0].y);
    ctx.lineTo(tri[1].x, tri[1].y);
    ctx.lineTo(tri[2].x, tri[2].y);
    ctx.closePath();
    ctx.stroke();
  }

  texture.update(false);
  return texture;
}

function createFaceUVs() {
  return Array.from({ length: FACE_COUNT }, (_, face) => {
    const col = face % ATLAS_COLS;
    const row = Math.floor(face / ATLAS_COLS);
    const u0 = col / ATLAS_COLS;
    const v0 = row / ATLAS_ROWS;
    const u1 = (col + 1) / ATLAS_COLS;
    const v1 = (row + 1) / ATLAS_ROWS;
    return new Vector4(u0, v0, u1, v1);
  });
}

function getFrontFacingRotation(value: number) {
  const normalized = ((value - 1) % FACE_COUNT + FACE_COUNT) % FACE_COUNT;
  return {
    x: ((normalized * 31) % 360) * (Math.PI / 180),
    y: ((normalized * 53) % 360) * (Math.PI / 180),
    z: ((normalized * 17) % 360) * (Math.PI / 180),
  };
}

export function Tester1BabylonDice({
  results,
  diceType,
  total,
  label,
  modifier = 0,
  highlight = 'sum',
  onComplete,
}: Tester1BabylonDiceProps) {
  const { dice3DAutoCloseMs } = useStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  const [phase, setPhase] = useState<'initializing' | 'rolling' | 'settled' | 'failed'>('initializing');

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let settleTimeout: number | null = null;
    let closeTimeout: number | null = null;
    let engine: Nullable<Engine> = null;
    let scene: Nullable<Scene> = null;
    let glowLayer: Nullable<GlowLayer> = null;
    let tester1: Nullable<Mesh> = null;
    let lavaMaterial: Nullable<StandardMaterial> = null;
    let pulseTime = 0;

    try {
      engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
      scene = new Scene(engine);
      scene.clearColor.set(0.04, 0.025, 0.02, 1);

      const camera = new ArcRotateCamera('tester1-camera', -Math.PI / 2, Math.PI / 2.35, 6.4, Vector3.Zero(), scene);
      camera.attachControl(canvas, false);
      camera.lowerRadiusLimit = 6.4;
      camera.upperRadiusLimit = 6.4;
      camera.wheelPrecision = 1000;
      camera.inputs.clear();

      const light = new HemisphericLight('tester1-hemi', new Vector3(0.4, 1, -0.6), scene);
      light.intensity = 1.15;
      light.groundColor = new Color3(0.14, 0.07, 0.04);

      glowLayer = new GlowLayer('tester1-glow', scene, { blurKernelSize: 32 });
      glowLayer.intensity = 0.85;

      tester1 = scene.getMeshByName('Tester1') as Nullable<Mesh>;
      if (tester1) {
        tester1.dispose(false, true);
      }

      tester1 = MeshBuilder.CreatePolyhedron('Tester1', {
        type: 3,
        size: 2.25,
        faceUV: createFaceUVs(),
      }, scene);
      tester1.rotationQuaternion = null;

      lavaMaterial = new StandardMaterial('Tester1LavaMaterial', scene);
      lavaMaterial.diffuseColor = new Color3(0.06, 0.04, 0.03);
      lavaMaterial.specularColor = new Color3(0.18, 0.1, 0.05);
      lavaMaterial.ambientColor = new Color3(0.04, 0.02, 0.02);
      lavaMaterial.emissiveColor = new Color3(0.85, 0.36, 0.04);
      lavaMaterial.diffuseTexture = createFaceAtlas(scene);
      lavaMaterial.emissiveTexture = lavaMaterial.diffuseTexture;
      lavaMaterial.backFaceCulling = true;
      tester1.material = lavaMaterial;

      if (glowLayer) {
        glowLayer.referenceMeshToUseItsOwnMaterial(tester1);
      }

      const targetRotation = getFrontFacingRotation(effectiveResults[0] ?? 1);
      tester1.rotation.x = targetRotation.x + 4.6;
      tester1.rotation.y = targetRotation.y - 5.4;
      tester1.rotation.z = targetRotation.z + 2.8;

      settleTimeout = window.setTimeout(() => {
        if (!tester1 || disposed) return;
        tester1.rotation.x = targetRotation.x;
        tester1.rotation.y = targetRotation.y;
        tester1.rotation.z = targetRotation.z;
        setPhase('settled');
        closeTimeout = window.setTimeout(() => {
          onCompleteRef.current(effectiveResults);
        }, dice3DAutoCloseMs);
      }, 1700);

      scene.registerBeforeRender(() => {
        if (!scene || !tester1 || !lavaMaterial) return;
        const dt = scene.getEngine().getDeltaTime() * 0.001;
        pulseTime += dt;

        if (phase !== 'settled') {
          tester1.rotation.x += 1.6 * dt;
          tester1.rotation.y += 2.1 * dt;
          tester1.rotation.z += 1.2 * dt;
        } else {
          tester1.rotation.x += 0.18 * dt;
          tester1.rotation.y += 0.26 * dt;
          tester1.rotation.z += 0.12 * dt;
        }

        const pulse = 0.78 + Math.sin(pulseTime * 3.8) * 0.22;
        lavaMaterial.emissiveColor = new Color3(1.2 * pulse, 0.46 * pulse, 0.06 * pulse);
      });

      engine.runRenderLoop(() => {
        scene?.render();
      });

      const handleResize = () => engine?.resize();
      window.addEventListener('resize', handleResize);
      setPhase('rolling');

      return () => {
        disposed = true;
        window.removeEventListener('resize', handleResize);
        if (settleTimeout) window.clearTimeout(settleTimeout);
        if (closeTimeout) window.clearTimeout(closeTimeout);
        glowLayer?.dispose();
        scene?.dispose();
        engine?.dispose();
      };
    } catch (error) {
      console.error('Tester1 Babylon dice failed to initialize', error);
      setPhase('failed');
      closeTimeout = window.setTimeout(() => {
        onCompleteRef.current(effectiveResults);
      }, 300);
      return () => {
        disposed = true;
        if (settleTimeout) window.clearTimeout(settleTimeout);
        if (closeTimeout) window.clearTimeout(closeTimeout);
        glowLayer?.dispose();
        scene?.dispose();
        engine?.dispose();
      };
    }
  }, [dice3DAutoCloseMs, effectiveResults, phase]);

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

        <div className="relative h-[40rem] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/90 shadow-[0_0_60px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-x-6 top-5 z-10 flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-zinc-500">
            <span>Dice Tray</span>
            <span>{notation}</span>
          </div>

          <canvas ref={canvasRef} className="relative z-20 h-full w-full" />

          {phase === 'initializing' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-300">
              Preparing Tester1...
            </div>
          )}

          {phase === 'failed' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-300">
              Tester1 Babylon dice unavailable, showing result summary instead.
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
                  <span className="font-bold text-orange-200">{displayHighlightedValue}</span>
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
