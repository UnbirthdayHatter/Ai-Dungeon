const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  process.cwd(),
  'node_modules',
  '@3d-dice',
  'dice-box',
  'dist',
  'world.onscreen.js',
);

const animatedHelper = `  registerAnimatedEmissive(e, t, i) {
    if (e !== "tester1" || !t.length)
      return;
    const r = (i == null ? void 0 : i.emissivePulse) || {}, s = Array.isArray(i == null ? void 0 : i.emissiveColor) ? i.emissiveColor : [1, 0.72, 0.35];
    t.forEach((n, a) => {
      n && (n.metadata = {
        ...(n.metadata || {}),
        tester1AnimatedEmissive: {
          baseLevel: r.base ?? i.emissiveLevel ?? 1.7,
          variation: r.variation ?? 0.48,
          frequency: r.frequency ?? 2.4,
          flicker: r.flicker ?? 0.14,
          phase: r.phaseOffset ? r.phaseOffset * a : a * 0.65,
          glowColor: s
        }
      }, this.animatedEmissiveMaterials.includes(n) || this.animatedEmissiveMaterials.push(n));
    }), this.animatedEmissiveObserver || (this.animatedEmissiveObserver = this.scene.onBeforeRenderObservable.add(() => {
      const n = Math.min(this.scene.getEngine().getDeltaTime() * 1e-3, 0.05);
      this.animatedEmissiveTime += n, this.animatedEmissiveMaterials = this.animatedEmissiveMaterials.filter((a) => {
        var o;
        return a && !((o = a.isDisposed) != null && o.call(a));
      }), this.animatedEmissiveMaterials.forEach((a) => {
        const o = a.metadata && a.metadata.tester1AnimatedEmissive;
        if (!o)
          return;
        const l = o.baseLevel + Math.sin(this.animatedEmissiveTime * o.frequency + o.phase) * o.variation + Math.sin(this.animatedEmissiveTime * (o.frequency * 2.13) + o.phase * 1.7) * o.flicker, d = Math.max(0.5, l), [h, c, p] = o.glowColor;
        a.emissiveTexture && (a.emissiveTexture.level = d), a.emissiveColor = new he(h * d, c * d, p * d);
      });
    }));
  }
`;

const tester1VisualHelper = `function ha(f, e) {
  var t, i, r;
  if (!f.mesh || f.config.theme !== "tester1" || !f.mesh.material || f.mesh.metadata && f.mesh.metadata.tester1VisualAttached)
    return;
  const s = f.mesh, n = s.material, a = s.clone(\`\${s.name || "tester1"}_visual\`);
  if (!a)
    return;
  const o = new g(\`tester1_visual_material_\${f.id}\`, e);
  o.diffuseColor = new he(0.08, 0.045, 0.03), o.specularColor = new he(0.22, 0.12, 0.05), o.specularPower = 96, o.roughness = 0.2, o.bumpTexture = (t = n.bumpTexture) != null ? t : null, o.specularTexture = (i = n.specularTexture) != null ? i : null, o.emissiveTexture = (r = n.emissiveTexture) != null ? r : null, o.emissiveColor = new he(1.05, 0.52, 0.12), o.useEmissiveAsIllumination = !0, o.alpha = 1, a.material = o, a.parent = s, a.position.set(0, 0, 0), a.rotation.set(0, 0, 0), a.rotationQuaternion = new Ie(0, 0, 0, 1), a.scaling = new M(1.028, 1.028, 1.028), a.isPickable = !1, a.receiveShadows = !1, a.alwaysSelectAsActiveMesh = !0, a.metadata = {
    ...(a.metadata || {}),
    tester1VisualShell: !0
  }, s.metadata = {
    ...(s.metadata || {}),
    tester1VisualAttached: !0
  };
  let l = 0;
  const d = e.onBeforeRenderObservable.add(() => {
    if (a.isDisposed() || o.isDisposed()) {
      e.onBeforeRenderObservable.remove(d);
      return;
    }
    const h = Math.min(e.getEngine().getDeltaTime() * 1e-3, 0.05);
    l += h;
    const c = 0.82 + Math.sin(l * 1.74) * 0.08 + Math.sin(l * 3.41 + 0.8) * 0.04, p = 0.96 + Math.sin(l * 1.13 + 1.7) * 0.03, E = Math.sin(l * 0.92 + 0.4) * 0.012;
    o.emissiveTexture && (o.emissiveTexture.level = 1.24 + c * 0.34), o.emissiveColor = new he(1.05 * (1 + E), 0.5 * p, 0.11), a.scaling.set(1.028 + E, 1.028 + E, 1.028 + E), a.rotation.y = Math.sin(l * 0.8) * 0.03, a.rotation.x = Math.sin(l * 1.1 + 0.6) * 0.018;
  });
  a.onDisposeObservable.add(() => {
    e.onBeforeRenderObservable.remove(d);
  });
}
`;

function warn(message) {
  console.warn(`[patch-dice-box-tester1] ${message}`);
}

function main() {
  if (!fs.existsSync(targetPath)) {
    warn(`Skipping: ${targetPath} not found`);
    return;
  }

  let source = fs.readFileSync(targetPath, 'utf8');

  if (source.includes('animatedEmissiveMaterials')) {
    console.log('[patch-dice-box-tester1] Patch already applied');
    return;
  }

  let patched = false;

  if (source.includes('xe(this, "themeData", {});')) {
    source = source.replace(
      'xe(this, "themeData", {});',
      `xe(this, "themeData", {});\n    xe(this, "animatedEmissiveMaterials", []);\n    xe(this, "animatedEmissiveObserver", null);\n    xe(this, "animatedEmissiveTime", 0);`,
    );
    patched = true;
  } else {
    warn('Constructor anchor not found; skipping animated emissive field injection');
  }

  if (source.includes('  async loadStandardMaterial(e) {') && !source.includes('registerAnimatedEmissive(e, t, i)')) {
    source = source.replace('  async loadStandardMaterial(e) {', `${animatedHelper}  async loadStandardMaterial(e) {`);
    patched = true;
  } else if (!source.includes('registerAnimatedEmissive(e, t, i)')) {
    warn('loadStandardMaterial anchor not found; skipping helper insertion');
  }

  source = source.replace(
    /async loadStandardMaterial\(e\)\s*\{([\s\S]*?)r\.allowShaderHotSwapping = !1;/,
    (match, body) => {
      if (match.includes('this.registerAnimatedEmissive(')) {
        return match;
      }
      patched = true;
      return `async loadStandardMaterial(e) {${body}r.allowShaderHotSwapping = !1, this.registerAnimatedEmissive(t, [r], i);`;
    },
  );

  source = source.replace(
    /async loadColorMaterial\(e\)\s*\{([\s\S]*?)n\.AddAttribute\("customColor"\);/,
    (match, body) => {
      if (match.includes('this.registerAnimatedEmissive(')) {
        return match;
      }
      patched = true;
      return `async loadColorMaterial(e) {${body}n.AddAttribute("customColor"), this.registerAnimatedEmissive(t, [r, n], i);`;
    },
  );

  if (!source.includes('this.registerAnimatedEmissive(t, [r], i);')) {
    warn('Did not patch loadStandardMaterial; Tester1 emissive animation may be unavailable');
  }
  if (!source.includes('this.registerAnimatedEmissive(t, [r, n], i);')) {
    warn('Did not patch loadColorMaterial; Tester1 emissive animation may be unavailable');
  }

  if (!source.includes('function ha(f, e) {') && source.includes('Z = new WeakMap()')) {
    source = source.replace('Z = new WeakMap()', `${tester1VisualHelper}Z = new WeakMap()`);
    patched = true;
  } else if (!source.includes('function ha(f, e) {')) {
    warn('Tester1 visual helper anchor not found; skipping visual shell injection');
  }

  source = source.replace(
    /(\}, i = new Oe\(t, C\(this, K\)\);)/,
    (match) => {
      if (match.includes('e.theme === "tester1" && ha(i, C(this, K));')) {
        return match;
      }
      patched = true;
      return `${match}\n  e.theme === "tester1" && ha(i, C(this, K));`;
    },
  );

  if (!source.includes('e.theme === "tester1" && ha(i, C(this, K));')) {
    warn('Did not patch Tester1 visual shell attach call; custom visual overlay may be unavailable');
  }

  fs.writeFileSync(targetPath, source, 'utf8');
  if (patched) {
    console.log('[patch-dice-box-tester1] Patch applied');
  } else {
    warn('No changes were applied');
  }
}

try {
  main();
} catch (error) {
  warn(error instanceof Error ? error.message : String(error));
  warn('Continuing without patch so install does not fail');
}
