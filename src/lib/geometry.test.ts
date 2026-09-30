import { describe, expect, it } from 'vitest'
import { CAT_PRESET, PRESETS, SAFE_LIMITS, updateAtPath } from './design'
import { cheekLayout } from './face'
import { Vector3 } from 'three'
import { createCatEarGeometry, createLegsGeometry, createSurfaceEllipseGeometry, createVesselGeometry, legLayout, vesselFrontSurface, vesselOuterScale } from './geometry'
import { roundProfileEnds, vesselInnerRadii, vesselOpening, vesselOuterSlope } from './profile'
import type { BufferGeometry } from 'three'

function signedVolume(geometry: BufferGeometry) {
  const position = geometry.getAttribute('position')
  const index = geometry.getIndex()
  const point = (i: number) => new Vector3().fromBufferAttribute(position, index ? index.getX(i) : i)
  const count = index ? index.count : position.count
  let volume = 0
  for (let i = 0; i < count; i += 3) volume += point(i).dot(point(i + 1).cross(point(i + 2))) / 6
  return volume
}

describe('vessel surface projection', () => {
  it('recedes around the curved face and points attachments outward', () => {
    const center = vesselFrontSurface(CAT_PRESET, 0, CAT_PRESET.face.vertical)
    const left = vesselFrontSurface(CAT_PRESET, -CAT_PRESET.face.spacing / 2, CAT_PRESET.face.vertical)
    const right = vesselFrontSurface(CAT_PRESET, CAT_PRESET.face.spacing / 2, CAT_PRESET.face.vertical)

    expect(Math.abs(left.y)).toBeLessThan(Math.abs(center.y))
    expect(right.y).toBeCloseTo(left.y)
    expect(left.normalAngle).toBeLessThan(0)
    expect(right.normalAngle).toBeGreaterThan(0)
    expect(Math.hypot(left.normalX, left.normalY)).toBeCloseTo(1)
    expect(left.normalX).toBeLessThan(0)
    expect(left.normalY).toBeLessThan(0)
  })
})

describe('surface-following reliefs', () => {
  it('wraps an eye edge around the changing vessel contour', () => {
    const centerX = CAT_PRESET.face.spacing / 2
    const centerZ = CAT_PRESET.face.vertical
    const radiusX = 4
    const radiusZ = 5
    const depth = CAT_PRESET.face.depth
    const segments = 32
    const geometry = createSurfaceEllipseGeometry(CAT_PRESET, centerX, centerZ, radiusX, radiusZ, depth, { radialSegments: 8, curveSegments: segments })
    const position = geometry.getAttribute('position')
    const edgeStart = 1 + 7 * segments

    for (let segment = 0; segment < segments; segment += 1) {
      const point = new Vector3().fromBufferAttribute(position, edgeStart + segment)
      const angle = segment / segments * Math.PI * 2
      const sourceX = centerX + Math.cos(angle) * radiusX
      const sourceZ = centerZ + Math.sin(angle) * radiusZ
      const surface = vesselFrontSurface(CAT_PRESET, sourceX, sourceZ)
      const offset = (point.x - sourceX) * surface.normalX + (point.y - surface.y) * surface.normalY
      expect(offset).toBeCloseTo(-depth * 0.08, 3)
    }
    expect(signedVolume(geometry)).toBeGreaterThan(0)
  })

  it('tilts an oval within the face', () => {
    const segments = 32
    const tilt = 0.3
    const geometry = createSurfaceEllipseGeometry(CAT_PRESET, 0, 50, 4, 8, 2, { tilt, curveSegments: segments })
    const position = geometry.getAttribute('position')
    // The quarter-turn edge point is the top of the oval, swung left by the tilt.
    const top = new Vector3().fromBufferAttribute(position, 1 + 7 * segments + segments / 4)
    // x also carries the edge's slight sink along the wall normal.
    expect(top.x).toBeCloseTo(-8 * Math.sin(tilt), 1)
    expect(top.z).toBeCloseTo(50 + 8 * Math.cos(tilt), 3)
  })

  it('keeps cheeks flatter than the eyes and sized by cheek scale alone', () => {
    const cheek = cheekLayout(CAT_PRESET)
    expect(cheek.depth).toBeLessThan(CAT_PRESET.face.depth)
    expect(cheek.depth).toBeGreaterThanOrEqual(SAFE_LIMITS.featureDepth)
    expect(cheekLayout(updateAtPath(CAT_PRESET, 'face.depth', 4)).halfHeight).toBe(cheek.halfHeight)
    expect(cheekLayout(updateAtPath(CAT_PRESET, 'face.cheekScale', 1.5)).halfHeight).toBeGreaterThan(cheek.halfHeight)
  })
})

describe('round body', () => {
  const round = updateAtPath(PRESETS.dog, 'body.shape', 'round')

  it('swells to its full width between a narrower base and rim', () => {
    const { base, rim } = roundProfileEnds(round)
    expect(vesselOuterScale(round, 0)).toBeCloseTo(base)
    expect(vesselOuterScale(round, round.body.height)).toBeCloseTo(rim)
    let widest = 0
    for (let i = 0; i <= 200; i += 1) widest = Math.max(widest, vesselOuterScale(round, (i / 200) * round.body.height))
    expect(widest).toBeCloseTo(1, 3)
  })

  it('keeps the wall thickness square to the curve', () => {
    for (const z of [round.opening.floor, round.body.height * 0.5, round.body.height]) {
      const { rx } = vesselInnerRadii(round, z)
      const outer = round.body.width * vesselOuterScale(round, z) / 2
      const lean = Math.atan(Math.abs(vesselOuterSlope(round, z)) * round.body.width / 2)
      expect((outer - rx) * Math.cos(lean)).toBeCloseTo(round.opening.wall, 1)
    }
  })

  it('cuts the opening at the rim, ignoring the opening sliders', () => {
    const opening = vesselOpening(round)
    expect(opening.width).toBeLessThan(round.body.width * roundProfileEnds(round).rim)
    expect(vesselOpening(updateAtPath(round, 'opening.width', 50))).toEqual(opening)
    expect(vesselOpening(PRESETS.dog)).toEqual({ width: PRESETS.dog.opening.width, depth: PRESETS.dog.opening.depth })
  })

  it('builds an outward-facing shell', () => {
    expect(signedVolume(createVesselGeometry(round))).toBeGreaterThan(10000)
  })
})

describe('legs', () => {
  it('keeps every flared leg top inside a bucket base', () => {
    for (const preset of Object.values(PRESETS)) {
      for (const width of [70, 180]) {
        const design = updateAtPath(updateAtPath(preset, 'body.shape', 'bucket'), 'body.width', width)
        const { radius, flare, positions } = legLayout(design)
        const scale = vesselOuterScale(design, 0)
        const rx = design.body.width * scale / 2
        const ry = design.body.depth * scale / 2
        const reach = radius + flare
        for (const [x, y] of positions) {
          expect(((Math.abs(x) + reach) / rx) ** 2 + (Math.abs(y) / ry) ** 2).toBeLessThan(1)
          expect((Math.abs(x) / rx) ** 2 + ((Math.abs(y) + reach) / ry) ** 2).toBeLessThan(1)
        }
      }
    }
  })

  it('stands on the ground and reaches just into a bucket base', () => {
    const design = updateAtPath(updateAtPath(PRESETS.dog, 'animalFeatures.legs', true), 'animalFeatures.legHeight', 12)
    const legs = createLegsGeometry(design)
    expect(legs.boundingBox!.min.z).toBeCloseTo(0)
    expect(legs.boundingBox!.max.z).toBeCloseTo(14)
    expect(signedVolume(legs)).toBeGreaterThan(0)
  })

  it('climbs onto a round belly without running up it', () => {
    const design = CAT_PRESET
    const { radius, height, positions } = legLayout(design)
    const legs = createLegsGeometry(design)
    const position = legs.getAttribute('position')
    let highestFillet = 0
    for (let i = 0; i < position.count; i += 1) {
      const p = new Vector3().fromBufferAttribute(position, i)
      // Skip each leg's top-cap centre, which sits hidden inside the body.
      if (positions.some(([x, y]) => Math.hypot(p.x - x, p.y - y) < 1e-6)) continue
      highestFillet = Math.max(highestFillet, p.z)
    }
    expect(highestFillet).toBeGreaterThan(height + 2)
    // At most the climb limit, plus the sink into the body.
    expect(highestFillet).toBeLessThan(height + radius * 1.1 + 1.01)
    expect(signedVolume(legs)).toBeGreaterThan(0)
  })
})

describe('cat ears', () => {
  const earX = CAT_PRESET.body.width * vesselOuterScale(CAT_PRESET, CAT_PRESET.body.height) * 0.32
  const ear = createCatEarGeometry(CAT_PRESET, earX)
  const position = ear.getAttribute('position')
  const index = ear.getIndex()!
  const point = (i: number) => new Vector3().fromBufferAttribute(position, i)

  it('is a closed, outward-facing solid', () => {
    let volume = 0
    for (let i = 0; i < index.count; i += 3) {
      const [a, b, c] = [point(index.getX(i)), point(index.getX(i + 1)), point(index.getX(i + 2))]
      volume += a.dot(b.cross(c)) / 6
    }
    // Positive and substantial; the round rim is thinner than a bucket's.
    expect(volume).toBeGreaterThan(500)
  })

  it('grows out of the rim flush with the outer wall', () => {
    const { body } = CAT_PRESET
    const scale = vesselOuterScale(CAT_PRESET, body.height)
    const rx = body.width * scale / 2
    const ry = body.depth * scale / 2
    let minZ = Infinity
    let maxZ = -Infinity
    let maxOutside = -Infinity
    for (let i = 0; i < position.count; i += 1) {
      const p = point(i)
      minZ = Math.min(minZ, p.z)
      maxZ = Math.max(maxZ, p.z)
      if (Math.abs(p.z - body.height) < 1e-6) maxOutside = Math.max(maxOutside, Math.hypot(p.x / rx, p.y / ry) - 1)
    }
    expect(minZ).toBeCloseTo(body.height - Math.min(10, CAT_PRESET.animalFeatures.earHeight * 0.34), 3)
    expect(maxZ).toBeGreaterThan(body.height + CAT_PRESET.animalFeatures.earHeight - 0.5)
    expect(maxOutside).toBeLessThan(1e-3)
    expect(ear.boundingBox!.min.x).toBeGreaterThan(0)
    // Above the face, on the front half of the rim.
    expect(ear.boundingBox!.max.y).toBeLessThan(0)
  })

  it('has a rounded body whose inner surface stays inside the outer face', () => {
    const targetZ = CAT_PRESET.body.height + CAT_PRESET.animalFeatures.earHeight / 2
    const points: Vector3[] = []
    for (let i = 0; i < position.count; i += 1) {
      const p = point(i)
      if (Math.abs(p.z - targetZ) < 0.5) points.push(p)
    }
    let greatestDepth = 0
    for (const a of points) {
      for (const b of points) {
        if (Math.abs(a.x - b.x) < 0.2) greatestDepth = Math.max(greatestDepth, Math.abs(a.y - b.y))
      }
    }
    expect(greatestDepth).toBeGreaterThan(7)

    const h = targetZ - CAT_PRESET.body.height
    const topScale = vesselOuterScale(CAT_PRESET, CAT_PRESET.body.height)
    const topSlope = Math.max(vesselOuterSlope(CAT_PRESET, CAT_PRESET.body.height), -Math.tan(Math.PI / 12) / (CAT_PRESET.body.width / 2))
    const scale = topScale + topSlope * h
    const rx = CAT_PRESET.body.width * scale / 2
    const ry = CAT_PRESET.body.depth * scale / 2
    const radialPositions = points.map((p) => Math.hypot(p.x / rx, p.y / ry))
    expect(Math.max(...radialPositions)).toBeLessThanOrEqual(1.001)
    expect(Math.min(...radialPositions)).toBeLessThan(0.9)
  })

  it('mirrors for the left ear', () => {
    const left = createCatEarGeometry(CAT_PRESET, -earX)
    expect(left.boundingBox!.min.x).toBeCloseTo(-ear.boundingBox!.max.x, 3)
    expect(left.boundingBox!.min.y).toBeCloseTo(ear.boundingBox!.min.y, 3)
  })
})
