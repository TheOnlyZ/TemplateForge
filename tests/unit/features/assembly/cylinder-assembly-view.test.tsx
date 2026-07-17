import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { generateCylinderTemplate } from '../../../../src/domain/shapes/cylinder/index.ts'
import { CylinderAssemblyView } from '../../../../src/features/assembly/CylinderAssemblyView.tsx'
import type { AssemblyPartMapping } from '../../../../src/features/assembly/mapping.ts'
import { buildCylinderAssemblyModel } from '../../../../src/features/assembly/model.ts'

const defaultPartMappings: AssemblyPartMapping[] = [
  {
    partId: 'part-main',
    partName: 'Straight Cylinder',
    pageNumbers: [1],
    pageLabels: ['Page 1'],
    tileCount: 1,
  },
]

function buildCylinderModel() {
  return buildCylinderAssemblyModel(
    generateCylinderTemplate(
      {
        diameterMm: 60,
        heightMm: 100,
      },
      {
        itemId: 'assembly-cylinder-view',
        itemName: 'Assembly Cylinder View',
      },
    ).template,
  )
}

describe('CylinderAssemblyView', () => {
  it('renders a finished cylinder view with visible structural labels by default', () => {
    render(
      <CylinderAssemblyView
        name="Cylinder View"
        cylinderInput={{
          diameterMm: 60,
          heightMm: 100,
        }}
        model={buildCylinderModel()}
        mode="finished"
        partMappings={defaultPartMappings}
        unitSystem="metric"
      />,
    )

    expect(screen.getByRole('img', { name: 'Cylinder View assembled 3D view' })).toBeInTheDocument()
    expect(screen.getByText('This is the finished object.')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByText('Top')).toBeInTheDocument()
  })

  it('supports mode switching and face hover events', () => {
    const onModeChange = vi.fn()
    const onFaceHoverChange = vi.fn()
    const { container } = render(
      <CylinderAssemblyView
        name="Interactive Cylinder"
        cylinderInput={{
          diameterMm: 60,
          heightMm: 100,
        }}
        model={buildCylinderModel()}
        mode="finished"
        partMappings={defaultPartMappings}
        unitSystem="metric"
        onModeChange={onModeChange}
        onFaceHoverChange={onFaceHoverChange}
      />,
    )

    fireEvent.click(screen.getByRole('radio', { name: 'Exploded View' }))
    expect(onModeChange).toHaveBeenCalledWith('exploded')

    const bodyFace = container.querySelector('[data-face-id="body"]')
    expect(bodyFace).not.toBeNull()

    fireEvent.mouseEnter(bodyFace!)
    fireEvent.mouseLeave(bodyFace!)

    expect(onFaceHoverChange).toHaveBeenNthCalledWith(1, 'body')
    expect(onFaceHoverChange).toHaveBeenNthCalledWith(2, null)
  })
})
