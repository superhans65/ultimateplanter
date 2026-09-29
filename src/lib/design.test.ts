import { describe, expect, it } from 'vitest'
import { CAT_PRESET, clonePreset, finalBounds, parseDesign, updateAtPath, validateDesign } from './design'

describe('planter design model', () => {
  it('ships a valid cat preset', () => {
    expect(validateDesign(CAT_PRESET)).toEqual([])
  })

  it('rejects an opening that breaks through the wall', () => {
    const design = updateAtPath(CAT_PRESET, 'opening.width', 109)
    expect(validateDesign(design).some((issue) => issue.field === 'opening.width')).toBe(true)
  })

  it('updates without mutating the preset', () => {
    const design = updateAtPath(CAT_PRESET, 'body.width', 140)
    expect(design.body.width).toBe(140)
    expect(CAT_PRESET.body.width).toBe(110)
  })

  it('includes ears and paws in final bounds', () => {
    expect(finalBounds(CAT_PRESET)).toEqual({ width: 110, depth: 98, height: 113 })
  })

  it('round trips a versioned design', () => {
    expect(parseDesign(JSON.stringify(clonePreset()))).toEqual(CAT_PRESET)
  })

  it('rejects unknown versions', () => {
    expect(() => parseDesign(JSON.stringify({ ...CAT_PRESET, version: 99 }))).toThrow(
      'version is not supported',
    )
  })
})
