import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateBoxTemplate } from '../../../../src/domain/shapes/box/index.ts'
import { createDefaultProjectState, useAppStore } from '../../../../src/store/app-store.ts'
import { BoxWizard } from '../../../../src/features/wizard/box-wizard/BoxWizard.tsx'

function resetStore() {
  useAppStore.setState(createDefaultProjectState())
}

describe('BoxWizard', () => {
  beforeEach(() => {
    resetStore()
  })

  it('interprets entered dimension values in imperial mode as inches', () => {
    useAppStore.setState({ unitSystem: 'imperial', draftStep: 'dimensions' })
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 120,
        externalWidthMm: 80,
        externalHeightMm: 24,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'wizard-preview',
        itemName: 'Wizard Preview',
      },
    )

    render(
      <BoxWizard
        unitSystem="imperial"
        previewTemplate={template}
        canExportPreviewPdf={true}
        canExportPreviewSvg={true}
        onExportPreviewPdf={vi.fn()}
        onExportPreviewSvg={vi.fn()}
        layoutStatus={{ type: 'single-piece', description: 'Fits on one page', errorCount: 0, warningCount: 0 }}
        messages={[]}
      />,
    )

    const lengthInput = screen.getByLabelText(/Length \(in\)/)

    fireEvent.change(lengthInput, { target: { value: '5' } })

    expect(useAppStore.getState().draft.boxInput.externalLengthMm).toBeCloseTo(127, 3)
  })

  it('shows the fit status badge', () => {
    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 120,
        externalWidthMm: 80,
        externalHeightMm: 24,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'wizard-preview',
        itemName: 'Wizard Preview',
      },
    )

    const props = {
      unitSystem: 'metric' as const,
      previewTemplate: template,
      canExportPreviewPdf: true,
      canExportPreviewSvg: true,
      onExportPreviewPdf: vi.fn(),
      onExportPreviewSvg: vi.fn(),
      layoutStatus: { type: 'single-piece' as const, description: 'Fits on one page', errorCount: 0, warningCount: 0 },
      messages: [],
    }

    render(<BoxWizard {...props} />)
    expect(screen.getByText('Fits')).toBeInTheDocument()
  })

  it('starts over without clearing the queue', () => {
    useAppStore.getState().setDraftName('Queued Box')
    useAppStore.getState().addDraftToQueue()
    useAppStore.getState().setDraftStep('paper')
    useAppStore.getState().setDraftName('Unsaved Draft')

    const { template } = generateBoxTemplate(
      {
        externalLengthMm: 120,
        externalWidthMm: 80,
        externalHeightMm: 24,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'wizard-preview',
        itemName: 'Wizard Preview',
      },
    )

    render(
      <BoxWizard
        unitSystem="metric"
        previewTemplate={template}
        canExportPreviewPdf={true}
        canExportPreviewSvg={true}
        onExportPreviewPdf={vi.fn()}
        onExportPreviewSvg={vi.fn()}
        layoutStatus={{ type: 'single-piece', description: 'Fits on one page', errorCount: 0, warningCount: 0 }}
        messages={[]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Start Over' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Start Over' })[1])

    const state = useAppStore.getState()
    expect(state.draftStep).toBe('shape')
    expect(state.queueItems).toHaveLength(1)
    expect(state.queueItems[0]!.name).toBe('Queued Box')
    expect(screen.getByText('Rectangular Box')).toBeInTheDocument()
  })
})
