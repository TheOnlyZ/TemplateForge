import { describe, expect, it } from 'vitest'
import {
  CYLINDER_MAX_DIAMETER_MM,
  CYLINDER_MIN_DIAMETER_MM,
  DEFAULT_MAX_DIMENSION_MM,
  DEFAULT_MIN_DIMENSION_MM,
  validateCylinderInput,
  validateTemplateInput,
} from '../../../src/domain/validation/index.ts'

describe('validateTemplateInput', () => {
  it('accepts dimensions inside the MVP limits', () => {
    const result = validateTemplateInput({
      dimensionsMm: { length: 100, width: 100, height: 100 },
    })

    expect(result.valid).toBe(true)
    expect(result.messages).toHaveLength(0)
  })

  it('blocks dimensions smaller than the minimum', () => {
    const result = validateTemplateInput({
      dimensionsMm: { length: DEFAULT_MIN_DIMENSION_MM - 1 },
    })

    expect(result.valid).toBe(false)
    expect(result.messages[0].code).toBe('min-dimension')
  })

  it('blocks dimensions larger than the maximum', () => {
    const result = validateTemplateInput({
      dimensionsMm: { length: DEFAULT_MAX_DIMENSION_MM + 1 },
    })

    expect(result.valid).toBe(false)
    expect(result.messages[0].code).toBe('max-dimension')
  })
})

describe('validateCylinderInput', () => {
  it('accepts valid cylinder dimensions', () => {
    const result = validateCylinderInput({ diameterMm: 80, heightMm: 120 })

    expect(result.valid).toBe(true)
    expect(result.messages).toHaveLength(0)
  })

  it('blocks a diameter below the minimum', () => {
    const result = validateCylinderInput({
      diameterMm: CYLINDER_MIN_DIAMETER_MM - 1,
      heightMm: 100,
    })

    expect(result.valid).toBe(false)
    expect(result.messages[0].code).toBe('min-dimension')
  })

  it('blocks a diameter above the maximum', () => {
    const result = validateCylinderInput({
      diameterMm: CYLINDER_MAX_DIAMETER_MM + 1,
      heightMm: 100,
    })

    expect(result.valid).toBe(false)
    expect(result.messages[0].code).toBe('max-dimension')
  })

  it('reports both diameter and height issues when both are out of range', () => {
    const result = validateCylinderInput({
      diameterMm: CYLINDER_MAX_DIAMETER_MM + 100,
      heightMm: 0,
    })

    expect(result.messages).toHaveLength(2)
  })
})
