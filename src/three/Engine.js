import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

import { TIERS, TIER_ORDER, AdaptiveQuality, detectInitialTier } from './quality.js'
import { createTextures, configureTextures, disposeTextures } from './textures.js'
import { createMaterialLibrary, SHARED, SKETCH_SHARED } from './materials.js'
import { Lighting } from './Lighting.js'
import { CameraRig } from './CameraRig.js'
import { disposeEdgeCache } from './Piece.js'
import { disposeGeometryCache } from './builders/helpers.js'
import { buildShell, BlueprintGrid } from './builders/shell.js'
import { buildWindow } from './builders/windowView.js'
import { buildSofa, buildRug, buildArmchair } from './builders/seating.js'
import { buildCoffeeTable, buildShelf } from './builders/tables.js'
import { buildFloorLamp, buildPlant, buildArt, buildPendants } from './builders/accents.js'
import { MODELS } from './assets/manifest.js'
import { loadModels, preloadTextures, disposeTree } from './assets/AssetLoader.js'
import { makeModelPiece } from './assets/modelPiece.js'
import { clamp, lerp, range, smooth } from './utils/math.js'

const PAPER = new THREE.Color('#e4ddcd')
const NIGHT = new THREE.Color('#171310')
const INTRO_SECONDS = 5.5

/**
 * Engine = renderer + scene + post stack + main loop.
 *
 *   store (damped scroll) ─┐
 *   pointer ───────────────┼─> update() ─> pieces / lighting / camera ─> composer
 *   intro timeline ────────┘
 *
 * Rendering is on-demand: when nothing changes (scroll settled, pointer idle,
 * intro finished) no frame is rendered, so an idle page costs ~0 GPU.
 */
export class Engine {
  constructor(container, store, { onProgress, onTier } = {}) {
    this.container = container
    this.store = store
    this.onProgress = onProgress
    this.onTier = onTier
    this.disposed = false
    this.ready = false

    const init = detectInitialTier()
    this.tierName = init.tier
    this.mode = init.locked ? init.tier : 'auto'
    this.adaptive = new AdaptiveQuality(() => this._stepDown())
    this.adaptive.enabled = !init.locked

    this.pointer = { tx: 0, ty: 0, x: 0, y: 0 }
    // drag-to-look state (radians): t* = target, others = smoothed
    this.look = { yaw: 0, pitch: 0, tyaw: 0, tpitch: 0, dragging: false, lx: 0, ly: 0 }
    this._canDrag = false
    this.intro = 0
    this.introRunning = false
    this.time = 0
    this._dirty = true
    this._prevRendered = false
    this._last = performance.now()
    this._raf = 0
    this.pieces = []
  }

  get tier() {
    return TIERS[this.tierName]
  }

  /* ------------------------------------------------------------ init */
  async init() {
    const tier = this.tier
    const progress = (v, label) => !this.disposed && this.onProgress?.(v, label)

    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y'
    this.container.appendChild(canvas)
    this.canvas = canvas

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // MSAA lives on the composer render target
      powerPreference: 'high-performance',
      stencil: false,
    })
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.shadowMap.autoUpdate = false // static casters -> re-render the map only on change
    this.renderer = renderer

    this.scene = new THREE.Scene()
    this.scene.background = PAPER.clone()
    this.camera = new THREE.PerspectiveCamera(34, 1.78, 0.1, 80)
    this.rig = new CameraRig(this.camera)

    // --- environment (IBL) ---------------------------------------------
    progress(0.02, 'Preparing light probes')
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envScene = new RoomEnvironment()
    this.scene.environment = pmrem.fromScene(envScene, 0.04).texture
    envScene.traverse((o) => {
      o.geometry?.dispose()
      o.material?.dispose?.()
    })
    pmrem.dispose()

    // --- textures (async, chunked) --------------------------------------
    this.tex = await createTextures({
      size: tier.tex,
      isCancelled: () => this.disposed,
      onStep: (v, label) => progress(0.05 + v * 0.55, label),
    })
    if (this.disposed) return
    configureTextures(this.tex, renderer)

    // --- GLB models (optional; each falls back to its procedural twin) ---
    progress(0.6, 'Loading models')
    const models = await loadModels(renderer, MODELS, {
      onProgress: (v) => progress(0.6 + v * 0.1, 'Loading models'),
      isCancelled: () => this.disposed,
    })
    if (this.disposed) return
    Object.values(models).forEach((m) => preloadTextures(m, renderer))
    this.modelKeys = Object.keys(models)

    // --- scene ---------------------------------------------------------
    progress(0.72, 'Assembling the studio model')
    await new Promise((r) => setTimeout(r, 0))
    const lib = createMaterialLibrary(this.tex)
    const pick = (key, build) => (models[key] ? makeModelPiece(key, models[key], MODELS[key], lib) : build(lib))
    this.grid = new BlueprintGrid()
    this.scene.add(this.grid.mesh)
    this.pieces = [
      ...buildShell(lib),
      ...buildWindow(lib, this.tex),
      pick('rug', buildRug),
      pick('sofa', buildSofa),
      pick('coffeeTable', buildCoffeeTable),
      pick('armchair', buildArmchair),
      pick('shelf', buildShelf),
      pick('floorLamp', buildFloorLamp),
      pick('plant', buildPlant),
      pick('art', buildArt),
      // pick('pendants', buildPendants),
      buildArt(lib),
      buildPendants(lib),
    ]
    this.pieces.forEach((pc) => {
      this.scene.add(pc.group)
      pc.init()
    })
    this.lighting = new Lighting(this.scene)

    // --- post ----------------------------------------------------------
    this._buildComposer()
    this.applyTier(this.tierName, false)
    this.resize()
    this._bind()

    // --- shader warm-up: compile every program before the first frame ---
    progress(0.8, 'Compiling shaders')
    const vis = this.pieces.map((pc) => pc.solids.map((s) => s.visible))
    this.pieces.forEach((pc) => {
      pc.solids.forEach((s) => (s.visible = true))
      pc.lines.forEach((l) => (l.visible = true))
    })
    this.grid.mesh.visible = true
    try {
      await renderer.compileAsync(this.scene, this.camera)
    } catch {
      renderer.compile(this.scene, this.camera)
    }
    this.pieces.forEach((pc, i) => pc.solids.forEach((s, j) => (s.visible = vis[i][j])))
    if (this.disposed) return

    progress(0.94, 'Focusing the lens')
    this.store.jump()
    this._update(0.016, true)
    this.lighting.sun.shadow.needsUpdate = true
    renderer.shadowMap.needsUpdate = true
    this.composer.render()

    progress(1, 'Ready')
    this.ready = true
    this._last = performance.now()
    this._raf = requestAnimationFrame(this._loop)
  }

  _buildComposer() {
    const { renderer, scene, camera } = this
    const size = renderer.getSize(new THREE.Vector2())
    const rt = new THREE.WebGLRenderTarget(size.x || 2, size.y || 2, { type: THREE.HalfFloatType, samples: 0 })
    this.composer = new EffectComposer(renderer, rt)
    this.composer.addPass(new RenderPass(scene, camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x || 2, size.y || 2), 0.0, 0.7, 1.0)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
  }

  /* ------------------------------------------------------------ quality */
  applyTier(name, notify = true) {
    this.tierName = name
    const t = TIERS[name]
    this.dpr = Math.min(window.devicePixelRatio || 1, t.dpr)
    this.renderer.setPixelRatio(this.dpr)
    this.composer.setPixelRatio(this.dpr)
    ;[this.composer.renderTarget1, this.composer.renderTarget2].forEach((rt) => {
      if (rt.samples !== t.msaa) {
        rt.samples = t.msaa
        rt.dispose()
      }
    })
    this.bloom.enabled = t.bloom
    this.lighting.setShadows(t.shadows, t.shadowMap)
    this.renderer.shadowMap.needsUpdate = true
    SKETCH_SHARED.uPixelRatio.value = this.dpr
    this.resize()
    this.adaptive.reset()
    this._dirty = true
    if (notify) this.onTier?.(name, this.mode)
  }

  /** mode: 'auto' | 'high' | 'medium' | 'low' */
  setQuality(mode) {
    this.mode = mode
    this.adaptive.enabled = mode === 'auto'
    if (mode !== 'auto') this.applyTier(mode)
    else this.onTier?.(this.tierName, this.mode)
  }

  _stepDown() {
    const i = TIER_ORDER.indexOf(this.tierName)
    if (i < TIER_ORDER.length - 1) this.applyTier(TIER_ORDER[i + 1])
  }

  /* ------------------------------------------------------------ events */
  _bind() {
    this._ro = new ResizeObserver(() => this.resize())
    this._ro.observe(this.container)
    const stage = this.container.parentElement // the sticky HUD wrapper
    this._onDown = (e) => {
      if (e.button > 0 || this.store.value < 0.58) return
      if (!stage.contains(e.target) || e.target.closest('button, a, aside')) return
      const L = this.look
      L.dragging = true
      L.lx = e.clientX
      L.ly = e.clientY
      document.body.style.userSelect = 'none'
      stage.style.cursor = 'grabbing'
    }
    this._onUp = () => {
      if (!this.look.dragging) return
      this.look.dragging = false
      document.body.style.userSelect = ''
      stage.style.cursor = this._canDrag ? 'grab' : ''
    }
    this._onDbl = () => {
      this.look.tyaw = this.look.tpitch = 0 // double-click = recentre the view
      this._dirty = true
    }
    this._onMove = (e) => {
      const L = this.look
      if (L.dragging) {
        L.tyaw = clamp(L.tyaw + (e.clientX - L.lx) * 0.0045, -1.0, 0.5) // limits keep the open front of the room out of view
        L.tpitch = clamp(L.tpitch + (e.clientY - L.ly) * 0.0035, -0.5, 0.5)
        L.lx = e.clientX
        L.ly = e.clientY
      }
      const r = this.container.getBoundingClientRect()
      this.pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1
      this.pointer.ty = -(((e.clientY - r.top) / r.height) * 2 - 1)
      SKETCH_SHARED.uPointer.value.set(e.clientX - r.left, r.height - (e.clientY - r.top))
      this._dirty = true
    }
    this._onLeave = () => {
      this.pointer.tx = this.pointer.ty = 0
      SKETCH_SHARED.uPointer.value.set(-9999, -9999)
    }
    this._onVis = () => {
      this._last = performance.now()
      this.adaptive.reset()
    }
    this._stage = stage
    window.addEventListener('pointerdown', this._onDown)
    window.addEventListener('pointerup', this._onUp)
    window.addEventListener('pointercancel', this._onUp)
    window.addEventListener('dblclick', this._onDbl)
    window.addEventListener('pointermove', this._onMove, { passive: true })
    document.addEventListener('pointerleave', this._onLeave)
    document.addEventListener('visibilitychange', this._onVis)
  }

  resize() {
    if (!this.renderer) return
    const w = Math.max(1, this.container.clientWidth)
    const h = Math.max(1, this.container.clientHeight)
    this.renderer.setSize(w, h, false)
    this.composer.setSize(w, h)
    this.rig.setAspect(w / h)
    this.camera.updateProjectionMatrix()
    this._dirty = true
  }

  startIntro() {
    if (this.introRunning || this.intro >= 1) return
    this.introRunning = true
  }

  /* ------------------------------------------------------------ frame */
  _loop = (now) => {
    if (this.disposed) return
    this._raf = requestAnimationFrame(this._loop)
    if (document.hidden) return
    const dtMs = now - this._last
    this._last = now
    const dt = Math.min(dtMs / 1000, 0.1)

    const moved = this.store.tick(dt)
    const px = this.pointer.tx - this.pointer.x
    const py = this.pointer.ty - this.pointer.y
    const k = 1 - Math.exp(-4 * dt)
    this.pointer.x += px * k
    this.pointer.y += py * k
    const pointerMoving = Math.abs(px) > 5e-4 || Math.abs(py) > 5e-4

    // drag-to-look: ease towards the target; drift back to centre while scrolling
    const L = this.look
    if (!L.dragging && moved) {
      const back = 1 - Math.exp(-2.5 * dt)
      L.tyaw -= L.tyaw * back
      L.tpitch -= L.tpitch * back
    }
    const dyaw = L.tyaw - L.yaw
    const dpitch = L.tpitch - L.pitch
    const kl = 1 - Math.exp(-9 * dt)
    L.yaw += dyaw * kl
    L.pitch += dpitch * kl
    const lookMoving = Math.abs(dyaw) > 4e-4 || Math.abs(dpitch) > 4e-4
    const can = this.store.value >= 0.58
    if (can !== this._canDrag) {
      this._canDrag = can
      if (this._stage && !L.dragging) this._stage.style.cursor = can ? 'grab' : ''
    }

    if (this.introRunning) {
      this.intro = Math.min(1, this.intro + dt / INTRO_SECONDS)
      if (this.intro >= 1) this.introRunning = false
    }

    const active = moved || pointerMoving || lookMoving || this.introRunning || this._dirty
    if (!active) {
      this._prevRendered = false
      return
    }
    this._dirty = false
    this.time += dt
    this._update(dt, false)
    this.composer.render(dt)

    if (this._prevRendered) this.adaptive.push(dtMs)
    this._prevRendered = true
  }

  _update(dt, force) {
    const p = this.store.value
    const intro = this.intro

    let casterChanged = force
    for (const pc of this.pieces) if (pc.update(p, intro)) casterChanged = true
    if (casterChanged && this.tier.shadows) this.renderer.shadowMap.needsUpdate = true

    this.grid.update(p, intro)
    const lit = this.lighting.update(p)

    // globals shared by every material
    SHARED.uPBR.value = smooth(range(p, 0.6, 0.86))
    SHARED.uLit.value = lit
    SKETCH_SHARED.uSketchy.value = 1 - smooth(range(p, 0.02, 0.3))

    // look: paper -> warm night, exposure + IBL + bloom
    this.scene.background.copy(PAPER).lerp(NIGHT, smooth(range(p, 0.26, 0.64)))
    this.scene.environmentIntensity = lerp(0.55, 0.22, smooth(range(p, 0.45, 0.95)))
    this.renderer.toneMappingExposure = lerp(1.0, 0.95, smooth(range(p, 0.6, 1)))
    this.bloom.strength = lit * 0.38
    this.bloom.threshold = 1.0

    // the HUD colour flips with the background so copy stays legible
    this.rig.update(p, this.pointer, this.time, this.look)
  }

  /* ------------------------------------------------------------ teardown */
  dispose() {
    this.disposed = true
    cancelAnimationFrame(this._raf)
    this._ro?.disconnect()
    window.removeEventListener('pointerdown', this._onDown)
    window.removeEventListener('pointerup', this._onUp)
    window.removeEventListener('pointercancel', this._onUp)
    window.removeEventListener('dblclick', this._onDbl)
    document.body.style.userSelect = ''
    window.removeEventListener('pointermove', this._onMove)
    document.removeEventListener('pointerleave', this._onLeave)
    document.removeEventListener('visibilitychange', this._onVis)

    this.pieces.forEach((pc) => pc.dispose())
    this.grid?.dispose()
    this.lighting?.dispose()
    this.scene?.traverse((o) => {
      if (o.isMesh || o.isLine) disposeTree(o)
    })
    disposeGeometryCache()
    disposeEdgeCache()
    if (this.tex) disposeTextures(this.tex)
    this.scene?.environment?.dispose()
    this.composer?.dispose()
    this.renderer?.dispose()
    this.renderer?.forceContextLoss()
    this.canvas?.remove()
  }
}
