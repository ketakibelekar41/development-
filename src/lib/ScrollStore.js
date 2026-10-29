
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
