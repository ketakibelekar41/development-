/**
 * Single source of truth for scroll progress (0..1).
 *
 *  - `target` is the raw, native scroll position (written by the ScrollTrack).
 *  - `value`  is the damped value that the 3D scene AND the HTML overlays read,
 *    so canvas and DOM always stay perfectly in sync.
 *
 * Native scrolling is kept (a11y, touch, keyboard, scrollbar) and smoothed with
 * frame-rate independent exponential damping — fully reversible, no timelines.
 */
export class ScrollStore {
  constructor() {
    this.target = 0
    this.value = 0
    this.damping = 5.5
    this.subs = new Set()
  }
  setTarget(p) {
    this.target = Math.min(1, Math.max(0, p))
  }
  jump() {
    this.value = this.target
    this.emit()
  }
  /** @returns {boolean} true when the value moved this frame */
  tick(dt) {
    if (this.value === this.target) return false
    const k = 1 - Math.exp(-this.damping * dt)
    this.value += (this.target - this.value) * k
    if (Math.abs(this.target - this.value) < 1e-5) this.value = this.target
    this.emit()
    return true
  }
  emit() {
    this.subs.forEach((fn) => fn(this.value))
  }
  subscribe(fn) {
    this.subs.add(fn)
    return () => this.subs.delete(fn)
  }
}
