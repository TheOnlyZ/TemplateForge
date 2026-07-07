import { describe, expect, it } from 'vitest'
import { generateBoxTemplate } from '../../../../src/domain/shapes/box/index.ts'
import { renderTemplatePreview } from '../../../../src/renderers/svg-preview/index.ts'

describe('renderTemplatePreview', () => {
  it('maps a generated template into preview paths and labels', () => {
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 140,
        externalWidthMm: 90,
        externalHeightMm: 36,
        glueTabWidthMm: 14,
        style: 'open-tray',
      },
      {
        itemId: 'preview-box',
        itemName: 'Preview Tray',
      },
    )

    const scene = renderTemplatePreview(template)

    expect(scene.viewBox).toContain(' ')
    expect(scene.panelPaths).toHaveLength(5)
    expect(scene.cutPaths).toHaveLength(1)
    expect(scene.tabPaths).toHaveLength(4)
    expect(scene.foldPaths).toHaveLength(8)
    expect(scene.labels.map((label) => label.text)).toContain('Base')
  })
})
