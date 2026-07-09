import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { generateBoxTemplate } from '../../../../src/domain/shapes/box/index.ts'
import { buildBoxAssemblyModel } from '../../../../src/features/assembly/model.ts'
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
    const model = buildBoxAssemblyModel(template, 'open-tray')
    const frontWallId = template.panels.find((panel) => panel.name === 'Front Panel')!.id
    const { container } = render(
      <TemplatePreview
        template={template}
        faceLabelLookup={model.targetIdToFaceLabel}
        highlightedTargetIds={new Set([frontWallId])}
      />,
    )

    expect(container.querySelectorAll('.template-preview__panel.is-highlighted')).toHaveLength(1)
    expect(container.querySelectorAll('.template-preview__label.is-highlighted')).toHaveLength(1)
    expect(container.textContent).toContain('Front')
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
        .filter((line) => line.id.includes('bottom-front') || line.id.includes('bottom-back'))
        .map((line) => line.id),
    )
    const { container } = render(
      <TemplatePreview template={template} highlightedFoldIds={highlightedFoldIds} />,
    )

    expect(container.querySelectorAll('.template-preview__fold.is-highlighted')).toHaveLength(2)
  })

  it('emits face hover and selection events through the shared face lookup', () => {
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 120,
        externalWidthMm: 80,
        externalHeightMm: 24,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'interactive-preview',
        itemName: 'Interactive Preview',
      },
    )
    const model = buildBoxAssemblyModel(template, 'open-tray')
    const onFaceHoverChange = vi.fn()
    const onFaceSelect = vi.fn()
    const { container } = render(
      <TemplatePreview
        template={template}
        faceTargetLookup={model.targetIdToFaceId}
        onFaceHoverChange={onFaceHoverChange}
        onFaceSelect={onFaceSelect}
      />,
    )

    const frontPanel = container.querySelector('[data-face-id="front"]')

    expect(frontPanel).not.toBeNull()

    fireEvent.mouseEnter(frontPanel!)
    fireEvent.click(frontPanel!)
    fireEvent.mouseLeave(frontPanel!)

    expect(onFaceHoverChange).toHaveBeenNthCalledWith(1, 'front')
    expect(onFaceSelect).toHaveBeenCalledWith('front')
    expect(onFaceHoverChange).toHaveBeenLastCalledWith(null)
  })
})
