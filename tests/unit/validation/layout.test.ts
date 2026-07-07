import { describe, expect, it } from 'vitest'
import { validateLayoutResult } from '../../../src/domain/validation/index.ts'

describe('validateLayoutResult', () => {
  it('warns when page count exceeds the practical threshold', () => {
    const result = validateLayoutResult({ pageCount: 9 })

    expect(result.valid).toBe(true)
    expect(result.messages[0].code).toBe('page-count-warning')
  })

  it('blocks when page count exceeds the export hard limit', () => {
    const result = validateLayoutResult({ pageCount: 25 })

    expect(result.valid).toBe(false)
    expect(result.messages[0].code).toBe('page-count-limit')
  })

  it('blocks illegal placements', () => {
    const result = validateLayoutResult({ pageCount: 1, hasLegalPlacement: false })

    expect(result.valid).toBe(false)
    expect(result.messages[0].code).toBe('impossible-layout')
  })
})
