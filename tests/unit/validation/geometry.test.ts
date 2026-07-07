import { describe, expect, it } from 'vitest'
import { validateTemplateGeometry } from '../../../src/domain/validation/index.ts'
import type { TemplateItem } from '../../../src/domain/templates/index.ts'

const template: TemplateItem = {
  id: 'box-1',
  version: 1,
  name: 'Box',
  shapeType: 'box',
  dimensionsMm: {},
  parts: [],
  panels: [],
  cutPaths: [],
  foldLines: [],
  tabs: [
    {
      id: 'tab-1',
      partId: 'part-1',
      outline: [],
      attachStart: { x: 0, y: 0 },
      attachEnd: { x: 0, y: 10 },
      widthMm: 4,
      label: 'Glue tab',
    },
  ],
  joinEdges: [],
  annotations: [],
  splitCandidates: [],
  assemblyNotes: [],
  pages: [],
  metadata: {},
}

describe('validateTemplateGeometry', () => {
  it('warns when a tab is narrower than the recommended width', () => {
    const result = validateTemplateGeometry(template)

    expect(result.valid).toBe(true)
    expect(result.messages[0].code).toBe('tab-too-small')
  })
})
