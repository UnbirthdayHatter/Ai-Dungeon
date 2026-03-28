import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { useStore } from '@/store/useStore';

interface VoidfireThreeDiceProps {
  results: number[];
  diceType: number;
  total?: number;
  label?: string;
  modifier?: number;
  highlight?: 'highest' | 'lowest' | 'sum';
  onComplete: (resolvedResults: number[]) => void;
}

const FACE_ORDER = [3, 4, 1, 6, 2, 5];
const FACE_NORMALS: Record<number, THREE.Vector3> = {
  1: new THREE.Vector3(0, 1, 0),
  6: new THREE.Vector3(0, -1, 0),
  2: new THREE.Vector3(0, 0, 1),
  5: new THREE.Vector3(0, 0, -1),
  3: new THREE.Vector3(1, 0, 0),
  4: new THREE.Vector3(-1, 0, 0),
};

const vertexShader = `
varying vec2 vUv;
varying vec3 vNormalW;

void main() {
  vUv = uv;
  vNormalW = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform float uSeed;
uniform sampler2D uNumberMap;
uniform sampler2D uCrackMap;

varying vec2 vUv;
varying vec3 vNormalW;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.04;
    amplitude *= 0.52;
  }
  return value;
}

void main() {
  vec2 uv = vUv * 3.1 + vec2(uSeed * 2.3, uSeed * 1.1);
  float t = uTime * 0.24;
  vec2 crackUv = vUv * 0.22 + vec2(uSeed * 0.07, uSeed * 0.05);
  vec2 distortion = vec2(
    fbm(uv * 0.9 + vec2(t * 0.12, -t * 0.06)),
    fbm(uv * 0.9 + vec2(-t * 0.08, t * 0.1))
  ) - 0.5;
  float crackSample = 1.0 - texture2D(uCrackMap, fract(crackUv + distortion * 0.06)).r;
  float cracks = smoothstep(0.16, 0.52, crackSample);
  float innerCracks = smoothstep(0.24, 0.72, crackSample);
  float crackEdge = clamp(cracks - innerCracks, 0.0, 1.0);
  float hotspots = pow(crackEdge, 7.0) * (0.42 + 0.58 * fbm(uv * 3.8 + 12.0));
  float ember = smoothstep(0.962, 0.992, fbm(uv * 5.4 + 19.0));
  float starField = smoothstep(0.946, 0.989, fbm(uv * 10.6 + vec2(t * 0.08, -t * 0.05) + 37.0));
  float starFieldSmall = smoothstep(0.972, 0.997, fbm(uv * 16.0 + vec2(-t * 0.06, t * 0.04) + 58.0));
  float starTwinkle = 0.7 + 0.3 * sin(uTime * 3.6 + uSeed * 11.0 + fbm(uv * 6.5) * 6.2831);
  float pulse = 0.88
    + sin(uTime * 1.55 + uSeed * 5.6) * 0.05
    + sin(uTime * 3.2 + uSeed * 9.3) * 0.025;

  vec3 rock = vec3(0.008, 0.008, 0.011);
  rock += fbm(uv * 1.6) * 0.012;
  rock += max(dot(normalize(vNormalW), normalize(vec3(0.32, 1.0, 0.58))), 0.0) * 0.018;

  vec3 voidCore = vec3(0.0, 0.001, 0.006) * innerCracks;
  vec3 galaxyTint = vec3(0.01, 0.015, 0.05) * innerCracks * (0.46 + 0.54 * fbm(uv * 4.9 + 25.0));
  vec3 nebula = vec3(0.04, 0.08, 0.18) * innerCracks * smoothstep(0.46, 0.84, fbm(uv * 3.8 + vec2(t * 0.05, -t * 0.03) + 81.0)) * 0.22;
  vec3 starColor = vec3(1.0, 1.0, 1.08) * starField * starTwinkle * innerCracks * 1.62;
  starColor += vec3(0.62, 0.8, 1.0) * starFieldSmall * (0.62 + 0.38 * starTwinkle) * innerCracks * 1.18;
  vec3 crackEdgeColor = vec3(0.74, 0.28, 1.0) * crackEdge * 0.22;
  vec3 hotspotColor = vec3(0.92, 0.42, 1.08) * hotspots * 0.065;
  vec3 emberColor = vec3(0.5, 0.24, 0.88) * ember * 0.01;

  vec4 numberSample = texture2D(uNumberMap, vUv);
  float numberMask = numberSample.a;
  vec3 numberCore = vec3(1.42, 1.4, 1.58) * smoothstep(0.9, 1.0, numberMask);
  vec3 numberGlow = vec3(0.34, 0.16, 0.62) * smoothstep(0.42, 0.98, numberMask) * 0.075;

  vec3 color = rock + voidCore + galaxyTint + nebula + starColor + crackEdgeColor + hotspotColor + emberColor;
  color += (numberGlow + numberCore) * pulse;
  color += (crackEdgeColor + hotspotColor + starColor * 0.26) * pulse * 0.08;

  gl_FragColor = vec4(color, 1.0);
}
`;

function createNumberTexture(value: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 280px Georgia';
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(206, 158, 255, 0.68)';
  ctx.shadowBlur = 8;
  ctx.shadowColor = 'rgba(168, 85, 247, 0.24)';
  ctx.strokeText(String(value), canvas.width / 2, canvas.height / 2);
  ctx.shadowBlur = 10;
  ctx.shadowColor = 'rgba(244, 232, 255, 0.24)';
  ctx.fillStyle = 'rgba(245, 238, 255, 0.97)';
  ctx.fillText(String(value), canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function buildFaceMaterials(crackTexture: THREE.Texture) {
  return FACE_ORDER.map((value, index) => {
    const texture = createNumberTexture(value);
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSeed: { value: 0.29 + index * 0.191 },
        uNumberMap: { value: texture },
        uCrackMap: { value: crackTexture },
      },
      vertexShader,
      fragmentShader,
    });
  });
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

export function VoidfireThreeDice({
  results,
  diceType,
  total,
  label,
  modifier = 0,
  highlight = 'sum',
  onComplete,
}: VoidfireThreeDiceProps) {
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

    const scene = new THREE.Scene();
    scene.background = null;
    const crackTexture = new THREE.TextureLoader().load('/assets/voidfire-cracks.png');
    crackTexture.wrapS = THREE.RepeatWrapping;
    crackTexture.wrapT = THREE.RepeatWrapping;
    crackTexture.colorSpace = THREE.NoColorSpace;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 12.4, 6.7);
    camera.lookAt(0, 0.45, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.setClearColor(0x000000, 0);
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(mountRef.current.clientWidth, mountRef.current.clientHeight),
      0.92,
      0.42,
      0.54,
    );
    composer.addPass(bloomPass);

    const ambient = new THREE.AmbientLight(0xd8c9ff, 0.48);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xc084fc, 1.45);
    keyLight.position.set(3.6, 11.2, 4.1);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x9333ea, 7.8, 22, 2);
    rimLight.position.set(-2.6, 3.8, 1.9);
    scene.add(rimLight);

    const world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -24, 0),
      allowSleep: true,
    });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.defaultContactMaterial.friction = 0.34;
    world.defaultContactMaterial.restitution = 0.42;

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

    const dice = effectiveResults.map((_, index) => {
      const materials = buildFaceMaterials(crackTexture);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.position.set((index - (effectiveResults.length - 1) / 2) * 1.45, 2.2 + index * 0.25, 0.25 - index * 0.18);
      scene.add(mesh);

      const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
        position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
        material: new CANNON.Material('voidfire'),
        allowSleep: true,
        sleepSpeedLimit: 0.16,
        sleepTimeLimit: 0.5,
      });
      body.velocity.set((Math.random() - 0.5) * 3.2, 0, (Math.random() - 0.5) * 2.8);
      body.angularVelocity.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
      );
      world.addBody(body);

      return {
        mesh,
        body,
        materials,
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
      dice.forEach((die, index) => {
        die.materials.forEach((material, faceIndex) => {
          material.uniforms.uTime.value = elapsed;
          material.uniforms.uSeed.value = 0.29 + index * 0.23 + faceIndex * 0.11;
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
          } else {
            allSettled = false;
          }
        }
      });

      rimLight.intensity = 6.8 + Math.sin(elapsed * 1.9) * 0.65;

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
      dice.forEach((die) => {
        world.removeBody(die.body);
        die.materials.forEach((material) => {
          material.uniforms.uNumberMap.value.dispose();
          material.dispose();
        });
        die.mesh.geometry.dispose();
      });
      crackTexture.dispose();
      composer.dispose();
      renderer.dispose();
      mountRef.current?.replaceChildren();
    };
  }, [dice3DAutoCloseMs, effectiveResults, modifier, notation]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-md overflow-hidden pointer-events-none">
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

        <div className="relative h-[40rem] w-full overflow-hidden rounded-[2rem] border border-violet-400/20 bg-zinc-950/95 shadow-[0_0_80px_rgba(0,0,0,0.58)]">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.16),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(147,51,234,0.18),transparent_28%),linear-gradient(180deg,rgba(12,7,22,0.34),rgba(4,2,12,0.86))]" />
          <div className="absolute inset-[10px] z-0 rounded-[1.6rem] border border-white/5 bg-[radial-gradient(circle_at_50%_40%,rgba(180,132,255,0.09),transparent_24%),linear-gradient(180deg,rgba(16,9,30,0.18),rgba(4,2,10,0.52))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]" />
          <div className="pointer-events-none absolute inset-[10px] z-[24] overflow-hidden rounded-[1.6rem] mix-blend-screen opacity-80">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(84,28,135,0.18),transparent_30%),linear-gradient(180deg,rgba(13,7,28,0.08),rgba(4,2,10,0.32))]" />
            {Array.from({ length: 5 }).map((_, index) => (
              <motion.div
                key={`voidfire-swell-${index}`}
                className="absolute rounded-full blur-2xl"
                style={{
                  left: `${-14 + index * 22}%`,
                  top: `${14 + (index % 2) * 14}%`,
                  width: `${380 + index * 70}px`,
                  height: `${110 + (index % 3) * 22}px`,
                  background: index % 2 === 0
                    ? 'linear-gradient(90deg, rgba(168,85,247,0), rgba(168,85,247,0.22), rgba(216,180,254,0.26), rgba(168,85,247,0.18), rgba(168,85,247,0))'
                    : 'linear-gradient(90deg, rgba(91,33,182,0), rgba(91,33,182,0.18), rgba(196,181,253,0.2), rgba(91,33,182,0.14), rgba(91,33,182,0))',
                  rotate: `${-8 + index * 4}deg`,
                  opacity: 0.88,
                }}
                animate={{
                  x: [0, 36, -28, 0],
                  y: [0, 20, -14, 0],
                  opacity: [0.3, 0.72, 0.38],
                  scaleX: [0.94, 1.12, 0.98],
                  scaleY: [0.92, 1.08, 0.96],
                }}
                transition={{ duration: 6 + index * 0.6, repeat: Infinity, ease: 'easeInOut', delay: index * 0.35 }}
              />
            ))}
            {Array.from({ length: 18 }).map((_, index) => (
              <motion.div
                key={`voidfire-mote-${index}`}
                className="absolute rounded-full"
                style={{
                  left: `${4 + ((index * 13) % 90)}%`,
                  top: `${10 + ((index * 9) % 72)}%`,
                  width: `${index % 4 === 0 ? 6 : 3}px`,
                  height: `${index % 4 === 0 ? 6 : 3}px`,
                  background: index % 3 === 0 ? 'rgba(233,213,255,0.9)' : index % 3 === 1 ? 'rgba(196,181,253,0.76)' : 'rgba(168,85,247,0.68)',
                  boxShadow: index % 3 === 0
                    ? '0 0 14px rgba(233,213,255,0.28)'
                    : index % 3 === 1
                      ? '0 0 12px rgba(196,181,253,0.24)'
                      : '0 0 10px rgba(168,85,247,0.22)',
                }}
                animate={{ x: [0, 14, -6], y: [0, -22, 10], opacity: [0.08, 0.44, 0.12], scale: [0.8, 1.22, 0.86] }}
                transition={{ duration: 2.4 + (index % 4) * 0.22, repeat: Infinity, delay: index * 0.09 }}
              />
            ))}
          </div>
          <div className="absolute inset-x-6 top-5 z-10 flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-zinc-500">
            <span>Voidfire Tray</span>
            <span>{notation}</span>
          </div>
          <div ref={mountRef} className="relative z-20 h-full w-full" />

          {phase === 'initializing' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-300">
              Preparing Voidfire...
            </div>
          )}

          {phase === 'failed' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-300">
              Voidfire renderer unavailable.
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
                  <span className="font-bold text-violet-300">
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
