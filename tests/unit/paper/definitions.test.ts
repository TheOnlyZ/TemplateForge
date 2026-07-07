import { describe, expect, it } from 'vitest'
import { getPaperDefinition, getPaperSizeOptions } from '../../../src/domain/paper/index.ts'

describe('paper definitions', () => {
  it('returns the MVP paper definitions', () => {
    expect(getPaperSizeOptions()).toHaveLength(4)
    expect(getPaperDefinition('a4').label).toBe('A4 (International standard)')
  })

  it('keeps Letter and Legal available as ordered US paper options', () => {
    const options = getPaperSizeOptions()

    expect(options.map((paper) => paper.id)).toEqual(['letter', 'legal', 'a4', 'a3'])
    expect(getPaperDefinition('letter')).toMatchObject({
      family: 'us',
      widthMm: 215.9,
      heightMm: 279.4,
    })
    expect(getPaperDefinition('legal')).toMatchObject({
      family: 'us',
      widthMm: 215.9,
      heightMm: 355.6,
    })
  })
})
