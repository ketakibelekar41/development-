import { useEffect, useRef } from 'react'

/**
 * Subscribe a callback to the damped scroll progress WITHOUT re-rendering React.
 * Overlays mutate their DOM nodes (opacity / transform) imperatively inside the
 * callback, so 60fps scroll never triggers reconciliation.
 */
export function useProgress(store, fn) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    const cb = (p) => ref.current(p)
    cb(store.value)
    return store.subscribe(cb)
  }, [store])
}

/** Trapezoid visibility: 0 -> 1 over [a,b], 1 until c, 1 -> 0 over [c,d]. */
export function windowOpacity(p, a, b, c, d) {
  if (p <= a || p >= d) return 0
  if (p < b) return (p - a) / (b - a)
  if (p <= c) return 1
  return 1 - (p - c) / (d - c)
}
