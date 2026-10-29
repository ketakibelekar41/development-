import { useRef } from 'react'
import { useProgress } from '../lib/useProgress.js'

export default function DragHint({ store }) {
  const root = useRef(null)
  useProgress(store, (p) => {
    const t = Math.min(1, Math.max(0, (p - 0.86) / 0.1))
    if (root.current) root.current.style.opacity = t
  })
  return (
    <div
      ref={root}
      className="pointer-events-none absolute right-6 top-24 z-10 flex items-center gap-3 opacity-0 md:right-12"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" />
      </svg>
      <span className="text-[10px] uppercase tracking-[0.3em] opacity-80">Drag to look around · double-click to reset</span>
    </div>
  )
}
