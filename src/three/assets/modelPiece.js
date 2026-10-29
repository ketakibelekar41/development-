import * as THREE from 'three'
import { Piece } from '../Piece.js'
import { makeRevealable } from '../materials.js'
import { buildSketchEdges } from './sketchEdges.js'

/**
 * Turns a loaded GLB scene into a Piece that behaves exactly like the
 * procedural ones: sketch -> dissolve-in -> clay -> PBR, shadows, disposal.
 *
 *  1. normalise : uniform-scale to manifest.fit, centre on the floor, place in the room
 *  2. materials : clone each glTF material (its textures stay shared) and patch it
 *                 with the reveal / clay / lit shader chunks
 *  3. blueprint : SKETCH_* meshes -> custom proxy (if the file has them);
 *                 otherwise the REAL edges of every mesh are traced (welded,
 *                 de-noised, capped) — dense models included.
 *                 cfg.sketch = 'box' forces the old bounding-box cage.
 */
export function makeModelPiece(key, root, cfg, lib) {
  const holder = new THREE.Group()
  holder.name = key
  holder.add(root)

  // 1 — normalise -------------------------------------------------------
  root.updateMatrixWorld(true)
  let box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const f = cfg.fit || {}
  const s = f.width ? f.width / size.x : f.height ? f.height / size.y : f.depth ? f.depth / size.z : 1
  root.scale.multiplyScalar(isFinite(s) && s > 0 ? s : 1)
  root.updateMatrixWorld(true)
  box = new THREE.Box3().setFromObject(root)
  const c = box.getCenter(new THREE.Vector3())
  root.position.set(-c.x, -box.min.y, -c.z)
  root.updateMatrixWorld(true)

  // 2 — materials -------------------------------------------------------
  // never trust file metadata: glTF `extras` land in userData and could collide with engine flags
  root.traverse((o) => {
    if (o.isMesh) o.userData = {}
  })
  const cache = new Map()
  const patch = (m) => {
    if (!cache.has(m)) {
      const clone = m.clone()
      clone.userData = {}
      cache.set(m, makeRevealable(clone, { clay: !clone.transparent }))
    }
    return cache.get(m)
  }
  let hasProxy = false
  root.traverse((o) => {
    if (!o.isMesh) return
    o.material = Array.isArray(o.material) ? o.material.map(patch) : patch(o.material)
    const transparent = (Array.isArray(o.material) ? o.material[0] : o.material).transparent
    o.castShadow = !transparent
    o.receiveShadow = true
    if (o.name.toUpperCase().startsWith('SKETCH')) {
      o.userData.sketchOnly = true
      hasProxy = true
    }
  })

  // 3 — blueprint -------------------------------------------------------
  const meshes = []
  root.traverse((o) => {
    if (o.isMesh && !o.userData.sketchOnly) meshes.push(o)
  })
  let drawn = 0
  if (hasProxy) {
    meshes.forEach((o) => (o.userData.noLines = true)) // the SKETCH_ meshes carry the drawing
    drawn = 1
  } else if (cfg.sketch !== 'box') {
    const budget = cfg.sketchBudget ?? 6000 // max line segments for the whole piece
    const per = Math.max(250, Math.floor(budget / Math.max(meshes.length, 1)))
    for (const o of meshes) {
      const e = buildSketchEdges(o.geometry, { angle: cfg.sketchAngle ?? 35, maxSegments: per, detail: cfg.sketchDetail ?? 36 })
      if (e) {
        o.userData.sketchEdges = e
        drawn += e.attributes.position.count / 2
      } else {
        o.userData.noLines = true
      }
    }
  }
  if (drawn === 0) {
    // forced 'box' mode, or a mesh with no usable edges: bounding-box cage as a last resort
    meshes.forEach((o) => {
      o.userData.noLines = true
      delete o.userData.sketchEdges
    })
    const b = new THREE.Box3().setFromObject(root)
    const sz = b.getSize(new THREE.Vector3())
    const cc = b.getCenter(new THREE.Vector3())
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(sz.x, sz.y, sz.z), new THREE.MeshBasicMaterial())
    proxy.position.copy(cc)
    proxy.userData.sketchOnly = true
    holder.add(proxy)
  }

  
  const at = cfg.at || {}
  holder.position.set(at.x ?? 0, at.y ?? 0, at.z ?? 0)
  holder.rotation.y = at.ry ?? 0

  return new Piece(key, holder, { win: cfg.win, draw: cfg.draw, dir: cfg.dir, dash: cfg.dash, wobble: cfg.wobble ?? 0.3 })
}
