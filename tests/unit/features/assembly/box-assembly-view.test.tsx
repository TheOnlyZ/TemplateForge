import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BoxAssemblyView } from '../../../../src/features/assembly/BoxAssemblyView.tsx'
import type { AssemblyPartMapping } from '../../../../src/features/assembly/mapping.ts'
import { buildBoxAssemblyModel } from '../../../../src/features/assembly/model.ts'
import { generateBoxTemplate } from '../../../../src/domain/shapes/box/index.ts'

const defaultPartMappings: AssemblyPartMapping[] = [
  {
    partId: 'part-main',
    partName: 'Open Tray',
    pageNumbers: [1],
    pageLabels: ['Page 1'],
    tileCount: 1,
  },
]

function buildOpenTrayModel() {
  return buildBoxAssemblyModel(
    generateBoxTemplate(
      {
        externalLengthMm: 120,
        externalWidthMm: 80,
        externalHeightMm: 24,
        glueTabWidthMm: 12,
        style: 'open-tray',
      },
      {
        itemId: 'assembly-view-open-tray',
        itemName: 'Assembly View Open Tray',
      },
    ).template,
    'open-tray',
  )
}

function buildTuckCartonModel() {
  return buildBoxAssemblyModel(
    generateBoxTemplate(
      {
        externalLengthMm: 140,
        externalWidthMm: 90,
        externalHeightMm: 55,
        glueTabWidthMm: 16,
        style: 'tuck-carton',
      },
      {
        itemId: 'assembly-view-carton',
        itemName: 'Assembly View Carton',
      },
    ).template,
    'tuck-carton',
  )
}

describe('BoxAssemblyView', () => {
  it('renders an accessible assembled 3D box view with dimension chips', () => {
    render(
      <BoxAssemblyView
        name="Assembly Box"
        boxInput={{
          externalLengthMm: 120,
          externalWidthMm: 80,
          externalHeightMm: 24,
          glueTabWidthMm: 12,
          style: 'open-tray',
        }}
        model={buildOpenTrayModel()}
        mode="finished"
        partMappings={defaultPartMappings}
        unitSystem="metric"
      />,
    )

    expect(screen.getByRole('img', { name: 'Assembly Box assembled 3D view' })).toBeInTheDocument()
    expect(screen.getByText('This is the finished object.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finished Object' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Base')).toBeInTheDocument()
    expect(screen.getByText('120 mm L')).toBeInTheDocument()
    expect(screen.getByText('80 mm W')).toBeInTheDocument()
    expect(screen.getByText('24 mm H')).toBeInTheDocument()
  })

  it('shows the carton closure label for closed-top styles', () => {
    render(
      <BoxAssemblyView
        name="Carton View"
        boxInput={{
          externalLengthMm: 140,
          externalWidthMm: 90,
          externalHeightMm: 55,
          glueTabWidthMm: 16,
          style: 'tuck-carton',
        }}
        model={buildTuckCartonModel()}
        mode="finished"
        partMappings={defaultPartMappings}
        unitSystem="imperial"
      />,
    )

    expect(screen.getByText('Top')).toBeInTheDocument()
    expect(screen.getByText('Tuck Carton')).toBeInTheDocument()
  })

  it('emits face highlight changes when a visible face is hovered', () => {
    const onFaceHoverChange = vi.fn()
    const { container } = render(
      <BoxAssemblyView
        name="Hover Box"
        boxInput={{
          externalLengthMm: 120,
          externalWidthMm: 80,
          externalHeightMm: 24,
          glueTabWidthMm: 12,
          style: 'open-tray',
        }}
        model={buildOpenTrayModel()}
        mode="finished"
        partMappings={defaultPartMappings}
        unitSystem="metric"
        onFaceHoverChange={onFaceHoverChange}
      />,
    )

    const frontFace = container.querySelector('[data-face-id="front"]')

    expect(frontFace).not.toBeNull()

    fireEvent.mouseEnter(frontFace!)
    fireEvent.mouseLeave(frontFace!)

    expect(onFaceHoverChange).toHaveBeenNthCalledWith(1, 'front')
    expect(onFaceHoverChange).toHaveBeenNthCalledWith(2, null)
  })

  it('switches modes and notifies consumers when the active sequence step changes', () => {
    const onModeChange = vi.fn()
    const onStepChange = vi.fn()

    render(
      <BoxAssemblyView
        name="Guided Box"
        boxInput={{
          externalLengthMm: 120,
          externalWidthMm: 80,
          externalHeightMm: 24,
          glueTabWidthMm: 12,
          style: 'open-tray',
        }}
        activeStepId="fold-front-wall"
        model={buildOpenTrayModel()}
        mode="sequence"
        onModeChange={onModeChange}
        partMappings={defaultPartMappings}
        unitSystem="metric"
        onStepChange={onStepChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Exploded View' }))

    expect(onModeChange).toHaveBeenCalledWith('exploded')

    fireEvent.click(screen.getByRole('button', { name: /Fold Back Wall upward 90°/ }))

    expect(onStepChange).toHaveBeenCalledWith('fold-back-wall')
  })

  it('advances through the assembly sequence and supports pausing on a selected step', () => {
    vi.useFakeTimers()
    const onStepChange = vi.fn()

    render(
      <BoxAssemblyView
        name="Sequence Box"
        boxInput={{
          externalLengthMm: 120,
          externalWidthMm: 80,
          externalHeightMm: 24,
          glueTabWidthMm: 12,
          style: 'open-tray',
        }}
        activeStepId="fold-front-wall"
        model={buildOpenTrayModel()}
        mode="sequence"
        onStepChange={onStepChange}
        partMappings={defaultPartMappings}
        unitSystem="metric"
      />,
    )

    expect(screen.getAllByText('Fold Front Wall upward 90°').length).toBeGreaterThan(0)
    expect(screen.getByText('Fold Up')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Play Sequence' }))

    act(() => {
      vi.advanceTimersByTime(1900)
    })

    expect(onStepChange).toHaveBeenCalledWith('fold-back-wall')

    fireEvent.click(screen.getByRole('button', { name: 'Pause Sequence' }))
    fireEvent.click(screen.getByRole('button', { name: /Press tabs until secure/ }))

    expect(onStepChange).toHaveBeenCalledWith('press-secure-tabs')
    expect(screen.getByRole('button', { name: 'Play Sequence' })).toBeInTheDocument()
    expect(screen.getByText('Part Identification')).toBeInTheDocument()
    expect(screen.getByText('Page 1')).toBeInTheDocument()

    vi.useRealTimers()
  })
})
