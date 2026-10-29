import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

function cluster(flat, indexArr, cell) {
  const n = flat.length / 3
  const remap = new Int32Array(n)
  const map = new Map()
  const sum = []
  let m = 0
  for (let i = 0; i < n; i++) {
    const x = flat[i * 3]
    const y = flat[i * 3 + 1]
    const z = flat[i * 3 + 2]
    const key = Math.round(x / cell) + ',' + Math.round(y / cell) + ',' + Math.round(z / cell)
    let id = map.get(key)
    if (id === undefined) {
      id = m++
      map.set(key, id)
      sum.push(0, 0, 0, 0)
    }
    remap[i] = id
    const o = id * 4
    sum[o] += x
    sum[o + 1] += y
    sum[o + 2] += z
    sum[o + 3] += 1
  }
  const pos = new Float32Array(m * 3)
  for (let id = 0; id < m; id++) {
    const c = sum[id * 4 + 3]
    pos[id * 3] = sum[id * 4] / c
    pos[id * 3 + 1] = sum[id * 4 + 1] / c
    pos[id * 3 + 2] = sum[id * 4 + 2] / c
  }
  const tris = indexArr ? indexArr.length / 3 : n / 3
  const seen = new Set()
  const idx = []
  for (let t = 0; t < tris; t++) {
    const a = remap[indexArr ? indexArr[t * 3] : t * 3]
    const b = remap[indexArr ? indexArr[t * 3 + 1] : t * 3 + 1]
    const c = remap[indexArr ? indexArr[t * 3 + 2] : t * 3 + 2]
    if (a === b || b === c || a === c) continue
    const s = [a, b, c].sort((p, q) => p - q)
    const k = (s[0] * m + s[1]) * m + s[2] 
    if (seen.has(k)) continue
    seen.add(k)
    idx.push(a, b, c)
  }
  return { pos, idx }
}

export function buildSketchEdges(geometry, { angle = 35, maxSegments = 2500, detail = 36, minLenRatio = 0.004 } = {}) {
  const posAttr = geometry.attributes.position
  if (!posAttr || posAttr.count < 3) return null

  const flat = new Float32Array(posAttr.count * 3)
  for (let i = 0; i < posAttr.count; i++) {
    flat[i * 3] = posAttr.getX(i)
    flat[i * 3 + 1] = posAttr.getY(i)
    flat[i * 3 + 2] = posAttr.getZ(i)
  }
  const indexArr = geometry.index ? geometry.index.array : null
  const triCount = (indexArr ? indexArr.length : posAttr.count) / 3

  let g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(flat, 3))
  g.computeBoundingBox()
  const diag = g.boundingBox.getSize(new THREE.Vector3()).length() || 1

  let minLen = diag * minLenRatio
  if (triCount > 1500) {
    const { pos, idx } = cluster(flat, indexArr, diag / detail)
    g.dispose()
    g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setIndex(idx)
    minLen = (diag / detail) * 0.6 
  } else {
    if (indexArr) g.setIndex(new THREE.BufferAttribute(indexArr.slice(), 1))
    g = mergeVertices(g, diag * 1e-5)
  }

  let edges = null
  for (const a of [angle, angle * 0.55, angle * 0.3]) {
    const e = new THREE.EdgesGeometry(g, a)
    if (e.attributes.position.count > 0) {
      edges = e
      break
    }
    e.dispose()
  }
  g.dispose()
  if (!edges) return null

  const p = edges.attributes.position.array
  const n = p.length / 6
  let segs = []
  for (let i = 0; i < n; i++) {
    const o = i * 6
    const len = Math.hypot(p[o + 3] - p[o], p[o + 4] - p[o + 1], p[o + 5] - p[o + 2])
    if (len >= minLen) segs.push([i, len])
  }
  if (segs.length === 0) segs = Array.from({ length: n }, (_, i) => [i, 1])
  if (segs.length > maxSegments) {
    segs.sort((a, b) => b[1] - a[1])
    segs = segs.slice(0, maxSegments)
  }

  const out = new Float32Array(segs.length * 6)
  segs.forEach(([i], k) => out.set(p.subarray(i * 6, i * 6 + 6), k * 6))
  edges.dispose()

  const res = new THREE.BufferGeometry()
  res.setAttribute('position', new THREE.BufferAttribute(out, 3))
  res.userData.owned = true
  return res
}
