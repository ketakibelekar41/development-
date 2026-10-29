import * as THREE from 'three'
import { box, plane, cyl, piece } from './helpers.js'

export const ROOM = { W: 8, D: 6, H: 3.2, T: 0.2 }
export const WINDOW = { z0: -2.4, z1: 1.8, top: 3.0 }


export function buildShell(lib) {
  const { W, D, H, T } = ROOM
  const pieces = []

  pieces.push(
    piece('floor', [box(W, T, D, lib.oakFloor(), { y: -T / 2 })], { win: [0.05, 0.26], dir: [1, 0, 0.25], draw: [0.0, 0.32] }),
  )

  pieces.push(
    piece('backWall', [box(W + T, H, T, lib.plaster(), { x: -T / 2, y: H / 2, z: -D / 2 - T / 2 })], {
      win: [0.12, 0.32],
      draw: [0.08, 0.4],
    }),
  )

  const wallMat = lib.plaster()
  pieces.push(
    piece(
      'windowWall',
      [
        box(T, H, 0.6, wallMat, { x: -W / 2 - T / 2, y: H / 2, z: -D / 2 + 0.3 }), // rear pier
        box(T, H, D / 2 - WINDOW.z1, wallMat, { x: -W / 2 - T / 2, y: H / 2, z: (WINDOW.z1 + D / 2) / 2 }), // front pier
        box(T, H - WINDOW.top, D, wallMat, { x: -W / 2 - T / 2, y: (H + WINDOW.top) / 2, z: 0 }), // header
      ],
      { win: [0.16, 0.34], draw: [0.12, 0.45] },
    ),
  )

  const rw = plane(D, H, lib.plaster(), { x: W / 2, y: H / 2, ry: -Math.PI / 2 })
  rw.castShadow = false
  pieces.push(piece('rightWall', [rw], { win: [0.2, 0.36], draw: [0.16, 0.5] }))

  const ceil = plane(W, D, lib.plaster(), { y: H, rx: Math.PI / 2 })
  const cove = lib.emissive('#ffcf96', 3.2)
  const coveBack = box(W - 0.6, 0.04, 0.1, cove, { x: 0, y: H - 0.03, z: -D / 2 + 0.28 })
  const coveRight = box(0.1, 0.04, D - 0.8, cove, { x: W / 2 - 0.28, y: H - 0.03, z: 0 })
  const downMat = lib.emissive('#ffe2b8', 2.4)
  const downs = []
  for (const x of [-1.6, 0.3, 2.2]) for (const z of [-2.0, 1.4]) downs.push(cyl(0.1, 0.1, 0.02, 20, downMat, { x, y: H - 0.01, z }))
  ;[coveBack, coveRight, ...downs].forEach((m) => (m.castShadow = false))
  ceil.userData.cast = true
  pieces.push(piece('ceiling', [ceil, coveBack, coveRight, ...downs], { win: [0.3, 0.5], dir: [-1, 0, 0], draw: [0.22, 0.55] }))

  pieces.push(
    piece('featureWall', [box(4.4, 2.95, 0.08, lib.travertine(), { x: 0.3, y: 1.475, z: -D / 2 + 0.04 })], {
      win: [0.36, 0.5],
      draw: [0.3, 0.62],
    }),
  )

  return pieces
}

export class BlueprintGrid {
  constructor() {
    this.uniforms = {
      uFade: { value: 1 },
      uDraw: { value: 0 },
      uColor: { value: new THREE.Color('#3a352f') },
    }
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vW;
        void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform float uFade; uniform float uDraw; uniform vec3 uColor;
        varying vec3 vW;
        float grid(vec2 p, float s){
          vec2 g = abs(fract(p / s - 0.5) - 0.5) / (fwidth(p / s) * 1.0);
          return 1.0 - min(min(g.x, g.y), 1.0);
        }
        void main(){
          float r = length(vW.xz);
          float reveal = smoothstep(uDraw * 26.0, uDraw * 26.0 - 6.0, r);
          float fall = smoothstep(18.0, 3.0, r);
          float a = (grid(vW.xz, 0.5) * 0.10 + grid(vW.xz, 2.5) * 0.18) * fall * reveal * uFade;
          if (a < 0.002) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
    })
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat)
    this.mesh.rotation.x = -Math.PI / 2
    this.mesh.position.y = -0.21
    this.mesh.renderOrder = 1
  }
  update(p, intro) {
    this.uniforms.uDraw.value = Math.min(1, intro * 1.4)
    this.uniforms.uFade.value = 1 - Math.min(1, Math.max(0, (p - 0.04) / 0.3))
    this.mesh.visible = this.uniforms.uFade.value > 0.002
  }
  dispose() {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
