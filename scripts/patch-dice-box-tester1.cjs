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

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Unable to find expected ${label} patch target in ${targetPath}`);
  }
  return source.replace(search, replacement);
}

function replaceRegexOnce(source, pattern, replacement, label) {
  if (!pattern.test(source)) {
    throw new Error(`Unable to find expected ${label} patch target in ${targetPath}`);
  }
  return source.replace(pattern, replacement);
}

function main() {
  if (!fs.existsSync(targetPath)) {
    console.warn(`[patch-dice-box-tester1] Skipping: ${targetPath} not found`);
    return;
  }

  let source = fs.readFileSync(targetPath, 'utf8');

  if (source.includes('animatedEmissiveMaterials')) {
    console.log('[patch-dice-box-tester1] Patch already applied');
    return;
  }

  source = replaceRegexOnce(
    source,
    /  constructor\(e\) \{\s+xe\(this, "loadedThemes", \{\}\);\s+xe\(this, "themeData", \{\}\);\s+this\.scene = e\.scene;\s+  \}\s+  async loadStandardMaterial\(e\) \{/m,
    `  constructor(e) {
    xe(this, "loadedThemes", {});
    xe(this, "themeData", {});
    xe(this, "animatedEmissiveMaterials", []);
    xe(this, "animatedEmissiveObserver", null);
    xe(this, "animatedEmissiveTime", 0);
    this.scene = e.scene;
  }
  registerAnimatedEmissive(e, t, i) {
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
  async loadStandardMaterial(e) {`,
    'constructor/registerAnimatedEmissive block',
  );

  source = replaceRegexOnce(
    source,
    /    const \{ theme: t, material: i \} = e, r = new g\(t, this\.scene\);\s+    i\.diffuseTexture && \(r\.diffuseTexture = await this\.getTexture\("diffuse", e\)\), i\.bumpTexture && \(r\.bumpTexture = await this\.getTexture\("bump", e\)\), i\.specularTexture && \(r\.specularTexture = await this\.getTexture\("specular", e\)\), i\.emissiveTexture && \(r\.emissiveTexture = await this\.getTexture\("emissive", e\), r\.emissiveColor = new he\(1, 0\.72, 0\.35\), r\.useEmissiveAsIllumination = !0\), r\.allowShaderHotSwapping = !1;\s+  \}/m,
    `    const { theme: t, material: i } = e, r = new g(t, this.scene);
    i.diffuseTexture && (r.diffuseTexture = await this.getTexture("diffuse", e)), i.bumpTexture && (r.bumpTexture = await this.getTexture("bump", e)), i.specularTexture && (r.specularTexture = await this.getTexture("specular", e)), i.emissiveTexture && (r.emissiveTexture = await this.getTexture("emissive", e), r.emissiveColor = new he(1, 0.72, 0.35), r.useEmissiveAsIllumination = !0), r.allowShaderHotSwapping = !1, this.registerAnimatedEmissive(t, [r], i);
  }`,
    'loadStandardMaterial',
  );

  source = replaceRegexOnce(
    source,
    /    const n = r\.clone\(t \+ "_dark"\);\s+    i\.diffuseTexture && i\.diffuseTexture\.dark && \(s\.material\.diffuseTexture = e\.material\.diffuseTexture\.dark, n\.diffuseTexture = await this\.getTexture\("diffuse", s\)\), i\.emissiveTexture && i\.emissiveTexture\.dark && \(s\.material\.emissiveTexture = e\.material\.emissiveTexture\.dark, n\.emissiveTexture = await this\.getTexture\("emissive", s\), n\.emissiveColor = new he\(1, 0\.72, 0\.35\), n\.useEmissiveAsIllumination = !0\), n\.AddAttribute\("customColor"\);\s+  \}/m,
    `    const n = r.clone(t + "_dark");
    i.diffuseTexture && i.diffuseTexture.dark && (s.material.diffuseTexture = e.material.diffuseTexture.dark, n.diffuseTexture = await this.getTexture("diffuse", s)), i.emissiveTexture && i.emissiveTexture.dark && (s.material.emissiveTexture = e.material.emissiveTexture.dark, n.emissiveTexture = await this.getTexture("emissive", s), n.emissiveColor = new he(1, 0.72, 0.35), n.useEmissiveAsIllumination = !0), n.AddAttribute("customColor"), this.registerAnimatedEmissive(t, [r, n], i);
  }`,
    'loadColorMaterial',
  );

  fs.writeFileSync(targetPath, source, 'utf8');
  console.log('[patch-dice-box-tester1] Applied patch successfully');
}

main();
