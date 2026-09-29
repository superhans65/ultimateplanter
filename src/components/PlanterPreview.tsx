'use client'

import { ContactShadows, Grid, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { DoubleSide, ExtrudeGeometry, Plane, Shape, Vector3 } from 'three'
import type { PlanterDesign } from '@/lib/design'
import { createVesselGeometry } from '@/lib/geometry'

interface Props {
  design: PlanterDesign
  inspect: boolean
  resetToken: number
}

function CameraReset({ token }: { token: number }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(145, -175, 125)
    camera.lookAt(0, 0, 52)
  }, [camera, token])
  return null
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
  const geometry = useMemo(() => {
    const width = design.animalFeatures.earWidth
    const height = design.animalFeatures.earHeight
    const shape = new Shape()
    shape.moveTo(-width / 2, 0)
    shape.lineTo(0, height)
    shape.lineTo(width / 2, 0)
    shape.quadraticCurveTo(0, -3, -width / 2, 0)
    return new ExtrudeGeometry(shape, {
      depth: Math.max(7, design.opening.wall * 2.5),
      bevelEnabled: true,
      bevelSize: 1.8,
      bevelThickness: 1.8,
      bevelSegments: 3,
    })
  }, [design.animalFeatures.earHeight, design.animalFeatures.earWidth, design.opening.wall])

  return (
    <mesh
      geometry={geometry}
      position={[x, design.body.depth * 0.16, design.body.height - 3]}
      rotation={[Math.PI / 2, 0, 0]}
      castShadow
    >
      <meshStandardMaterial color={design.body.color} roughness={0.5} clippingPlanes={clipping} />
    </mesh>
  )
}

function Face({ design, clipping }: { design: PlanterDesign; clipping: Plane[] }) {
  const front = -design.body.depth * 0.475
  const eyeX = design.face.spacing / 2
  const scale = design.face.scale
  const eyeScale: [number, number, number] =
    design.face.eyeStyle === 'sleepy' ? [7 * scale, 2.4 * scale, design.face.depth] : [6.4 * scale, 8 * scale, design.face.depth]

  return (
    <group>
      {[-eyeX, eyeX].map((x) => (
        <mesh key={x} position={[x, front - design.face.depth * 0.25, design.face.vertical]} scale={eyeScale} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color="#312d38" roughness={0.24} clippingPlanes={clipping} />
        </mesh>
      ))}
      <mesh position={[0, front - design.face.depth * 0.5, design.face.vertical - 14 * scale]} rotation={[Math.PI / 2, 0, design.face.mouthStyle === 'w' ? Math.PI / 4 : 0]} scale={[5.5 * scale, 3.4 * scale, 1.2]}>
        <torusGeometry args={[1, 0.28, 12, 32, Math.PI]} />
        <meshStandardMaterial color="#5e3c45" roughness={0.5} clippingPlanes={clipping} />
      </mesh>
      {design.face.cheeks && [-eyeX - 9, eyeX + 9].map((x) => (
        <mesh key={x} position={[x, front - 0.8, design.face.vertical - 12]} scale={[6 * scale, design.face.depth, 3.5 * scale]} rotation={[Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[1, 20, 12]} />
          <meshStandardMaterial color="#f1848f" roughness={0.58} clippingPlanes={clipping} />
        </mesh>
      ))}
    </group>
  )
}

function CatModel({ design, inspect }: Omit<Props, 'resetToken'>) {
  const vessel = useMemo(() => createVesselGeometry(design), [design])
  const clipping = useMemo(() => (inspect ? [new Plane(new Vector3(0, -1, 0), -2)] : []), [inspect])
  const earX = design.body.width * 0.3
  const pawZ = 10 * design.animalFeatures.pawScale
  const pawY = -design.body.depth * 0.47

  useEffect(() => () => vessel.dispose(), [vessel])

  return (
    <group position={[0, 0, 0]}>
      <mesh geometry={vessel} castShadow receiveShadow>
        <meshStandardMaterial color={design.body.color} roughness={0.52} side={DoubleSide} clippingPlanes={clipping} />
      </mesh>
      <Ear x={-earX} design={design} clipping={clipping} />
      <Ear x={earX} design={design} clipping={clipping} />
      <Face design={design} clipping={clipping} />
      {design.animalFeatures.paws && [-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * design.body.width * 0.28, pawY - 3, pawZ]}
          scale={[13 * design.animalFeatures.pawScale, 8 * design.animalFeatures.pawScale, 10 * design.animalFeatures.pawScale]}
          castShadow
        >
          <sphereGeometry args={[1, 28, 18]} />
          <meshStandardMaterial color={design.body.color} roughness={0.55} clippingPlanes={clipping} />
        </mesh>
      ))}
    </group>
  )
}

export default function PlanterPreview({ design, inspect, resetToken }: Props) {
  return (
    <Canvas shadows gl={{ antialias: true, localClippingEnabled: true }} className="canvas">
      <color attach="background" args={['#f4eee6']} />
      <PerspectiveCamera makeDefault position={[145, -175, 125]} fov={34} near={1} far={1000} />
      <CameraReset token={resetToken} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[-80, -110, 180]} intensity={2.3} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[100, 70, 100]} intensity={0.8} color="#ffd4c7" />
      <CatModel design={design} inspect={inspect} />
      <Grid position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]} args={[280, 280]} cellSize={10} cellColor="#d7ccc1" sectionSize={50} sectionColor="#b9aa9d" fadeDistance={300} infiniteGrid />
      <ContactShadows position={[0, 0, 0]} opacity={0.28} scale={240} blur={2.4} far={100} />
      <OrbitControls makeDefault target={[0, 0, 52]} minDistance={100} maxDistance={420} enableDamping />
    </Canvas>
  )
}
