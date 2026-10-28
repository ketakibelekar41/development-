export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
/** Normalised position of v inside [a, b], clamped to 0..1. */
export const range = (v, a, b) => clamp((v - a) / (b - a))
export const smooth = (t) => t * t * (3 - 2 * t)
export const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10)
export const lerp = (a, b, t) => a + (b - a) * t
