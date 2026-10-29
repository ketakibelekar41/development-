import { useRef, useState } from 'react'
import { useProgress } from '../lib/useProgress.js'

const STAGES = [
  { label: 'Sketch', at: 0.0, to: 0.28 },
  { label: 'Structure', at: 0.76, to: 0.84 },
  { label: 'Interior', at: 0.95, to: 1.01 },
]
const stageOf = (p) => (p < 0.28 ? 0 : p < 0.84 ? 1 : 2)

export default function ProgressRail({ store, onJump }) {
  const fill = useRef(null)
  const [active, setActive] = useState(0)
  useProgress(store, (p) => {
    if (fill.current) fill.current.style.transform = `scaleY(${p})`
    const s = stageOf(p)
    setActive((prev) => (prev === s ? prev : s)) 
  })
  return (
    <aside className="absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 items-center gap-5 md:right-12 md:flex">
      <ul className="flex flex-col items-end gap-8 text-[10px] uppercase tracking-[0.3em]">
        {STAGES.map((s, i) => (
          <li key={s.label}>
            <button
              onClick={() => onJump(s.at)}
              className={`cursor-pointer transition-opacity duration-500 ${active === i ? 'opacity-100' : 'opacity-40 hover:opacity-80'}`}
            >
              0{i + 1} · {s.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="relative h-48 w-px bg-[rgb(var(--fg)/0.25)]">
        <div ref={fill} className="absolute inset-0 origin-top bg-[rgb(var(--fg))]" style={{ transform: 'scaleY(0)' }} />
      </div>
    </aside>
  )
}
