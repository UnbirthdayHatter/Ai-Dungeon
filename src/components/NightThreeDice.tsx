import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { useStore } from '@/store/useStore';

interface NightThreeDiceProps {
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
varying vec3 vViewDir;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPosition.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform float uSeed;
uniform sampler2D uNumberMap;
uniform sampler2D uStarMap;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;

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
  float t = uTime * 0.18;
  vec2 starUv = fract(vUv * 1.18 + vec2(uSeed * 0.07 + t * 0.01, uSeed * 0.05 - t * 0.008));
  vec3 starSample = texture2D(uStarMap, starUv).rgb;
  float starLuma = max(max(starSample.r, starSample.g), starSample.b);
  float twinkle = 0.92 + 0.08 * sin(uTime * 2.6 + uSeed * 7.0 + fbm(vUv * 8.0 + uSeed * 3.0) * 6.2831);
  float fresnel = pow(1.0 - max(dot(normalize(vNormalW), normalize(vViewDir)), 0.0), 2.2);

  vec3 body = vec3(0.004, 0.006, 0.012);
  vec3 spaceField = starSample * twinkle;
  spaceField += vec3(0.012, 0.018, 0.03) * smoothstep(0.02, 0.14, starLuma);
  spaceField += vec3(0.02, 0.03, 0.05) * fresnel * 0.16;

  vec4 numberSample = texture2D(uNumberMap, vUv);
  float numberMask = numberSample.a;
  vec3 numberCore = vec3(1.02, 1.05, 1.1) * smoothstep(0.92, 1.0, numberMask);
  vec3 numberGlow = vec3(0.26, 0.36, 0.58) * smoothstep(0.3, 0.95, numberMask) * 0.06;

  vec3 color = body + spaceField;
  color += numberCore;
  color += numberGlow * (0.94 + sin(uTime * 1.5 + uSeed * 4.0) * 0.04);

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
  ctx.font = 'bold 276px Georgia';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(160, 196, 255, 0.16)';
  ctx.shadowBlur = 4;
  ctx.shadowColor = 'rgba(160, 196, 255, 0.08)';
  ctx.strokeText(String(value), canvas.width / 2, canvas.height / 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(245, 248, 255, 0.98)';
  ctx.fillText(String(value), canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function buildFaceMaterials(starTexture: THREE.Texture) {
  return FACE_ORDER.map((value, index) => {
    const texture = createNumberTexture(value);
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSeed: { value: 0.29 + index * 0.191 },
        uNumberMap: { value: texture },
        uStarMap: { value: starTexture },
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

export function NightThreeDice({
  results,
  diceType,
  total,
  label,
  modifier = 0,
  highlight = 'sum',
  onComplete,
}: NightThreeDiceProps) {
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
    const starTextures = Array.from({ length: 8 }, (_, index) => {
      const texture = new THREE.TextureLoader().load(`/assets/voidfire-stars/frame-0${index}.png`);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    });

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 12.6, 6.6);
    camera.lookAt(0, 0.45, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.setClearColor(0x000000, 0);
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(mountRef.current.clientWidth, mountRef.current.clientHeight),
      0.7,
      0.34,
      0.58,
    );
    composer.addPass(bloomPass);

    scene.add(new THREE.AmbientLight(0xdbe7ff, 0.42));

    const keyLight = new THREE.DirectionalLight(0x9bbcff, 1.25);
    keyLight.position.set(3.8, 11.4, 3.6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x6b8cff, 6.8, 20, 2);
    rimLight.position.set(-2.3, 3.7, 2);
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
      const materials = buildFaceMaterials(starTextures[0]);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.position.set((index - (effectiveResults.length - 1) / 2) * 1.45, 2.2 + index * 0.25, 0.25 - index * 0.18);
      scene.add(mesh);

      const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
        position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
        material: new CANNON.Material('night'),
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
          material.uniforms.uStarMap.value = starTextures[Math.floor(elapsed * 10) % starTextures.length];
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

      rimLight.intensity = 6.1 + Math.sin(elapsed * 1.9) * 0.48;
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
      starTextures.forEach((texture) => texture.dispose());
      composer.dispose();
      renderer.dispose();
      mountRef.current?.replaceChildren();
    };
  }, [dice3DAutoCloseMs, effectiveResults, modifier, notation]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/46 backdrop-blur-md overflow-hidden pointer-events-none">
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

        <div className="relative h-[40rem] w-full overflow-hidden rounded-[2rem] border border-slate-300/10 bg-black shadow-[0_0_90px_rgba(0,0,0,0.8)]">
          <div className="absolute inset-0 z-0 bg-black" />
          <div className="absolute inset-[10px] z-0 rounded-[1.6rem] border border-white/5 bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]" />
          <div className="pointer-events-none absolute inset-[10px] z-[22] overflow-hidden rounded-[1.6rem] opacity-24">
            <img src="/assets/voidfire-stars/frame-00.png" alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.18),rgba(0,0,0,0.52)_66%,rgba(0,0,0,0.82))]" />
          </div>
          <div className="absolute inset-x-6 top-5 z-10 flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-zinc-500">
            <span>Night Tray</span>
            <span>{notation}</span>
          </div>
          <div ref={mountRef} className="relative z-20 h-full w-full" />

          {phase === 'initializing' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-300">
              Preparing Night...
            </div>
          )}

          {phase === 'failed' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-300">
              Night renderer unavailable.
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
                  <span className="font-bold text-slate-200">
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
