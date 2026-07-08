import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultProjectState, useAppStore } from '../../../src/store/app-store.ts'

function resetStore() {
  useAppStore.setState(createDefaultProjectState())
}

describe('app store queue editing', () => {
  beforeEach(() => {
    resetStore()
  })

  it('defaults new projects to US Letter paper and box shape', () => {
    const state = useAppStore.getState()

    expect(state.draft.paperSizeId).toBe('letter')
    expect(state.draft.shapeType).toBe('box')
    expect(state.draft.cylinderInput).toEqual({ diameterMm: 60, heightMm: 100 })
  })

  it('loads a queued item into the draft for editing', () => {
    useAppStore.getState().setDraftName('Queued Box')
    useAppStore.getState().setDraftDimension('externalLengthMm', 150)
    useAppStore.getState().addDraftToQueue()

    const itemId = useAppStore.getState().queueItems[0]!.id
    useAppStore.getState().startEditingQueueItem(itemId)

    const state = useAppStore.getState()

    expect(state.editingQueueItemId).toBe(itemId)
    expect(state.draft.name).toBe('Queued Box')
    expect(state.draft.boxInput.externalLengthMm).toBe(150)
    expect(state.draftStep).toBe('dimensions')
  })

  it('saves edits back into the existing queued item instead of adding a new one', () => {
    useAppStore.getState().setDraftName('Original Box')
    useAppStore.getState().addDraftToQueue()

    const itemId = useAppStore.getState().queueItems[0]!.id
    useAppStore.getState().startEditingQueueItem(itemId)
    useAppStore.getState().setDraftName('Updated Box')
    useAppStore.getState().setDraftDimension('externalHeightMm', 42)
    useAppStore.getState().addDraftToQueue()

    const state = useAppStore.getState()

    expect(state.queueItems).toHaveLength(1)
    expect(state.queueItems[0]!.id).toBe(itemId)
    expect(state.queueItems[0]!.name).toBe('Updated Box')
    expect(state.queueItems[0]!.boxInput.externalHeightMm).toBe(42)
    expect(state.editingQueueItemId).toBeNull()
    expect(state.draft.name).toBe('Rectangular Box 2')
  })

  it('duplicates a queue item immediately with a new id and copied values', () => {
    useAppStore.getState().setDraftName('Source Box')
    useAppStore.getState().setDraftDimension('externalWidthMm', 92)
    useAppStore.getState().addDraftToQueue()

    const sourceId = useAppStore.getState().queueItems[0]!.id
    useAppStore.getState().duplicateQueueItem(sourceId)

    const state = useAppStore.getState()

    expect(state.queueItems).toHaveLength(2)
    expect(state.queueItems[0]!.id).toBe('queue-item-2')
    expect(state.queueItems[0]!.name).toBe('Source Box Copy')
    expect(state.queueItems[0]!.boxInput.externalWidthMm).toBe(92)
    expect(state.queueItems[1]!.id).toBe(sourceId)
  })

  it('cancels queue editing and restores a fresh draft', () => {
    useAppStore.getState().setDraftName('Editable Box')
    useAppStore.getState().addDraftToQueue()

    const itemId = useAppStore.getState().queueItems[0]!.id
    useAppStore.getState().startEditingQueueItem(itemId)
    useAppStore.getState().setDraftName('Unsaved Change')
    useAppStore.getState().cancelEditingQueueItem()

    const state = useAppStore.getState()

    expect(state.editingQueueItemId).toBeNull()
    expect(state.draft.name).toBe('Rectangular Box 2')
    expect(state.draftStep).toBe('dimensions')
  })

  it('clears edit mode when the currently edited queue item is removed', () => {
    useAppStore.getState().setDraftName('Removable Box')
    useAppStore.getState().addDraftToQueue()

    const itemId = useAppStore.getState().queueItems[0]!.id
    useAppStore.getState().startEditingQueueItem(itemId)
    useAppStore.getState().removeQueueItem(itemId)

    const state = useAppStore.getState()

    expect(state.queueItems).toHaveLength(0)
    expect(state.editingQueueItemId).toBeNull()
    expect(state.draft.name).toBe('Rectangular Box 2')
  })

  it('switches between box and cylinder shape types and preserves inputs', () => {
    useAppStore.getState().setDraftShapeType('cylinder')
    useAppStore.getState().setDraftCylinderDimension('diameterMm', 80)

    const state = useAppStore.getState()

    expect(state.draft.shapeType).toBe('cylinder')
    expect(state.draft.cylinderInput.diameterMm).toBe(80)

    useAppStore.getState().setDraftShapeType('box')

    expect(useAppStore.getState().draft.shapeType).toBe('box')
    expect(useAppStore.getState().draft.boxInput.externalLengthMm).toBe(120)
  })
})
