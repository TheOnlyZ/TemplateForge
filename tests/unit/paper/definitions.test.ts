import { describe, expect, it } from 'vitest'
import { getPaperDefinition, getPaperSizeOptions } from '../../../src/domain/paper/index.ts'

describe('paper definitions', () => {
  it('returns the MVP paper definitions', () => {
    expect(getPaperSizeOptions()).toHaveLength(4)
    expect(getPaperDefinition('a4').label).toBe('A4 (International standard)')
  })
})
