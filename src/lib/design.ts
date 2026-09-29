export const DESIGN_VERSION = 1 as const

export type EyeStyle = 'round' | 'sleepy'
export type MouthStyle = 'smile' | 'w'

export interface PlanterDesign {
  version: typeof DESIGN_VERSION
  animal: 'cat'
  body: {
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
    pawScale: number
  }
  face: {
    eyeStyle: EyeStyle
    mouthStyle: MouthStyle
    spacing: number
    vertical: number
    scale: number
    depth: number
    cheeks: boolean
  }
}

export const CAT_PRESET: PlanterDesign = {
  version: DESIGN_VERSION,
  animal: 'cat',
  body: {
    width: 110,
    depth: 92,
    height: 88,
    roundness: 0.72,
    taper: 0.08,
    color: '#e8a39c',
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
    earHeight: 25,
    earWidth: 25,
    paws: true,
    pawScale: 1,
  },
  face: {
    eyeStyle: 'round',
    mouthStyle: 'w',
    spacing: 36,
    vertical: 47,
    scale: 1,
    depth: 2.2,
    cheeks: true,
  },
}

export interface DesignIssue {
  field: string
  message: string
}

export const SAFE_LIMITS = {
  wall: 2.4,
  floor: 3,
  featureDepth: 1.2,
  earTip: 2,
} as const

export function clonePreset(): PlanterDesign {
  return structuredClone(CAT_PRESET)
}

export function validateDesign(design: PlanterDesign): DesignIssue[] {
  const issues: DesignIssue[] = []
  const add = (field: string, message: string) => issues.push({ field, message })

  if (design.body.width < 70 || design.body.width > 180)
    add('body.width', 'Width must be between 70 and 180 mm.')
  if (design.body.depth < 65 || design.body.depth > 160)
    add('body.depth', 'Depth must be between 65 and 160 mm.')
  if (design.body.height < 60 || design.body.height > 160)
    add('body.height', 'Height must be between 60 and 160 mm.')
  if (design.opening.wall < SAFE_LIMITS.wall)
    add('opening.wall', `Wall must be at least ${SAFE_LIMITS.wall} mm for this prototype.`)
  if (design.opening.floor < SAFE_LIMITS.floor)
    add('opening.floor', `Floor must be at least ${SAFE_LIMITS.floor} mm.`)

  const maxOpeningWidth = design.body.width - design.opening.wall * 2
  const maxOpeningDepth = design.body.depth - design.opening.wall * 2
  if (design.opening.width > maxOpeningWidth)
    add('opening.width', `Opening is too wide; the maximum is ${maxOpeningWidth.toFixed(1)} mm.`)
  if (design.opening.depth > maxOpeningDepth)
    add('opening.depth', `Opening is too deep; the maximum is ${maxOpeningDepth.toFixed(1)} mm.`)
  if (design.opening.width < 40) add('opening.width', 'Opening must be at least 40 mm wide.')
  if (design.opening.depth < 40) add('opening.depth', 'Opening must be at least 40 mm deep.')
  if (design.opening.floor >= design.body.height * 0.35)
    add('opening.floor', 'Floor thickness leaves too little usable interior height.')
  if (design.opening.drainage && design.opening.drainDiameter > Math.min(design.opening.width, design.opening.depth) * 0.35)
    add('opening.drainDiameter', 'Drainage hole is too large for this opening.')
  if (design.face.depth < SAFE_LIMITS.featureDepth)
    add('face.depth', `Feature depth must be at least ${SAFE_LIMITS.featureDepth} mm.`)
  if (design.face.spacing > design.body.width * 0.58)
    add('face.spacing', 'Eye spacing places the face beyond the curved front surface.')
  if (design.face.vertical > design.body.height - 12)
    add('face.vertical', 'Face is too close to the rim.')
  if (design.animalFeatures.earWidth < 16)
    add('animalFeatures.earWidth', 'Ears narrower than 16 mm may have fragile joins.')

  return issues
}

export function finalBounds(design: PlanterDesign) {
  const pawProjection = design.animalFeatures.paws ? 6 * design.animalFeatures.pawScale : 0
  return {
    width: design.body.width,
    depth: design.body.depth + pawProjection,
    height: design.body.height + design.animalFeatures.earHeight,
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
  return next
}

export function parseDesign(input: string): PlanterDesign {
  const value: unknown = JSON.parse(input)
  if (!value || typeof value !== 'object') throw new Error('Design file is not an object.')
  const candidate = value as Partial<PlanterDesign>
  if (candidate.version !== DESIGN_VERSION) throw new Error('This design version is not supported.')
  if (candidate.animal !== 'cat' || !candidate.body || !candidate.opening || !candidate.face || !candidate.animalFeatures)
    throw new Error('Design file is missing required cat parameters.')
  return candidate as PlanterDesign
}
