import { minTexturePitch, vesselInnerRadii, vesselOpening } from './profile'
import { planterPalette } from './theme'

export const DESIGN_VERSION = 1 as const

export type Animal = 'cat' | 'dog' | 'koala' | 'panda' | 'mushroom' | 'duck' | 'pig' | 'kawaii' | 'bunny'
export type EyeStyle = 'round' | 'dot' | 'sparkle' | 'sleepy' | 'happy' | 'closed' | 'wink' | 'heart' | 'star'
export type NoseStyle = 'none' | 'button' | 'oval' | 'tall' | 'triangle' | 'heart' | 'snout' | 'beak'
export type MouthStyle = 'smile' | 'w'
export type BodyShape = 'bucket' | 'round'
export type TexturePattern = 'none' | 'ribs' | 'knurl' | 'lattice'

export const BODY_SHAPES: Array<{ value: BodyShape; label: string }> = [
  { value: 'bucket', label: 'Bucket' },
  { value: 'round', label: 'Round' },
]

export const EYE_STYLES: Array<{ value: EyeStyle; label: string }> = [
  { value: 'round', label: 'Round' },
  { value: 'dot', label: 'Dot' },
  { value: 'sparkle', label: 'Sparkle' },
  { value: 'sleepy', label: 'Sleepy' },
  { value: 'happy', label: 'Happy ^^' },
  { value: 'closed', label: 'Closed' },
  { value: 'wink', label: 'Wink' },
  { value: 'heart', label: 'Heart' },
  { value: 'star', label: 'Star' },
]

export const NOSE_STYLES: Array<{ value: NoseStyle; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'button', label: 'Button' },
  { value: 'oval', label: 'Oval' },
  { value: 'tall', label: 'Tall oval' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'heart', label: 'Heart' },
  { value: 'snout', label: 'Snout' },
  { value: 'beak', label: 'Beak' },
]

export const TEXTURE_PATTERNS: Array<{ value: TexturePattern; label: string }> = [
  { value: 'none', label: 'Smooth' },
  { value: 'ribs', label: 'Ribs' },
  { value: 'knurl', label: 'Knurl' },
  { value: 'lattice', label: 'Lattice' },
]

/** Patterns made of two rib families leaning ±angle, crossing each other. */
export function isCrossingPattern(pattern: TexturePattern) {
  return pattern === 'knurl' || pattern === 'lattice'
}

// Below MIN_CROSSING the two families of a crossing pattern nearly coincide.
export const TEXTURE_LIMITS = {
  count: { min: 8, max: 60 },
  depth: { min: 0.4, max: 3 },
  angle: { max: 60, minCrossing: 15 },
  panelFade: { min: 1, max: 12 },
  // Finer than this and a 0.4 mm nozzle can't resolve the relief.
  minPitch: 2.5,
} as const

// Tube radii (mm at scale 1) for line-drawn relief such as mouths and arc eyes.
export const MOUTH_STROKE = 0.65
export const EYE_ARC_STROKE = 0.9

export interface PlanterDesign {
  version: typeof DESIGN_VERSION
  animal: Animal
  body: {
    shape: BodyShape
    width: number
    depth: number
    height: number
    roundness: number
    taper: number
    color: string
  }
  opening: {
    width: number
    depth: number
    wall: number
    floor: number
    drainage: boolean
    drainDiameter: number
  }
  animalFeatures: {
    earHeight: number
    earWidth: number
    paws: boolean
    feet: boolean
    pawScale: number
    pawHeight: number
    legs: boolean
    legHeight: number
  }
  face: {
    eyeStyle: EyeStyle
    noseStyle: NoseStyle
    mouthStyle: MouthStyle
    spacing: number
    vertical: number
    scale: number
    eyeScale: number
    noseScale: number
    mouthScale: number
    cheekScale: number
    depth: number
    cheeks: boolean
    whiskers?: boolean
    flatEyeMounts: boolean
  }
  /**
   * Relief on the outer wall: `count` ribs around the body leaning `angle`
   * degrees from vertical (both ways for crossing patterns), raised `depth`
   * mm. The face sits on a plain panel whose edge fades over `panelFade` mm.
   */
  texture: {
    pattern: TexturePattern
    count: number
    depth: number
    angle: number
    panelFade: number
  }
}

export const PLAIN_TEXTURE: PlanterDesign['texture'] = {
  pattern: 'none',
  count: 24,
  depth: 1.2,
  angle: 0,
  panelFade: 4,
}

export const CAT_PRESET: PlanterDesign = {
  version: DESIGN_VERSION,
  animal: 'cat',
  body: {
    shape: 'round',
    width: 110,
    depth: 92,
    height: 88,
    roundness: 0.72,
    taper: 0.08,
    color: planterPalette.modelCream,
  },
  opening: {
    width: 88,
    depth: 70,
    wall: 3.2,
    floor: 4,
    drainage: false,
    drainDiameter: 8,
  },
  animalFeatures: {
    earHeight: 24,
    earWidth: 34,
    paws: true,
    feet: false,
    pawScale: 1,
    pawHeight: 43,
    legs: false,
    legHeight: 12,
  },
  face: {
    eyeStyle: 'round',
    noseStyle: 'none',
    mouthStyle: 'w',
    spacing: 36,
    vertical: 47,
    scale: 1,
    eyeScale: 1,
    noseScale: 1,
    mouthScale: 1,
    cheekScale: 1,
    depth: 2.2,
    cheeks: true,
    whiskers: true,
    flatEyeMounts: false,
  },
  texture: { ...PLAIN_TEXTURE },
}

export const DOG_PRESET: PlanterDesign = {
  version: DESIGN_VERSION,
  animal: 'dog',
  body: {
    shape: 'bucket',
    width: 118,
    depth: 96,
    height: 104,
    roundness: 0.84,
    taper: 0.12,
    color: planterPalette.modelTerracotta,
  },
  opening: {
    width: 94,
    depth: 73,
    wall: 3.4,
    floor: 4,
    drainage: false,
    drainDiameter: 8,
  },
  animalFeatures: {
    earHeight: 32,
    earWidth: 27,
    paws: true,
    feet: false,
    pawScale: 1.05,
    pawHeight: 11,
    legs: false,
    legHeight: 12,
  },
  face: {
    eyeStyle: 'round',
    noseStyle: 'oval',
    mouthStyle: 'w',
    spacing: 43,
    vertical: 67,
    scale: 1.08,
    eyeScale: 1,
    noseScale: 1,
    mouthScale: 1,
    cheekScale: 1,
    depth: 2.4,
    cheeks: false,
    flatEyeMounts: false,
  },
  texture: { ...PLAIN_TEXTURE },
}

export const KOALA_PRESET: PlanterDesign = {
  version: DESIGN_VERSION,
  animal: 'koala',
  body: {
    shape: 'bucket',
    width: 100,
    depth: 82,
    height: 105,
    roundness: 0.82,
    taper: 0.08,
    color: planterPalette.modelCream,
  },
  opening: {
    width: 78,
    depth: 62,
    wall: 3.2,
    floor: 4,
    drainage: false,
    drainDiameter: 8,
  },
  animalFeatures: {
    earHeight: 27,
    earWidth: 31,
    paws: true,
    feet: true,
    pawScale: 1.15,
    pawHeight: 38,
    legs: false,
    legHeight: 12,
  },
  face: {
    eyeStyle: 'round',
    noseStyle: 'tall',
    mouthStyle: 'smile',
    spacing: 34,
    vertical: 62,
    scale: 0.82,
    eyeScale: 1,
    noseScale: 1,
    mouthScale: 1,
    cheekScale: 1,
    depth: 2.2,
    cheeks: false,
    flatEyeMounts: false,
  },
  texture: { ...PLAIN_TEXTURE },
}

export const PANDA_PRESET: PlanterDesign = {
  version: DESIGN_VERSION,
  animal: 'panda',
  body: {
    shape: 'round',
    width: 108,
    depth: 92,
    height: 88,
    roundness: 0.72,
    taper: 0.06,
    color: planterPalette.modelCream,
  },
  opening: {
    width: 86,
    depth: 70,
    wall: 3.2,
    floor: 4,
    drainage: false,
    drainDiameter: 8,
  },
  animalFeatures: {
    earHeight: 20,
    earWidth: 20,
    paws: false,
    feet: false,
    pawScale: 0.9,
    pawHeight: 10,
    legs: false,
    legHeight: 12,
  },
  face: {
    eyeStyle: 'round',
    noseStyle: 'button',
    mouthStyle: 'w',
    spacing: 38,
    vertical: 50,
    scale: 0.9,
    eyeScale: 1,
    noseScale: 0.85,
    mouthScale: 0.9,
    cheekScale: 1,
    depth: 2.2,
    cheeks: true,
    flatEyeMounts: false,
  },
  texture: { ...PLAIN_TEXTURE },
}

export const MUSHROOM_PRESET: PlanterDesign = {
  version: DESIGN_VERSION,
  animal: 'mushroom',
  body: {
    shape: 'bucket',
    width: 108,
    depth: 92,
    height: 94,
    roundness: 0.86,
    taper: 0.1,
    color: planterPalette.modelCream,
  },
  opening: {
    width: 82,
    depth: 68,
    wall: 3.4,
    floor: 4,
    drainage: false,
    drainDiameter: 8,
  },
  animalFeatures: {
    earHeight: 20,
    earWidth: 20,
    paws: false,
    feet: false,
    pawScale: 0.8,
    pawHeight: 8,
    legs: false,
    legHeight: 12,
  },
  face: {
    eyeStyle: 'round',
    noseStyle: 'none',
    mouthStyle: 'smile',
    spacing: 34,
    vertical: 32,
    scale: 0.8,
    eyeScale: 1,
    noseScale: 1,
    mouthScale: 1,
    cheekScale: 1,
    depth: 2,
    cheeks: false,
    flatEyeMounts: false,
  },
  texture: { ...PLAIN_TEXTURE },
}

export const DUCK_PRESET: PlanterDesign = {
  version: DESIGN_VERSION,
  animal: 'duck',
  body: {
    shape: 'bucket',
    width: 96,
    depth: 82,
    height: 90,
    roundness: 0.62,
    taper: 0.04,
    color: planterPalette.modelCream,
  },
  opening: {
    width: 78,
    depth: 64,
    wall: 3.2,
    floor: 4,
    drainage: false,
    drainDiameter: 8,
  },
  animalFeatures: {
    earHeight: 18,
    earWidth: 18,
    paws: true,
    feet: false,
    pawScale: 0.7,
    pawHeight: 7,
    legs: false,
    legHeight: 12,
  },
  face: {
    eyeStyle: 'round',
    noseStyle: 'beak',
    mouthStyle: 'smile',
    spacing: 43,
    vertical: 55,
    scale: 0.72,
    eyeScale: 1,
    noseScale: 1,
    mouthScale: 1,
    cheekScale: 1,
    depth: 2.2,
    cheeks: false,
    flatEyeMounts: false,
  },
  texture: { ...PLAIN_TEXTURE },
}

export const PIG_PRESET: PlanterDesign = {
  version: DESIGN_VERSION,
  animal: 'pig',
  body: {
    shape: 'round',
    width: 94,
    depth: 80,
    height: 86,
    roundness: 0.66,
    taper: 0.04,
    color: planterPalette.modelTerracotta,
  },
  opening: {
    width: 76,
    depth: 62,
    wall: 3.2,
    floor: 4,
    drainage: false,
    drainDiameter: 8,
  },
  animalFeatures: {
    earHeight: 18,
    earWidth: 18,
    paws: false,
    feet: false,
    pawScale: 0.68,
    pawHeight: 7,
    legs: true,
    legHeight: 12,
  },
  face: {
    eyeStyle: 'sleepy',
    noseStyle: 'snout',
    mouthStyle: 'smile',
    spacing: 42,
    vertical: 53,
    scale: 0.74,
    eyeScale: 1,
    noseScale: 1,
    mouthScale: 1,
    cheekScale: 1,
    depth: 2.2,
    cheeks: false,
    flatEyeMounts: false,
  },
  texture: { ...PLAIN_TEXTURE },
}

export const KAWAII_PRESET: PlanterDesign = {
  version: DESIGN_VERSION,
  animal: 'kawaii',
  body: {
    shape: 'bucket',
    width: 104,
    depth: 88,
    height: 88,
    roundness: 0.9,
    taper: 0.08,
    color: planterPalette.modelCream,
  },
  opening: {
    width: 82,
    depth: 68,
    wall: 3.2,
    floor: 4,
    drainage: false,
    drainDiameter: 8,
  },
  animalFeatures: {
    earHeight: 18,
    earWidth: 18,
    paws: true,
    feet: true,
    pawScale: 0.9,
    pawHeight: 34,
    legs: false,
    legHeight: 12,
  },
  face: {
    eyeStyle: 'round',
    noseStyle: 'none',
    mouthStyle: 'smile',
    spacing: 34,
    vertical: 51,
    scale: 0.82,
    eyeScale: 1,
    noseScale: 1,
    mouthScale: 1,
    cheekScale: 1,
    depth: 2,
    cheeks: true,
    flatEyeMounts: false,
  },
  texture: { ...PLAIN_TEXTURE },
}

export const BUNNY_PRESET: PlanterDesign = {
  version: DESIGN_VERSION,
  animal: 'bunny',
  body: {
    shape: 'bucket',
    width: 105,
    depth: 88,
    height: 90,
    roundness: 0.86,
    taper: 0.08,
    color: planterPalette.modelCream,
  },
  opening: {
    width: 82,
    depth: 67,
    wall: 3.2,
    floor: 4,
    drainage: false,
    drainDiameter: 8,
  },
  animalFeatures: {
    earHeight: 45,
    earWidth: 20,
    paws: true,
    feet: false,
    pawScale: 0.95,
    pawHeight: 9,
    legs: false,
    legHeight: 12,
  },
  face: {
    eyeStyle: 'sleepy',
    noseStyle: 'none',
    mouthStyle: 'w',
    spacing: 38,
    vertical: 53,
    scale: 0.9,
    eyeScale: 1,
    noseScale: 1,
    mouthScale: 1,
    cheekScale: 1,
    depth: 2.2,
    cheeks: true,
    flatEyeMounts: false,
  },
  texture: { ...PLAIN_TEXTURE },
}

export interface DesignIssue {
  field: string
  message: string
}

export const SAFE_LIMITS = {
  wall: 2.4,
  floor: 3,
  featureDepth: 1.2,
  lineFeature: 0.8,
  earTip: 2,
} as const

// Stubby legs lift the body; taller legs get spindly and the underside bridge
// between them becomes harder to print.
export const LEG_HEIGHT = { min: 4, max: 30 } as const
export const BODY_HEIGHT = { min: 40, max: 160 } as const

export function legLift(design: PlanterDesign) {
  return design.animalFeatures.legs ? design.animalFeatures.legHeight : 0
}

export const PRESETS: Record<Animal, PlanterDesign> = {
  cat: CAT_PRESET,
  dog: DOG_PRESET,
  koala: KOALA_PRESET,
  panda: PANDA_PRESET,
  mushroom: MUSHROOM_PRESET,
  duck: DUCK_PRESET,
  pig: PIG_PRESET,
  kawaii: KAWAII_PRESET,
  bunny: BUNNY_PRESET,
}

export function hasMouth(animal: Animal) {
  return animal === 'cat' || animal === 'dog' || animal === 'panda' || animal === 'mushroom' || animal === 'kawaii' || animal === 'bunny'
}

export function clonePreset(animal: Animal = 'cat'): PlanterDesign {
  return structuredClone(PRESETS[animal])
}

export function validateDesign(design: PlanterDesign): DesignIssue[] {
  const issues: DesignIssue[] = []
  const add = (field: string, message: string) => issues.push({ field, message })

  if (design.body.width < 70 || design.body.width > 180)
    add('body.width', 'Width must be between 70 and 180 mm.')
  if (design.body.depth < 65 || design.body.depth > 160)
    add('body.depth', 'Depth must be between 65 and 160 mm.')
  if (design.body.height < BODY_HEIGHT.min || design.body.height > BODY_HEIGHT.max)
    add('body.height', `Height must be between ${BODY_HEIGHT.min} and ${BODY_HEIGHT.max} mm.`)
  if (design.opening.wall < SAFE_LIMITS.wall)
    add('opening.wall', `Wall must be at least ${SAFE_LIMITS.wall} mm for this prototype.`)
  if (design.opening.floor < SAFE_LIMITS.floor)
    add('opening.floor', `Floor must be at least ${SAFE_LIMITS.floor} mm.`)

  if (design.body.shape === 'round') {
    // The round body's opening follows the rim, so it is checked as cut.
    const opening = vesselOpening(design)
    if (Math.min(opening.width, opening.depth) < 40)
      add('body.roundness', `The rim closes the opening to ${Math.min(opening.width, opening.depth).toFixed(0)} mm; it must be at least 40 mm. Reduce roundness or widen the body.`)
  } else {
    const maxOpeningWidth = design.body.width - design.opening.wall * 2
    const maxOpeningDepth = design.body.depth - design.opening.wall * 2
    if (design.opening.width > maxOpeningWidth)
      add('opening.width', `Opening is too wide; the maximum is ${maxOpeningWidth.toFixed(1)} mm.`)
    if (design.opening.depth > maxOpeningDepth)
      add('opening.depth', `Opening is too deep; the maximum is ${maxOpeningDepth.toFixed(1)} mm.`)
    if (design.opening.width < 40) add('opening.width', 'Opening must be at least 40 mm wide.')
    if (design.opening.depth < 40) add('opening.depth', 'Opening must be at least 40 mm deep.')
  }
  if (design.opening.floor >= design.body.height * 0.35)
    add('opening.floor', 'Floor thickness leaves too little usable interior height.')
  // The round body's floor is narrower than its rim.
  const floor = vesselInnerRadii(design, design.opening.floor)
  const drainSpan = design.body.shape === 'round' ? Math.min(floor.rx, floor.ry) * 2 : Math.min(design.opening.width, design.opening.depth)
  if (design.opening.drainage && design.opening.drainDiameter > drainSpan * 0.35)
    add('opening.drainDiameter', 'Drainage hole is too large for this opening.')
  if (design.face.depth < SAFE_LIMITS.featureDepth)
    add('face.depth', `Feature depth must be at least ${SAFE_LIMITS.featureDepth} mm.`)
  for (const key of ['eyeScale', 'noseScale', 'mouthScale', 'cheekScale'] as const) {
    if (design.face[key] < 0.5 || design.face[key] > 1.8)
      add(`face.${key}`, 'Individual feature sizes must be between 0.5 and 1.8.')
  }
  const arcEyes = design.face.eyeStyle === 'happy' || design.face.eyeStyle === 'closed' || design.face.eyeStyle === 'wink'
  if (arcEyes && !design.face.flatEyeMounts && EYE_ARC_STROKE * 2 * design.face.scale * design.face.eyeScale < SAFE_LIMITS.lineFeature)
    add('face.eyeScale', `Eye lines would be thinner than ${SAFE_LIMITS.lineFeature} mm; increase eye size.`)
  if (hasMouth(design.animal) && MOUTH_STROKE * 2 * design.face.scale * design.face.mouthScale < SAFE_LIMITS.lineFeature)
    add('face.mouthScale', `Mouth line would be thinner than ${SAFE_LIMITS.lineFeature} mm; increase mouth size.`)
  if (design.face.spacing > design.body.width * 0.58)
    add('face.spacing', 'Eye spacing places the face beyond the curved front surface.')
  if (design.face.vertical > design.body.height - 12)
    add('face.vertical', 'Face is too close to the rim.')
  if (design.animalFeatures.earWidth < 16)
    add('animalFeatures.earWidth', 'Ears narrower than 16 mm may have fragile joins.')
  if (design.animalFeatures.pawHeight < 6 || design.animalFeatures.pawHeight > design.body.height - 15)
    add('animalFeatures.pawHeight', 'Paw height must stay on the printable body surface.')
  const { texture } = design
  if (texture.pattern !== 'none') {
    const pitch = minTexturePitch(design)
    if (texture.count < TEXTURE_LIMITS.count.min || texture.count > TEXTURE_LIMITS.count.max)
      add('texture.count', `Texture count must be between ${TEXTURE_LIMITS.count.min} and ${TEXTURE_LIMITS.count.max}.`)
    else if (pitch < TEXTURE_LIMITS.minPitch)
      add('texture.count', `Texture spacing narrows to ${pitch.toFixed(1)} mm, finer than a nozzle can print; use fewer ribs.`)
    if (texture.depth < TEXTURE_LIMITS.depth.min || texture.depth > TEXTURE_LIMITS.depth.max)
      add('texture.depth', `Texture depth must be between ${TEXTURE_LIMITS.depth.min} and ${TEXTURE_LIMITS.depth.max} mm.`)
    else if (texture.depth > pitch / 2)
      add('texture.depth', `Texture is deeper than half its ${pitch.toFixed(1)} mm spacing; reduce depth or use fewer ribs.`)
    const minAngle = isCrossingPattern(texture.pattern) ? TEXTURE_LIMITS.angle.minCrossing : 0
    if (texture.angle < minAngle || texture.angle > TEXTURE_LIMITS.angle.max)
      add('texture.angle', `Texture angle must be between ${minAngle}° and ${TEXTURE_LIMITS.angle.max}°.`)
  }
  if (design.animalFeatures.legs && (design.animalFeatures.legHeight < LEG_HEIGHT.min || design.animalFeatures.legHeight > LEG_HEIGHT.max))
    add('animalFeatures.legHeight', `Leg height must be between ${LEG_HEIGHT.min} and ${LEG_HEIGHT.max} mm.`)

  return issues
}

export function finalBounds(design: PlanterDesign) {
  const pawProjection = design.animalFeatures.paws || design.animalFeatures.feet ? 6 * design.animalFeatures.pawScale : 0
  const hasSideEars = design.animal === 'dog' || design.animal === 'koala'
  const finalWidth = design.animal === 'mushroom'
    ? design.body.width * 1.2
    : hasSideEars ? Math.max(design.body.width, design.body.width * 0.98 + design.animalFeatures.earWidth) : design.body.width
  const relief = design.texture.pattern === 'none' ? 0 : design.texture.depth * 2
  const bodyAndEarsHeight = design.animal === 'cat' || design.animal === 'bunny'
    ? design.body.height + design.animalFeatures.earHeight
    : design.animal === 'panda'
      ? Math.max(design.body.height, design.body.height * 0.92 + design.animalFeatures.earHeight / 2)
      : design.body.height
  return {
    width: design.animal === 'mushroom' ? finalWidth : finalWidth + relief,
    depth: design.animal === 'mushroom' ? design.body.depth * 1.15 : design.body.depth + pawProjection + relief,
    height: legLift(design) + bodyAndEarsHeight,
  }
}

export function updateAtPath(
  design: PlanterDesign,
  path: string,
  value: number | boolean | string,
): PlanterDesign {
  const next = structuredClone(design)
  const [section, key] = path.split('.') as [keyof PlanterDesign, string]
  const record = next[section] as unknown as Record<string, unknown>
  record[key] = value
  // Front paws and legs crowd the same lower body, so turning one on drops the other.
  if (value === true && path === 'animalFeatures.paws') next.animalFeatures.legs = false
  if (value === true && path === 'animalFeatures.legs') next.animalFeatures.paws = false
  return next
}

export function parseDesign(input: string): PlanterDesign {
  const value: unknown = JSON.parse(input)
  if (!value || typeof value !== 'object') throw new Error('Design file is not an object.')
  const candidate = value as Partial<PlanterDesign>
  if (candidate.version !== DESIGN_VERSION) throw new Error('This design version is not supported.')
  if (!candidate.animal || !(candidate.animal in PRESETS) || !candidate.body || !candidate.opening || !candidate.face || !candidate.animalFeatures)
    throw new Error('Design file is missing required animal parameters.')
  candidate.body.shape ??= 'bucket'
  candidate.animalFeatures.pawHeight ??= candidate.animal === 'cat' ? 43 : 11
  candidate.animalFeatures.feet ??= false
  candidate.animalFeatures.legs ??= false
  candidate.animalFeatures.legHeight ??= 12
  if (candidate.animalFeatures.paws && candidate.animalFeatures.legs) candidate.animalFeatures.legs = false
  candidate.face.flatEyeMounts ??= false
  candidate.face.noseStyle ??= PRESETS[candidate.animal].face.noseStyle
  candidate.face.eyeScale ??= 1
  candidate.face.noseScale ??= 1
  candidate.face.mouthScale ??= 1
  candidate.face.cheekScale ??= 1
  if (candidate.animal === 'cat') candidate.face.whiskers ??= true
  candidate.texture = { ...PLAIN_TEXTURE, ...candidate.texture }
  return candidate as PlanterDesign
}
