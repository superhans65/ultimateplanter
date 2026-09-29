import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { PlanterDesign } from './design'

type Point = [number, number, number]

function ellipse(rx: number, ry: number, z: number, angle: number): Point {
  return [Math.cos(angle) * rx, Math.sin(angle) * ry, z]
}

/**
 * Builds one closed vessel shell in millimetres: outside, inside, rim, floor,
 * underside, and (when enabled) the wall of the drainage hole.
 */
export function createVesselGeometry(design: PlanterDesign, segments = 72): BufferGeometry {
  const positions: number[] = []
  const { body, opening } = design
  const levels = 18
  const outerRx = body.width / 2
  const outerRy = body.depth / 2
  const innerRx = opening.width / 2
  const innerRy = opening.depth / 2
  const drainRadius = opening.drainage ? opening.drainDiameter / 2 : 0

  const tri = (a: Point, b: Point, c: Point) => positions.push(...a, ...b, ...c)
  const quad = (a: Point, b: Point, c: Point, d: Point, inward = false) => {
    if (inward) {
      tri(a, c, b)
      tri(a, d, c)
    } else {
      tri(a, b, c)
      tri(a, c, d)
    }
  }

  const outerScale = (t: number) => {
    const belly = Math.sin(Math.PI * t) * body.roundness * 0.07
    return 0.88 + belly + body.taper * (t - 0.25)
  }

  // Outer wall
  for (let level = 0; level < levels; level += 1) {
    const t0 = level / levels
    const t1 = (level + 1) / levels
    for (let i = 0; i < segments; i += 1) {
      const a0 = (i / segments) * Math.PI * 2
      const a1 = ((i + 1) / segments) * Math.PI * 2
      const s0 = outerScale(t0)
      const s1 = outerScale(t1)
      quad(
        ellipse(outerRx * s0, outerRy * s0, body.height * t0, a0),
        ellipse(outerRx * s0, outerRy * s0, body.height * t0, a1),
        ellipse(outerRx * s1, outerRy * s1, body.height * t1, a1),
        ellipse(outerRx * s1, outerRy * s1, body.height * t1, a0),
      )
    }
  }

  // Inner wall, tapering subtly toward the floor to keep a robust base.
  for (let level = 0; level < levels; level += 1) {
    const t0 = level / levels
    const t1 = (level + 1) / levels
    const z0 = opening.floor + (body.height - opening.floor) * t0
    const z1 = opening.floor + (body.height - opening.floor) * t1
    const s0 = 0.94 + t0 * 0.06
    const s1 = 0.94 + t1 * 0.06
    for (let i = 0; i < segments; i += 1) {
      const a0 = (i / segments) * Math.PI * 2
      const a1 = ((i + 1) / segments) * Math.PI * 2
      quad(
        ellipse(innerRx * s0, innerRy * s0, z0, a0),
        ellipse(innerRx * s1, innerRy * s1, z1, a0),
        ellipse(innerRx * s1, innerRy * s1, z1, a1),
        ellipse(innerRx * s0, innerRy * s0, z0, a1),
      )
    }
  }

  for (let i = 0; i < segments; i += 1) {
    const a0 = (i / segments) * Math.PI * 2
    const a1 = ((i + 1) / segments) * Math.PI * 2
    const topScale = outerScale(1)

    // Soft-looking planar rim.
    quad(
      ellipse(innerRx, innerRy, body.height, a0),
      ellipse(innerRx, innerRy, body.height, a1),
      ellipse(outerRx * topScale, outerRy * topScale, body.height, a1),
      ellipse(outerRx * topScale, outerRy * topScale, body.height, a0),
    )

    const floorOuter0 = ellipse(innerRx * 0.94, innerRy * 0.94, opening.floor, a0)
    const floorOuter1 = ellipse(innerRx * 0.94, innerRy * 0.94, opening.floor, a1)
    const baseScale = outerScale(0)
    const baseOuter0 = ellipse(outerRx * baseScale, outerRy * baseScale, 0, a0)
    const baseOuter1 = ellipse(outerRx * baseScale, outerRy * baseScale, 0, a1)

    if (opening.drainage) {
      const drainFloor0 = ellipse(drainRadius, drainRadius, opening.floor, a0)
      const drainFloor1 = ellipse(drainRadius, drainRadius, opening.floor, a1)
      const drainBase0 = ellipse(drainRadius, drainRadius, 0, a0)
      const drainBase1 = ellipse(drainRadius, drainRadius, 0, a1)
      quad(drainFloor0, drainFloor1, floorOuter1, floorOuter0)
      quad(drainBase0, baseOuter0, baseOuter1, drainBase1)
      quad(drainBase0, drainBase1, drainFloor1, drainFloor0, true)
    } else {
      tri([0, 0, opening.floor], floorOuter1, floorOuter0)
      tri([0, 0, 0], baseOuter0, baseOuter1)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
