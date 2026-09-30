'use client'

import { ContactShadows, Grid, PerspectiveCamera, TrackballControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { DoubleSide, ExtrudeGeometry, Plane, QuadraticBezierCurve3, Shape, Vector3 } from 'three'
import type { TrackballControls as TrackballControlsImpl } from 'three-stdlib'
import { EYE_ARC_STROKE, hasMouth, legLift, type PlanterDesign } from '@/lib/design'
import { cheekLayout, footLayout, mouthLayout, noseLayout, pawLayout, whiskerLayout } from '@/lib/face'
import { createCatEarGeometry, createLegsGeometry, createSurfaceEllipseGeometry, createVesselGeometry, vesselFrontSurface, vesselOuterScale } from '@/lib/geometry'
import { vesselOpening } from '@/lib/profile'
import { planterPreviewTheme } from '@/lib/theme'

export type CameraView = 'perspective' | 'front' | 'top' | 'bottom'

interface Props {
  design: PlanterDesign
  inspect: boolean
  resetToken: number
  cameraView: CameraView
}

const EAR_BEVEL = 1.8

function earVerticalPosition(design: PlanterDesign) {
  if (design.animal === 'cat') return design.body.height - 3
  if (design.animal === 'bunny') return design.body.height - 4 + design.animalFeatures.earHeight / 2
  return design.body.height * (design.animal === 'dog' ? 0.82 : 0.76)
}

function CameraReset({ token, view, controlsRef }: { token: number; view: CameraView; controlsRef: RefObject<TrackballControlsImpl | null> }) {
  const { camera } = useThree()
  useEffect(() => {
    const target = new Vector3(0, 0, 52)
    const positions: Record<CameraView, [number, number, number]> = {
      perspective: [145, -175, 125],
      front: [0, -260, 52],
      top: [0, 0, 300],
      bottom: [0, 0, -200],
    }
    const isVertical = view === 'top' || view === 'bottom'
    camera.up.set(0, isVertical ? 1 : 0, isVertical ? 0 : 1)
    camera.position.set(...positions[view])
    camera.lookAt(target)
    if (controlsRef.current) {
      controlsRef.current.target.copy(target)
      controlsRef.current.update()
    }
  }, [camera, controlsRef, token, view])
  return null
}

function CatEar({ x, design, clipping }: { x: number; design: PlanterDesign; clipping: Plane[] }) {
  const geometry = useMemo(() => createCatEarGeometry(design, x), [design, x])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color={design.body.color} roughness={0.66} clippingPlanes={clipping} />
    </mesh>
  )
}

function PandaEar({ x, design, clipping }: { x: number; design: PlanterDesign; clipping: Plane[] }) {
  const width = design.animalFeatures.earWidth
  const height = design.animalFeatures.earHeight
  const thickness = Math.max(5, design.opening.wall * 1.8)

  return (
    <mesh
      position={[x, design.body.depth * 0.14, design.body.height * 0.92]}
      scale={[width / 2, thickness, height / 2]}
      castShadow
    >
      <sphereGeometry args={[1, 28, 18]} />
      <meshStandardMaterial color={planterPreviewTheme.face} roughness={0.72} clippingPlanes={clipping} />
    </mesh>
  )
}

function Ear({
  x,
  design,
  clipping,
}: {
  x: number
  design: PlanterDesign
  clipping: Plane[]
}) {
  const earDepth = Math.max(7, design.opening.wall * 2.5)
  const geometry = useMemo(() => {
    const width = design.animalFeatures.earWidth
    const height = design.animalFeatures.earHeight
    const shape = new Shape()
    if (design.animal === 'koala' || design.animal === 'bunny') {
      shape.absellipse(0, 0, width / 2, height / 2, 0, Math.PI * 2, false, 0)
    } else if (design.animal === 'dog') {
      const half = width / 2
      shape.moveTo(-half * 0.56, height * 0.12)
      shape.bezierCurveTo(-half * 1.08, -height * 0.08, -half * 1.18, -height * 0.58, -half * 0.62, -height * 0.88)
      shape.bezierCurveTo(-half * 0.2, -height * 1.08, half * 0.5, -height * 0.96, half * 0.76, -height * 0.68)
      shape.bezierCurveTo(half * 1.06, -height * 0.34, half * 0.82, height * 0.02, half * 0.48, height * 0.12)
      shape.quadraticCurveTo(0, height * 0.22, -half * 0.56, height * 0.12)
      shape.closePath()
    } else {
      shape.moveTo(-width / 2, 0)
      shape.lineTo(0, height)
      shape.lineTo(width / 2, 0)
      shape.quadraticCurveTo(0, -3, -width / 2, 0)
    }
    const ear = new ExtrudeGeometry(shape, {
      depth: earDepth,
      bevelEnabled: true,
      bevelSize: EAR_BEVEL,
      bevelThickness: EAR_BEVEL,
      bevelSegments: 3,
    })

    // ExtrudeGeometry grows in one direction. Centre that thickness so an ear
    // can be positioned against the outside wall without reaching into the
    // vessel opening.
    ear.translate(0, 0, -earDepth / 2)
    return ear
  }, [design.animal, design.animalFeatures.earHeight, design.animalFeatures.earWidth, earDepth])

  const isRearEar = design.animal === 'cat' || design.animal === 'bunny'
  const z = earVerticalPosition(design)

  if (isRearEar) {
    // The rim is elliptical, so the back wall at the ear's x sits well forward
    // of the centre-line depth. Seat the ear on the rim at its own x, turned to
    // follow the wall's tangent, straddling the outer edge slightly so it stays
    // out of the opening.
    const back = vesselFrontSurface(design, x, design.body.height)
    const normalY = -back.normalY
    const inset = (earDepth / 2 + EAR_BEVEL) * 0.6
    return (
      <group
        position={[x - back.normalX * inset, -back.y - normalY * inset, z]}
        rotation={[0, 0, Math.atan2(-back.normalX, normalY)]}
      >
        <mesh geometry={geometry} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <meshStandardMaterial color={design.animal === 'panda' ? planterPreviewTheme.face : design.body.color} roughness={0.62} clippingPlanes={clipping} />
        </mesh>
      </group>
    )
  }

  return (
    <mesh
      geometry={geometry}
      // Keep side ears behind the face. On the vessel centre plane, the far
      // ear can peek through beside an eye in the perspective view.
      position={[x, design.body.depth * 0.16, z]}
      rotation={[Math.PI / 2, design.animal === 'dog' ? -Math.sign(x) * 0.16 : 0, 0]}
      scale={design.animal === 'dog' ? [Math.sign(x), 1, 1] : undefined}
      castShadow
    >
      <meshStandardMaterial color={design.animal === 'panda' ? planterPreviewTheme.face : design.body.color} roughness={0.62} clippingPlanes={clipping} />
    </mesh>
  )
}

function MushroomCap({ design, clipping }: { design: PlanterDesign; clipping: Plane[] }) {
  const outerRadius = design.body.width * 0.6
  const innerRadius = vesselOpening(design).width / 2
  const majorRadius = (outerRadius + innerRadius) / 2
  const tubeRadius = Math.max(4, (outerRadius - innerRadius) / 2)
  const depthScale = (design.body.depth * 1.15) / (design.body.width * 1.2)
  const capZ = design.body.height * 0.78
  const spots = [{ x: -30, z: 5, size: 7 }, { x: 0, z: -4, size: 9 }, { x: 29, z: 7, size: 6 }]
  return (
    <group>
      <mesh position={[0, 0, capZ]} scale={[1, depthScale, 1.35]} castShadow>
        <torusGeometry args={[majorRadius, tubeRadius, 24, 64]} />
        <meshStandardMaterial color={planterPreviewTheme.mushroomCap} roughness={0.72} clippingPlanes={clipping} />
      </mesh>
      {spots.map((spot) => (
        <mesh key={spot.x} position={[spot.x, -Math.sqrt(Math.max(0, outerRadius ** 2 - spot.x ** 2)) * depthScale - 0.7, capZ + spot.z]} scale={[spot.size, 1.2, spot.size * 1.12]} castShadow>
          <sphereGeometry args={[1, 20, 12]} />
          <meshStandardMaterial color={design.body.color} roughness={0.78} clippingPlanes={clipping} />
        </mesh>
      ))}
    </group>
  )
}

function featureAttachment(design: PlanterDesign, x: number, z: number, normalOffset: number) {
  const surface = vesselFrontSurface(design, x, z)
  return {
    position: [x + surface.normalX * normalOffset, surface.y + surface.normalY * normalOffset, z] as [number, number, number],
    rotation: surface.normalAngle,
  }
}

function surfacePoint(design: PlanterDesign, x: number, z: number, normalOffset: number) {
  return new Vector3(...featureAttachment(design, x, z, normalOffset).position)
}

function heartShape(width: number) {
  const half = width / 2
  const shape = new Shape()
  shape.moveTo(0, -half * 0.9)
  shape.bezierCurveTo(-half * 0.35, -half * 0.55, -half, -half * 0.15, -half, half * 0.3)
  shape.bezierCurveTo(-half, half * 0.8, -half * 0.35, half * 0.95, 0, half * 0.5)
  shape.bezierCurveTo(half * 0.35, half * 0.95, half, half * 0.8, half, half * 0.3)
  shape.bezierCurveTo(half, -half * 0.15, half * 0.35, -half * 0.55, 0, -half * 0.9)
  return shape
}

function starShape(outer: number, inner: number) {
  const shape = new Shape()
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outer : inner
    const angle = Math.PI / 2 + (index * Math.PI) / 5
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

function triangleNoseShape(halfWidth: number, halfHeight: number) {
  const w = halfWidth
  const h = halfHeight
  const shape = new Shape()
  shape.moveTo(-w * 0.8, h)
  shape.quadraticCurveTo(0, h * 1.15, w * 0.8, h)
  shape.quadraticCurveTo(w * 1.05, h * 0.9, w * 0.8, h * 0.55)
  shape.lineTo(w * 0.15, -h * 0.85)
  shape.quadraticCurveTo(0, -h * 1.05, -w * 0.15, -h * 0.85)
  shape.lineTo(-w * 0.8, h * 0.55)
  shape.quadraticCurveTo(-w * 1.05, h * 0.9, -w * 0.8, h)
  return shape
}

type ReliefOutline = 'heart' | 'star' | 'triangle'

function outlineShape(outline: ReliefOutline, halfWidth: number, halfHeight: number) {
  if (outline === 'heart') return heartShape(halfWidth * 2)
  if (outline === 'star') return starShape(halfWidth, halfWidth * 0.46)
  return triangleNoseShape(halfWidth, halfHeight)
}

/** A flat-backed relief (heart, star, triangle) yawed to sit flush on the curved front. */
function ExtrudedRelief({
  design,
  outline,
  halfWidth,
  halfHeight,
  x,
  z,
  color,
  clipping,
}: {
  design: PlanterDesign
  outline: ReliefOutline
  halfWidth: number
  halfHeight: number
  x: number
  z: number
  color: string
  clipping: Plane[]
}) {
  const depth = design.face.depth
  const geometry = useMemo(() => {
    const relief = new ExtrudeGeometry(outlineShape(outline, halfWidth, halfHeight), {
      depth: depth * 1.3,
      bevelEnabled: true,
      bevelSize: 0.4,
      bevelThickness: 0.4,
      bevelSegments: 2,
      curveSegments: 18,
    })
    // Sink the flat back into the wall so the edges stay attached where the
    // front surface curves away; the face protrudes about 0.85 × depth.
    relief.translate(0, 0, -depth * 0.45 - 0.4)
    return relief
  }, [outline, halfWidth, halfHeight, depth])
  useEffect(() => () => geometry.dispose(), [geometry])
  const attachment = featureAttachment(design, x, z, 0)
  return (
    <mesh geometry={geometry} position={attachment.position} rotation={[Math.PI / 2, 0, attachment.rotation, 'ZXY']} castShadow>
      <meshStandardMaterial color={color} roughness={0.78} clippingPlanes={clipping} />
    </mesh>
  )
}

function StrokeCurves({ curves, radius, clipping, color = planterPreviewTheme.face }: { curves: QuadraticBezierCurve3[]; radius: number; clipping: Plane[]; color?: string }) {
  return (
    <group>
      {curves.map((curve, index) => (
        <mesh key={index} castShadow>
          <tubeGeometry args={[curve, 16, radius, 8, false]} />
          <meshStandardMaterial color={color} roughness={0.78} clippingPlanes={clipping} />
        </mesh>
      ))}
    </group>
  )
}

function SurfaceEllipse({
  design,
  x,
  z,
  width,
  height,
  clipping,
  color = planterPreviewTheme.face,
  depth = design.face.depth,
  tilt = 0,
}: {
  design: PlanterDesign
  x: number
  z: number
  width: number
  height: number
  clipping: Plane[]
  color?: string
  depth?: number
  tilt?: number
}) {
  const geometry = useMemo(
    () => createSurfaceEllipseGeometry(design, x, z, width, height, depth, { tilt }),
    [design, x, z, width, height, depth, tilt],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color={color} roughness={0.78} clippingPlanes={clipping} />
    </mesh>
  )
}

function Eye({ design, x, clipping }: { design: PlanterDesign; x: number; clipping: Plane[] }) {
  const size = design.face.scale * design.face.eyeScale
  const z = design.face.vertical
  const style = design.face.eyeStyle === 'wink' ? (x < 0 ? 'round' : 'happy') : design.face.eyeStyle
  const eyeColor = design.animal === 'panda' ? planterPreviewTheme.eyeHighlight : planterPreviewTheme.face
  if (style === 'heart' || style === 'star') {
    const halfWidth = (style === 'heart' ? 6 : 7) * size
    return <ExtrudedRelief design={design} outline={style} halfWidth={halfWidth} halfHeight={halfWidth} x={x} z={z} color={eyeColor} clipping={clipping} />
  }

  if (style === 'happy' || style === 'closed') {
    const halfWidth = 5.5 * size
    const lift = (style === 'happy' ? 1 : -1) * 1.5 * size
    const offset = -EYE_ARC_STROKE * size * 0.15
    const curve = new QuadraticBezierCurve3(
      surfacePoint(design, x - halfWidth, z - lift, offset),
      surfacePoint(design, x, z + lift * 3, offset),
      surfacePoint(design, x + halfWidth, z - lift, offset),
    )
    return <StrokeCurves curves={[curve]} radius={EYE_ARC_STROKE * size} clipping={clipping} color={eyeColor} />
  }

  const smallEyes = design.animal === 'koala' || design.animal === 'panda' || design.animal === 'mushroom' || design.animal === 'duck' || design.animal === 'pig' || design.animal === 'kawaii'
  const [width, height] = style === 'sleepy'
    ? [7, 2.4]
    : style === 'dot'
      ? [3.2, 3.2]
      : style === 'sparkle'
        ? smallEyes ? [4.6, 5.4] : [6.4, 8]
        : smallEyes ? [3.6, 4.4] : [6.4, 8]
  const glintRadius = width * size * 0.3
  if (style !== 'sparkle') {
    return <SurfaceEllipse design={design} x={x} z={z} width={width * size} height={height * size} clipping={clipping} color={eyeColor} />
  }
  // The eye's dome stands 0.88 × depth out at this upper-left offset; the glint sits on it.
  const glint = featureAttachment(design, x - width * size * 0.32, z + height * size * 0.35, design.face.depth * 0.8)
  return (
    <group>
      <SurfaceEllipse design={design} x={x} z={z} width={width * size} height={height * size} clipping={clipping} color={eyeColor} />
      <mesh position={glint.position} rotation={[0, 0, glint.rotation]} scale={[glintRadius, design.face.depth * 0.3, glintRadius]}>
        <sphereGeometry args={[1, 16, 10]} />
        <meshStandardMaterial color={design.animal === 'panda' ? planterPreviewTheme.face : planterPreviewTheme.eyeHighlight} roughness={0.7} clippingPlanes={clipping} />
      </mesh>
    </group>
  )
}

function Nose({ design, clipping }: { design: PlanterDesign; clipping: Plane[] }) {
  const style = design.face.noseStyle
  const layout = noseLayout(design)
  if (!layout) return null

  const color = style === 'beak'
    ? planterPreviewTheme.duckAccent
    : style === 'snout'
      ? planterPreviewTheme.pigAccent
      : design.animal === 'koala'
        ? planterPreviewTheme.koalaNose
        : design.animal === 'panda' ? planterPreviewTheme.pandaNose : planterPreviewTheme.face
  if (style === 'triangle' || style === 'heart')
    return <ExtrudedRelief design={design} outline={style} halfWidth={layout.halfWidth} halfHeight={layout.halfHeight} x={0} z={layout.z} color={color} clipping={clipping} />

  const nose = <SurfaceEllipse design={design} x={0} z={layout.z} width={layout.halfWidth} height={layout.halfHeight} color={color} clipping={clipping} />
  if (style !== 'snout') return nose

  const size = design.face.scale * design.face.noseScale
  const snout = featureAttachment(design, 0, layout.z, -design.face.depth * 0.15)
  return (
    <group>
      {nose}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 2.7 * size, snout.position[1] - design.face.depth * 0.9, layout.z]} scale={[1.1 * size, design.face.depth * 0.35, 1.5 * size]} castShadow>
          <sphereGeometry args={[1, 16, 10]} />
          <meshStandardMaterial color={planterPreviewTheme.pigDetail} roughness={0.82} clippingPlanes={clipping} />
        </mesh>
      ))}
    </group>
  )
}

function Mouth({ design, clipping }: { design: PlanterDesign; clipping: Plane[] }) {
  const { scale, radius } = mouthLayout(design)
  const curves = useMemo(() => {
    const { gap, baseZ, span, dip } = mouthLayout(design)
    const point = (x: number, z: number) => surfacePoint(design, x, baseZ + z, -radius * 0.15)
    const paths = design.face.mouthStyle === 'smile'
      ? [new QuadraticBezierCurve3(point(-span, 1.5 * scale), point(0, -dip), point(span, 1.5 * scale))]
      : [
          new QuadraticBezierCurve3(point(0, 0), point(-span * 0.55, -dip), point(-span, 1.5 * scale)),
          new QuadraticBezierCurve3(point(0, 0), point(span * 0.55, -dip), point(span, 1.5 * scale)),
        ]
    if (design.animal === 'dog' && noseLayout(design)) {
      const philtrum = gap + 3 * design.face.scale
      paths.push(new QuadraticBezierCurve3(point(0, philtrum), point(0, philtrum / 2), point(0, 0)))
    }
    return paths
  }, [design, scale, radius])

  return <StrokeCurves curves={curves} radius={radius} clipping={clipping} />
}

function Whiskers({ design, clipping }: { design: PlanterDesign; clipping: Plane[] }) {
  const { innerX, outerX, z, gap, radius } = whiskerLayout(design)
  const curves = useMemo(() => [-1, 1].flatMap((side) => [-1, 0, 1].map((row) => {
    const startZ = z + row * gap
    const endZ = startZ + row * gap * 0.35
    const point = (x: number, height: number) => surfacePoint(design, side * x, height, -radius * 0.15)
    return new QuadraticBezierCurve3(
      point(innerX, startZ),
      point((innerX + outerX) / 2, (startZ + endZ) / 2),
      point(outerX, endZ),
    )
  })), [design, gap, innerX, outerX, radius, z])

  return <StrokeCurves curves={curves} radius={radius} clipping={clipping} />
}

function Face({ design, clipping }: { design: PlanterDesign; clipping: Plane[] }) {
  const eyeX = design.face.spacing / 2
  const scale = design.face.scale
  const eyeSize = scale * design.face.eyeScale

  return (
    <group>
      {design.animal === 'panda' && [-eyeX, eyeX].map((x) => (
        <SurfaceEllipse
          key={`panda-patch-${x}`}
          design={design}
          x={x}
          z={design.face.vertical}
          width={8.5 * scale}
          height={12 * scale}
          color={planterPreviewTheme.face}
          clipping={clipping}
          depth={design.face.depth * 0.5}
          tilt={x < 0 ? -0.2 : 0.2}
        />
      ))}
      {[-eyeX, eyeX].map((x) => {
        if (!design.face.flatEyeMounts) return <Eye key={`eye-${x}`} design={design} x={x} clipping={clipping} />
        const attachment = featureAttachment(design, x, design.face.vertical, -0.1)
        return (
          <mesh
            key={`mount-${x}`}
            position={attachment.position}
            rotation={[0, 0, attachment.rotation]}
            scale={[1, 1, 1.18]}
            castShadow
          >
            <cylinderGeometry args={[6.8 * eyeSize, 6.8 * eyeSize, 0.9, 32]} />
            <meshStandardMaterial color={design.body.color} roughness={0.82} clippingPlanes={clipping} />
          </mesh>
        )
      })}
      <Nose design={design} clipping={clipping} />
      {hasMouth(design.animal) && <Mouth design={design} clipping={clipping} />}
      {design.animal === 'cat' && design.face.whiskers && <Whiskers design={design} clipping={clipping} />}
      {design.face.cheeks && [-1, 1].map((side) => {
        const layout = cheekLayout(design)
        return (
          <SurfaceEllipse
            key={`cheek-${side}`}
            design={design}
            x={side * layout.x}
            z={layout.z}
            width={layout.halfWidth}
            height={layout.halfHeight}
            color={planterPreviewTheme.cheek}
            clipping={clipping}
            depth={layout.depth}
          />
        )
      })}
    </group>
  )
}

function Legs({ design, color, clipping }: { design: PlanterDesign; color: string; clipping: Plane[] }) {
  const geometry = useMemo(() => createLegsGeometry(design), [design])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color={color} roughness={0.68} clippingPlanes={clipping} />
    </mesh>
  )
}

function AnimalModel({ design, inspect }: Omit<Props, 'resetToken' | 'cameraView'>) {
  const vessel = useMemo(() => createVesselGeometry(design), [design])
  const clipping = useMemo(() => (inspect ? [new Plane(new Vector3(0, -1, 0), -2)] : []), [inspect])
  const hasEars = design.animal === 'cat' || design.animal === 'dog' || design.animal === 'koala' || design.animal === 'panda' || design.animal === 'bunny'
  const hasSideEars = design.animal === 'dog' || design.animal === 'koala'
  const earZ = earVerticalPosition(design)
  const sideRadiusAtEar = design.body.width * vesselOuterScale(design, earZ) / 2
  const sideEarOverlap = Math.max(EAR_BEVEL * 2, design.animalFeatures.earWidth * 0.18)
  const earX = design.animal === 'panda'
    ? design.body.width * vesselOuterScale(design, design.body.height) * 0.44
    : hasSideEars
      ? sideRadiusAtEar + design.animalFeatures.earWidth / 2 - sideEarOverlap
      : design.body.width * vesselOuterScale(design, design.body.height) * (design.animal === 'bunny' ? 0.3 : 0.32)
  const limbColor = design.animal === 'duck' ? planterPreviewTheme.duckAccent : design.animal === 'pig' ? planterPreviewTheme.pigAccent : design.body.color
  const pawSpec = pawLayout(design)
  const footSpec = footLayout(design)
  const [hovered, setHovered] = useState(false)
  const lift = legLift(design)

  useEffect(() => () => vessel.dispose(), [vessel])

  return (
    <group
      position={[0, 0, 0]}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
    >
      {design.animalFeatures.legs && <Legs design={design} color={limbColor} clipping={clipping} />}
      <group position={[0, 0, lift]}>
        <mesh geometry={vessel} castShadow receiveShadow={false}>
          <meshStandardMaterial
            color={design.body.color}
            roughness={0.66}
            side={DoubleSide}
            clippingPlanes={clipping}
            emissive={inspect ? planterPreviewTheme.selection : hovered ? planterPreviewTheme.hover : planterPreviewTheme.emissiveOff}
            emissiveIntensity={inspect ? 0.12 : hovered ? 0.08 : 0}
          />
        </mesh>
        {design.animal === 'mushroom' && <MushroomCap design={design} clipping={clipping} />}
        {hasEars && <>
          {[-1, 1].map((side) => design.animal === 'cat'
            ? <CatEar key={side} x={side * earX} design={design} clipping={clipping} />
            : design.animal === 'panda'
              ? <PandaEar key={side} x={side * earX} design={design} clipping={clipping} />
              : <Ear key={side} x={side * earX} design={design} clipping={clipping} />)}
        </>}
        <Face design={design} clipping={clipping} />
        {design.animalFeatures.paws && [-1, 1].map((side) => {
          const paw = featureAttachment(design, side * pawSpec.x, pawSpec.z, -pawSpec.depth * 0.18)
          return (
            <mesh
              key={side}
              position={paw.position}
              rotation={[0, 0, paw.rotation]}
              scale={[pawSpec.halfWidth, pawSpec.depth, pawSpec.halfHeight]}
              castShadow
            >
              <sphereGeometry args={[1, 28, 18]} />
              <meshStandardMaterial color={limbColor} roughness={0.68} clippingPlanes={clipping} />
            </mesh>
          )
        })}
        {design.animalFeatures.feet && [-1, 1].map((side) => {
          const foot = featureAttachment(design, side * footSpec.x, footSpec.z, -footSpec.depth * 0.2)
          return (
            <mesh
              key={`foot-${side}`}
              position={foot.position}
              rotation={[0, 0, foot.rotation]}
              scale={[footSpec.halfWidth, footSpec.depth, footSpec.halfHeight]}
              castShadow
            >
              <sphereGeometry args={[1, 24, 16]} />
              <meshStandardMaterial color={limbColor} roughness={0.7} clippingPlanes={clipping} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

export default function PlanterPreview({ design, inspect, resetToken, cameraView }: Props) {
  const controlsRef = useRef<TrackballControlsImpl>(null)
  return (
    <Canvas shadows gl={{ antialias: true, alpha: true, localClippingEnabled: true }} className="canvas">
      <PerspectiveCamera makeDefault position={[145, -175, 125]} fov={34} near={1} far={1000} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[-80, -110, 180]} intensity={2.3} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[100, 70, 100]} intensity={0.8} color={planterPreviewTheme.keyLight} />
      <AnimalModel design={design} inspect={inspect} />
      {/* Drei's Grid shader builds a Y-up floor on XZ. This scene is Z-up, so
          rotate it onto the ground; otherwise the plane stands through the
          opening and the grid shows up inside the vessel. */}
      <Grid position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]} args={[280, 280]} cellSize={10} cellColor={planterPreviewTheme.grid} sectionSize={50} sectionColor={planterPreviewTheme.gridStrong} fadeDistance={300} infiniteGrid />
      <ContactShadows position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} opacity={0.28} scale={240} blur={2.4} far={100} />
      <TrackballControls
        ref={controlsRef}
        makeDefault
        target={[0, 0, 52]}
        minDistance={100}
        maxDistance={420}
        dynamicDampingFactor={0.12}
      />
      <CameraReset token={resetToken} view={cameraView} controlsRef={controlsRef} />
    </Canvas>
  )
}
