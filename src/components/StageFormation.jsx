import { useRef } from 'react'
import { useProgress, windowOpacity } from '../lib/useProgress.js'

export default function StageFormation({ store }) {
  const root = useRef(null)
  const bar = useRef(null)
  useProgress(store, (p) => {
    const o = windowOpacity(p, 0.2, 0.3, 0.78, 0.86)
    const el = root.current
    if (el) {
      el.style.opacity = o
      el.style.transform = `translate3d(0, ${(1 - Math.min(1, o * 1.4)) * 28}px, 0)`
      el.style.visibility = o < 0.01 ? 'hidden' : 'visible'
    }
    if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, Math.max(0, (p - 0.2) / 0.46))})`
  })
  return (
    <div
      ref={root}
      className="pointer-events-none absolute bottom-0 left-0 z-10 w-full px-6 pb-24 pt-24 opacity-0
             bg-gradient-to-t from-[rgb(var(--bg)/0.92)] via-[rgb(var(--bg)/0.75)] to-transparent
             md:bg-none md:px-12 md:pb-20 md:pt-0"
    >      <p className="mb-5 text-[11px] uppercase tracking-[0.32em] opacity-70">02 — Structure</p>
      <h2 className="max-w-2xl font-serif text-3xl font-light leading-[1.05] md:text-6xl">        Form finds <em className="italic">its footing.</em>
      </h2>
      <p className="mt-6 max-w-md text-sm leading-relaxed opacity-75">
        Walls rise from the plan, light is carved through the glazing and each piece is placed in clay — volume,
        proportion and rhythm resolved before a single material is chosen.
      </p>
      <div className="mt-8 h-px w-56 bg-[rgb(var(--fg)/0.25)]">
        <div ref={bar} className="h-px origin-left bg-[rgb(var(--fg))]" />
      </div>
    </div>
  )
}
