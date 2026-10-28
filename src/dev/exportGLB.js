import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

/**
 * DEV ONLY (loaded with ?debug): exports any procedural piece as a GLB so you
 * get a ready-made asset to open in Blender, replace, or compress.
 *   window.__exportGLB('sofa')  ->  base64 string of the .glb
 * Bump maps are baked to normal maps (glTF has no bump channel) so the fabric
 * relief survives the round trip.
 */
function heightToNormal(tex, strength = 2.4) {
  const img = tex.image
  const w = img.width
  const h = img.height
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const src = ctx.getImageData(0, 0, w, h).data
  const out = ctx.createImageData(w, h)
  const hgt = (x, y) => {
    const i = (((y + h) % h) * w + ((x + w) % w)) * 4
    return (src[i] * 0.3 + src[i + 1] * 0.59 + src[i + 2] * 0.11) / 255
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (hgt(x + 1, y) - hgt(x - 1, y)) * strength
      const dy = (hgt(x, y + 1) - hgt(x, y - 1)) * strength
      const l = Math.hypot(dx, dy, 1)
      const i = (y * w + x) * 4
      out.data[i] = ((-dx / l) * 0.5 + 0.5) * 255
      out.data[i + 1] = ((dy / l) * 0.5 + 0.5) * 255 // glTF is +Y up; canvas rows go down
      out.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255
      out.data[i + 3] = 255
    }
  }
  ctx.putImageData(out, 0, 0)
  const nt = new THREE.CanvasTexture(c)
  nt.wrapS = tex.wrapS
  nt.wrapT = tex.wrapT
  nt.repeat.copy(tex.repeat)
  return nt
}

export function install(engine) {
  window.__exportGLB = async (name) => {
    const piece = engine.pieces.find((p) => p.name === name)
    if (!piece) throw new Error(`no piece "${name}"`)
    const orig = []
    piece.group.traverse((o) => o.isMesh && orig.push(o))
    const clone = piece.group.clone(true)
    clone.position.set(0, 0, 0)
    clone.rotation.set(0, 0, 0)
    const lines = []
    clone.traverse((o) => o.isLine && lines.push(o))
    lines.forEach((o) => o.parent.remove(o))

    // Blueprint proxies: one `SKETCH_n` mesh per solid (crisp cage if the solid is
    // rounded). The runtime draws their edges as the sketch and never renders them.
    const proxyMat = new THREE.MeshBasicMaterial({ name: 'sketch-proxy' })
    const proxies = []
    let mi = 0
    clone.traverse((o) => {
      if (!o.isMesh) return
      const src = orig[mi++] // clone() JSON-copies userData, so read the real flags/geometry from the original
      if (src.userData.noLines) return
      const p = new THREE.Mesh(src.userData.sketch || src.geometry, proxyMat)
      p.name = `SKETCH_${proxies.length}`
      p.position.copy(o.position)
      p.quaternion.copy(o.quaternion)
      p.scale.copy(o.scale)
      proxies.push([o.parent, p])
    })
    proxies.forEach(([parent, p]) => parent.add(p))

    const cache = new Map()
    clone.traverse((o) => {
      o.visible = true
      o.userData = {} // internal engine flags must not leak into the file
      if (!o.isMesh || o.name.startsWith('SKETCH_')) return
      const m = o.material
      if (!cache.has(m)) {
        const c = m.clone()
        c.userData = {}
        c.onBeforeCompile = () => {}
        if (c.bumpMap && !c.normalMap) c.normalMap = heightToNormal(c.bumpMap)
        c.bumpMap = null
        cache.set(m, c)
      }
      o.material = cache.get(m)
    })

    const buf = await new GLTFExporter().parseAsync(clone, { binary: true, maxTextureSize: 1024 })
    const bytes = new Uint8Array(buf)
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    return btoa(bin)
  }
}
