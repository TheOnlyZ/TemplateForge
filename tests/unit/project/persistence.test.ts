import { describe, expect, it } from 'vitest'
import { createDefaultProjectState } from '../../../src/store/app-store.ts'
import {
  createProjectFileContents,
  getDefaultProjectName,
  parseProjectFileContents,
} from '../../../src/features/project/persistence.ts'

describe('project persistence', () => {
  it('round-trips the current project state through the saved project file format', () => {
    const snapshot = createDefaultProjectState()
    snapshot.unitSystem = 'imperial'
    snapshot.draft.name = 'Saved Draft'
    snapshot.draftStep = 'preview'
    snapshot.queueItems = [
      {
        id: 'queue-item-3',
        name: 'Queued Box',
        materialId: 'cardstock',
        paperSizeId: 'letter',
        orientation: 'landscape',
        margins: { top: 6.35, right: 7, bottom: 8, left: 9 },
        boxInput: {
          externalLengthMm: 150,
          externalWidthMm: 90,
          externalHeightMm: 36,
          glueTabWidthMm: 14,
          style: 'glue-tab-carton',
        },
      },
    ]
    snapshot.nextQueueIndex = 4
    snapshot.editingQueueItemId = 'queue-item-3'

    const contents = createProjectFileContents(snapshot, 'Queued Box Project')
    const restored = parseProjectFileContents(contents)

    expect(restored).toEqual(snapshot)
  })

  it('derives a default project name from the queue before falling back to the draft', () => {
    const snapshot = createDefaultProjectState()

    expect(getDefaultProjectName(snapshot)).toBe('Rectangular Box 1')

    snapshot.queueItems = [
      {
        id: 'queue-item-1',
        name: 'Queued Project Name',
        materialId: 'cardstock',
        paperSizeId: 'a4',
        orientation: 'auto',
        margins: { top: 6.35, right: 6.35, bottom: 6.35, left: 6.35 },
        boxInput: {
          externalLengthMm: 120,
          externalWidthMm: 80,
          externalHeightMm: 24,
          glueTabWidthMm: 12,
          style: 'open-tray',
        },
      },
    ]

    expect(getDefaultProjectName(snapshot)).toBe('Queued Project Name')
  })

  it('rejects files that are not valid TemplateForge project exports', () => {
    expect(() => parseProjectFileContents('{"version":99}')).toThrow(
      'Invalid TemplateForge project file.',
    )
  })

  it('drops stale editing ids when reopening a project file', () => {
    const snapshot = createDefaultProjectState()
    snapshot.queueItems = [
      {
        id: 'queue-item-1',
        name: 'Queued Project Name',
        materialId: 'cardstock',
        paperSizeId: 'a4',
        orientation: 'auto',
        margins: { top: 6.35, right: 6.35, bottom: 6.35, left: 6.35 },
        boxInput: {
          externalLengthMm: 120,
          externalWidthMm: 80,
          externalHeightMm: 24,
          glueTabWidthMm: 12,
          style: 'open-tray',
        },
      },
    ]
    snapshot.editingQueueItemId = 'missing-item'

    const restored = parseProjectFileContents(createProjectFileContents(snapshot, 'Queued Project Name'))

    expect(restored.editingQueueItemId).toBeNull()
  })
})
