import { describe, expect, it } from 'vitest'
import { BODY_HEIGHT, CAT_PRESET, DOG_PRESET, PRESETS, clonePreset, finalBounds, parseDesign, updateAtPath, validateDesign } from './design'

describe('planter design model', () => {
  it('ships valid presets for every character family', () => {
    expect(Object.keys(PRESETS)).toEqual(['cat', 'dog', 'koala', 'panda', 'mushroom', 'duck', 'pig', 'kawaii', 'bunny'])
    for (const preset of Object.values(PRESETS)) {
      expect(validateDesign(preset)).toEqual([])
    }
  })

  it('rejects an opening that breaks through the wall', () => {
    const design = updateAtPath(DOG_PRESET, 'opening.width', 117)
    expect(validateDesign(design).some((issue) => issue.field === 'opening.width')).toBe(true)
  })

  it('updates without mutating the preset', () => {
    const design = updateAtPath(CAT_PRESET, 'body.width', 140)
    expect(design.body.width).toBe(140)
    expect(CAT_PRESET.body.width).toBe(110)
  })

  it('includes ears, paws and legs in final bounds', () => {
    expect(finalBounds(CAT_PRESET)).toEqual({ width: 110, depth: 98, height: 112 })
    expect(finalBounds(DOG_PRESET)).toEqual({ width: 142.64, depth: 102.3, height: 104 })
  })

  it('adds leg height to final bounds and bounds the leg range', () => {
    const legged = updateAtPath(DOG_PRESET, 'animalFeatures.legs', true)
    expect(finalBounds(legged).height).toBe(finalBounds(DOG_PRESET).height + 12)
    expect(validateDesign(legged)).toEqual([])
    expect(validateDesign(updateAtPath(legged, 'animalFeatures.legHeight', 40)).some((issue) => issue.field === 'animalFeatures.legHeight')).toBe(true)
  })

  it('keeps front paws and legs mutually exclusive', () => {
    for (const preset of Object.values(PRESETS)) expect(preset.animalFeatures.paws && preset.animalFeatures.legs).toBe(false)
    const legged = updateAtPath(CAT_PRESET, 'animalFeatures.legs', true)
    expect(legged.animalFeatures).toMatchObject({ legs: true, paws: false })
    expect(updateAtPath(legged, 'animalFeatures.paws', true).animalFeatures).toMatchObject({ legs: false, paws: true })
    const saved = structuredClone(CAT_PRESET)
    saved.animalFeatures.legs = true
    expect(parseDesign(JSON.stringify(saved)).animalFeatures).toMatchObject({ legs: false, paws: true })
  })

  it('round trips a versioned design', () => {
    expect(parseDesign(JSON.stringify(clonePreset()))).toEqual(CAT_PRESET)
    for (const animal of Object.keys(PRESETS) as Array<keyof typeof PRESETS>) {
      expect(parseDesign(JSON.stringify(clonePreset(animal)))).toEqual(PRESETS[animal])
    }
  })

  it('fills per-feature sizes, nose style and cat whiskers for older saved designs', () => {
    const legacy = structuredClone(DOG_PRESET) as unknown as { face: Record<string, unknown> }
    for (const key of ['noseStyle', 'eyeScale', 'noseScale', 'mouthScale', 'cheekScale']) delete legacy.face[key]
    const legacyFeatures = (legacy as unknown as { animalFeatures: Record<string, unknown> }).animalFeatures
    delete legacyFeatures.legs
    delete legacyFeatures.legHeight
    delete (legacy as unknown as { body: Record<string, unknown> }).body.shape
    expect(parseDesign(JSON.stringify(legacy))).toEqual(DOG_PRESET)

    const legacyCat = structuredClone(CAT_PRESET) as unknown as { face: Record<string, unknown> }
    delete legacyCat.face.whiskers
    expect(parseDesign(JSON.stringify(legacyCat)).face.whiskers).toBe(true)
  })

  it('flags line features too thin to print', () => {
    const tinyMouth = updateAtPath(updateAtPath(CAT_PRESET, 'face.scale', 0.65), 'face.mouthScale', 0.5)
    expect(validateDesign(tinyMouth).some((issue) => issue.field === 'face.mouthScale')).toBe(true)
    const tinyArcs = updateAtPath(updateAtPath(tinyMouth, 'face.eyeStyle', 'happy'), 'face.eyeScale', 0.5)
    expect(validateDesign(tinyArcs).some((issue) => issue.field === 'face.eyeScale')).toBe(true)
    expect(validateDesign(updateAtPath(CAT_PRESET, 'face.eyeScale', 1.8))).toEqual([])
  })

  it('checks a round body rim without blocking curves handled by slicer supports', () => {
    const round = updateAtPath(DOG_PRESET, 'body.shape', 'round')
    expect(validateDesign(round)).toEqual([])
    // The sliders don't cut a round body's opening, so they can't break it.
    expect(validateDesign(updateAtPath(round, 'opening.width', 165))).toEqual([])
    const squat = updateAtPath(updateAtPath(round, 'body.height', 60), 'body.roundness', 1)
    expect(validateDesign(squat).some((issue) => issue.field === 'body.roundness')).toBe(false)
    const narrow = updateAtPath(updateAtPath(updateAtPath(round, 'body.width', 70), 'body.depth', 65), 'body.roundness', 1)
    expect(validateDesign(narrow).some((issue) => issue.message.includes('closes the opening'))).toBe(true)
  })

  it('allows shorter bodies down to the height control minimum', () => {
    let short = updateAtPath(CAT_PRESET, 'body.height', BODY_HEIGHT.min)
    short = updateAtPath(short, 'body.roundness', 0)
    short = updateAtPath(short, 'face.vertical', 28)
    short = updateAtPath(short, 'animalFeatures.pawHeight', 20)
    expect(validateDesign(short)).toEqual([])
    expect(validateDesign(updateAtPath(short, 'body.height', BODY_HEIGHT.min - 1)).some((issue) => issue.field === 'body.height')).toBe(true)
  })

  it('rejects unknown versions', () => {
    expect(() => parseDesign(JSON.stringify({ ...CAT_PRESET, version: 99 }))).toThrow(
      'version is not supported',
    )
  })
})
