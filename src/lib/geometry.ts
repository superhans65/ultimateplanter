import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { PlanterDesign } from './design'
import { vesselInnerRadii, vesselOpening, vesselOuterScale, vesselOuterSlope } from './profile'
import { outerWall } from './texture'

export { vesselOuterScale }

type Point = [number, number, number]

function ellipse(rx: number, ry: number, z: number, angle: number): Point {
  return [Math.cos(angle) * rx, Math.sin(angle) * ry, z]
}

export function vesselFrontSurface(design: PlanterDesign, x: number, z: number) {
  const scale = vesselOuterScale(design, z)
  const rx = design.body.width * scale / 2
  const ry = design.body.depth * scale / 2
  const normalizedX = Math.max(-1, Math.min(1, x / rx))
  const y = -ry * Math.sqrt(Math.max(0, 1 - normalizedX ** 2))

  // Angle from the straight-ahead -Y direction to the ellipse's outward normal.
  const gradientX = x / (rx ** 2)
  const gradientY = y / (ry ** 2)
  const gradientLength = Math.hypot(gradientX, gradientY) || 1
  const normalX = gradientX / gradientLength
  const normalY = gradientY / gradientLength
  const normalAngle = Math.atan2(normalX, -normalY)
  return { y, normalAngle, normalX, normalY }
}

/**
 * A closed oval relief sampled from the vessel so it wraps around the wall.
 * `tilt` turns the oval within the face, counterclockwise as seen from the front.
 */
export function createSurfaceEllipseGeometry(
  design: PlanterDesign,
  centerX: number,
  centerZ: number,
  radiusX: number,
  radiusZ: number,
  depth: number,
  { tilt = 0, radialSegments = 8, curveSegments = 32 }: { tilt?: number; radialSegments?: number; curveSegments?: number } = {},
): BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const vertex = (point: Vector3) => positions.push(point.x, point.y, point.z) / 3 - 1
  const pointAt = (u: number, angle: number, offset: number) => {
    const alongX = Math.cos(angle) * radiusX * u
    const alongZ = Math.sin(angle) * radiusZ * u
    const x = centerX + alongX * Math.cos(tilt) - alongZ * Math.sin(tilt)
    const z = centerZ + alongX * Math.sin(tilt) + alongZ * Math.cos(tilt)
    const surface = vesselFrontSurface(design, x, z)
    return new Vector3(x + surface.normalX * offset, surface.y + surface.normalY * offset, z)
  }

  const face: number[][] = []
  face.push([vertex(pointAt(0, 0, depth))])
  for (let ring = 1; ring <= radialSegments; ring += 1) {
    const u = ring / radialSegments
    // Tangent at the perimeter, full at the centre, and just sunk at the edge
    // so the feature has no visible stuck-on lip.
    const dome = depth * Math.sqrt(Math.max(0, 1 - u ** 2)) - depth * 0.08 * u ** 4
    face.push(Array.from({ length: curveSegments }, (_, segment) => (
      vertex(pointAt(u, segment / curveSegments * Math.PI * 2, dome))
    )))
  }
  for (let segment = 0; segment < curveSegments; segment += 1) {
    const next = (segment + 1) % curveSegments
    indices.push(face[0][0], face[1][segment], face[1][next])
  }
  for (let ring = 1; ring < radialSegments; ring += 1) {
    for (let segment = 0; segment < curveSegments; segment += 1) {
      const next = (segment + 1) % curveSegments
      const [a, b, c, d] = [face[ring][segment], face[ring + 1][segment], face[ring + 1][next], face[ring][next]]
      indices.push(a, b, c, a, c, d)
    }
  }

  const backOffset = -depth * 0.18
  const backCenter = vertex(pointAt(0, 0, backOffset))
  const back = Array.from({ length: curveSegments }, (_, segment) => (
    vertex(pointAt(1, segment / curveSegments * Math.PI * 2, backOffset))
  ))
  const edge = face[radialSegments]
  for (let segment = 0; segment < curveSegments; segment += 1) {
    const next = (segment + 1) % curveSegments
    indices.push(edge[segment], back[segment], back[next], edge[segment], back[next], edge[next])
    indices.push(backCenter, back[next], back[segment])
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

/**
 * Four stubby legs under the base, sized from the base footprint so they scale
 * with the body. Under a bucket each leg's flared top stays inside the flat
 * base; under a round body the legs are fatter and set out at the edge of the
 * narrow base, so their fillets climb onto the belly.
 */
export function legLayout(design: PlanterDesign) {
  const baseScale = vesselOuterScale(design, 0)
  const rx = design.body.width * baseScale / 2
  const ry = design.body.depth * baseScale / 2
  const round = design.body.shape === 'round'
  const radius = Math.min(rx, ry) * (round ? 0.36 : 0.24)
  const flare = radius * (round ? 0.95 : 0.35)
  const x = rx * (round ? 0.62 : 0.48)
  const y = ry * (round ? 0.62 : 0.46)
  return {
    radius,
    flare,
    height: design.animalFeatures.legHeight,
    positions: [[-x, -y], [x, -y], [-x, y], [x, y]] as Array<[number, number]>,
  }
}

// How far a leg reaches into the body so the two solids overlap.
const LEG_SINK = 1

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * The body's underside above (x, y), in body coordinates: the flat base, or
 * failing that the lower belly, where the outline still grows with height.
 * The normal points out of the body.
 */
export function bodyUnderside(design: PlanterDesign, x: number, y: number) {
  const { body } = design
  const radii = (z: number) => {
    const scale = vesselOuterScale(design, z)
    return { ax: body.width * scale / 2, ay: body.depth * scale / 2 }
  }
  const reach = (z: number) => {
    const { ax, ay } = radii(z)
    return (x / ax) ** 2 + (y / ay) ** 2
  }
  if (reach(0) <= 1) return { z: 0, normal: new Vector3(0, 0, -1) }

  let widest = 0
  for (let i = 1; i <= 64; i += 1) {
    const z = (i / 64) * body.height
    if (vesselOuterScale(design, z) > vesselOuterScale(design, widest)) widest = z
  }
  let low = 0
  let high = widest
  for (let i = 0; i < 32; i += 1) {
    const mid = (low + high) / 2
    if (reach(mid) > 1) low = mid
    else high = mid
  }
  // Gradient of (x/ax)² + (y/ay)² with both radii growing with z.
  const { ax, ay } = radii(high)
  const growth = vesselOuterSlope(design, high) / vesselOuterScale(design, high)
  const normal = new Vector3(x / ax ** 2, y / ay ** 2, -((x / ax) ** 2 + (y / ay) ** 2) * growth).normalize()
  return { z: high, normal }
}

/**
 * All four legs as one mesh, Z-up with the feet on z = 0 and the body's base
 * at z = legHeight. Each leg is a rounded foot and a straight column, topped
 * by a fillet that leaves the column vertically and lands tangent to the body
 * underside, so the leg grows out of the flat base or the curved belly
 * without a visible joint.
 */
export function createLegsGeometry(design: PlanterDesign, segments = 40): BufferGeometry {
  const { radius, flare, height, positions: centers } = legLayout(design)
  const footRound = Math.min(radius * 0.3, height * 0.3)
  const columnTop = height - Math.min(flare, height - footRound)
  const filletRows = 12
  const maxClimb = radius * 1.1
  const positions: number[] = []
  const indices: number[] = []
  const vertex = (point: Vector3) => positions.push(point.x, point.y, point.z) / 3 - 1
  const directions = Array.from({ length: segments }, (_, j) => {
    const angle = (j / segments) * Math.PI * 2
    return new Vector3(Math.cos(angle), Math.sin(angle), 0)
  })

  for (const [cx, cy] of centers) {
    const center = new Vector3(cx, cy, 0)
    const rings: number[][] = []

    for (let i = 0; i <= 6; i += 1) {
      const t = (i / 6) * (Math.PI / 2)
      const r = radius - footRound + Math.sin(t) * footRound
      const z = footRound - Math.cos(t) * footRound
      rings.push(directions.map((dir) => vertex(center.clone().addScaledVector(dir, r).setZ(z))))
    }

    const fillets = directions.map((dir) => {
      const start = center.clone().addScaledVector(dir, radius).setZ(columnTop)
      // Land a full flare out, unless that climbs too far up the belly; then
      // land short, where the belly is maxClimb above the base.
      const landAt = (reach: number) => {
        const point = center.clone().addScaledVector(dir, reach)
        return { point, underside: bodyUnderside(design, point.x, point.y) }
      }
      let land = landAt(radius + flare)
      if (land.underside.z > maxClimb) {
        let low = radius
        let high = radius + flare
        for (let i = 0; i < 24; i += 1) {
          const mid = (low + high) / 2
          if (landAt(mid).underside.z > maxClimb) high = mid
          else low = mid
        }
        land = landAt(low)
      }
      // The body has a crease where the flat base meets the belly; ease the
      // landing direction across it so neighbouring fillets don't fold.
      const belly = smoothstep(0, maxClimb * 0.6, land.underside.z)
      const normal = new Vector3(0, 0, -1).lerp(land.underside.normal, belly).normalize()
      const end = land.point.setZ(height + land.underside.z).addScaledVector(normal, -LEG_SINK)
      const endTangent = dir.clone().addScaledVector(normal, -dir.dot(normal)).normalize()
      return { start, end, endTangent, span: start.distanceTo(end) }
    })
    for (let i = 0; i <= filletRows; i += 1) {
      const u = i / filletRows
      // Cubic Hermite from the column's vertical to the body's tangent.
      const h00 = 2 * u ** 3 - 3 * u ** 2 + 1
      const h10 = u ** 3 - 2 * u ** 2 + u
      const h01 = -2 * u ** 3 + 3 * u ** 2
      const h11 = u ** 3 - u ** 2
      rings.push(fillets.map(({ start, end, endTangent, span }) => vertex(
        start.clone().multiplyScalar(h00)
          .add(new Vector3(0, 0, span * h10))
          .addScaledVector(end, h01)
          .addScaledVector(endTangent, span * h11),
      )))
    }

    for (let row = 0; row < rings.length - 1; row += 1) {
      for (let j = 0; j < segments; j += 1) {
        const k = (j + 1) % segments
        const [a, b, c, d] = [rings[row][j], rings[row][k], rings[row + 1][k], rings[row + 1][j]]
        indices.push(a, b, c, a, c, d)
      }
    }
    // Close the sole, and the top from inside the body.
    const sole = vertex(center)
    const top = vertex(center.clone().setZ(height + bodyUnderside(design, cx, cy).z + LEG_SINK + 1))
    const last = rings[rings.length - 1]
    for (let j = 0; j < segments; j += 1) {
      const k = (j + 1) % segments
      indices.push(sole, rings[0][k], rings[0][j], top, last[j], last[k])
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

/**
 * Builds one closed vessel shell in millimetres: outside, inside, rim, floor,
 * underside, and (when enabled) the wall of the drainage hole. The outer wall
 * carries any texture relief and is shaded smooth on its own; the rest is
 * creased so the rim and base edges stay crisp.
 */
export function createVesselGeometry(design: PlanterDesign): BufferGeometry {
  const positions: number[] = []
  const { body, opening } = design
  const wall = outerWall(design)
  const { angles, columns: segments } = wall
  // Enough levels for the round body's curve to stay smooth.
  const levels = body.shape === 'round' ? 40 : 18
  const drainRadius = opening.drainage ? opening.drainDiameter / 2 : 0
  const angle = (i: number) => angles[i % segments]

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

  // Outer wall, as one indexed grid wrapping around.
  const wallPositions: number[] = []
  const wallIndices: number[] = []
  for (let level = 0; level <= wall.levels; level += 1) {
    for (let i = 0; i < segments; i += 1) wallPositions.push(...wall.point(i, level))
  }
  for (let level = 0; level < wall.levels; level += 1) {
    for (let i = 0; i < segments; i += 1) {
      const a = level * segments + i
      const b = level * segments + (i + 1) % segments
      const c = b + segments
      const d = a + segments
      wallIndices.push(a, b, c, a, c, d)
    }
  }

  // Inner wall: tapering subtly toward the floor in a bucket to keep a robust
  // base, or following the outer wall of a round body.
  for (let level = 0; level < levels; level += 1) {
    const z0 = opening.floor + (body.height - opening.floor) * (level / levels)
    const z1 = opening.floor + (body.height - opening.floor) * ((level + 1) / levels)
    const r0 = vesselInnerRadii(design, z0)
    const r1 = vesselInnerRadii(design, z1)
    for (let i = 0; i < segments; i += 1) {
      const a0 = angle(i)
      const a1 = angle(i + 1)
      quad(
        ellipse(r0.rx, r0.ry, z0, a0),
        ellipse(r1.rx, r1.ry, z1, a0),
        ellipse(r1.rx, r1.ry, z1, a1),
        ellipse(r0.rx, r0.ry, z0, a1),
      )
    }
  }

  const rim = vesselInnerRadii(design, body.height)
  const floor = vesselInnerRadii(design, opening.floor)

  for (let i = 0; i < segments; i += 1) {
    const a0 = angle(i)
    const a1 = angle(i + 1)

    // Soft-looking planar rim, meeting the outer wall's top ring exactly.
    quad(
      ellipse(rim.rx, rim.ry, body.height, a0),
      ellipse(rim.rx, rim.ry, body.height, a1),
      wall.point(i + 1, wall.levels),
      wall.point(i, wall.levels),
      true,
    )

    const floorOuter0 = ellipse(floor.rx, floor.ry, opening.floor, a0)
    const floorOuter1 = ellipse(floor.rx, floor.ry, opening.floor, a1)
    const baseOuter0 = wall.point(i, 0)
    const baseOuter1 = wall.point(i + 1, 0)

    if (opening.drainage) {
      const drainFloor0 = ellipse(drainRadius, drainRadius, opening.floor, a0)
      const drainFloor1 = ellipse(drainRadius, drainRadius, opening.floor, a1)
      const drainBase0 = ellipse(drainRadius, drainRadius, 0, a0)
      const drainBase1 = ellipse(drainRadius, drainRadius, 0, a1)
      quad(drainFloor0, drainFloor1, floorOuter1, floorOuter0, true)
      quad(drainBase0, baseOuter0, baseOuter1, drainBase1, true)
      quad(drainBase0, drainBase1, drainFloor1, drainFloor0, true)
    } else {
      tri([0, 0, opening.floor], floorOuter0, floorOuter1)
      tri([0, 0, 0], baseOuter1, baseOuter0)
    }
  }

  const outer = new BufferGeometry()
  outer.setAttribute('position', new Float32BufferAttribute(wallPositions, 3))
  outer.setIndex(wallIndices)
  outer.computeVertexNormals()
  const outerFaces = outer.toNonIndexed()
  outer.dispose()

  const faceted = new BufferGeometry()
  faceted.setAttribute('position', new Float32BufferAttribute(positions, 3))
  // Smooth shading across the curved inner wall, crisp at the rim and base edges.
  const rest = toCreasedNormals(faceted, Math.PI / 6)
  faceted.dispose()

  const geometry = mergeGeometries([outerFaces, rest])
  outerFaces.dispose()
  rest.dispose()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

const EAR_MAX_LEAN = Math.PI / 12

/**
 * A cat ear grown out of the front half of the rim, above the face, rather
 * than stuck on top of it. The outer face continues the vessel's outer wall
 * upward, the foot spans the full rim thickness (flush with both walls) and
 * sweeps up out of the rim in a broad curve, the upper edges roll over, and the
 * forward face carries a shallow inner-ear pocket. `centerX` is the ear's
 * centre on the rim; negative values build the left ear.
 */
export function createCatEarGeometry(design: PlanterDesign, centerX: number, uSegments = 36, vSegments = 40): BufferGeometry {
  const { body } = design
  const earHeight = design.animalFeatures.earHeight
  const earWidth = design.animalFeatures.earWidth
  const topScale = vesselOuterScale(design, body.height)
  // Continue the wall's slope past the rim so the ear doesn't kink where it
  // leaves the vessel, but lean in no more than EAR_MAX_LEAN: a round body's
  // rim curves in too sharply to follow for the ear's full height.
  const topSlope = Math.max(vesselOuterSlope(design, body.height), -Math.tan(EAR_MAX_LEAN) / (body.width / 2))
  const outerRx = body.width * topScale / 2
  const outerRy = body.depth * topScale / 2
  const { width: openingWidth, depth: openingDepth } = vesselOpening(design)
  const innerRx = openingWidth / 2
  const innerRy = openingDepth / 2

  // Rounded-triangle silhouette with a circular tip, widened at the foot by a
  // quarter-ellipse sweep that meets the rim tangentially.
  // Raise the virtual sharp apex so the rounded tip still reaches earHeight.
  const tipRadius = Math.min(6, earWidth * 0.22)
  let apex = earHeight
  for (let pass = 0; pass < 6; pass += 1) apex = earHeight - tipRadius + tipRadius / Math.sin(Math.atan(earWidth / 2 / apex))
  const halfAngle = Math.atan(earWidth / 2 / apex)
  const tipCenter = apex - tipRadius / Math.sin(halfAngle)
  const tipTangent = tipCenter + tipRadius * Math.sin(halfAngle)
  const totalHeight = tipCenter + tipRadius
  const sweepWidth = earWidth * 0.3
  const sweepHeight = earHeight * 0.3
  const coreHalfWidthAt = (h: number) => h <= tipTangent
    ? earWidth / 2 * (1 - h / apex)
    : Math.sqrt(Math.max(0, tipRadius ** 2 - (h - tipCenter) ** 2))
  const halfWidthAt = (h: number) => {
    const s = 1 - h / sweepHeight
    return coreHalfWidthAt(h) + (h < sweepHeight ? sweepWidth * (1 - Math.sqrt(Math.max(0, 1 - s ** 2))) : 0)
  }

  // Arc length along the rim ellipse, so the ear keeps its proportions where
  // the wall curves toward the sides. The ear is built on the back half, where
  // positive offsets move toward +X with decreasing parametric angle, and
  // mirrored to the front at the end.
  const centerTheta = Math.acos(Math.max(-1, Math.min(1, centerX / outerRx)))
  const arcSamples: { theta: number; arc: number }[] = []
  const steps = 360
  for (let index = 0, arc = 0; index <= steps; index += 1) {
    const theta = centerTheta + Math.PI / 2 - (index / steps) * Math.PI
    if (index > 0) {
      const mid = theta + Math.PI / steps / 2
      arc += Math.hypot(outerRx * Math.sin(mid), outerRy * Math.cos(mid)) * (Math.PI / steps)
    }
    arcSamples.push({ theta, arc })
  }
  const centerArc = arcSamples[steps / 2].arc
  const thetaAt = (offset: number) => {
    const target = centerArc + offset
    const next = arcSamples.findIndex((sample) => sample.arc >= target)
    if (next <= 0) return next === 0 ? arcSamples[0].theta : arcSamples[steps].theta
    const a = arcSamples[next - 1]
    const b = arcSamples[next]
    return a.theta + (b.theta - a.theta) * ((target - a.arc) / (b.arc - a.arc))
  }

  const pocketBottom = totalHeight * 0.18
  const pocketTop = totalHeight * 0.78
  // Grow the ear from below the rim. The tangent skirt removes the hard
  // shoulder made by placing a separate closed solid directly on the top edge.
  const blendHeight = Math.min(10, earHeight * 0.34)
  const blendRows = Math.max(6, Math.round(vSegments * blendHeight / totalHeight))

  const positions: number[] = []
  const indices: number[] = []
  const vertex = (point: Vector3) => positions.push(point.x, point.y, point.z) / 3 - 1
  const outer: number[][] = []
  const inner: number[][] = []
  const baseOuter: Vector3[] = []
  const baseInner: Vector3[] = []

  for (let row = -blendRows; row <= vSegments; row += 1) {
    const h = row < 0 ? row / blendRows * blendHeight : (row / vSegments) * totalHeight
    const blend = smoothstep(-blendHeight, 0, h)
    const baseHalfWidth = halfWidthAt(0)
    const halfWidth = h < 0
      ? earWidth * 0.38 + (baseHalfWidth - earWidth * 0.38) * blend
      : halfWidthAt(h)
    const coreHalfWidth = h < 0 ? earWidth / 2 * blend : coreHalfWidthAt(h)
    const absoluteZ = body.height + h
    const scale = h < 0
      ? vesselOuterScale(design, absoluteZ) / topScale
      : (topScale + topSlope * h) / topScale
    const rollGrowth = smoothstep(0, sweepHeight, h)
    const outerRow: number[] = []
    const innerRow: number[] = []
    for (let column = 0; column <= uSegments; column += 1) {
      // Denser columns near the edges, where the surface rolls over.
      const u = row === vSegments ? 0 : Math.sin((column / uSegments - 0.5) * Math.PI)
      const offset = u * halfWidth
      const theta = thetaAt(offset)
      const outerPoint = new Vector3(outerRx * scale * Math.cos(theta), outerRy * scale * Math.sin(theta), absoluteZ)
      const rimOuter = new Vector3(outerRx * Math.cos(theta), outerRy * Math.sin(theta), absoluteZ)
      const rimInner = new Vector3(innerRx * Math.cos(theta), innerRy * Math.sin(theta), absoluteZ)
      // Meet the inner rim exactly at the foot, then swell into a rounded ear
      // body. Merely extending the rim wall upward leaves a 2–3 mm sheet on a
      // round pot, which reads as a razor-thin fin in oblique views. The sine
      // profile gives the ear a substantial middle without changing its rim
      // footprint; the rolled perimeter below still closes it at the sides
      // and tip. Derive the inward direction from the rim, not outerPoint:
      // above the rim the leaning outer face can pass inside rimInner, which
      // would reverse the vector and turn the inner face outward.
      const rimThickness = rimOuter.distanceTo(rimInner)
      const bodyBulge = Math.sin(Math.PI * (h / totalHeight)) * Math.max(4, earWidth * 0.16)
      const thickness = (rimThickness + bodyBulge) * blend
      const inward = rimInner.clone().sub(rimOuter).normalize()
      // Hide the skirt's lowest edge just inside the body surface.
      if (h < 0) outerPoint.addScaledVector(inward, 0.35 * (1 - blend))
      const innerPoint = outerPoint.clone().addScaledVector(inward, thickness)

      const pocketHalfWidth = coreHalfWidth * 0.55
      const pocketRadius = Math.hypot(
        pocketHalfWidth > 0 ? offset / pocketHalfWidth : 2,
        (2 * (h - pocketBottom)) / (pocketTop - pocketBottom) - 1,
      )
      if (h >= 0 && pocketRadius < 1) {
        const depth = Math.min(2.2, thickness * 0.3) * (1 - pocketRadius ** 2) ** 2
        outerPoint.lerp(innerPoint, depth / thickness)
      }

      const rollRadius = thickness / 2 * rollGrowth
      const edgeDistance = (1 - Math.abs(u)) * halfWidth
      const roll = rollRadius > 0.01 ? 1 - Math.min(1, edgeDistance / rollRadius) : 0
      const squeeze = Math.sqrt(Math.max(0, 1 - roll ** 2))
      const mid = outerPoint.clone().lerp(innerPoint, 0.5)
      const o = mid.clone().lerp(outerPoint, squeeze)
      const i = mid.clone().lerp(innerPoint, squeeze)
      if (row === -blendRows) {
        baseOuter.push(o)
        baseInner.push(i)
      }
      const outerIndex = vertex(o)
      outerRow.push(outerIndex)
      // Share the seam vertices so the rolled edge shades smoothly.
      innerRow.push(squeeze === 0 ? outerIndex : vertex(i))
    }
    outer.push(outerRow)
    inner.push(innerRow)
  }

  for (let row = 0; row < outer.length - 1; row += 1) {
    for (let column = 0; column < uSegments; column += 1) {
      const [a, b, c, d] = [outer[row][column], outer[row + 1][column], outer[row + 1][column + 1], outer[row][column + 1]]
      indices.push(a, b, c, a, c, d)
      const [e, f, g, k] = [inner[row][column], inner[row + 1][column], inner[row + 1][column + 1], inner[row][column + 1]]
      indices.push(e, g, f, e, k, g)
    }
    // Side walls close the crisp edges at the foot; above that the faces meet
    // and these collapse to nothing.
    const last = uSegments
    indices.push(outer[row][last], outer[row + 1][last], inner[row][last], outer[row + 1][last], inner[row + 1][last], inner[row][last])
    indices.push(outer[row][0], inner[row][0], outer[row + 1][0], outer[row + 1][0], inner[row][0], inner[row + 1][0])
  }

  // Underside, hidden against the rim; separate vertices keep it from
  // darkening the foot of the ear.
  for (let column = 0; column < uSegments; column += 1) {
    const a = vertex(baseOuter[column])
    const b = vertex(baseOuter[column + 1])
    const c = vertex(baseInner[column + 1])
    const d = vertex(baseInner[column])
    indices.push(a, b, d, b, c, d)
  }

  // Mirror onto the front half; the reflection flips handedness, so reverse
  // each triangle to keep the faces pointing outward.
  for (let i = 1; i < positions.length; i += 3) positions[i] = -positions[i]
  for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]]

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
