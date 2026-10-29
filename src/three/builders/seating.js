import { box, rbox, cyl, piece } from './helpers.js'

export function buildSofa(lib) {
  const cx = 0.3
  const cz = -2.4
  const fab = lib.fabric('boucle')
  const brass = lib.brass()
  const terra = lib.fabric('terracotta')
  const olive = lib.fabric('olive')
  const m = []

  m.push(rbox(2.3, 0.32, 1.05, 0.05, fab, { x: cx, y: 0.32, z: cz }))
  for (const sx of [-1.275, 1.275]) m.push(rbox(0.25, 0.62, 1.05, 0.08, fab, { x: cx + sx, y: 0.47, z: cz }))
  m.push(rbox(2.3, 0.6, 0.22, 0.06, fab, { x: cx, y: 0.78, z: cz - 0.41 }))
  for (const sx of [-0.77, 0, 0.77]) {
    m.push(rbox(0.76, 0.18, 0.82, 0.07, fab, { x: cx + sx, y: 0.57, z: cz + 0.1 }))
    m.push(rbox(0.74, 0.5, 0.22, 0.08, fab, { x: cx + sx, y: 0.9, z: cz - 0.3, rx: -0.2 }))
  }
  m.push(rbox(0.44, 0.44, 0.15, 0.07, terra, { x: cx + 0.95, y: 0.86, z: cz - 0.02, ry: -0.35, rx: -0.2 }))
  m.push(rbox(0.4, 0.4, 0.14, 0.07, olive, { x: cx - 0.95, y: 0.85, z: cz - 0.02, ry: 0.3, rx: -0.2 }))
  for (const sx of [-1.3, 1.3]) for (const sz of [-0.42, 0.42]) m.push(cyl(0.025, 0.017, 0.16, 8, brass, { x: cx + sx, y: 0.08, z: cz + sz }))

  return piece('sofa', m, { win: [0.44, 0.58], draw: [0.45, 0.78] })
}

export function buildRug(lib) {
  return piece('rug', [box(4.2, 0.02, 3.0, lib.fabric('rug'), { x: 0.3, y: 0.011, z: -0.9 })], {
    win: [0.42, 0.52],
    dir: [1, 0, 0],
    draw: [0.4, 0.7],
    dash: true,
  })
}

export function buildArmchair(lib) {
  const fab = lib.fabric('caramel')
  const wood = lib.walnut()
  const m = []
  m.push(rbox(0.8, 0.16, 0.8, 0.06, fab, { y: 0.3 }))
  m.push(rbox(0.74, 0.18, 0.74, 0.07, fab, { y: 0.46, z: 0.03 }))
  m.push(rbox(0.8, 0.62, 0.16, 0.07, fab, { y: 0.78, z: -0.34, rx: -0.18 }))
  for (const sx of [-0.37, 0.37]) m.push(rbox(0.13, 0.3, 0.72, 0.05, fab, { x: sx, y: 0.62, z: 0.0 }))
  for (const sx of [-0.32, 0.32]) for (const sz of [-0.3, 0.3]) m.push(cyl(0.03, 0.018, 0.22, 10, wood, { x: sx, y: 0.11, z: sz }))
  return piece('armchair', m, { win: [0.54, 0.65], draw: [0.5, 0.82] }, { x: 3.0, z: -1.2, ry: -1.25 })
}
