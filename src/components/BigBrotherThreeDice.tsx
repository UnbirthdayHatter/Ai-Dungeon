import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { useStore } from '@/store/useStore';

interface BigBrotherThreeDiceProps {
  results: number[];
  diceType: number;
  total?: number;
  label?: string;
  modifier?: number;
  highlight?: 'highest' | 'lowest' | 'sum';
  onComplete: (resolvedResults: number[]) => void;
}

type DiceVariant = 'blue' | 'pink';

const FACE_ORDER = [3, 4, 1, 6, 2, 5];
const FACE_NORMALS: Record<number, THREE.Vector3> = {
  1: new THREE.Vector3(0, 1, 0),
  6: new THREE.Vector3(0, -1, 0),
  2: new THREE.Vector3(0, 0, 1),
  5: new THREE.Vector3(0, 0, -1),
  3: new THREE.Vector3(1, 0, 0),
  4: new THREE.Vector3(-1, 0, 0),
};

function buildRestingQuaternions() {
  const seen = new Set<string>();
  const quaternions: THREE.Quaternion[] = [];

  for (let x = 0; x < 4; x += 1) {
    for (let y = 0; y < 4; y += 1) {
      for (let z = 0; z < 4; z += 1) {
        const q = new THREE.Quaternion().setFromEuler(
          new THREE.Euler((x * Math.PI) / 2, (y * Math.PI) / 2, (z * Math.PI) / 2, 'XYZ'),
        );
        const key = [q.x, q.y, q.z, q.w].map((value) => value.toFixed(4)).join(',');
        if (!seen.has(key)) {
          seen.add(key);
          quaternions.push(q);
        }
      }
    }
  }

  return quaternions;
}

const D6_RESTING_QUATERNIONS = buildRestingQuaternions();

function getSnappedRestingQuaternion(current: THREE.Quaternion, topValue: number) {
  let best = current.clone();
  let bestDot = -Infinity;

  D6_RESTING_QUATERNIONS.forEach((candidate) => {
    if (readTopFaceValue(candidate) !== topValue) return;
    const dot = Math.abs(current.dot(candidate));
    if (dot > bestDot) {
      bestDot = dot;
      best = candidate.clone();
    }
  });

  return best;
}

const VARIANT_STYLE: Record<DiceVariant, {
  size: number;
  baseA: string;
  baseB: string;
  rim: string;
  numberStroke: string;
  numberFill: string;
  emissive: string;
}> = {
  blue: {
    size: 1.12,
    baseA: '#2f67e0',
    baseB: '#1a3262',
    rim: '#92b8ff',
    numberStroke: 'rgba(160, 205, 255, 0.8)',
    numberFill: 'rgba(246, 251, 255, 0.98)',
    emissive: '#5d8fff',
  },
  pink: {
    size: 0.8,
    baseA: '#ff8fc5',
    baseB: '#8a3066',
    rim: '#ffd1e8',
    numberStroke: 'rgba(255, 195, 226, 0.86)',
    numberFill: 'rgba(255, 247, 252, 0.98)',
    emissive: '#ff7fc8',
  },
};

function createHeartTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.translate(128, 132);
  ctx.scale(1.12, 1.12);
  ctx.beginPath();
  ctx.moveTo(0, 32);
  ctx.bezierCurveTo(46, -10, 88, 8, 88, 50);
  ctx.bezierCurveTo(88, 92, 44, 122, 0, 156);
  ctx.bezierCurveTo(-44, 122, -88, 92, -88, 50);
  ctx.bezierCurveTo(-88, 8, -46, -10, 0, 32);
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, -80, 0, 140);
  fill.addColorStop(0, 'rgba(255,244,250,0.98)');
  fill.addColorStop(0.45, 'rgba(255,170,218,0.96)');
  fill.addColorStop(1, 'rgba(255,110,188,0.92)');
  ctx.fillStyle = fill;
  ctx.shadowBlur = 22;
  ctx.shadowColor = 'rgba(255, 126, 199, 0.4)';
  ctx.fill();
  ctx.shadowBlur = 0;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createFaceTextures(value: number, variant: DiceVariant) {
  const style = VARIANT_STYLE[variant];

  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = 1024;
  mapCanvas.height = 1024;
  const mapCtx = mapCanvas.getContext('2d');

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = 1024;
  emissiveCanvas.height = 1024;
  const emissiveCtx = emissiveCanvas.getContext('2d');

  if (!mapCtx || !emissiveCtx) {
    return {
      map: new THREE.CanvasTexture(mapCanvas),
      emissiveMap: new THREE.CanvasTexture(emissiveCanvas),
    };
  }

  const base = mapCtx.createLinearGradient(0, 0, 1024, 1024);
  base.addColorStop(0, style.baseA);
  base.addColorStop(0.5, style.baseB);
  base.addColorStop(1, variant === 'blue' ? '#0a1430' : '#401028');
  mapCtx.fillStyle = base;
  mapCtx.fillRect(0, 0, 1024, 1024);

  const sheen = mapCtx.createRadialGradient(260, 200, 30, 260, 200, 340);
  sheen.addColorStop(0, `${style.rim}55`);
  sheen.addColorStop(0.46, `${style.rim}18`);
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  mapCtx.fillStyle = sheen;
  mapCtx.fillRect(0, 0, 1024, 1024);

  for (let i = 0; i < 30; i += 1) {
    mapCtx.fillStyle = variant === 'blue' ? 'rgba(255,255,255,0.04)' : 'rgba(255,240,250,0.05)';
    const radius = 2 + (i % 4);
    const x = (i * 173) % 1024;
    const y = (i * 257) % 1024;
    mapCtx.beginPath();
    mapCtx.arc(x, y, radius, 0, Math.PI * 2);
    mapCtx.fill();
  }

  mapCtx.textAlign = 'center';
  mapCtx.textBaseline = 'middle';
  mapCtx.font = 'bold 420px Georgia';
  mapCtx.lineJoin = 'round';
  mapCtx.lineWidth = 20;
  mapCtx.strokeStyle = style.numberStroke;
  mapCtx.shadowBlur = 14;
  mapCtx.shadowColor = variant === 'blue' ? 'rgba(93, 143, 255, 0.28)' : 'rgba(255, 127, 200, 0.3)';
  mapCtx.strokeText(String(value), 512, 540);
  mapCtx.shadowBlur = 0;
  mapCtx.fillStyle = style.numberFill;
  mapCtx.fillText(String(value), 512, 540);

  emissiveCtx.clearRect(0, 0, 1024, 1024);
  emissiveCtx.textAlign = 'center';
  emissiveCtx.textBaseline = 'middle';
  emissiveCtx.font = 'bold 420px Georgia';
  emissiveCtx.lineJoin = 'round';
  emissiveCtx.lineWidth = 22;
  emissiveCtx.strokeStyle = variant === 'blue' ? 'rgba(93, 143, 255, 0.62)' : 'rgba(255, 127, 200, 0.64)';
  emissiveCtx.shadowBlur = 32;
  emissiveCtx.shadowColor = variant === 'blue' ? 'rgba(93, 143, 255, 0.34)' : 'rgba(255, 127, 200, 0.36)';
  emissiveCtx.strokeText(String(value), 512, 540);
  emissiveCtx.fillStyle = 'rgba(255,255,255,0.28)';
  emissiveCtx.fillText(String(value), 512, 540);

  const map = new THREE.CanvasTexture(mapCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;

  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.needsUpdate = true;

  return { map, emissiveMap };
}

function readTopFaceValue(quaternion: THREE.Quaternion) {
  const up = new THREE.Vector3(0, 1, 0);
  let bestValue = 1;
  let bestDot = -Infinity;

  Object.entries(FACE_NORMALS).forEach(([value, normal]) => {
    const worldNormal = normal.clone().applyQuaternion(quaternion);
    const dot = worldNormal.dot(up);
    if (dot > bestDot) {
      bestDot = dot;
      bestValue = Number(value);
    }
  });

  return bestValue;
}

export function BigBrotherThreeDice({
  results,
  diceType,
  total,
  label,
  modifier = 0,
  highlight = 'sum',
  onComplete,
}: BigBrotherThreeDiceProps) {
  const { dice3DAutoCloseMs } = useStore();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const completeTimeoutRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const [phase, setPhase] = useState<'initializing' | 'rolling' | 'settled' | 'failed'>('initializing');
  const [resolvedResults, setResolvedResults] = useState<number[] | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const effectiveResults = useMemo(() => (results.length > 0 ? results : [total || 0]), [results, total]);
  const notation = useMemo(() => {
    const diceCount = Math.max(1, effectiveResults.length);
    const modifierPart = modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`;
    return `${diceCount}d${diceType}${modifierPart}`;
  }, [diceType, effectiveResults.length, modifier]);
  const displayValues = resolvedResults ?? effectiveResults;
  const displayHighlightedValue = highlight === 'lowest'
    ? Math.min(...displayValues)
    : highlight === 'highest'
      ? Math.max(...displayValues)
      : displayValues.reduce((sum, value) => sum + value, 0) + modifier;
  const displayTotal = highlight === 'sum'
    ? displayValues.reduce((sum, value) => sum + value, 0) + modifier
    : displayHighlightedValue;

  useEffect(() => {
    if (!mountRef.current) return;
    setResolvedResults(null);
    let cancelled = false;
    let animationFrame = 0;
    let resizeObserver: ResizeObserver | null = null;
    const disposableResources: Array<{ dispose: () => void }> = [];
    const heartSprites: Array<{ sprite: THREE.Sprite; material: THREE.SpriteMaterial; velocity: THREE.Vector3; life: number }> = [];
    const pairHeartTimes = new Map<string, number>();

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 12.4, 6.8);
    camera.lookAt(0, 0.35, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000, 0);
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(mountRef.current.clientWidth, mountRef.current.clientHeight),
      0.52,
      0.34,
      0.7,
    );
    composer.addPass(bloomPass);

    scene.add(new THREE.AmbientLight(0xfaf6ff, 0.72));

    const blueLight = new THREE.DirectionalLight(0x93b8ff, 1.55);
    blueLight.position.set(3.6, 10.8, 3.2);
    blueLight.castShadow = true;
    blueLight.shadow.mapSize.set(1024, 1024);
    scene.add(blueLight);

    const pinkLight = new THREE.PointLight(0xff8fd0, 6.4, 18, 2);
    pinkLight.position.set(-2.4, 3.2, 1.7);
    scene.add(pinkLight);

    const trayGeometry = new THREE.PlaneGeometry(18, 18);
    const trayMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#120d24'),
      emissive: new THREE.Color('#1c1534'),
      emissiveIntensity: 0.2,
      roughness: 0.96,
      metalness: 0.05,
    });
    const trayMesh = new THREE.Mesh(trayGeometry, trayMaterial);
    trayMesh.rotation.x = -Math.PI / 2;
    trayMesh.position.set(0, -0.52, 0);
    trayMesh.receiveShadow = true;
    scene.add(trayMesh);

    const world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -24, 0),
      allowSleep: true,
    });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.defaultContactMaterial.friction = 0.36;
    world.defaultContactMaterial.restitution = 0.48;

    const floorBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(floorBody);

    const wallDistance = 7.4;
    const wallData = [
      { pos: new CANNON.Vec3(0, 0, -wallDistance), rot: [0, 0, 0] },
      { pos: new CANNON.Vec3(0, 0, wallDistance), rot: [0, Math.PI, 0] },
      { pos: new CANNON.Vec3(-wallDistance, 0, 0), rot: [0, Math.PI / 2, 0] },
      { pos: new CANNON.Vec3(wallDistance, 0, 0), rot: [0, -Math.PI / 2, 0] },
    ];
    wallData.forEach(({ pos, rot }) => {
      const wall = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
      wall.position.copy(pos);
      wall.quaternion.setFromEuler(rot[0], rot[1], rot[2]);
      world.addBody(wall);
    });

    const heartTexture = createHeartTexture();
    disposableResources.push(heartTexture);

    const spawnHeartBurst = (position: THREE.Vector3, count: number) => {
      for (let i = 0; i < count; i += 1) {
        const material = new THREE.SpriteMaterial({
          map: heartTexture,
          transparent: true,
          depthWrite: false,
          opacity: 0.92,
          blending: THREE.AdditiveBlending,
        });
        const sprite = new THREE.Sprite(material);
        const scale = 0.28 + Math.random() * 0.14;
        sprite.scale.set(scale, scale, scale);
        sprite.position.copy(position).add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.55,
          0.28 + Math.random() * 0.18,
          (Math.random() - 0.5) * 0.36,
        ));
        scene.add(sprite);
        heartSprites.push({
          sprite,
          material,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.34,
            0.68 + Math.random() * 0.24,
            (Math.random() - 0.5) * 0.2,
          ),
          life: 0.95 + Math.random() * 0.25,
        });
      }
    };

    const dice = effectiveResults.map((_, index) => {
      const variant: DiceVariant = index % 2 === 0 ? 'blue' : 'pink';
      const style = VARIANT_STYLE[variant];
      const geometry = new THREE.BoxGeometry(style.size, style.size, style.size);
      const materials = FACE_ORDER.map((value) => {
        const { map, emissiveMap } = createFaceTextures(value, variant);
        disposableResources.push(map, emissiveMap);
        return new THREE.MeshPhysicalMaterial({
          map,
          emissiveMap,
          emissive: new THREE.Color(style.emissive),
          emissiveIntensity: variant === 'blue' ? 0.2 : 0.22,
          roughness: variant === 'blue' ? 0.32 : 0.28,
          metalness: 0.12,
          clearcoat: 0.72,
          clearcoatRoughness: 0.16,
        });
      });
      const mesh = new THREE.Mesh(geometry, materials);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.position.set((index - (effectiveResults.length - 1) / 2) * 1.7, 2.25 + index * 0.18, index % 2 === 0 ? -0.15 : 0.2);
      scene.add(mesh);

      const half = style.size / 2;
      const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(half, half, half)),
        position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
        material: new CANNON.Material(`bigbrother-${variant}`),
        allowSleep: true,
        sleepSpeedLimit: 0.16,
        sleepTimeLimit: 0.5,
      });
      (body as any).__bbVariant = variant;
      (body as any).__bbIndex = index;
      body.velocity.set((Math.random() - 0.5) * 3.4, 0, (Math.random() - 0.5) * 3.0);
      body.angularVelocity.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
      );
      body.addEventListener('collide', (event: any) => {
        const other = event.body as CANNON.Body & { __bbVariant?: DiceVariant; __bbIndex?: number };
        if (!other || other.__bbVariant === variant || typeof other.__bbIndex !== 'number') return;
        const now = performance.now() / 1000;
        const pairKey = [index, other.__bbIndex].sort((a, b) => a - b).join(':');
        const last = pairHeartTimes.get(pairKey) || 0;
        if (now - last < 0.16) return;
        pairHeartTimes.set(pairKey, now);
        const midpoint = new THREE.Vector3(
          (body.position.x + other.position.x) / 2,
          (body.position.y + other.position.y) / 2,
          (body.position.z + other.position.z) / 2,
        );
        const impact = body.velocity.vsub(other.velocity).length();
        const burstCount = Math.max(3, Math.min(6, 2 + Math.round(impact / 2.2)));
        spawnHeartBurst(midpoint, burstCount);
      });
      world.addBody(body);

      return {
        mesh,
        body,
        materials,
        variant,
        settled: false,
        resolvedValue: null as number | null,
      };
    });

    const resize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    };

    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mountRef.current);

    const finish = (finalResults: number[]) => {
      if (completeTimeoutRef.current) {
        window.clearTimeout(completeTimeoutRef.current);
      }
      completeTimeoutRef.current = window.setTimeout(() => {
        onCompleteRef.current(finalResults);
      }, dice3DAutoCloseMs);
    };

    setPhase('rolling');
    const clock = new THREE.Clock();
    const minRollTime = 1.2;
    const maxRollTime = 4.2;
    let finished = false;

    const animate = () => {
      if (cancelled) return;
      animationFrame = window.requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.033);
      const elapsed = clock.elapsedTime;
      world.step(1 / 60, delta, 3);

      let allSettled = true;
      dice.forEach((die) => {
        die.materials.forEach((material, faceIndex) => {
          material.emissiveIntensity = (die.variant === 'blue' ? 0.17 : 0.19) + Math.sin(elapsed * 1.5 + faceIndex * 0.7) * 0.03;
        });

        const bodyQuat = new THREE.Quaternion(
          die.body.quaternion.x,
          die.body.quaternion.y,
          die.body.quaternion.z,
          die.body.quaternion.w,
        );
        const bodyPos = new THREE.Vector3(die.body.position.x, die.body.position.y, die.body.position.z);

        die.mesh.position.copy(bodyPos);
        die.mesh.quaternion.copy(bodyQuat);

        if (!die.settled) {
          const speed = die.body.velocity.length();
          const spin = die.body.angularVelocity.length();
          if (elapsed > minRollTime && (die.body.sleepState === CANNON.Body.SLEEPING || (speed < 0.18 && spin < 0.2) || elapsed > maxRollTime)) {
            die.body.sleep();
            die.body.velocity.setZero();
            die.body.angularVelocity.setZero();
            die.settled = true;
            die.resolvedValue = readTopFaceValue(die.mesh.quaternion);
            die.mesh.quaternion.copy(getSnappedRestingQuaternion(die.mesh.quaternion, die.resolvedValue));
          } else {
            allSettled = false;
          }
        }
      });

      for (let i = heartSprites.length - 1; i >= 0; i -= 1) {
        const heart = heartSprites[i];
        heart.life -= delta * 1.05;
        heart.sprite.position.addScaledVector(heart.velocity, delta);
        heart.sprite.scale.multiplyScalar(1 + delta * 0.28);
        heart.material.opacity = Math.max(0, heart.life * 0.9);
        if (heart.life <= 0) {
          scene.remove(heart.sprite);
          heart.material.dispose();
          heartSprites.splice(i, 1);
        }
      }

      pinkLight.intensity = 5.5 + Math.sin(elapsed * 2.0) * 0.35;
      composer.render();

      if (!finished && allSettled) {
        finished = true;
        const finalResults = dice.map((die) => die.resolvedValue ?? readTopFaceValue(die.mesh.quaternion));
        setResolvedResults(finalResults);
        setPhase('settled');
        finish(finalResults);
      }
    };

    animate();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      if (completeTimeoutRef.current) {
        window.clearTimeout(completeTimeoutRef.current);
      }
      resizeObserver?.disconnect();
      heartSprites.forEach((heart) => {
        scene.remove(heart.sprite);
        heart.material.dispose();
      });
      dice.forEach((die) => {
        world.removeBody(die.body);
        die.materials.forEach((material) => material.dispose());
        die.mesh.geometry.dispose();
      });
      trayGeometry.dispose();
      trayMaterial.dispose();
      disposableResources.forEach((resource) => resource.dispose());
      composer.dispose();
      renderer.dispose();
      mountRef.current?.replaceChildren();
    };
  }, [dice3DAutoCloseMs, effectiveResults, modifier, notation]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/44 backdrop-blur-md overflow-hidden pointer-events-none">
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

        <div className="relative h-[40rem] w-full overflow-hidden rounded-[2rem] border border-slate-300/10 bg-black shadow-[0_0_90px_rgba(0,0,0,0.82)]">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_26%_24%,rgba(93,143,255,0.24),transparent_24%),radial-gradient(circle_at_74%_72%,rgba(255,127,200,0.22),transparent_24%),linear-gradient(180deg,rgba(14,12,30,0.38),rgba(6,4,16,0.9))]" />
          <div className="absolute inset-[10px] z-0 rounded-[1.6rem] border border-white/5 bg-[linear-gradient(180deg,rgba(22,16,42,0.4),rgba(10,8,22,0.72))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]" />
          <div className="absolute inset-x-6 top-5 z-10 flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-zinc-500">
            <span>Big Brother Tray</span>
            <span>{notation}</span>
          </div>
          <div ref={mountRef} className="relative z-20 h-full w-full" />

          {phase === 'initializing' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-300">
              Preparing Big Brother...
            </div>
          )}

          {phase === 'failed' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-300">
              Big Brother renderer unavailable.
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
                  <span className="font-bold text-pink-200">
                    {displayHighlightedValue}
                  </span>
                </div>
              )}
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm text-zinc-300">
                {displayValues.map((value, index) => (
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
