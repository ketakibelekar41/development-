import { useEffect, useRef } from 'react'


export function useProgress(store, fn) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    const cb = (p) => ref.current(p)
    cb(store.value)
    return store.subscribe(cb)
  }, [store])
}

export function windowOpacity(p, a, b, c, d) {
  if (p <= a || p >= d) return 0
  if (p < b) return (p - a) / (b - a)
  if (p <= c) return 1
  return 1 - (p - c) / (d - c)
}
