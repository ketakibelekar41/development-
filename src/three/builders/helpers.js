import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { Piece } from '../Piece.js'

/**
 * Geometry cache: identical shapes (e.g. 5 window mullions, 3 pendant domes,
 * 3 sofa cushions) share ONE BufferGeometry -> less GPU memory & upload time.
 */
const gcache = new Map()
const geo = (key, make) => {
  let g = gcache.get(key)
  if (!g) {
    g = make()
    gcache.set(key, g)
  }
  return g
}
export function disposeGeometryCache() {
  gcache.forEach((g) => g.dispose())
  gcache.clear()
}

function place(m, t = {}) {
  m.position.set(t.x ?? 0, t.y ?? 0, t.z ?? 0)
  m.rotation.set(t.rx ?? 0, t.ry ?? 0, t.rz ?? 0)
  if (t.s) m.scale.set(...t.s)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

export const box = (w, h, d, mat, t) => place(new THREE.Mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), mat), t)

/** Rounded box; the blueprint is drawn with the crisp un-rounded box. */
export function rbox(w, h, d, r, mat, t) {
  const m = place(new THREE.Mesh(geo(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r)), mat), t)
  m.userData.sketch = geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d))
  return m
}

export const cyl = (rt, rb, h, seg, mat, t) =>
  place(new THREE.Mesh(geo(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), mat), t)

export const plane = (w, h, mat, t) => place(new THREE.Mesh(geo(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h)), mat), t)

/** Half-sphere dome (pendant shade). Sketch = a simple cylinder. */
export function dome(r, mat, t) {
  const m = place(
    new THREE.Mesh(geo(`d${r}`, () => new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2)), mat),
    t,
  )
  m.userData.sketch = geo(`dc${r}`, () => new THREE.CylinderGeometry(r * 0.35, r, r, 14, 1, true))
  m.userData.cast = true
  return m
}

/** Bulb / small sphere. Sketch = tiny box (spheres have no hard edges). */
export function bulb(r, mat, t) {
  const m = place(new THREE.Mesh(geo(`s${r}`, () => new THREE.SphereGeometry(r, 16, 12)), mat), t)
  m.userData.noLines = true
  m.castShadow = false
  return m
}

export function lathe(points, seg, mat, t, sketchR, sketchH) {
  const key = points.map((p) => p.join(':')).join('|')
  const m = place(
    new THREE.Mesh(geo(`l${key}`, () => new THREE.LatheGeometry(points.map((p) => new THREE.Vector2(p[0], p[1])), seg)), mat),
    t,
  )
  m.userData.sketch = geo(`lc${sketchR},${sketchH}`, () => new THREE.CylinderGeometry(sketchR, sketchR, sketchH, 14))
  return m
}

/**
 * Convenience: wraps meshes in a group (optionally transformed) and a Piece.
 * `at` positions the whole group in the world (used for rotated furniture).
 */
export function piece(name, meshes, opts, at = {}) {
  const g = new THREE.Group()
  g.name = name
  meshes.forEach((m) => g.add(m))
  g.position.set(at.x ?? 0, at.y ?? 0, at.z ?? 0)
  g.rotation.y = at.ry ?? 0
  return new Piece(name, g, opts)
}
