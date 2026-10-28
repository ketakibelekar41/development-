import { useRef } from 'react'
import { useProgress, windowOpacity } from '../lib/useProgress.js'

/** Section 01 — Concept. Visible on load, dissolves as the structure forms. */
export default function StageSketch({ store }) {
  const root = useRef(null)
  useProgress(store, (p) => {
    const o = 1 - Math.min(1, Math.max(0, (p - 0.1) / 0.14))
    const el = root.current
    if (!el) return
    el.style.opacity = o
    el.style.transform = `translate3d(0, ${(1 - o) * -24}px, 0)`
    el.style.visibility = o < 0.01 ? 'hidden' : 'visible'
  })
  return (
    <div ref={root} className="pointer-events-none absolute bottom-0 left-0 z-10 w-full px-6 pb-24 md:px-12 md:pb-20">
      <p className="mb-5 text-[11px] uppercase tracking-[0.32em] opacity-70">01 — Concept</p>
      <h1 className="max-w-3xl font-serif text-5xl font-light leading-[1.02] md:text-7xl lg:text-[5.5rem]">
        Every space begins <br className="hidden md:block" />
        as a <em className="italic">single line.</em>
      </h1>
      <p className="mt-6 max-w-md text-sm leading-relaxed opacity-75">
        Ardent &amp; Vale design rooms that feel inevitable. Scroll to watch an idea become architecture, and
        architecture become home.
      </p>
      <p className="absolute bottom-24 right-6 hidden text-[10px] uppercase tracking-[0.3em] opacity-60 md:bottom-20 md:right-12 md:block">
        Fig. 01 — Concept plan · 1:50
      </p>
    </div>
  )
}
