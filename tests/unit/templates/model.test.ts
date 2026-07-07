import { describe, expect, it } from 'vitest'
import type { TemplateItem } from '../../../src/domain/templates/index.ts'

function buildTemplate(shapeType: string): TemplateItem {
  return {
    id: `shape-${shapeType}`,
    version: 1,
    name: `${shapeType} template`,
    shapeType,
    dimensionsMm: { width: 100, height: 80 },
    parts: [
      {
        id: 'part-main',
        name: 'Main part',
        panelIds: ['panel-main'],
        cutPathIds: ['cut-main'],
        foldLineIds: ['fold-main'],
        tabIds: ['tab-main'],
        joinEdgeIds: ['join-main'],
        bounds: { minX: 0, minY: 0, maxX: 100, maxY: 80, width: 100, height: 80 },
      },
    ],
    panels: [
      {
        id: 'panel-main',
        partId: 'part-main',
        name: 'Main panel',
        outline: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 80 },
          { x: 0, y: 80 },
        ],
        bounds: { minX: 0, minY: 0, maxX: 100, maxY: 80, width: 100, height: 80 },
      },
    ],
    cutPaths: [{ id: 'cut-main', partId: 'part-main', path: [{ x: 0, y: 0 }], style: 'solid', closed: false }],
    foldLines: [
      {
        id: 'fold-main',
        partId: 'part-main',
        start: { x: 50, y: 0 },
        end: { x: 50, y: 80 },
        foldType: 'score',
        style: 'dashed',
      },
    ],
    tabs: [
      {
        id: 'tab-main',
        partId: 'part-main',
        outline: [
          { x: 100, y: 0 },
          { x: 110, y: 0 },
          { x: 110, y: 20 },
        ],
        attachStart: { x: 100, y: 0 },
        attachEnd: { x: 100, y: 20 },
        widthMm: 10,
      },
    ],
    joinEdges: [
      {
        id: 'join-main',
        partId: 'part-main',
        start: { x: 0, y: 0 },
        end: { x: 0, y: 80 },
        label: 'A',
      },
    ],
    annotations: [
      {
        id: 'annotation-main',
        kind: 'label',
        text: 'Front',
        position: { x: 50, y: 40 },
        targetIds: ['panel-main'],
      },
    ],
    splitCandidates: [
      {
        id: 'split-main',
        partId: 'part-main',
        start: { x: 50, y: 0 },
        end: { x: 50, y: 80 },
        kind: 'fold',
        priority: 1,
        reason: 'Primary fold line',
      },
    ],
    assemblyNotes: [{ id: 'assembly-main', text: 'Fold along the center line.', step: 1 }],
    pages: [
      {
        id: 'page-main',
        pageNumber: 1,
        paperSizeId: 'a4',
        orientation: 'portrait',
        printableBounds: { minX: 0, minY: 0, maxX: 200, maxY: 287, width: 200, height: 287 },
        partIds: ['part-main'],
        joinEdgeIds: ['join-main'],
      },
    ],
    metadata: { shapeType },
  }
}

describe('template model', () => {
  it('can represent a rectangular box template', () => {
    const template = buildTemplate('box')

    expect(template.shapeType).toBe('box')
    expect(template.panels).toHaveLength(1)
    expect(template.pages[0].paperSizeId).toBe('a4')
  })

  it('can represent a cylinder template without changing the contract', () => {
    const template = buildTemplate('cylinder')

    expect(template.shapeType).toBe('cylinder')
    expect(template.splitCandidates[0].kind).toBe('fold')
  })
})
