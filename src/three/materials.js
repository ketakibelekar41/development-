import * as THREE from 'three'

/**
 * Material system
 * ---------------
 * 1. makeRevealable(material): patches a stock PBR material (onBeforeCompile) so
 *    it can
 *      - dissolve / assemble along a direction with 3D noise + a glowing front
 *        (uReveal 0..1, per-piece uniforms)
 *      - blend from a neutral "clay" architectural-model look to its full PBR
 *        look (uPBR, shared by every material)
 *      - gate its emissive output with a shared "lights on" factor (uLit)
 *    All of the lighting, shadow and tone-mapping code of MeshStandard/Physical
 *    is retained – we only splice a few lines into the stock shader chunks.
 *
 * 2. createSketchMaterial(): the hand-drawn blueprint line shader.
 */

/** Uniforms shared by every patched material (one write per frame). */
export const SHARED = {
  uPBR: { value: 0 },
  uLit: { value: 0 },
}

/** Uniforms shared by every sketch (line) material. */
export const SKETCH_SHARED = {
  uInk: { value: new THREE.Color('#2a2622') },
  uAccent: { value: new THREE.Color('#c4572e') },
  uSketchy: { value: 1 },
  uPointer: { value: new THREE.Vector2(-9999, -9999) }, // CSS px, y from bottom
  uPixelRatio: { value: 1 },
}

const NOISE_GLSL = /* glsl */ `
float rvHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float rvNoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(rvHash(i), rvHash(i + vec3(1,0,0)), f.x), mix(rvHash(i + vec3(0,1,0)), rvHash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(rvHash(i + vec3(0,0,1)), rvHash(i + vec3(1,0,1)), f.x), mix(rvHash(i + vec3(0,1,1)), rvHash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
`

export function makeRevealable(material, { clay = true, glow = '#ffb070' } = {}) {
  const reveal = {
    uReveal: { value: 0 },
    uOrigin: { value: new THREE.Vector3() },
    uDir: { value: new THREE.Vector3(0, 1, 0) },
    uLen: { value: 1 },
    uGlow: { value: new THREE.Color(glow) },
  }
  material.userData.reveal = reveal

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, reveal, SHARED)

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vWPos;
uniform float uReveal; uniform vec3 uOrigin; uniform vec3 uDir; uniform float uLen;
uniform vec3 uGlow; uniform float uPBR; uniform float uLit;
${NOISE_GLSL}`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
float rvEdge = 0.0;
if (uReveal < 0.9995) {
  float t = dot(vWPos - uOrigin, uDir) / uLen;          // 0..1 along the sweep axis
  float n = rvNoise(vWPos * 4.0);                       // ragged front
  float k = t * 0.72 + n * 0.28;
  float d = uReveal * 1.25 - 0.1 - k;
  if (d < 0.0) discard;
  rvEdge = 1.0 - smoothstep(0.0, 0.07, d);              // glowing seam at the front
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
${clay ? 'diffuseColor.rgb = mix(vec3(0.80, 0.78, 0.74), diffuseColor.rgb, uPBR);' : ''}`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
${clay ? 'roughnessFactor = mix(0.92, roughnessFactor, uPBR);' : ''}`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
${clay ? 'metalnessFactor *= uPBR;' : ''}`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
totalEmissiveRadiance *= uLit;
totalEmissiveRadiance += uGlow * rvEdge * 1.6;`,
      )
  }
  material.customProgramCacheKey = () => `reveal-${clay ? 'clay' : 'flat'}`
  return material
}

/**
 * Sketch (blueprint) line material. Draws a pen-like sweep along the piece's
 * reveal axis, wobbles vertices like a hand drawing, dashes "construction"
 * lines and brightens ink near the pointer.
 */
export function createSketchMaterial({ dash = false, wobble = 1 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...SKETCH_SHARED,
      uDraw: { value: 0 },
      uFade: { value: 1 },
      uDash: { value: dash ? 1 : 0 },
      uWobble: { value: wobble },
      uOrigin: { value: new THREE.Vector3() },
      uDir: { value: new THREE.Vector3(0, 1, 0) },
      uLen: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute float lineDistance;
      uniform float uSketchy; uniform float uWobble; uniform vec3 uOrigin; uniform vec3 uDir; uniform float uLen;
      varying float vT; varying float vLD;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec3 q = floor(wp.xyz * 40.0 + 0.5);                // same corner -> same wobble
        vec3 j = vec3(h(q), h(q + 7.1), h(q + 13.3)) - 0.5;
        wp.xyz += j * 0.05 * uSketchy * uWobble;
        vT = dot(wp.xyz - uOrigin, uDir) / uLen;
        vLD = lineDistance;
        vec4 clip = projectionMatrix * viewMatrix * wp;
        clip.z -= 0.0006 * clip.w;                          // pull lines slightly towards camera (no z-fight with solids)
        gl_Position = clip;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uInk; uniform vec3 uAccent;
      uniform float uDraw; uniform float uFade; uniform float uDash;
      uniform vec2 uPointer; uniform float uPixelRatio;
      varying float vT; varying float vLD;
      void main(){
        float head = uDraw * 1.35 - 0.15;                   // pen position along the sweep axis
        if (vT > head) discard;
        if (uDash > 0.5 && mod(vLD * 7.0, 1.0) > 0.62) discard;
        float tip = smoothstep(0.12, 0.0, head - vT) * step(uDraw, 0.999);
        float d = distance(gl_FragCoord.xy / uPixelRatio, uPointer);
        float near = smoothstep(190.0, 0.0, d);
        vec3 col = mix(uInk, uAccent, clamp(near * 0.95 + tip, 0.0, 1.0));
        gl_FragColor = vec4(col, uFade * (0.82 + 0.18 * near));
      }`,
  })
}

/* ------------------------------------------------------------------ */
/* Material library: every call returns a NEW instance (uniform sets   */
/* are per-piece) but all instances share the same textures + shader    */
/* program, so the GPU cost is one program per material type.           */
/* ------------------------------------------------------------------ */
export function createMaterialLibrary(tex) {
  const std = (p, o) => makeRevealable(new THREE.MeshStandardMaterial(p), o)
  const phys = (p, o) => makeRevealable(new THREE.MeshPhysicalMaterial(p), o)

  return {
    oakFloor: () =>
      phys({ map: tex.oakFloor, bumpMap: tex.oakFloor, bumpScale: 1.5, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.22 }),
    walnut: () => std({ map: tex.walnut, bumpMap: tex.walnut, bumpScale: 1, roughness: 0.5 }),
    plaster: () => std({ map: tex.plaster, bumpMap: tex.plaster, bumpScale: 0.6, roughness: 0.92 }),
    travertine: () => std({ map: tex.travertine, bumpMap: tex.travertine, bumpScale: 2.0, roughness: 0.62 }),
    marble: () => phys({ map: tex.marble, roughness: 0.14, clearcoat: 0.8, clearcoatRoughness: 0.08 }),
    fabric: (key) => std({ map: tex[key], bumpMap: tex[key], bumpScale: 2.2, roughness: 0.96, color: '#ffffff' }),
    brass: () => std({ color: '#c9a064', metalness: 1, roughness: 0.26 }),
    darkMetal: () => std({ color: '#2a2724', metalness: 0.9, roughness: 0.38 }),
    ceramic: (hex = '#efe9df') => std({ color: hex, roughness: 0.3 }),
    paint: (hex) => std({ color: hex, roughness: 0.7 }),
    leaf: () => std({ color: '#4f6b3c', roughness: 0.65, side: THREE.DoubleSide }),
    glass: () =>
      phys(
        { color: '#dfeaf0', transparent: true, opacity: 0.16, roughness: 0.02, metalness: 0, clearcoat: 1, envMapIntensity: 2, depthWrite: false },
        { clay: false },
      ),
    painting: () => std({ map: tex.art, roughness: 0.85 }),
    emissive: (hex, intensity) =>
      std({ color: '#f5ead8', emissive: new THREE.Color(hex), emissiveIntensity: intensity, roughness: 0.6 }, { glow: '#ffd7a0' }),
  }
}
