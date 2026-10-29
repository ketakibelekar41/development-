import { useRef } from 'react'
import { useProgress } from '../lib/useProgress.js'


export default function Scrim({ store }) {
  const root = useRef(null)
  useProgress(store, (p) => {
    const t = Math.min(1, Math.max(0, (p - 0.66) / 0.16))
    if (root.current) root.current.style.opacity = t * t * (3 - 2 * t)
  })
  return (
    <div
      ref={root}
      className="pointer-events-none absolute inset-0 z-[5] opacity-0"
      style={{
        background:
          'radial-gradient(120% 90% at 0% 100%, rgba(14,10,7,.78) 0%, rgba(14,10,7,.45) 38%, rgba(14,10,7,0) 70%), radial-gradient(140% 120% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.35) 100%)',
      }}
    />
  )
}
