# Ardent & Vale — Sketch → Structure → Interior

A scroll-driven, real-time WebGL film for a fictional luxury architecture / interior studio.
One room is **drawn**, **built** and **furnished + lit** while you scroll — forwards or backwards.

**Stack:** Three.js (r186) · React 19 · JavaScript · Tailwind CSS v4 · Vite

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build -> dist/
npm run preview    # serve dist/ at http://localhost:4173
```

Useful URL flags

| flag | effect |
| --- | --- |
| `?quality=high\|medium\|low` | pin a quality tier and disable the adaptive downgrade |
| `?debug` | exposes `window.__engine` (read `engine.renderer.info` in the console) |

Models ship as **compressed GLB files** in `public/models/` (≈ 0.5 MB total) and textures are generated
procedurally. If a GLB is missing or broken, that piece is built procedurally instead, so the page always
works (see *Asset pipeline*). Requires WebGL2.

---

## Project structure (one component per section)

```
src/
├─ App.jsx                      page shell: 650vh scroll track, sticky 100svh stage
├─ components/                  ── React sections ──
│  ├─ Loader.jsx                preloader (real progress from the engine)
│  ├─ Navbar.jsx                top bar
│  ├─ Experience.jsx            WebGL stage; owns Engine lifecycle
│  ├─ StageSketch.jsx           01 — Concept copy
│  ├─ StageFormation.jsx        02 — Structure copy
│  ├─ StageInterior.jsx         03 — Interior copy + CTA
│  ├─ ProgressRail.jsx          stage rail + progress line (click to jump)
│  ├─ ScrollHint.jsx            "scroll to build" cue
│  ├─ Scrim.jsx                 cinematic shadow so copy stays legible on the lit render
│  ├─ QualityToggle.jsx         auto / high / medium / low
│  └─ Contact.jsx               closing section after the film
├─ lib/
│  ├─ ScrollStore.js            damped scroll progress, shared by canvas + DOM
│  └─ useProgress.js            subscribe overlays to progress without re-rendering
└─ three/                       ── Three.js ──
   ├─ Engine.js                 renderer, composer, loop, tiers, resize, dispose
   ├─ CameraRig.js              spline camera + dolly-zoom + pointer parallax
   ├─ Lighting.js               sun / hemi / lamp / spot, all driven by progress
   ├─ Piece.js                  solid meshes + blueprint lines + reveal timing
   ├─ materials.js              reveal/clay shader patch, sketch line shader, material library
   ├─ textures.js               procedural tileable PBR textures
   ├─ assets/                   GLB pipeline: manifest · AssetLoader (Draco/Meshopt/KTX2) · modelPiece
   ├─ ../dev/exportGLB.js       dev-only (?debug): export a procedural piece to .glb
   ├─ quality.js                tiers + adaptive quality
   └─ builders/                 shell · windowView · seating · tables · accents · helpers
```

---

## Technical explanation

### Three.js architecture
`Engine` owns the `WebGLRenderer`, `Scene`, `PerspectiveCamera`, an `EffectComposer`
(`RenderPass → UnrealBloomPass → OutputPass`) and the main loop. The room is a list of **`Piece`**s
(floor, walls, window, sofa, table, lamp …). Each `Piece` wraps a group of PBR meshes and knows two
scroll windows: when its sketch is drawn and when its solid is revealed. Builders in `three/builders/`
are plain functions `(materialLibrary) → Piece`, so adding furniture never touches the engine.
The Engine is created/disposed by a React effect; `dispose()` releases geometries, materials,
textures, render targets, the PMREM environment, listeners and the GL context.

React never renders per frame. A single `ScrollStore` holds the **damped** scroll progress; the engine
ticks it each frame and overlays subscribe via `useProgress`, mutating DOM `opacity/transform`
imperatively. Canvas and copy are therefore always on the same value.

### Animation approach
Everything is a **pure function of scroll progress `p`** (no timelines to rewind), so forward and
reverse scrubbing are identical and seamless.

| p | what happens |
| --- | --- |
| intro (auto, 5.5 s) | a pen sweeps along each piece and draws its blueprint lines; grid expands |
| 0.05 – 0.50 | solids dissolve in along each piece's axis with a glowing seam; lines fade out behind it; sketch wobble 1 → 0 |
| 0.28 – 0.60 | everything exists as a white **clay model**; soft light + shadows appear; camera descends |
| 0.60 – 0.86 | `uPBR` ramps 0 → 1: clay cross-fades to real colour, roughness, metalness |
| 0.70 – 0.96 | practicals, cove, pendants and sun come up; bloom, exposure and scrim follow |
| 0.55 – 1.00 | dolly-zoom (34° → 27°) into the hero composition; pointer parallax grows |

The camera follows two Catmull-Rom splines (position + look-at) sampled by `p`. Native scrolling is kept
(touch, keyboard, a11y) and smoothed with frame-rate-independent exponential damping.

### Custom shader techniques
* **Reveal / dissolve (`makeRevealable`)** — splices GLSL into `MeshStandard/PhysicalMaterial` through
  `onBeforeCompile`, so PBR lighting, shadows, IBL and tone-mapping are untouched. A world-space sweep
  along a per-piece axis + 3D value noise produces a ragged front; fragments behind it are `discard`ed
  and the seam gets an emissive glow (picked up by bloom).
* **Clay → PBR transition** — shared `uPBR` blends albedo to neutral clay and roughness/metalness to
  matte/dielectric, giving a true *material transition* rather than a cross-fade of two scenes.
* **Sketch material** — `LineSegments` of `EdgesGeometry` with a pen-sweep draw mask, a glowing pen
  tip, quantised-world-position vertex wobble ("hand drawn" → precise), dashed construction lines,
  a depth nudge to avoid z-fighting, and **pointer-reactive ink** (lines near the cursor turn terracotta).
* **Blueprint grid** — analytic anti-aliased (`fwidth`) grid in one full-ground quad, radially drawn in.

### Asset pipeline
**Hybrid:** architecture (floor, walls, ceiling, glazing, feature wall, rug, lights) is procedural; the hero
furniture — **sofa, armchair, coffee table, floor lamp** — is loaded from **GLB** files in `public/models/`.
Textures for procedural pieces are seamless periodic-noise canvases (`textures.js`).

```
Blender / any DCC ──► .glb ──► gltf-transform optimize ──► public/models/x.glb ──► GLTFLoader
                              (Meshopt + WebP, 1024px)      Draco · Meshopt · KTX2 decoders
```
* `src/three/assets/manifest.js` is the single switchboard: per model `enabled`, `url`, `fit`
  (scale one dimension to metres), `at` (position / rotation), and its scroll windows.
* `AssetLoader.js` loads every enabled model in parallel with **Draco**, **Meshopt** and **KTX2/Basis**
  support (decoders in `public/draco`, `public/basis`), reports progress to the loader, preloads their
  textures to the GPU, and **never throws**: a failed file logs a warning and the procedural twin is used.
* `modelPiece.js` turns a GLB into the same `Piece` the procedural code makes: it normalises scale and
  floor contact, clones each glTF material (textures stay shared) and patches it with the reveal /
  clay→PBR / lights-on shader, and builds the blueprint (below). All sketch, dissolve, shadow and
  disposal behaviour therefore works on imported models unchanged.
* **Blueprint from a GLB:** add a low-poly mesh named `SKETCH_<anything>` in Blender — its edges become the
  pen drawing and it is never rendered. Without one, light models draw their own edges and dense (>6k tri)
  models get a bounding-box cage.
* **Starter GLBs were generated from the procedural pieces** (`?debug` → `window.__exportGLB(name)`,
  `npm run models:export`), with bump maps baked to normal maps and `SKETCH_` proxies embedded, then
  compressed with `gltf-transform` (**6.5 MB → 0.5 MB**: sofa 336 KB, armchair 124 KB, table 48 KB, lamp 7 KB).
  Replace any file with a Blender model of the same name and it is picked up — no code change.

**Model requirements:** Y-up, metres, front facing **+Z**, PBR materials (baseColor / normal / ORM or
emissive). Set `fit` in the manifest and the loader scales and grounds it.

**Adding a model:** drop `public/models/plant.glb`, set `enabled: true` for `plant` in `manifest.js`, adjust
`fit`/`at`. `shelf` and `rug` slots are ready too.

### Optimization decisions
Measured (`?debug`, medium tier, 1440×810):

| stage | draw calls | triangles | lines |
| --- | --- | --- | --- |
| sketch (p = 0) | 98 | – | 1 920 segments |
| structure (p = 0.3) | 103 | 64 | 1 908 |
| interior (p = 1) | **56** | **11.6 k** | 0 (hidden) |

* **Draw calls / reuse** — a geometry cache shares identical shapes (mullions, cushions, pendants);
  textures are shared by every material; materials are per-piece instances (their reveal uniforms
  differ) but all use one shader program per type (25 programs, 31 textures in total).
* **Hidden work is skipped** — unrevealed solids are `visible=false`; sketch lines are hidden once
  their solid is complete.
* **Static shadows** — the sun's shadow map is *not* re-rendered every frame
  (`shadowMap.autoUpdate = false`); it updates only when a piece becomes a caster.
  Dissolving objects never cast (so no wrong shadows).
* **Render on demand** — if scroll is settled, pointer idle and the intro finished, no frame is rendered.
* **Cheap glass** — transparent PBR + env reflections instead of a transmission pass.
* **Preloading** — textures, PMREM probe and **all shader programs are compiled and uploaded before the
  first frame** (`compileAsync`), behind a real-progress loader.
* **Cut-away for free** — right wall and ceiling are single-sided planes; from outside they are culled,
  so the aerial camera sees in without extra geometry or clipping planes.
* **Post cost** — half-float RT; MSAA and bloom only on the high tier.
* **Adaptive quality** — tier picked from device hints (cores, memory, coarse pointer), then
  `AdaptiveQuality` watches a 90-frame rolling average and steps *high → medium → low* when it exceeds
  ~26 ms. Tiers change DPR (2 / 1.5 / 1), MSAA, bloom, shadow map (2048 / 1024 / off) and texture size
  (1024 / 512). `QualityToggle` pins a tier for reviewers.

### Known limits / next steps
* WebGL lines are 1 px wide — fine for a fine-line drawing; `Line2` would give weighted strokes.
* Procedural textures are generated on the main thread (~1–2 s); moving them to a worker/KTX2 would
  shorten load. The bundled GLBs are exports of the procedural pieces, so they look the same; the real
  realism upgrade is replacing them with Blender-modelled / photoscanned assets (same filenames).
* Layout is tuned for 16:9 desktop; portrait screens widen the FOV automatically.
