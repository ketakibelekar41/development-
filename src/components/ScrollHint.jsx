import { useRef } from 'react'
import { useProgress } from '../lib/useProgress.js'

export default function ScrollHint({ store, visible }) {
  const root = useRef(null)
  useProgress(store, (p) => {
    if (root.current) root.current.style.opacity = Math.max(0, 1 - p * 18)
  })
  return (
    <div
      ref={root}
      className={`pointer-events-none absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3 transition-[visibility] ${
        visible ? 'visible' : 'invisible'
      }`}
    >
      <span className="text-[10px] uppercase tracking-[0.34em] opacity-70">Scroll to build</span>
      <span className="block h-10 w-px bg-[rgb(var(--fg))]" style={{ animation: 'hint 2.2s ease-in-out infinite' }} />
    </div>
  )
}
