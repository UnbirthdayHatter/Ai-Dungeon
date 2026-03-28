import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { useStore } from '@/store/useStore';

interface Tester1ThreeDiceProps {
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
varying vec3 vPos;

void main() {
  vUv = uv;
  vPos = position;
  vNormalW = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform float uSeed;
uniform sampler2D uNumberMap;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPos;

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
    p *= 2.03;
    amplitude *= 0.52;
  }
  return value;
}

void main() {
  vec2 uv = vUv * 3.2 + vec2(uSeed * 2.7, uSeed * 1.3);
  float t = uTime * 0.22;
  float fieldA = fbm(uv + vec2(t * 0.4, -t * 0.2));
  float fieldB = fbm(uv * 1.7 - vec2(t * 0.17, -t * 0.31));
  float crackField = abs(fieldA - 0.48) + abs(fieldB - 0.52) * 0.72;
  float cracks = 1.0 - smoothstep(0.03, 0.07, crackField);
  float hotspots = pow(cracks, 6.0) * (0.55 + 0.45 * fbm(uv * 3.4 + 10.0));
  float ember = smoothstep(0.94, 0.985, fbm(uv * 5.5 + 20.0));
  float pulse = 0.88 + sin(uTime * 1.8 + uSeed * 5.0) * 0.06 + sin(uTime * 3.7 + uSeed * 9.0) * 0.03;

  vec3 rock = vec3(0.018, 0.01, 0.009);
  rock += fbm(uv * 1.6) * 0.028;
  rock += max(dot(normalize(vNormalW), normalize(vec3(0.4, 1.0, 0.6))), 0.0) * 0.03;

  vec3 crackColor = vec3(1.0, 0.38, 0.06) * cracks * 0.34;
  vec3 hotspotColor = vec3(1.55, 0.92, 0.34) * hotspots * 0.28;
  vec3 emberColor = vec3(1.0, 0.55, 0.1) * ember * 0.04;

  vec4 numberSample = texture2D(uNumberMap, vUv);
  float numberMask = numberSample.a;
  vec3 numberCore = vec3(1.95, 1.72, 1.34) * smoothstep(0.78, 1.0, numberMask);
  vec3 numberGlow = vec3(1.15, 0.48, 0.1) * smoothstep(0.12, 0.96, numberMask) * 0.52;

  vec3 color = rock + crackColor + hotspotColor + emberColor;
  color += (numberGlow + numberCore) * pulse;
  color += (crackColor + hotspotColor) * pulse * 0.28;

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
  ctx.lineWidth = 22;
  ctx.strokeStyle = 'rgba(255, 120, 24, 1)';
  ctx.shadowBlur = 34;
  ctx.shadowColor = 'rgba(255, 92, 12, 0.92)';
  ctx.strokeText(String(value), canvas.width / 2, canvas.height / 2);
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(255, 214, 144, 0.88)';
  ctx.shadowBlur = 96;
  ctx.shadowColor = 'rgba(255, 214, 136, 0.95)';
  ctx.strokeText(String(value), canvas.width / 2, canvas.height / 2);
  ctx.shadowBlur = 132;
  ctx.shadowColor = 'rgba(255, 235, 180, 0.98)';
  ctx.fillStyle = 'rgba(255, 250, 230, 1)';
  ctx.fillText(String(value), canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function buildFaceMaterials() {
  return FACE_ORDER.map((value, index) => {
    const texture = createNumberTexture(value);
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSeed: { value: 0.41 + index * 0.173 },
        uNumberMap: { value: texture },
      },
      vertexShader,
      fragmentShader,
    });
  });
}

function makeTargetQuaternion(value: number) {
  const from = FACE_NORMALS[value].clone().normalize();
  const to = new THREE.Vector3(0, 1, 0);
  return new THREE.Quaternion().setFromUnitVectors(from, to);
}

export function Tester1ThreeDice({
  results,
  diceType,
  total,
  label,
  modifier = 0,
  highlight = 'sum',
  onComplete,
}: Tester1ThreeDiceProps) {
  const { dice3DAutoCloseMs } = useStore();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const completeTimeoutRef = useRef<number | null>(null);
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
    if (!mountRef.current) return;
    let cancelled = false;
    let animationFrame = 0;
    let resizeObserver: ResizeObserver | null = null;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 12.6, 6.6);
    camera.lookAt(0, 0.45, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(mountRef.current.clientWidth, mountRef.current.clientHeight),
      1.18,
      0.52,
      0.66,
    );
    composer.addPass(bloomPass);

    const ambient = new THREE.AmbientLight(0xffd7a8, 0.62);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffc27a, 1.7);
    keyLight.position.set(3.2, 11.5, 3.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xff6a1f, 7.4, 20, 2);
    rimLight.position.set(-2.4, 3.8, 1.8);
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

    const dice = effectiveResults.map((value, index) => {
      const materials = buildFaceMaterials();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.position.set((index - (effectiveResults.length - 1) / 2) * 1.45, 2.2 + index * 0.25, 0.25 - index * 0.18);
      scene.add(mesh);

      const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
        position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
        material: new CANNON.Material('tester1'),
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
        value,
        mesh,
        body,
        materials,
        snapping: false,
        snapProgress: 0,
        snapFrom: new THREE.Quaternion(),
        snapTo: makeTargetQuaternion(value),
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

    const finish = () => {
      if (completeTimeoutRef.current) {
        window.clearTimeout(completeTimeoutRef.current);
      }
      completeTimeoutRef.current = window.setTimeout(() => {
        onCompleteRef.current(effectiveResults);
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
          material.uniforms.uSeed.value = 0.37 + index * 0.27 + faceIndex * 0.11;
        });

        const bodyQuat = new THREE.Quaternion(
          die.body.quaternion.x,
          die.body.quaternion.y,
          die.body.quaternion.z,
          die.body.quaternion.w,
        );
        const bodyPos = new THREE.Vector3(die.body.position.x, die.body.position.y, die.body.position.z);

        if (!die.snapping) {
          die.mesh.position.copy(bodyPos);
          die.mesh.quaternion.copy(bodyQuat);
          const speed = die.body.velocity.length();
          const spin = die.body.angularVelocity.length();
          if (elapsed > minRollTime && (die.body.sleepState === CANNON.Body.SLEEPING || (speed < 0.18 && spin < 0.2) || elapsed > maxRollTime)) {
            die.snapping = true;
            die.body.sleep();
            die.body.velocity.setZero();
            die.body.angularVelocity.setZero();
            die.snapFrom.copy(die.mesh.quaternion);
          } else {
            allSettled = false;
          }
        }

        if (die.snapping) {
          die.snapProgress = Math.min(1, die.snapProgress + delta * 2.6);
          die.mesh.position.copy(bodyPos);
          die.mesh.quaternion.slerpQuaternions(die.snapFrom, die.snapTo, die.snapProgress);
          if (die.snapProgress < 1) {
            allSettled = false;
          }
        }
      });

      rimLight.intensity = 6.3 + Math.sin(elapsed * 2.1) * 0.7;

      composer.render();

      if (!finished && allSettled) {
        finished = true;
        setPhase('settled');
        finish();
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
      composer.dispose();
      renderer.dispose();
      mountRef.current?.replaceChildren();
    };
  }, [dice3DAutoCloseMs, effectiveResults, modifier, notation]);

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

        <div className="relative h-[40rem] w-full overflow-hidden rounded-[2rem] border border-orange-400/20 bg-zinc-950/95 shadow-[0_0_80px_rgba(0,0,0,0.55)]">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,153,76,0.16),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(249,115,22,0.14),transparent_28%),linear-gradient(180deg,rgba(24,10,7,0.32),rgba(8,4,4,0.82))]" />
          <div className="absolute inset-[10px] z-0 rounded-[1.6rem] border border-white/5 bg-[radial-gradient(circle_at_50%_35%,rgba(255,175,95,0.06),transparent_26%),linear-gradient(180deg,rgba(20,9,7,0.18),rgba(6,3,3,0.45))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]" />
          <div className="absolute inset-x-6 top-5 z-10 flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-zinc-500">
            <span>Tester1 Tray</span>
            <span>{notation}</span>
          </div>
          <div ref={mountRef} className="relative z-20 h-full w-full" />

          {phase === 'initializing' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-300">
              Preparing Tester1...
            </div>
          )}

          {phase === 'failed' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-300">
              Tester1 renderer unavailable.
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
                  <span className="font-bold text-orange-300">
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
