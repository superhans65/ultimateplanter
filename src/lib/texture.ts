import { isCrossingPattern, type PlanterDesign, type TexturePattern } from './design'
import { faceExtent, footLayout, pawLayout } from './face'
import { vesselOuterScale, vesselOuterSlope } from './profile'

type Point = [number, number, number]

/**
 * Plain bands, in mm, where the wall meets the flat base (and any legs) and
 * the rim (and any ears grown from it), plus the fade into the texture.
 */
export const TEXTURE_BAND = { base: 3, rim: 3, fade: 2.5 } as const
// Clearance around the face features, and around paws and feet, before the
// plain edge starts to fade.
const PANEL_MARGIN = 2.5
const LIMB_MARGIN = 1.5
// A superellipse exponent: the face panel is a rounded rectangle.
const PANEL_POWER = 4
// Rounds the pyramid edges of a knurl and the crossings of a lattice.
const CROSSING_ROUND = 0.2
// A lattice rib covers this share of the distance between two lines.
const LATTICE_WIDTH = 0.5
const SAMPLES_PER_PITCH = 10
const MAX_COLUMNS = 512
const MAX_LEVELS = 400

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const smoothstep01 = (value: number) => {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

/** Distance from a rib family's nearest line: 0 on a line, 1 midway between two. */
const lineDistance = (phase: number) => 2 * Math.abs(phase - Math.round(phase))

/** Polynomial smooth minimum; blends a and b within k of each other. */
function smoothMin(a: number, b: number, k: number) {
  const h = clamp01(0.5 + 0.5 * (b - a) / k)
  return b + (a - b) * h - k * h * (1 - h)
}

/**
 * Relief height, 0–1, from each rib family's line distance. Ribs are raised
 * on their lines; a knurl is grooved along both families, leaving pyramids;
 * a lattice raises both families, leaving diamond pockets. Every profile
 * eases in and out so crests and valleys print round.
 */
export function patternHeight(pattern: TexturePattern, d1: number, d2: number) {
  if (pattern === 'ribs') return smoothstep01(1 - d1)
  const nearest = smoothMin(d1, d2, CROSSING_ROUND)
  if (pattern === 'knurl') return smoothstep01(nearest / (1 - CROSSING_ROUND / 4))
  if (pattern === 'lattice') return smoothstep01(1 - nearest / LATTICE_WIDTH)
  return 0
}

/**
 * Arc length around the body outline at scale 1, from the front centre
 * (θ = −π/2) toward +X. Every level is the same ellipse scaled, so a
 * fraction of the way around (`u`) marks the same place at every height.
 */
function outlineArc(design: PlanterDesign) {
  const a = design.body.width / 2
  const b = design.body.depth / 2
  const samples = 2048
  const step = (Math.PI * 2) / samples
  const arcs = new Float64Array(samples + 1)
  for (let k = 1; k <= samples; k += 1) {
    const theta = -Math.PI / 2 + (k - 0.5) * step
    arcs[k] = arcs[k - 1] + Math.hypot(a * Math.sin(theta), b * Math.cos(theta)) * step
  }
  const perimeter = arcs[samples]
  return {
    perimeter,
    thetaAt(u: number) {
      const target = u * perimeter
      let low = 0
      let high = samples
      while (high - low > 1) {
        const mid = (low + high) >> 1
        if (arcs[mid] <= target) low = mid
        else high = mid
      }
      const t = (target - arcs[low]) / (arcs[high] - arcs[low])
      return -Math.PI / 2 + (low + t) * step
    },
    uAt(theta: number) {
      const k = Math.max(0, Math.min(samples, (theta + Math.PI / 2) / step))
      const low = Math.min(samples - 1, Math.floor(k))
      return (arcs[low] + (arcs[low + 1] - arcs[low]) * (k - low)) / perimeter
    },
  }
}

/**
 * Up the wall at intervals of `dz`: length along the profile, and the twist a
 * line leaning 45° gathers as a fraction of the way around. The meridian's
 * lean uses the outline's mean radius.
 */
function meridianTable(design: PlanterDesign, perimeter: number) {
  const samples = 512
  const dz = design.body.height / samples
  const length = new Float64Array(samples + 1)
  const twist = new Float64Array(samples + 1)
  for (let k = 1; k <= samples; k += 1) {
    const z = (k - 0.5) * dz
    const step = Math.hypot(1, perimeter * vesselOuterSlope(design, z) / (Math.PI * 2)) * dz
    length[k] = length[k - 1] + step
    twist[k] = twist[k - 1] + step / (perimeter * vesselOuterScale(design, z))
  }
  const at = (table: Float64Array, z: number) => {
    const k = Math.max(0, Math.min(samples, z / dz))
    const low = Math.min(samples - 1, Math.floor(k))
    return table[low] + (table[low + 1] - table[low]) * (k - low)
  }
  return {
    length: length[samples],
    twistAt: (z: number) => at(twist, z),
    // Height reached after `target` mm along the profile.
    zAt(target: number) {
      let low = 0
      let high = samples
      while (high - low > 1) {
        const mid = (low + high) >> 1
        if (length[mid] <= target) low = mid
        else high = mid
      }
      return (low + (target - length[low]) / (length[high] - length[low])) * dz
    },
  }
}

/**
 * The outer wall as a grid: `columns` around at even arc spacing, starting
 * at the front centre, and `heights` up at even spacing along the profile.
 * Rim, base and inner rings use the same `angles`, so the shell closes.
 * `point` is the textured surface; `displacement` is the relief alone.
 */
export function outerWall(design: PlanterDesign) {
  const { body, texture } = design
  const textured = texture.pattern !== 'none'
  const outline = outlineArc(design)
  const meridian = meridianTable(design, outline.perimeter)

  // Whole samples per rib, so every rib is meshed alike.
  let perPitch = Math.max(SAMPLES_PER_PITCH, Math.ceil(72 / texture.count))
  if (texture.count * perPitch > MAX_COLUMNS) perPitch = Math.max(6, Math.floor(MAX_COLUMNS / texture.count))
  const columns = textured ? texture.count * perPitch : 72
  const angles = Array.from({ length: columns }, (_, i) => outline.thetaAt(i / columns))

  // Rows about as far apart as columns, so a leaning rib stays smooth.
  let widest = 0
  for (let i = 0; i <= 64; i += 1) widest = Math.max(widest, vesselOuterScale(design, (i / 64) * body.height))
  const baseLevels = body.shape === 'round' ? 40 : 18
  const levels = textured
    ? Math.min(MAX_LEVELS, Math.max(baseLevels, Math.ceil(meridian.length / (outline.perimeter * widest / columns))))
    : baseLevels
  const heights = Array.from({ length: levels + 1 }, (_, l) =>
    l === 0 ? 0 : l === levels ? body.height : meridian.zAt((l / levels) * meridian.length))
  const scales = heights.map((z) => vesselOuterScale(design, z))
  const twists = heights.map((z) => meridian.twistAt(z))

  // Plain pads on the front, in arc length around (s) and height: one under
  // the face, and one under each paw and foot, whose thin edges the relief
  // would otherwise break through.
  const arcAt = (x: number, z: number) => {
    const scale = vesselOuterScale(design, z)
    const u = outline.uAt(-Math.acos(Math.max(-1, Math.min(1, x / (body.width * scale / 2)))))
    return u * outline.perimeter * scale
  }
  const face = faceExtent(design)
  const faceZ = (face.top + face.bottom) / 2
  // Stretch the box so its corners sit inside the rounded rectangle.
  const cornerReach = 2 ** (1 / PANEL_POWER)
  const pads = [{
    s: 0,
    z: faceZ,
    a: arcAt(face.halfWidth, faceZ) * cornerReach + PANEL_MARGIN,
    b: (face.top - face.bottom) / 2 * cornerReach + PANEL_MARGIN,
    power: PANEL_POWER,
  }]
  const limbs = [
    ...(design.animalFeatures.paws ? [pawLayout(design)] : []),
    ...(design.animalFeatures.feet ? [footLayout(design)] : []),
  ]
  for (const limb of limbs) {
    for (const side of [-1, 1]) {
      pads.push({ s: side * arcAt(limb.x, limb.z), z: limb.z, a: limb.halfWidth + LIMB_MARGIN, b: limb.halfHeight + LIMB_MARGIN, power: 2 })
    }
  }
  const panelFade = Math.max(0.1, texture.panelFade)

  const lean = Math.tan((texture.angle * Math.PI) / 180)
  const crossing = isCrossingPattern(texture.pattern)

  function displacement(column: number, level: number) {
    if (!textured) return 0
    const z = heights[level]
    const band = smoothstep01((z - TEXTURE_BAND.base) / TEXTURE_BAND.fade)
      * smoothstep01((body.height - TEXTURE_BAND.rim - z) / TEXTURE_BAND.fade)
    if (band === 0) return 0

    const u = column / columns
    const s = (u > 0.5 ? u - 1 : u) * outline.perimeter * scales[level]
    let panel = 1
    for (const pad of pads) {
      const reach = ((Math.abs(s - pad.s) / pad.a) ** pad.power + (Math.abs(z - pad.z) / pad.b) ** pad.power) ** (1 / pad.power)
      panel *= smoothstep01((reach - 1) * Math.min(pad.a, pad.b) / panelFade)
      if (panel === 0) return 0
    }

    // Both families cross the front centre line at the base, mirrored.
    const d1 = lineDistance(texture.count * (u - lean * twists[level]))
    const d2 = crossing ? lineDistance(texture.count * (u + lean * twists[level])) : 1
    return texture.depth * band * panel * patternHeight(texture.pattern, d1, d2)
  }

  function point(column: number, level: number): Point {
    const theta = angles[column % columns]
    const rx = body.width * scales[level] / 2
    const ry = body.depth * scales[level] / 2
    const cos = Math.cos(theta)
    const sin = Math.sin(theta)
    const offset = displacement(column % columns, level)
    // Out along the outline's normal, so the relief is even all round.
    const nx = cos / rx
    const ny = sin / ry
    const n = Math.hypot(nx, ny)
    return [rx * cos + (offset * nx) / n, ry * sin + (offset * ny) / n, heights[level]]
  }

  return { columns, levels, angles, heights, twists, perimeter: outline.perimeter, thetaAt: outline.thetaAt, displacement, point }
}
