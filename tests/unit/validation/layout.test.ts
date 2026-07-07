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

  it('warns when margins fall below the recommended printer-safe threshold', () => {
    const result = validateLayoutResult({
      pageCount: 1,
      margins: { top: 3, right: 6.35, bottom: 6.35, left: 6.35 },
    })

    expect(result.valid).toBe(true)
    expect(result.messages.some((message) => message.code === 'margin-below-recommended')).toBe(true)
  })

  it('blocks when the configured printable area becomes too small for calibrated export', () => {
    const result = validateLayoutResult({
      pageCount: 1,
      printableAreaWidthMm: 96,
      printableAreaHeightMm: 20,
    })

    expect(result.valid).toBe(false)
    expect(result.messages.some((message) => message.code === 'printable-area-too-small')).toBe(true)
  })
})
