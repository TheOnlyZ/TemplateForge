import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BoxAssemblyView } from '../../../../src/features/assembly/BoxAssemblyView.tsx'

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
        unitSystem="metric"
      />,
    )

    expect(screen.getByRole('img', { name: 'Assembly Box assembled 3D view' })).toBeInTheDocument()
    expect(screen.getByText('Open Top')).toBeInTheDocument()
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
        unitSystem="imperial"
      />,
    )

    expect(screen.getByText('Top Closure')).toBeInTheDocument()
    expect(screen.getByText('Tuck Carton')).toBeInTheDocument()
  })

  it('emits face highlight changes when a visible face is hovered', () => {
    const onFaceHighlightChange = vi.fn()
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
        unitSystem="metric"
        onFaceHighlightChange={onFaceHighlightChange}
      />,
    )

    const frontFace = container.querySelector('[data-face-id="front"]')

    expect(frontFace).not.toBeNull()

    fireEvent.mouseEnter(frontFace!)
    fireEvent.mouseLeave(frontFace!)

    expect(onFaceHighlightChange).toHaveBeenNthCalledWith(1, 'front')
    expect(onFaceHighlightChange).toHaveBeenNthCalledWith(2, null)
  })

  it('notifies consumers when the active assembly step changes', () => {
    vi.useFakeTimers()
    const onSequenceStepChange = vi.fn()

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
        unitSystem="metric"
        onSequenceStepChange={onSequenceStepChange}
      />,
    )

    expect(onSequenceStepChange).toHaveBeenCalledWith('flat-setup', 'top')

    act(() => {
      vi.advanceTimersByTime(1700)
    })

    expect(onSequenceStepChange).toHaveBeenCalledWith('walls-rising', 'side')
    vi.useRealTimers()
  })

  it('advances through the assembly sequence and supports pausing on a selected step', () => {
    vi.useFakeTimers()

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
        unitSystem="metric"
      />,
    )

    expect(screen.getByRole('button', { name: 'Pause Sequence' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Score the front and back wall fold lines first so the tray can hinge upward cleanly from the base.',
      ),
    ).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1700)
    })

    expect(
      screen.getByText(
        'Raise the left and right wall folds after the front and back walls are creased to square the tray shell.',
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Pause Sequence' }))
    fireEvent.click(screen.getByRole('button', { name: /3Tray Ready/ }))

    expect(
      screen.getByText(
        'Fold the corner tabs inward last, then secure them behind the front and back walls to lock the tray shape.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play Sequence' })).toBeInTheDocument()

    vi.useRealTimers()
  })
})
