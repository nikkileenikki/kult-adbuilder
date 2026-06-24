import { create } from 'zustand'
import { useCanvasStore } from './canvasStore'

export const useHistoryStore = create((set, get) => ({
  past: [],
  future: [],

  saveState: () => {
    const snapshot = JSON.stringify({
      elements: useCanvasStore.getState().elements,
      groups: useCanvasStore.getState().groups,
    })
    set((s) => ({ past: [...s.past, snapshot], future: [] }))
  },

  undo: () => {
    const { past, future } = get()
    if (!past.length) return
    const current = JSON.stringify({
      elements: useCanvasStore.getState().elements,
      groups: useCanvasStore.getState().groups,
    })
    const previous = past[past.length - 1]
    const state = JSON.parse(previous)
    useCanvasStore.setState(state)
    set({ past: past.slice(0, -1), future: [current, ...future] })
  },

  redo: () => {
    const { past, future } = get()
    if (!future.length) return
    const current = JSON.stringify({
      elements: useCanvasStore.getState().elements,
      groups: useCanvasStore.getState().groups,
    })
    const next = future[0]
    const state = JSON.parse(next)
    useCanvasStore.setState(state)
    set({ past: [...past, current], future: future.slice(1) })
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}))
