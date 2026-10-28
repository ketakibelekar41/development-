import { useRef } from 'react'
import { useProgress, windowOpacity } from '../lib/useProgress.js'

const MATERIALS = ['Travertine', 'Smoked oak', 'Bouclé', 'Brushed brass', 'Honed marble']

/** Section 03 — Interior. Material palette fades in as the room is lit. */
export default function StageInterior({ store, onContact }) {
  const root = useRef(null)
  useProgress(store, (p) => {
    const o = windowOpacity(p, 0.72, 0.84, 2, 3)
    const el = root.current
    if (!el) return
    el.style.opacity = o
    el.style.transform = `translate3d(0, ${(1 - Math.min(1, o * 1.4)) * 28}px, 0)`
    el.style.visibility = o < 0.01 ? 'hidden' : 'visible'
    el.style.pointerEvents = o > 0.6 ? 'auto' : 'none'
  })
  return (
    <div ref={root} className="absolute bottom-0 left-0 z-10 w-full px-6 pb-24 opacity-0 md:px-12 md:pb-20">
      <p className="mb-5 text-[11px] uppercase tracking-[0.32em] opacity-70">03 — Interior</p>
      <h2 className="max-w-2xl font-serif text-4xl font-light leading-[1.05] md:text-6xl">
        Light, material, <em className="italic">and calm.</em>
      </h2>
      <ul className="mt-6 flex max-w-xl flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.24em] opacity-80">
        {MATERIALS.map((m) => (
          <li key={m} className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-[rgb(var(--fg))]" />
            {m}
          </li>
        ))}
      </ul>
      <button
        onClick={onContact}
        className="hud-border mt-8 cursor-pointer border px-6 py-3 text-[11px] uppercase tracking-[0.3em] transition-colors hover:bg-[rgb(var(--fg)/0.12)]"
      >
        Begin your project
      </button>
    </div>
  )
}
