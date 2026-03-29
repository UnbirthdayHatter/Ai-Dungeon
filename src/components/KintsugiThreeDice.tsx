import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { useStore } from '@/store/useStore';

interface KintsugiThreeDiceProps {
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

function loadTexture(loader: THREE.TextureLoader, url: string) {
  return new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function createFaceTextures(value: number, albedoImage: CanvasImageSource, metallicImage: CanvasImageSource) {
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

  mapCtx.clearRect(0, 0, 1024, 1024);
  mapCtx.drawImage(albedoImage, 0, 0, 1024, 1024);
  mapCtx.textAlign = 'center';
  mapCtx.textBaseline = 'middle';
  mapCtx.font = 'bold 420px Georgia';
  mapCtx.lineJoin = 'round';
  mapCtx.lineWidth = 24;
  mapCtx.strokeStyle = 'rgba(168, 116, 28, 0.95)';
  mapCtx.shadowBlur = 10;
  mapCtx.shadowColor = 'rgba(255, 222, 150, 0.2)';
  mapCtx.strokeText(String(value), 512, 534);
  mapCtx.shadowBlur = 0;
  mapCtx.fillStyle = 'rgba(43, 35, 29, 0.96)';
  mapCtx.fillText(String(value), 512, 534);

  emissiveCtx.clearRect(0, 0, 1024, 1024);
  emissiveCtx.drawImage(metallicImage, 0, 0, 1024, 1024);
  emissiveCtx.globalCompositeOperation = 'screen';
  emissiveCtx.textAlign = 'center';
  emissiveCtx.textBaseline = 'middle';
  emissiveCtx.font = 'bold 420px Georgia';
  emissiveCtx.lineJoin = 'round';
  emissiveCtx.lineWidth = 18;
  emissiveCtx.strokeStyle = 'rgba(255, 223, 146, 0.7)';
  emissiveCtx.shadowBlur = 28;
  emissiveCtx.shadowColor = 'rgba(255, 216, 128, 0.36)';
  emissiveCtx.strokeText(String(value), 512, 534);
  emissiveCtx.fillStyle = 'rgba(255, 246, 220, 0.34)';
  emissiveCtx.fillText(String(value), 512, 534);
  emissiveCtx.globalCompositeOperation = 'source-over';

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

export function KintsugiThreeDice({
  results,
  diceType,
  total,
  label,
  modifier = 0,
  highlight = 'sum',
  onComplete,
}: KintsugiThreeDiceProps) {
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
    let loadedResources: Array<{ dispose: () => void }> = [];

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
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000, 0);
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(mountRef.current.clientWidth, mountRef.current.clientHeight),
      0.36,
      0.28,
      0.76,
    );
    composer.addPass(bloomPass);

    scene.add(new THREE.AmbientLight(0xfff8ef, 0.9));

    const keyLight = new THREE.DirectionalLight(0xfff3dd, 1.5);
    keyLight.position.set(4.2, 10.8, 3.6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const goldLight = new THREE.PointLight(0xffd277, 4.8, 18, 2);
    goldLight.position.set(-2.2, 3.8, 2.0);
    scene.add(goldLight);

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

    (async () => {
      try {
        const loader = new THREE.TextureLoader();
        const [albedoTexture, aoTexture, roughnessTexture, metallicTexture, normalTexture, bumpTexture] = await Promise.all([
          loadTexture(loader, '/assets/kintsugi/albedo.png'),
          loadTexture(loader, '/assets/kintsugi/ao.png'),
          loadTexture(loader, '/assets/kintsugi/roughness.png'),
          loadTexture(loader, '/assets/kintsugi/metallic.png'),
          loadTexture(loader, '/assets/kintsugi/normal.png'),
          loadTexture(loader, '/assets/kintsugi/bump.png'),
        ]);

        if (cancelled) return;

        [albedoTexture, aoTexture, roughnessTexture, metallicTexture, normalTexture, bumpTexture].forEach((texture) => {
          texture.colorSpace = texture === albedoTexture ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
        });

        loadedResources = [albedoTexture, aoTexture, roughnessTexture, metallicTexture, normalTexture, bumpTexture];

        const albedoImage = albedoTexture.image as CanvasImageSource;
        const metallicImage = metallicTexture.image as CanvasImageSource;

        const dice = effectiveResults.map((_, index) => {
          const geometry = new THREE.BoxGeometry(1, 1, 1);
          geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array.slice(), 2));

          const materials = FACE_ORDER.map((value) => {
            const { map, emissiveMap } = createFaceTextures(value, albedoImage, metallicImage);
            loadedResources.push(map, emissiveMap);
            return new THREE.MeshPhysicalMaterial({
              map,
              aoMap: aoTexture,
              roughnessMap: roughnessTexture,
              metalnessMap: metallicTexture,
              normalMap: normalTexture,
              bumpMap: bumpTexture,
              emissiveMap,
              emissive: new THREE.Color('#d7a43a'),
              emissiveIntensity: 0.18,
              roughness: 0.74,
              metalness: 0.42,
              bumpScale: 0.06,
              normalScale: new THREE.Vector2(0.42, 0.42),
              clearcoat: 0.28,
              clearcoatRoughness: 0.38,
            });
          });

          const mesh = new THREE.Mesh(geometry, materials);
          mesh.castShadow = true;
          mesh.receiveShadow = false;
          mesh.position.set((index - (effectiveResults.length - 1) / 2) * 1.45, 2.2 + index * 0.25, 0.25 - index * 0.18);
          scene.add(mesh);

          const body = new CANNON.Body({
            mass: 1,
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
            position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
            material: new CANNON.Material('kintsugi'),
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
              material.emissiveIntensity = 0.15 + Math.sin(elapsed * 1.1 + faceIndex * 0.7) * 0.025;
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

          goldLight.intensity = 4.5 + Math.sin(elapsed * 1.15) * 0.22;
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

        return () => dice;
      } catch (error) {
        console.error('Failed to initialize Kintsugi renderer', error);
        setPhase('failed');
      }
    })();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      if (completeTimeoutRef.current) {
        window.clearTimeout(completeTimeoutRef.current);
      }
      resizeObserver?.disconnect();
      loadedResources.forEach((resource) => resource.dispose());
      composer.dispose();
      renderer.dispose();
      mountRef.current?.replaceChildren();
    };
  }, [dice3DAutoCloseMs, effectiveResults, modifier, notation]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/36 backdrop-blur-md overflow-hidden pointer-events-none">
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

        <div className="relative h-[40rem] w-full overflow-hidden rounded-[2rem] border border-amber-200/20 bg-black/85 shadow-[0_0_90px_rgba(0,0,0,0.62)]">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,247,235,0.14),transparent_34%),linear-gradient(180deg,rgba(30,21,15,0.18),rgba(8,5,4,0.9))]" />
          <div className="absolute inset-[10px] z-0 rounded-[1.6rem] border border-white/5 bg-[linear-gradient(180deg,rgba(62,50,39,0.22),rgba(18,14,11,0.76))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]" />
          <div className="pointer-events-none absolute inset-[10px] z-[22] overflow-hidden rounded-[1.6rem]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_26%,rgba(255,250,241,0.12),transparent_18%),radial-gradient(circle_at_72%_64%,rgba(216,164,58,0.16),transparent_20%),radial-gradient(circle_at_54%_42%,rgba(255,232,186,0.08),transparent_30%),linear-gradient(180deg,rgba(49,39,32,0.06),rgba(12,10,8,0.4))]" />
            <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(135deg,rgba(255,223,162,0.0)_0%,rgba(255,223,162,0.0)_46%,rgba(214,164,72,0.18)_49%,rgba(255,234,190,0.22)_50%,rgba(214,164,72,0.18)_51%,rgba(255,223,162,0.0)_54%,rgba(255,223,162,0.0)_100%)] bg-[length:220px_220px]" />
          </div>
          <div className="absolute inset-x-6 top-5 z-10 flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-zinc-500">
            <span>Kintsugi Tray</span>
            <span>{notation}</span>
          </div>
          <div ref={mountRef} className="relative z-20 h-full w-full" />

          {phase === 'initializing' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-300">
              Preparing Kintsugi...
            </div>
          )}

          {phase === 'failed' && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-300">
              Kintsugi renderer unavailable.
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
                  <span className="font-bold text-amber-200">
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
