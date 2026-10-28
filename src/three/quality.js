/**
 * Quality tiers + adaptive quality.
 *
 *  high   : MSAA RT, bloom, 2048 soft shadows, DPR up to 2, 1024 textures
 *  medium : no MSAA/bloom, 1024 shadows, DPR up to 1.5, 512 textures
 *  low    : no shadows, DPR 1, 512 textures
 *
 * The initial tier is guessed from the device; AdaptiveQuality then watches the
 * real frame time and steps down a tier when the experience is not smooth.
 */
export const TIERS = {
  high: { name: 'high', dpr: 2, msaa: 4, bloom: true, shadows: true, shadowMap: 2048, tex: 1024 },
  medium: { name: 'medium', dpr: 1.5, msaa: 0, bloom: false, shadows: true, shadowMap: 1024, tex: 512 },
  low: { name: 'low', dpr: 1, msaa: 0, bloom: false, shadows: false, shadowMap: 512, tex: 512 },
}
export const TIER_ORDER = ['high', 'medium', 'low']

export function detectInitialTier() {
  const q = new URLSearchParams(window.location.search).get('quality')
  if (q && TIERS[q]) return { tier: q, locked: true }

  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const cores = navigator.hardwareConcurrency || 4
  const mem = navigator.deviceMemory || 8
  if (coarse || cores <= 4 || mem <= 4) return { tier: coarse ? 'low' : 'medium', locked: false }
  return { tier: 'high', locked: false }
}

export class AdaptiveQuality {
  /**
   * @param {() => void} onSlow called when the rolling average frame time is too high
   */
  constructor(onSlow) {
    this.onSlow = onSlow
    this.enabled = true
    this.samples = []
    this.warmup = 60 // ignore shader-compile / texture-upload hitches
    this.window = 90
    this.limitMs = 26 // ~38 fps
  }
  reset() {
    this.samples.length = 0
    this.warmup = 45
  }
  push(dtMs) {
    if (!this.enabled) return
    if (this.warmup > 0) {
      this.warmup--
      return
    }
    this.samples.push(Math.min(dtMs, 100))
    if (this.samples.length >= this.window) {
      const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length
      this.samples.length = 0
      if (avg > this.limitMs) this.onSlow(avg)
    }
  }
}
