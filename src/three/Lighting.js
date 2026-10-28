import * as THREE from 'three'
import { LAMP, PENDANT } from './builders/accents.js'
import { ROOM } from './builders/shell.js'
import { lerp, range, smooth } from './utils/math.js'

/**
 * Lighting rig (4 real lights + image-based lighting):
 *   - Sun         : warm directional light through the window, the only shadow
 *                   caster (static shadow map, re-rendered only when casters change)
 *   - Hemisphere  : very low sky/ground bounce
 *   - Lamp        : warm point light at the floor lamp
 *   - Spot        : warm accent spot over the coffee table
 * Environment (PMREM RoomEnvironment) supplies reflections on glass, brass,
 * marble and the lacquered floor.
 *
 * Everything is a function of scroll progress: the model is lit softly in
 * "clay" mode, then the sun, practical lights and cove lights come up in
 * Stage 3.
 */
export class Lighting {
  constructor(scene) {
    this.hemi = new THREE.HemisphereLight('#fff1e0', '#8a7664', 0)
    this.sun = new THREE.DirectionalLight('#ffe0b8', 0)
    this.sun.position.set(-9, 6.2, 2.0)
    this.sun.target.position.set(0, 0.2, -1.2)
    const c = this.sun.shadow.camera
    c.left = -7
    c.right = 7
    c.top = 6
    c.bottom = -6
    c.near = 1
    c.far = 26
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.03
    this.sun.shadow.radius = 4

    this.lamp = new THREE.PointLight('#ffb064', 0, 8, 2)
    this.lamp.position.set(LAMP.x, LAMP.shadeY, LAMP.z + 0.1)

    this.spot = new THREE.SpotLight('#ffd7a3', 0, 12, 0.55, 0.7, 2)
    this.spot.position.set(PENDANT.x, ROOM.H - 0.1, PENDANT.z + 0.3)
    this.spot.target.position.set(PENDANT.x, 0.4, PENDANT.z - 0.2)

    this.shadowsEnabled = true
    scene.add(this.hemi, this.sun, this.sun.target, this.lamp, this.spot, this.spot.target)
    this.scene = scene
  }

  setShadows(enabled, mapSize) {
    this.shadowsEnabled = enabled
    this.sun.castShadow = enabled
    if (this.sun.shadow.mapSize.x !== mapSize) {
      this.sun.shadow.map?.dispose()
      this.sun.shadow.map = null
      this.sun.shadow.mapSize.set(mapSize, mapSize)
    }
  }

  /** @returns lit factor 0..1 (used by the post pipeline / materials) */
  update(p) {
    const clay = smooth(range(p, 0.28, 0.5)) // soft model lighting appears with the solids
    const lit = smooth(range(p, 0.7, 0.96)) // practicals + cove come on
    const sunUp = smooth(range(p, 0.55, 0.98))

    this.hemi.intensity = lerp(0, 0.8, clay) * lerp(1, 0.22, lit)
    this.sun.intensity = lerp(0, 1.3, clay) + lerp(0, 1.5, sunUp)
    this.sun.color.set('#ffe9cc').lerp(new THREE.Color('#ffd49a'), lit)
    this.lamp.intensity = lit * 7
    this.spot.intensity = lit * 38
    return lit
  }

  dispose() {
    this.sun.shadow.map?.dispose()
  }
}
