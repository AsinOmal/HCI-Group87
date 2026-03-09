/**
 * Unit tests for DesignContext
 * Tests: addFurniture, updateFurniture, deleteFurniture, undo/redo,
 *        saveDesign, loadDesign, deleteDesign
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DesignProvider, useDesign } from '../context/DesignContext'

// ── Helper: renders a component inside DesignProvider and returns the context ──
function renderWithContext(ui) {
    let contextValue
    function Capture() {
        contextValue = useDesign()
        return ui
    }
    render(
        <DesignProvider>
            <Capture />
        </DesignProvider>
    )
    return () => contextValue
}

const SCALE = 80
const PAD = 40

const CHAIR = { type: 'Chair', width: 0.6, height: 0.6, defaultColor: '#8B7355' }
const SOFA = { type: 'Sofa', width: 2.0, height: 0.9, defaultColor: '#708090' }

// ══════════════════════════════════════════════════════════════════════════════
// 1. addFurniture
// ══════════════════════════════════════════════════════════════════════════════
describe('addFurniture', () => {
    it('TC-DC-01: adds a furniture item to the list', () => {
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(CHAIR) })
        expect(getCtx().furniture).toHaveLength(1)
        expect(getCtx().furniture[0].type).toBe('Chair')
    })

    it('TC-DC-02: spawns item at the centre of the floor (PAD + half room dimension)', () => {
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(CHAIR) })
        const item = getCtx().furniture[0]
        // Default room is 4×3m
        const expectedX = PAD + (4 * SCALE) / 2   // 40 + 160 = 200
        const expectedY = PAD + (3 * SCALE) / 2   // 40 + 120 = 160
        expect(item.x).toBe(expectedX)
        expect(item.y).toBe(expectedY)
    })

    it('TC-DC-03: new item has default rotation=0 and scale=1', () => {
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(SOFA) })
        const item = getCtx().furniture[0]
        expect(item.rotation).toBe(0)
        expect(item.scale).toBe(1)
    })

    it('TC-DC-04: new item colour matches the library defaultColor', () => {
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(CHAIR) })
        expect(getCtx().furniture[0].color).toBe(CHAIR.defaultColor)
    })

    it('TC-DC-05: adding multiple items all appear in the list', () => {
        const getCtx = renderWithContext(<></>)
        act(() => {
            getCtx().addFurniture(CHAIR)
            getCtx().addFurniture(SOFA)
        })
        expect(getCtx().furniture).toHaveLength(2)
    })

    it('TC-DC-06: each new item gets a unique id', () => {
        vi.useFakeTimers()
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(CHAIR) })
        vi.advanceTimersByTime(1)
        act(() => { getCtx().addFurniture(SOFA) })
        vi.useRealTimers()
        const [a, b] = getCtx().furniture
        expect(a.id).not.toBe(b.id)
    })
})

// ══════════════════════════════════════════════════════════════════════════════
// 2. updateFurniture
// ══════════════════════════════════════════════════════════════════════════════
describe('updateFurniture', () => {
    it('TC-DC-07: updates the colour of a specific item', () => {
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(CHAIR) })
        const id = getCtx().furniture[0].id
        act(() => { getCtx().updateFurniture(id, { color: '#FF0000' }) })
        expect(getCtx().furniture[0].color).toBe('#FF0000')
    })

    it('TC-DC-08: updates rotation without affecting other properties', () => {
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(CHAIR) })
        const id = getCtx().furniture[0].id
        const originalColor = getCtx().furniture[0].color
        act(() => { getCtx().updateFurniture(id, { rotation: 90 }) })
        expect(getCtx().furniture[0].rotation).toBe(90)
        expect(getCtx().furniture[0].color).toBe(originalColor)
    })

    it('TC-DC-09: updates scale correctly', () => {
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(SOFA) })
        const id = getCtx().furniture[0].id
        act(() => { getCtx().updateFurniture(id, { scale: 2.0 }) })
        expect(getCtx().furniture[0].scale).toBe(2.0)
    })

    it('TC-DC-10: updating one item does not affect another', () => {
        vi.useFakeTimers()
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(CHAIR) })
        vi.advanceTimersByTime(1)
        act(() => { getCtx().addFurniture(SOFA) })
        vi.useRealTimers()
        const chairId = getCtx().furniture[0].id
        const sofaColorBefore = getCtx().furniture[1].color
        act(() => { getCtx().updateFurniture(chairId, { color: '#FF0000' }) })
        expect(getCtx().furniture[0].color).toBe('#FF0000')
        expect(getCtx().furniture[1].color).toBe(sofaColorBefore)
    })
})

// ══════════════════════════════════════════════════════════════════════════════
// 3. deleteFurniture
// ══════════════════════════════════════════════════════════════════════════════
describe('deleteFurniture', () => {
    it('TC-DC-11: removes the item with the given id', () => {
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(CHAIR) })
        const id = getCtx().furniture[0].id
        act(() => { getCtx().deleteFurniture(id) })
        expect(getCtx().furniture).toHaveLength(0)
    })

    it('TC-DC-12: only removes the targeted item, leaving others intact', () => {
        vi.useFakeTimers()
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(CHAIR) })
        vi.advanceTimersByTime(1)
        act(() => { getCtx().addFurniture(SOFA) })
        vi.useRealTimers()
        const chairId = getCtx().furniture[0].id
        act(() => { getCtx().deleteFurniture(chairId) })
        expect(getCtx().furniture).toHaveLength(1)
        expect(getCtx().furniture[0].type).toBe('Sofa')
    })

    it('TC-DC-13: clears selectedId after deletion', () => {
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(CHAIR) })
        const id = getCtx().furniture[0].id
        act(() => { getCtx().setSelectedId(id) })
        act(() => { getCtx().deleteFurniture(id) })
        expect(getCtx().selectedId).toBeNull()
    })
})

// ══════════════════════════════════════════════════════════════════════════════
// 4. Undo / Redo
// ══════════════════════════════════════════════════════════════════════════════
describe('undo / redo', () => {
    it('TC-DC-14: undo removes the last added item', () => {
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(CHAIR) })
        expect(getCtx().furniture).toHaveLength(1)
        act(() => { getCtx().undo() })
        expect(getCtx().furniture).toHaveLength(0)
    })

    it('TC-DC-15: redo re-adds the undone item', () => {
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(CHAIR) })
        act(() => { getCtx().undo() })
        act(() => { getCtx().redo() })
        expect(getCtx().furniture).toHaveLength(1)
    })

    it('TC-DC-16: canUndo is false on an empty history', () => {
        const getCtx = renderWithContext(<></>)
        expect(getCtx().canUndo()).toBe(false)
    })

    it('TC-DC-17: canUndo is true after adding an item', () => {
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(CHAIR) })
        expect(getCtx().canUndo()).toBe(true)
    })

    it('TC-DC-18: canRedo is true after an undo', () => {
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(CHAIR) })
        act(() => { getCtx().undo() })
        expect(getCtx().canRedo()).toBe(true)
    })
})

// ══════════════════════════════════════════════════════════════════════════════
// 5. saveDesign / loadDesign / deleteDesign
// ══════════════════════════════════════════════════════════════════════════════
describe('design persistence', () => {
    beforeEach(() => {
        localStorage.clear()
        localStorage.setItem('token', 'fake-token')
        
        // Mock global fetch
        global.fetch = vi.fn((url, options) => {
            if (url.includes('/api/designs') && options?.method === 'DELETE') {
                return Promise.resolve({ ok: true })
            }
            if (url.includes('/api/designs') && options?.method === 'POST') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ _id: 'new-id', name: JSON.parse(options.body).name })
                })
            }
            if (url.includes('/api/designs') && (!options || options.method === 'GET')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([
                        { _id: '1', name: 'My Bedroom', furniture: [CHAIR], room: { width: 4, length: 3 } },
                        { _id: '2', name: 'TestDesign', furniture: [SOFA], room: { width: 4, length: 3 } }
                    ])
                })
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
        })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('TC-DC-19: saveDesign calls fetch POST when currentDesignId is null', async () => {
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().addFurniture(CHAIR) })
        await act(async () => { await getCtx().saveDesign('My Bedroom') })
        
        expect(global.fetch).toHaveBeenCalledWith('/api/designs', expect.objectContaining({
            method: 'POST'
        }))
        expect(getCtx().currentDesignName).toBe('My Bedroom')
    })

    it('TC-DC-20: saving an existing design calls fetch PUT', async () => {
        const getCtx = renderWithContext(<></>)
        act(() => { getCtx().setCurrentDesignId('existing-id') })
        await act(async () => { await getCtx().saveDesign('Office') })
        
        expect(global.fetch).toHaveBeenCalledWith('/api/designs/existing-id', expect.objectContaining({
            method: 'PUT'
        }))
    })

    it('TC-DC-21: loadDesign restores furniture and room from the saved design', () => {
        const getCtx = renderWithContext(<></>)
        
        const mockDesign = {
            _id: '1',
            name: 'Test Room',
            room: { width: 5, length: 5 },
            furniture: [CHAIR]
        }
        
        act(() => { getCtx().loadDesign(mockDesign) })
        
        expect(getCtx().furniture).toHaveLength(1)
        expect(getCtx().furniture[0].type).toBe('Chair')
        expect(getCtx().room.width).toBe(5)
        expect(getCtx().currentDesignId).toBe('1')
        expect(getCtx().currentDesignName).toBe('Test Room')
    })

    it('TC-DC-22: deleteDesign calls fetch DELETE', async () => {
        const getCtx = renderWithContext(<></>)
        await act(async () => { await getCtx().deleteDesign('1') })
        
        expect(global.fetch).toHaveBeenCalledWith('/api/designs/1', expect.objectContaining({
            method: 'DELETE'
        }))
    })
})
