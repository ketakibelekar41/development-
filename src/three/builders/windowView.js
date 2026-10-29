import * as THREE from 'three'
import { box, plane, piece } from './helpers.js'
import { ROOM, WINDOW } from './shell.js'
import { range, smooth } from '../utils/math.js'


export function buildWindow(lib, tex) {
  const { W } = ROOM
  const { z0, z1, top } = WINDOW
  const x = -W / 2 - 0.1
  const width = z1 - z0
  const zc = (z0 + z1) / 2

  const glass = box(0.02, top, width, lib.glass(), { x, y: top / 2, z: zc })
  glass.castShadow = false

  const metal = lib.darkMetal()
  const frame = [glass]
  const posts = 5
  for (let i = 0; i < posts; i++) frame.push(box(0.07, top, 0.06, metal, { x, y: top / 2, z: z0 + (width / (posts - 1)) * i }))
  frame.push(box(0.07, 0.06, width, metal, { x, y: 0.03, z: zc }))
  frame.push(box(0.07, 0.06, width, metal, { x, y: top - 0.03, z: zc }))
  frame.push(box(0.07, 0.04, width, metal, { x, y: 2.1, z: zc }))

  const pieces = [piece('window', frame, { win: [0.34, 0.48], draw: [0.35, 0.7], dir: [0, 0, 1] })]

  // sky backdrop
  const skyMat = new THREE.MeshBasicMaterial({ map: tex.sky, toneMapped: true, transparent: true, opacity: 0, fog: false })
  skyMat.color.setScalar(1.0)
  const sky = plane(34, 17, skyMat, { x: -11, y: 4.2, z: -0.4, ry: Math.PI / 2 })
  sky.castShadow = false
  sky.receiveShadow = false
  sky.userData.noLines = true
  pieces.push(
    piece('sky', [sky], {
      win: [0.58, 0.76],
      onUpdate: (p, r, pc) => {
        sky.visible = r > 0.001
      },
    }),
  )
  return pieces
}
