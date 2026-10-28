import * as THREE from 'three'
import { box, cyl, dome, bulb, piece } from './helpers.js'
import { ROOM } from './shell.js'

/** Where the practical lights live (Lighting.js reads these). */
export const LAMP = { x: -1.95, z: -2.35, shadeY: 1.55 }
export const PENDANT = { x: 0.3, z: -0.7 }

/** Brass floor lamp with a glowing drum shade. */
export function buildFloorLamp(lib) {
  const brass = lib.brass()
  const shade = lib.emissive('#ffc98c', 0.9)
  const m = [
    cyl(0.17, 0.2, 0.03, 32, brass, { x: LAMP.x, y: 0.015, z: LAMP.z }),
    cyl(0.011, 0.011, 1.4, 10, brass, { x: LAMP.x, y: 0.72, z: LAMP.z }),
    cyl(0.23, 0.26, 0.4, 32, shade, { x: LAMP.x, y: LAMP.shadeY, z: LAMP.z }),
  ]
  m[2].castShadow = false
  return piece('floorLamp', m, { win: [0.6, 0.7], draw: [0.6, 0.88] })
}

/** Rubber-fig-ish plant: low-poly blades in a ceramic pot. */
export function buildPlant(lib) {
  const px = -3.25
  const pz = 0.95
  const m = [cyl(0.21, 0.16, 0.42, 28, lib.ceramic('#cdbfa8'), { x: px, y: 0.21, z: pz })]
  const leaf = lib.leaf()
  const up = new THREE.Vector3(0, 1, 0)
  const n = 11
  for (let i = 0; i < n; i++) {
    const a = i * 2.399
    const tilt = 0.18 + 0.12 * (i % 4)
    const h = 0.9 + 0.35 * ((i * 7) % 5) / 4
    const dir = new THREE.Vector3(Math.sin(tilt) * Math.cos(a), Math.cos(tilt), Math.sin(tilt) * Math.sin(a))
    const base = new THREE.Vector3(px, 0.4, pz)
    const pos = base.clone().addScaledVector(dir, h / 2)
    const mesh = cyl(0.0, 0.11, h, 4, leaf, { x: pos.x, y: pos.y, z: pos.z })
    mesh.quaternion.setFromUnitVectors(up, dir)
    mesh.scale.set(1, 1, 0.35)
    mesh.castShadow = true
    m.push(mesh)
  }
  return piece('plant', m, { win: [0.62, 0.72], draw: [0.62, 0.9] })
}

/** Abstract painting in a thin brass frame above the sofa. */
export function buildArt(lib) {
  const frame = box(1.76, 1.11, 0.05, lib.brass(), { x: 0.3, y: 1.85, z: -2.895 })
  const canvas = box(1.6, 0.96, 0.02, lib.painting(), { x: 0.3, y: 1.85, z: -2.862 })
  canvas.castShadow = false
  return piece('art', [frame, canvas], { win: [0.64, 0.73], draw: [0.62, 0.9] })
}

/** Three brass dome pendants over the coffee table, bulbs glow when "lit". */
export function buildPendants(lib) {
  const brass = lib.brass()
  const glow = lib.emissive('#ffd9a2', 5)
  const m = []
  const drops = [
    { dx: -0.5, y: 2.0 },
    { dx: 0.0, y: 1.72 },
    { dx: 0.5, y: 2.15 },
  ]
  drops.forEach(({ dx, y }) => {
    const len = ROOM.H - y - 0.16
    m.push(cyl(0.004, 0.004, len, 6, brass, { x: PENDANT.x + dx, y: y + 0.16 + len / 2, z: PENDANT.z }))
    m.push(dome(0.16, brass, { x: PENDANT.x + dx, y: y, z: PENDANT.z }))
    m.push(bulb(0.055, glow, { x: PENDANT.x + dx, y: y - 0.03, z: PENDANT.z }))
  })
  m.forEach((mesh) => {
    if (mesh.material === brass) mesh.material.side = THREE.DoubleSide
  })
  return piece('pendants', m, { win: [0.66, 0.76], draw: [0.66, 0.92] })
}
