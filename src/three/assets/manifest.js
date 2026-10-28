/**
 * GLB manifest — the single place that decides which pieces come from files.
 *
 *  enabled : true  -> load `url`; if the file is missing/corrupt the engine
 *                     silently falls back to the procedural version of that piece.
 *  fit     : uniform-scale the model so ONE dimension matches (metres):
 *            { width } | { height } | { depth }   (so any Blender export fits)
 *  at      : world placement of the model's footprint centre / floor contact
 *  win     : scroll window in which the solid is revealed
 *  draw    : intro window in which its blueprint is drawn
 *
 * Model requirements: Y-up, metres, FRONT FACING +Z, origin anywhere
 * (the loader re-centres it on the floor).
 *
 * Blueprint (the pen drawing before the solid appears) — by default it is
 * traced from the REAL edges of your mesh, however dense. Optional per model:
 *   sketchAngle  : crease angle in degrees (default 35; lower = more lines)
 *   sketchBudget : max line segments for the whole model (default 6000)
 *   sketch: 'box': force the old bounding-box cage
 * Advanced: a mesh named `SKETCH_<anything>` inside the GLB overrides all of
 * this (its edges are drawn, it is never rendered as a solid). Delete such
 * meshes from your file if you want the real outline instead.
 */
const BASE = import.meta.env.BASE_URL

export const MODELS = {
  sofa: {
    enabled: true,
    url: `${BASE}models/sofa.glb`,
    fit: { width: 2.8 },
    at: { x: 0.3, z: -2.4, ry: 0 },
    win: [0.44, 0.58],
    draw: [0.45, 0.78],
    sketchDetail: 14, sketchAngle: 45, wobble: 0.12,
  },
  armchair: {
    enabled: true,
    url: `${BASE}models/armchair.glb`,
    fit: { width: 0.88 },
    at: { x: 3.0, z: -1.2, ry: -1.25 },
    win: [0.54, 0.65],
    draw: [0.5, 0.82],
    sketchDetail: 16, sketchAngle: 45, wobble: 0.12,
  },
  coffeeTable: {
    enabled: true,
    url: `${BASE}models/coffeeTable.glb`,
    fit: { width: 1.1 },
    at: { x: 0.3, z: -0.7, ry: 0 },
    win: [0.5, 0.62],
    draw: [0.5, 0.82],
    sketchDetail: 20, sketchAngle: 40, wobble: 0.12,
  },
  floorLamp: {
    enabled: true,
    url: `${BASE}models/floorLamp.glb`,
    fit: { height: 1.75 },
    at: { x: -1.95, z: -2.35, ry: 0 },
    win: [0.6, 0.7],
    draw: [0.6, 0.88],
  },
    art: {
    enabled: true,
    url: `${BASE}models/art.glb`,
    fit: { width: 1.76 },
    at: { x: 0.3, y: 1.3, z: -2.88, ry: 0 },   // frame bottom at 1.3 m, on the back wall
    win: [0.64, 0.73], draw: [0.62, 0.9],
  },
  pendants: {
    enabled: true,
    url: `${BASE}models/pendants.glb`,
    fit: { height: 1.5 },                      
    at: { x: 0.3, y: 1.7, z: -0.7, ry: 0 },
    win: [0.66, 0.76], draw: [0.66, 0.92],
  },

  plant: { enabled: true, url: `${BASE}models/plant.glb`, fit: { height: 1.3 }, at: { x: -3.25, z: 0.95, ry: 0 }, win: [0.62, 0.72], draw: [0.62, 0.9] },
  shelf: { enabled: false, url: `${BASE}models/shelf.glb`, fit: { width: 1.3 }, at: { x: 3.3, y: 1.15, z: -2.86, ry: 0 }, win: [0.58, 0.68], draw: [0.55, 0.85] },
  rug: { enabled: true, url: `${BASE}models/rug.glb`, fit: { width: 4.2 }, at: { x: 0.3, z: -0.9, ry: 0 }, win: [0.42, 0.52], draw: [0.4, 0.7] },
}
