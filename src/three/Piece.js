import * as THREE from 'three'
import { createSketchMaterial } from './materials.js'
import { range, smooth } from './utils/math.js'

const edgeCache = new Map() // sketch geometry -> EdgesGeometry (reused across all instances)
function edgesFor(geometry, angle = 25) {
  const key = `${geometry.uuid}:${angle}`
  let e = edgeCache.get(key)
  if (!e) {
    e = new THREE.EdgesGeometry(geometry, angle)
    edgeCache.set(key, e)
    e.userData.needsDistances = true
  }
  return e
}
export function disposeEdgeCache() {
  edgeCache.forEach((g) => g.dispose())
  edgeCache.clear()
}

/**
 * A Piece is one logical element of the interior (floor, sofa, lamp …).
 *
 *  - owns a THREE.Group of solid meshes (PBR, patched with the reveal shader)
 *  - owns matching blueprint LineSegments (one pass of EdgesGeometry per mesh)
 *  - maps global scroll progress to:
 *        draw   : pen-sweep of the sketch lines (driven by the intro timeline)
 *        reveal : dissolve-in of the solid, with the sketch fading out behind it
 *
 * `win`  = scroll window [from,to] in which the solid is revealed
 * `draw` = intro window [from,to] (0..1) in which the sketch is drawn
 */
export class Piece {
  constructor(name, group, { win, draw = [0, 0.6], dir = [0, 1, 0], dash = false, wobble = 1, onUpdate = null } = {}) {
    this.name = name
    this.group = group
    this.win = win
    this.drawWin = draw
    this.dir = new THREE.Vector3(...dir).normalize()
    this.dash = dash
    this.wobble = wobble
    this.onUpdate = onUpdate
    this.solids = []
    this.proxies = [] // sketch-only meshes: draw blueprint lines, never rendered as solids
    this.lines = []
    this.revealMats = []
    this.fadeMats = []
    this.sketchMat = null
    this._cast = false
  }

  /** Call after the group is positioned in the world. */
  init() {
    const g = this.group
    g.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(g)
    const corners = []
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z))
    let min = Infinity
    let max = -Infinity
    corners.forEach((c) => {
      const d = c.dot(this.dir)
      min = Math.min(min, d)
      max = Math.max(max, d)
    })
    const origin = this.dir.clone().multiplyScalar(min)
    const len = Math.max(max - min, 1e-3)

    const matSet = new Set()
    g.traverse((o) => {
      if (!o.isMesh) return
      if (o.userData.sketchOnly) {
        o.visible = false
        this.proxies.push(o)
        return
      }
      this.solids.push(o)
      matSet.add(o.material)
    })
    matSet.forEach((m) => {
      if (m.userData.reveal) {
        const r = m.userData.reveal
        r.uOrigin.value.copy(origin)
        r.uDir.value.copy(this.dir)
        r.uLen.value = len
        this.revealMats.push(m)
      } else {
        m.transparent = true
        this.fadeMats.push(m)
      }
    })

    this.sketchMat = createSketchMaterial({ dash: this.dash, wobble: this.wobble })
    const u = this.sketchMat.uniforms
    u.uOrigin.value.copy(origin)
    u.uDir.value.copy(this.dir)
    u.uLen.value = len

    ;[...this.solids, ...this.proxies].forEach((mesh) => {
      if (mesh.userData.noLines) return
      // GLB meshes bring their own traced edge geometry; procedural ones use the cached EdgesGeometry
      const eg = mesh.userData.sketchEdges || edgesFor(mesh.userData.sketch || mesh.geometry, mesh.userData.edgeAngle || 25)
      const ls = new THREE.LineSegments(eg, this.sketchMat)
      if (eg.userData.needsDistances) {
        ls.computeLineDistances()
        eg.userData.needsDistances = false
      }
      ls.position.copy(mesh.position)
      ls.quaternion.copy(mesh.quaternion)
      ls.scale.copy(mesh.scale)
      ls.matrixAutoUpdate = true
      ls.renderOrder = 2
      mesh.parent.add(ls)
      this.lines.push(ls)
    })
    return this
  }

  /** @returns {boolean} true when the shadow-casting set changed */
  update(p, intro) {
    const r = smooth(range(p, this.win[0], this.win[1]))
    const draw = smooth(range(intro, this.drawWin[0], this.drawWin[1]))

    for (const m of this.revealMats) m.userData.reveal.uReveal.value = r
    for (const m of this.fadeMats) m.opacity = r

    const cast = r >= 0.999
    const shown = r > 0.001
    for (const s of this.solids) {
      s.visible = shown
      s.castShadow = cast && s.userData.cast !== false
    }

    const u = this.sketchMat.uniforms
    u.uDraw.value = draw
    u.uFade.value = 1 - smooth(range(r, 0.0, 0.7))
    const linesOn = draw > 0 && r < 0.999
    for (const l of this.lines) l.visible = linesOn

    this.onUpdate?.(p, r, this)
    const changed = cast !== this._cast
    this._cast = cast
    return changed
  }

  dispose() {
    this.sketchMat?.dispose()
    this.revealMats.forEach((m) => m.dispose())
    this.fadeMats.forEach((m) => m.dispose())
    this.lines.forEach((l) => l.geometry.userData.owned && l.geometry.dispose())
  }
}
