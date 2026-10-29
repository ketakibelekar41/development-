import { useEffect, useRef } from 'react'
import { Engine } from '../three/Engine.js'


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
      window.__engine = engine 
      import('../dev/exportGLB.js').then((m) => m.install(engine)) 
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
