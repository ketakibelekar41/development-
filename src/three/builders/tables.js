import { box, cyl, lathe, piece } from './helpers.js'

export function buildCoffeeTable(lib) {
  const m = []
  m.push(cyl(0.55, 0.55, 0.05, 56, lib.marble(), { x: 0.3, y: 0.425, z: -0.7 }))
  m.push(cyl(0.28, 0.33, 0.4, 40, lib.travertine(), { x: 0.3, y: 0.2, z: -0.7 }))
  m.push(cyl(0.345, 0.345, 0.02, 40, lib.brass(), { x: 0.3, y: 0.012, z: -0.7 }))

  const cover1 = lib.paint('#2f3b34')
  const cover2 = lib.paint('#b9573a')
  m.push(box(0.34, 0.035, 0.25, cover1, { x: 0.12, y: 0.4675 + 0.0, z: -0.62, ry: 0.25 }))
  m.push(box(0.3, 0.03, 0.22, cover2, { x: 0.12, y: 0.5, z: -0.62, ry: 0.5 }))
  m.push(
    lathe(
      [
        [0.001, 0],
        [0.07, 0],
        [0.09, 0.08],
        [0.06, 0.2],
        [0.035, 0.28],
        [0.045, 0.3],
      ],
      24,
      lib.ceramic('#f1ece2'),
      { x: 0.55, y: 0.45, z: -0.78 },
      0.08,
      0.3,
    ),
  )
  return piece('coffeeTable', m, { win: [0.5, 0.62], draw: [0.5, 0.82] })
}

export function buildShelf(lib) {
  const wood = lib.walnut()
  const m = []
  const x0 = 3.3
  const z = -2.86
  const ys = [1.15, 1.7, 2.25]
  ys.forEach((y) => m.push(box(1.3, 0.04, 0.28, wood, { x: x0, y, z })))

  const spine = [lib.paint('#e6ddcc'), lib.paint('#1f2a2e'), lib.paint('#b9573a'), lib.paint('#8c8a64'), lib.paint('#d7b46a')]
  const dims = [
    [0.05, 0.25, 0.18],
    [0.04, 0.3, 0.2],
    [0.06, 0.22, 0.17],
    [0.045, 0.27, 0.19],
    [0.05, 0.24, 0.18],
  ]
  dims.forEach((d, i) => m.push(box(d[0], d[1], d[2], spine[i], { x: x0 - 0.55 + i * 0.055, y: ys[0] + 0.02 + d[1] / 2, z, rz: i === 4 ? 0.12 : 0 })))
  dims.forEach((d, i) => m.push(box(d[0], d[1], d[2], spine[(i + 2) % 5], { x: x0 + 0.1 + i * 0.055, y: ys[1] + 0.02 + d[1] / 2, z })))
  m.push(
    lathe(
      [
        [0.001, 0],
        [0.06, 0],
        [0.075, 0.07],
        [0.04, 0.17],
        [0.03, 0.22],
        [0.04, 0.24],
      ],
      20,
      lib.ceramic('#d9c7ae'),
      { x: x0 + 0.45, y: ys[1] + 0.02, z },
      0.07,
      0.24,
    ),
  )
  m.push(box(0.3, 0.025, 0.2, lib.paint('#e6ddcc'), { x: x0 - 0.3, y: ys[2] + 0.033, z }))
  m.push(box(0.26, 0.025, 0.18, lib.paint('#1f2a2e'), { x: x0 - 0.3, y: ys[2] + 0.0585, z }))
  m.push(box(0.12, 0.12, 0.12, lib.brass(), { x: x0 + 0.1, y: ys[2] + 0.08, z, ry: 0.5 }))
  return piece('shelf', m, { win: [0.58, 0.68], draw: [0.55, 0.85] })
}
