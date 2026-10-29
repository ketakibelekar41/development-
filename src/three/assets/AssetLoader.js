import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'


export async function loadModels(renderer, manifest, { onProgress, isCancelled } = {}) {
  const entries = Object.entries(manifest).filter(([, m]) => m.enabled)
  const out = {}
  if (!entries.length) return out

  const base = import.meta.env.BASE_URL
  const draco = new DRACOLoader().setDecoderPath(`${base}draco/`)
  const ktx2 = new KTX2Loader().setTranscoderPath(`${base}basis/`).detectSupport(renderer)
  const loader = new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder)

  const progress = new Map(entries.map(([k]) => [k, 0]))
  const report = () => onProgress?.([...progress.values()].reduce((a, b) => a + b, 0) / entries.length)

  await Promise.all(
    entries.map(async ([key, cfg]) => {
      try {
        const gltf = await loader.loadAsync(cfg.url, (e) => {
          if (e.lengthComputable) {
            progress.set(key, e.loaded / e.total)
            report()
          }
        })
        if (!isCancelled?.()) out[key] = gltf.scene
      } catch (err) {
        console.warn(`[assets] "${key}" (${cfg.url}) could not be loaded — using the procedural fallback.`, err?.message ?? err)
      }
      progress.set(key, 1)
      report()
    }),
  )
  draco.dispose()
  ktx2.dispose()
  return out
}

export function preloadTextures(root, renderer) {
  const seen = new Set()
  root.traverse((o) => {
    if (!o.isMesh) return
    const ms = Array.isArray(o.material) ? o.material : [o.material]
    ms.forEach((m) => {
      for (const v of Object.values(m)) {
        if (v && v.isTexture && !seen.has(v)) {
          seen.add(v)
          renderer.initTexture(v)
        }
      }
    })
  })
}

export function disposeTree(root) {
  root.traverse((o) => {
    o.geometry?.dispose?.()
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []
    ms.forEach((m) => {
      for (const v of Object.values(m)) if (v && v.isTexture) v.dispose()
      m.dispose()
    })
  })
}

export { THREE }
