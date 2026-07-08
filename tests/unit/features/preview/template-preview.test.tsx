import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { generateBoxTemplate } from '../../../../src/domain/shapes/box/index.ts'
import { TemplatePreview } from '../../../../src/features/preview/TemplatePreview.tsx'

describe('TemplatePreview', () => {
  it('highlights matching panels and labels for the active face target ids', () => {
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 120,
        externalWidthMm: 80,
        externalHeightMm: 24,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'highlight-preview',
        itemName: 'Highlight Preview',
      },
    )
    const frontWallId = template.panels.find((panel) => panel.name === 'Front Wall')!.id
    const { container } = render(
      <TemplatePreview template={template} highlightedTargetIds={new Set([frontWallId])} />,
    )

    expect(container.querySelectorAll('.template-preview__panel.is-highlighted')).toHaveLength(1)
    expect(container.querySelectorAll('.template-preview__label.is-highlighted')).toHaveLength(1)
  })

  it('highlights active fold lines for the current folding-guidance step', () => {
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 120,
        externalWidthMm: 80,
        externalHeightMm: 24,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'highlight-folds',
        itemName: 'Highlight Folds',
      },
    )
    const highlightedFoldIds = new Set(
      template.foldLines
        .filter((line) => line.id.includes('front-wall') || line.id.includes('back-wall'))
        .map((line) => line.id),
    )
    const { container } = render(
      <TemplatePreview template={template} highlightedFoldIds={highlightedFoldIds} />,
    )

    expect(container.querySelectorAll('.template-preview__fold.is-highlighted')).toHaveLength(2)
  })
})
