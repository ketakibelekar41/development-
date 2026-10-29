import * as THREE from 'three'

function hash2(x, y, s) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
function vnoise(x, y, s, px, py) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const x0 = ((xi % px) + px) % px
  const x1 = (x0 + 1) % px
  const y0 = ((yi % py) + py) % py
  const y1 = (y0 + 1) % py
  const a = hash2(x0, y0, s)
  const b = hash2(x1, y0, s)
  const c = hash2(x0, y1, s)
  const d = hash2(x1, y1, s)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
function fbm(u, v, px, py, seed = 0, oct = 4) {
  let sum = 0
  let amp = 0.5
  let f = 1
  for (let i = 0; i < oct; i++) {
    sum += amp * vnoise(u * px * f, v * py * f, seed + i * 17, px * f, py * f)
    f *= 2
    amp *= 0.5
  }
  return sum
}

function bake(size, w, h, pixel) {
  const canvas = document.createElement('canvas')
  canvas.width = w ?? size
  canvas.height = h ?? size
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(canvas.width, canvas.height)
  const d = img.data
  const W = canvas.width
  const H = canvas.height
  const out = [0, 0, 0]
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      pixel(x / W, y / H, x, y, out)
      const i = (y * W + x) * 4
      d[i] = out[0]
      d[i + 1] = out[1]
      d[i + 2] = out[2]
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

function toTexture(canvas, { repeat = [1, 1], srgb = true, repeatWrap = true } = {}) {
  const t = new THREE.CanvasTexture(canvas)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  if (repeatWrap) t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat[0], repeat[1])
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  return t
}

const hexToRgb = (hex) => {
  const c = new THREE.Color(hex).convertLinearToSRGB()
  return [c.r * 255, c.g * 255, c.b * 255]
}

function genOak(S) {
  const rows = 8
  return bake(S, S, S, (u, v, x, y, out) => {
    const rh = 1 / rows
    const row = Math.floor(v / rh)
    const inRow = (v - row * rh) / rh
    const off = hash2(row, 0, 3)
    const bu = (((u - off) % 1) + 1) % 1
    const board = Math.floor(bu * 2)
    const id = row * 7 + board
    const tone = hash2(id, 1, 9)
    const g = fbm(u, v, 5, 70, 4, 4)
    const g2 = vnoise(u * 3, v * 280, 8, 3, 280)
    let r = 150 + tone * 38
    let gr = 108 + tone * 34
    let b = 70 + tone * 28
    const k = 0.78 + g * 0.5 + (g2 - 0.5) * 0.12
    r *= k
    gr *= k
    b *= k
    const gap = inRow < 0.018 || inRow > 0.985 || (bu * 2) % 1 < 0.004
    if (gap) {
      r *= 0.35
      gr *= 0.35
      b *= 0.35
    }
    out[0] = r
    out[1] = gr
    out[2] = b
  })
}

function genWalnut(S) {
  return bake(S, S, S, (u, v, x, y, out) => {
    const w = fbm(u, v, 2, 8, 21, 3)
    const g = fbm(u, v, 3, 90, 22, 4)
    const ring = 0.5 + 0.5 * Math.sin((v * 8 + w * 3.0) * Math.PI * 2)
    const k = 0.55 + g * 0.55 + ring * 0.18
    out[0] = 92 * k
    out[1] = 60 * k
    out[2] = 40 * k
  })
}

function genMarble(S) {
  return bake(S, S, S, (u, v, x, y, out) => {
    const warp = fbm(u, v, 3, 3, 31, 5)
    const t = (u * 3 + v * 2 + warp * 2.4) * Math.PI * 2
    const vein = Math.pow(1 - Math.abs(Math.sin(t)), 16)
    const warp2 = fbm(u, v, 5, 5, 41, 4)
    const t2 = (u * 7 - v * 5 + warp2 * 3.2) * Math.PI * 2
    const vein2 = Math.pow(1 - Math.abs(Math.sin(t2)), 30) * 0.5
    const cloud = fbm(u, v, 4, 4, 51, 4)
    const m = Math.min(1, vein * 0.75 + vein2)
    const base = 232 - cloud * 18
    out[0] = base * (1 - m * 0.55) - m * 6
    out[1] = (base - 3) * (1 - m * 0.55) - m * 6
    out[2] = (base - 10) * (1 - m * 0.5)
  })
}

function genTravertine(S) {
  return bake(S, S, S, (u, v, x, y, out) => {
    const band = fbm(u, v, 3, 22, 61, 4)
    const cloud = fbm(u, v, 6, 6, 62, 3)
    const pore = fbm(u, v, 40, 150, 63, 2)
    const p = pore > 0.62 ? (pore - 0.62) * 3.2 : 0
    const k = 0.84 + band * 0.26 + cloud * 0.1 - p * 0.55
    out[0] = 216 * k
    out[1] = 196 * k
    out[2] = 164 * k
  })
}

function genPlaster(S) {
  return bake(S, S, S, (u, v, x, y, out) => {
    const n = fbm(u, v, 30, 30, 71, 3)
    const c = fbm(u, v, 3, 3, 72, 3)
    const k = 0.94 + (n - 0.5) * 0.12 + (c - 0.5) * 0.08
    out[0] = 230 * k
    out[1] = 224 * k
    out[2] = 212 * k
  })
}

function genFabric(S, hex, stripes = 0) {
  const [br, bg, bb] = hexToRgb(hex)
  return bake(S, S, S, (u, v, x, y, out) => {
    const weave = 0.5 + 0.5 * Math.sin(x * Math.PI * 0.5) * Math.sin(y * Math.PI * 0.5)
    const n = fbm(u, v, 64, 64, 81, 3)
    const loop = vnoise(u * 160, v * 160, 82, 160, 160)
    let k = 0.72 + n * 0.5 + (loop - 0.5) * 0.28
    k *= 0.9 + weave * 0.12
    if (stripes) {
      const s = Math.abs(Math.sin(v * Math.PI * 2 * stripes))
      k *= s > 0.97 ? 0.75 : 1
    }
    out[0] = br * k
    out[1] = bg * k
    out[2] = bb * k
  })
}

function genSky() {
  const W = 1024
  const H = 512
  return bake(0, W, H, (u, v, x, y, out) => {
    // gradient
    const t = Math.pow(v, 0.8)
    let r = 70 + (240 - 70) * Math.pow(t, 1.5)
    let g = 140 + (232 - 140) * Math.pow(t, 1.5)
    let b = 228 + (214 - 228) * Math.pow(t, 1.5)
    // sun glow
    const dx = u - 0.72
    const dy = v - 0.48
    const glow = Math.exp(-(dx * dx * 6 + dy * dy * 14) * 9)
    r += glow * 120
    g += glow * 95
    b += glow * 60
    // distant tree line
    const hz = 0.66 + (fbm(u, 0, 14, 1, 91, 4) - 0.5) * 0.12
    if (v > hz) {
      const d = Math.min(1, (v - hz) * 6)
      const m = 0.22 + (1 - d) * 0.3
      r = r * (1 - m) + 96 * m + (fbm(u, v, 40, 20, 92, 3) - 0.5) * 18
      g = g * (1 - m) + 118 * m + (fbm(u, v, 40, 20, 92, 3) - 0.5) * 18
      b = b * (1 - m) + 92 * m
    }
    out[0] = r
    out[1] = g
    out[2] = b
  })
}

function genArt() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 640
  const x = c.getContext('2d')
  x.fillStyle = '#eadfce'
  x.fillRect(0, 0, 1024, 640)
  const grd = x.createLinearGradient(0, 0, 1024, 640)
  grd.addColorStop(0, '#e6d8c2')
  grd.addColorStop(1, '#d9c6aa')
  x.fillStyle = grd
  x.fillRect(0, 0, 1024, 640)
  x.fillStyle = '#c4572e'
  x.beginPath()
  x.arc(360, 330, 210, 0, Math.PI * 2)
  x.fill()
  x.fillStyle = '#d9a441'
  x.beginPath()
  x.arc(640, 430, 190, Math.PI, 0)
  x.fill()
  x.fillStyle = '#6e7350'
  x.fillRect(640, 120, 230, 12)
  x.fillRect(700, 150, 170, 12)
  x.fillStyle = '#2a2622'
  x.fillRect(120, 520, 780, 5)
  x.strokeStyle = '#2a2622'
  x.lineWidth = 4
  x.beginPath()
  x.arc(360, 330, 250, -0.6, 0.9)
  x.stroke()
  // paper grain
  const id = x.getImageData(0, 0, 1024, 640)
  for (let i = 0; i < id.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16
    id.data[i] += n
    id.data[i + 1] += n
    id.data[i + 2] += n
  }
  x.putImageData(id, 0, 0)
  return c
}

const nextFrame = () => new Promise((r) => setTimeout(r, 0))


export async function createTextures({ size, onStep, isCancelled }) {
  const S = size
  const F = 512 
  const tex = {}
  const jobs = [
    ['oakFloor', 'Laying oak floor', () => toTexture(genOak(S), { repeat: [5, 3.75] })],
    ['walnut', 'Planing walnut', () => toTexture(genWalnut(F))],
    ['marble', 'Polishing marble', () => toTexture(genMarble(S), { repeat: [1, 1] })],
    ['travertine', 'Cutting travertine', () => toTexture(genTravertine(S), { repeat: [1.6, 1.1] })],
    ['plaster', 'Skimming plaster', () => toTexture(genPlaster(F), { repeat: [3, 1.2] })],
    ['boucle', 'Weaving bouclé', () => toTexture(genFabric(F, '#e3d8c6'), { repeat: [2, 1] })],
    ['terracotta', 'Dyeing linen', () => toTexture(genFabric(F, '#b8603f'))],
    ['olive', 'Dyeing linen', () => toTexture(genFabric(F, '#7f8159'))],
    ['caramel', 'Stitching upholstery', () => toTexture(genFabric(F, '#a8744a'), { repeat: [2, 2] })],
    ['rug', 'Knotting the rug', () => toTexture(genFabric(F, '#cdbd9f', 6), { repeat: [4, 3] })],
    ['sky', 'Painting the view', () => toTexture(genSky(), { repeatWrap: false })],
    ['art', 'Stretching the canvas', () => toTexture(genArt(), { repeatWrap: false })],
  ]
  for (let i = 0; i < jobs.length; i++) {
    if (isCancelled?.()) return tex
    const [key, label, fn] = jobs[i]
    await nextFrame()
    tex[key] = fn()
    onStep?.((i + 1) / jobs.length, label)
  }
  return tex
}

export function configureTextures(tex, renderer) {
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  Object.values(tex).forEach((t) => {
    t.anisotropy = aniso
    renderer.initTexture(t) 
  })
}

export function disposeTextures(tex) {
  Object.values(tex).forEach((t) => t.dispose())
}
