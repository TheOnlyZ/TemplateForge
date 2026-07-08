import { describe, expect, it } from 'vitest'
import { layoutTemplate } from '../../../../src/domain/layout/index.ts'
import { getDefaultMarginConfig, getPaperDefinition } from '../../../../src/domain/paper/index.ts'
import { generateBoxTemplate } from '../../../../src/domain/shapes/box/index.ts'
import type { TemplateItem } from '../../../../src/domain/templates/index.ts'
import { buildAssemblyPartMappings } from '../../../../src/features/assembly/mapping.ts'

function createOversizedTemplate(width: number, height: number): TemplateItem {
  return {
    id: 'assembly-mapping-oversized',
    version: 1,
    name: 'Assembly Mapping Oversized',
    shapeType: 'box',
    dimensionsMm: { width, height },
    parts: [
      {
        id: 'part-main',
        name: 'Main Part',
        panelIds: [],
        cutPathIds: ['cut-outline'],
        foldLineIds: [],
        tabIds: [],
        joinEdgeIds: [],
        bounds: { minX: 0, minY: 0, maxX: width, maxY: height, width, height },
      },
    ],
    panels: [],
    cutPaths: [
      {
        id: 'cut-outline',
        partId: 'part-main',
        path: [
          { x: 0, y: 0 },
          { x: width, y: 0 },
          { x: width, y: height },
          { x: 0, y: height },
        ],
        style: 'solid',
        closed: true,
      },
    ],
    foldLines: [],
    tabs: [],
    joinEdges: [],
    annotations: [],
    splitCandidates: [],
    assemblyNotes: [],
    pages: [],
    metadata: {},
  }
}

describe('buildAssemblyPartMappings', () => {
  it('maps a single-page box part to its printable page', () => {
    const paper = getPaperDefinition('a4')
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 100,
        externalWidthMm: 70,
        externalHeightMm: 20,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'assembly-map-box',
        itemName: 'Assembly Map Box',
      },
    )
    const layout = layoutTemplate(template, paper, 'auto', getDefaultMarginConfig())
    const mappings = buildAssemblyPartMappings(template, layout)

    expect(mappings).toHaveLength(1)
    expect(mappings[0]!.partName).toBe('Open Tray')
    expect(mappings[0]!.pageNumbers).toEqual([1])
    expect(mappings[0]!.pageLabels).toEqual(['Page 1'])
  })

  it('maps a tiled part to each printable tile label', () => {
    const template = createOversizedTemplate(320, 430)
    const layout = layoutTemplate(
      template,
      getPaperDefinition('a4'),
      'portrait',
      getDefaultMarginConfig(),
    )
    const mappings = buildAssemblyPartMappings(template, layout)

    expect(mappings).toHaveLength(1)
    expect(mappings[0]!.tileCount).toBe(4)
    expect(mappings[0]!.pageLabels).toEqual([
      'Page 1 • Tile 1,1',
      'Page 2 • Tile 1,2',
      'Page 3 • Tile 2,1',
      'Page 4 • Tile 2,2',
    ])
  })
})
