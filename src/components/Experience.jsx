import { useEffect, useRef } from 'react'
import { Engine } from '../three/Engine.js'

/**
 * Section: the WebGL stage. Owns the Engine lifecycle (create on mount,
 * dispose on unmount). The canvas element is created by the engine itself so
 * React StrictMode's mount/unmount/mount cycle never reuses a lost context.
 */
export default function Experience({ store, engineRef, onProgress, onReady, onTier }) {
  const host = useRef(null)
  const cb = useRef({ onProgress, onReady, onTier })
  cb.current = { onProgress, onReady, onTier }

  useEffect(() => {
    const engine = new Engine(host.current, store, {
      onProgress: (...a) => cb.current.onProgress?.(...a),
      onTier: (...a) => cb.current.onTier?.(...a),
    })
    engineRef.current = engine
    if (new URLSearchParams(location.search).has('debug')) {
      window.__engine = engine // dev: inspect renderer.info
      import('../dev/exportGLB.js').then((m) => m.install(engine)) // dev: window.__exportGLB(name)
    }
    cb.current.onTier?.(engine.tierName, engine.mode)
    engine
      .init()
      .then(() => {
        if (!engine.disposed) cb.current.onReady?.()
      })
      .catch((e) => console.error('[engine] init failed', e))
    return () => {
      engine.dispose()
      if (engineRef.current === engine) engineRef.current = null
    }
  }, [store, engineRef])

  return <div ref={host} className="absolute inset-0" aria-hidden="true" />
}
