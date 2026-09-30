import type { PlanterDesign } from './design'

/**
 * The round body's silhouette as fractions of its widest point: where the
 * outline meets the ground (`base`) and the rim (`rim`). Roundness pulls both
 * ends in; taper opens the rim and tucks the base.
 */
export function roundProfileEnds(design: PlanterDesign) {
  const ends = 1 - 0.45 * design.body.roundness
  const clamp = (value: number) => Math.max(0.3, Math.min(0.98, value))
  return { base: clamp(ends - design.body.taper * 0.8), rim: clamp(ends + design.body.taper * 0.8) }
}

/**
 * One elliptical arc through the base, the widest point (scale 1) and the
 * rim, so the body reads as a ball with its ends cut flat.
 */
function roundScale(design: PlanterDesign, t: number) {
  const { base, rim } = roundProfileEnds(design)
  const p = Math.sqrt(1 - base ** 2)
  const q = Math.sqrt(1 - rim ** 2)
  const a = 1 / (p + q)
  const center = a * p
  return Math.sqrt(Math.max(0, 1 - ((t - center) / a) ** 2))
}

export function vesselOuterScale(design: PlanterDesign, z: number): number {
  const t = Math.max(0, Math.min(1, z / design.body.height))
  if (design.body.shape === 'round') return roundScale(design, t)
  return 0.88 + Math.sin(Math.PI * t) * design.body.roundness * 0.07 + design.body.taper * (t - 0.25)
}

/** d(scale)/dz in 1/mm, one-sided at the base and rim. */
export function vesselOuterSlope(design: PlanterDesign, z: number): number {
  const h = 0.05
  const z0 = Math.max(0, Math.min(design.body.height - h, z - h / 2))
  return (vesselOuterScale(design, z0 + h) - vesselOuterScale(design, z0)) / h
}

/**
 * Cavity radii at height z (floor to rim). The bucket keeps its near-straight
 * cavity sized from the opening; the round body's cavity follows the outer
 * wall at wall thickness, measured square to the leaning surface.
 */
export function vesselInnerRadii(design: PlanterDesign, z: number) {
  const { body, opening } = design
  if (body.shape !== 'round') {
    const t = Math.max(0, Math.min(1, (z - opening.floor) / (body.height - opening.floor)))
    const scale = 0.94 + t * 0.06
    return { rx: opening.width / 2 * scale, ry: opening.depth / 2 * scale }
  }
  const scale = vesselOuterScale(design, z)
  const slope = vesselOuterSlope(design, z)
  const inset = (half: number) => opening.wall * Math.hypot(1, half * slope)
  return {
    rx: body.width / 2 * scale - inset(body.width / 2),
    ry: body.depth / 2 * scale - inset(body.depth / 2),
  }
}

/** The opening actually cut at the rim. */
export function vesselOpening(design: PlanterDesign) {
  const { rx, ry } = vesselInnerRadii(design, design.body.height)
  return { width: rx * 2, depth: ry * 2 }
}

/**
 * Steepest lean of the wall from vertical, in degrees. On the round body the
 * base leans out (an overhang outside) and the rim leans in (an overhang
 * inside the cavity).
 */
export function maxWallLean(design: PlanterDesign) {
  const half = Math.max(design.body.width, design.body.depth) / 2
  let steepest = 0
  for (let i = 0; i <= 64; i += 1) {
    const slope = vesselOuterSlope(design, (i / 64) * design.body.height)
    steepest = Math.max(steepest, Math.abs(slope) * half)
  }
  return Math.atan(steepest) * 180 / Math.PI
}

/** Perimeter of the body outline at its widest (scale 1), by Ramanujan's approximation. */
export function outlinePerimeter(design: PlanterDesign) {
  const a = design.body.width / 2
  const b = design.body.depth / 2
  const h = ((a - b) / (a + b)) ** 2
  return Math.PI * (a + b) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h)))
}

/**
 * Narrowest spacing between neighbouring ribs, measured square to the ribs,
 * where the outline is smallest.
 */
export function minTexturePitch(design: PlanterDesign) {
  let smallest = Infinity
  for (let i = 0; i <= 64; i += 1) smallest = Math.min(smallest, vesselOuterScale(design, (i / 64) * design.body.height))
  const { count, angle } = design.texture
  return outlinePerimeter(design) * smallest / count * Math.cos(angle * Math.PI / 180)
}
