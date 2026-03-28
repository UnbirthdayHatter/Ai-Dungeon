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
