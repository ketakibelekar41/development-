import * as THREE from 'three'
import { clamp, lerp, range, smooth } from './utils/math.js'

/**
 * Cinematic camera, a pure function of scroll progress.
 *
 * Position and look-at target travel along two Catmull-Rom splines:
 *   aerial 3/4 cut-away  ->  descend towards the room  ->  glide in through the
 *   open front  ->  eye-level hero composition.
 * A gentle dolly-zoom (FOV 34 -> 27) tightens the final frame; pointer parallax
 * and a micro "breathing" sway keep it alive.
 */
const POS = [
  [8.6, 7.4, 10.8],
  [7.0, 5.2, 8.8],
  [4.8, 3.0, 7.2],
  [3.5, 1.9, 5.5],
  [2.35, 1.5, 4.0],
]
const LOOK = [
  [0.0, 0.6, -0.5],
  [0.0, 0.9, -0.8],
  [-0.1, 1.1, -1.0],
  [-0.4, 1.1, -1.3],
  [-0.65, 1.05, -1.65],
]

export class CameraRig {
  constructor(camera) {
    this.camera = camera
    this.pos = new THREE.CatmullRomCurve3(POS.map((a) => new THREE.Vector3(...a)), false, 'centripetal')
    this.look = new THREE.CatmullRomCurve3(LOOK.map((a) => new THREE.Vector3(...a)), false, 'centripetal')
    this._p = new THREE.Vector3()
    this._l = new THREE.Vector3()
    this._right = new THREE.Vector3()
    this._up = new THREE.Vector3()
    this._d = new THREE.Vector3()
    this._r = new THREE.Vector3()
    this._lk = new THREE.Vector3()
    this.aspect = 1.78
  }

  setAspect(aspect) {
    this.aspect = aspect
    this.camera.aspect = aspect
  }

  update(p, pointer, time, look) {
    const t = clamp(p)
    this.pos.getPoint(t, this._p)
    this.look.getPoint(t, this._l)

    // drag-to-look: rotate the view direction around the camera position
    this._lk.copy(this._l)
    if (look && (look.yaw || look.pitch)) {
      const enable = smooth(range(t, 0.5, 0.62)) // only active in the interior stage
      this._d.copy(this._l).sub(this._p)
      const len = this._d.length()
      this._d.normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, look.yaw * enable)
      this._r.crossVectors(this._d, THREE.Object3D.DEFAULT_UP).normalize()
      this._d.applyAxisAngle(this._r, look.pitch * enable)
      this._lk.copy(this._p).addScaledVector(this._d, len)
    }

    // dolly-zoom + responsive FOV (keep >= ~58deg horizontal on portrait screens)
    const base = lerp(34, 27, smooth(range(t, 0.55, 1)))
    const hfovMin = THREE.MathUtils.degToRad(52)
    const vfovForWidth = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfovMin / 2) / this.aspect))
    const fov = Math.min(66, Math.max(base, vfovForWidth))
    if (Math.abs(fov - this.camera.fov) > 1e-3) {
      this.camera.fov = fov
      this.camera.updateProjectionMatrix()
    }

    // pointer parallax: strongest at the end, light while it is a drawing
    const amt = lerp(0.18, 0.42, smooth(range(t, 0.3, 1)))
    this.camera.position.copy(this._p)
    this.camera.lookAt(this._lk)
    this.camera.updateMatrixWorld()
    this._right.setFromMatrixColumn(this.camera.matrixWorld, 0)
    this._up.setFromMatrixColumn(this.camera.matrixWorld, 1)
    this.camera.position
      .addScaledVector(this._right, pointer.x * amt)
      .addScaledVector(this._up, pointer.y * amt * 0.5)
    this.camera.position.y += Math.sin(time * 0.6) * 0.008
    this.camera.lookAt(this._lk)
  }
}
