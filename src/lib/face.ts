import { MOUTH_STROKE, SAFE_LIMITS, hasMouth, type NoseStyle, type PlanterDesign } from './design'

const NOSE_LAYOUT: Record<Exclude<NoseStyle, 'none'>, { offset: number; halfWidth: number; halfHeight: number }> = {
  button: { offset: 12, halfWidth: 3.4, halfHeight: 3 },
  oval: { offset: 15, halfWidth: 7, halfHeight: 5 },
  tall: { offset: 10, halfWidth: 6, halfHeight: 9 },
  triangle: { offset: 12, halfWidth: 4.5, halfHeight: 3.5 },
  heart: { offset: 12, halfWidth: 4.5, halfHeight: 4 },
  snout: { offset: 11, halfWidth: 8, halfHeight: 5 },
  beak: { offset: 11, halfWidth: 9, halfHeight: 4 },
}

export function noseLayout(design: PlanterDesign) {
  if (design.face.noseStyle === 'none') return null
  const layout = NOSE_LAYOUT[design.face.noseStyle]
  const size = design.face.scale * design.face.noseScale
  return {
    z: design.face.vertical - layout.offset * design.face.scale,
    halfWidth: layout.halfWidth * size,
    halfHeight: layout.halfHeight * size,
  }
}

/**
 * The mouth hangs below the nose when there is one, leaving room for the
 * dog's philtrum line. `baseZ` is where the mouth's corners meet its centre.
 */
export function mouthLayout(design: PlanterDesign) {
  const scale = design.face.scale * design.face.mouthScale
  const nose = noseLayout(design)
  const gap = (design.animal === 'dog' ? 4 : 2.5) * design.face.scale
  return {
    scale,
    gap,
    baseZ: nose ? nose.z - nose.halfHeight - gap : design.face.vertical - 14 * design.face.scale,
    span: 7 * scale,
    dip: 3.5 * scale,
    radius: MOUTH_STROKE * scale,
  }
}

export function cheekLayout(design: PlanterDesign) {
  const size = design.face.scale * design.face.cheekScale
  return {
    // Larger cheeks move outward so they grow away from the eyes.
    x: design.face.spacing / 2 + 9 + 6 * design.face.scale * (design.face.cheekScale - 1),
    z: design.face.vertical - 12,
    halfWidth: 6 * size,
    halfHeight: 3.5 * size,
    // Blush sits flatter than the eyes: half their relief, but never below
    // what a nozzle can resolve.
    depth: Math.max(SAFE_LIMITS.featureDepth, design.face.depth / 2),
  }
}

export function whiskerLayout(design: PlanterDesign) {
  const scale = design.face.scale
  const outerX = design.body.width * 0.44
  const innerX = Math.min(design.face.spacing / 2 + 14 * scale, outerX - 8 * scale)
  return {
    innerX,
    outerX,
    z: design.face.vertical - 13 * scale,
    gap: 4 * scale,
    // Preserve printable line width when the overall face is scaled down.
    radius: MOUTH_STROKE * Math.max(1, scale),
  }
}

/**
 * A box around every face feature on the front surface: `halfWidth` across
 * (measured in x) and `bottom`–`top` in height.
 */
export function faceExtent(design: PlanterDesign) {
  const { face } = design
  const eyeSize = face.scale * face.eyeScale
  // Wide enough for the largest eye style or a glass-eye mount.
  let halfWidth = face.spacing / 2 + 7 * eyeSize
  let top = face.vertical + 8 * eyeSize
  let bottom = face.vertical - 8 * eyeSize

  const nose = noseLayout(design)
  if (nose) {
    halfWidth = Math.max(halfWidth, nose.halfWidth)
    bottom = Math.min(bottom, nose.z - nose.halfHeight)
  }
  if (hasMouth(design.animal)) {
    const mouth = mouthLayout(design)
    halfWidth = Math.max(halfWidth, mouth.span + mouth.radius)
    // A quadratic curve reaches half its control point's dip.
    bottom = Math.min(bottom, mouth.baseZ - mouth.dip / 2 - mouth.radius)
  }
  if (face.cheeks) {
    const cheek = cheekLayout(design)
    halfWidth = Math.max(halfWidth, cheek.x + cheek.halfWidth)
    bottom = Math.min(bottom, cheek.z - cheek.halfHeight)
    top = Math.max(top, cheek.z + cheek.halfHeight)
  }
  if (design.animal === 'cat' && face.whiskers) {
    const whiskers = whiskerLayout(design)
    halfWidth = Math.max(halfWidth, whiskers.outerX + whiskers.radius)
    bottom = Math.min(bottom, whiskers.z - whiskers.gap - whiskers.radius)
    top = Math.max(top, whiskers.z + whiskers.gap + whiskers.radius)
  }
  return { halfWidth, bottom, top }
}
