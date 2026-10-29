import { useEffect, useState } from 'react'

export default function Loader({ pct, label, ready, onDone }) {
  const [shown, setShown] = useState(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    let raf
    const tick = () => {
      setShown((s) => (Math.abs(pct - s) < 0.002 ? pct : s + (pct - s) * 0.12))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pct])

  useEffect(() => {
    if (!ready || shown < 0.995) return
    const t1 = setTimeout(() => setLeaving(true), 350)
    const t2 = setTimeout(onDone, 350 + 1100)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [ready, shown, onDone])

  const n = Math.round(shown * 100)
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-paper text-ink transition-opacity duration-1000 ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
    >
      <svg viewBox="0 0 120 120" className="h-28 w-28" fill="none" stroke="currentColor" strokeWidth="1">
        {[
          'M60 14 L104 38 L104 82 L60 106 L16 82 L16 38 Z',
          'M60 14 L60 58 M16 38 L60 58 L104 38',
          'M60 58 L60 106',
          'M38 26 L82 50 M38 94 L82 70',
        ].map((d, i) => (
          <path
            key={i}
            d={d}
            pathLength="1"
            strokeDasharray="1"
            style={{ animation: `draw 1.8s ${i * 0.25}s cubic-bezier(.6,0,.2,1) both` }}
          />
        ))}
      </svg>

      <p className="mt-10 font-serif text-3xl font-light tracking-wide">Ardent &amp; Vale</p>
      <p className="mt-2 text-[11px] uppercase tracking-[0.32em] opacity-60">{label}</p>

      <div className="mt-10 h-px w-56 bg-ink/15">
        <div className="h-px bg-ink transition-[width] duration-150" style={{ width: `${n}%` }} />
      </div>
      <p className="mt-3 font-mono text-[11px] tabular-nums tracking-widest opacity-60">{String(n).padStart(3, '0')}</p>
    </div>
  )
}
