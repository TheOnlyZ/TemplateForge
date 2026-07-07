import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAX_DIMENSION_MM,
  DEFAULT_MIN_DIMENSION_MM,
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
