import { create } from 'zustand'
import { useCanvasStore } from './canvasStore'

// Each entry is a full snapshot of the canvas, and elements can carry base64 image
// data (uploads, AI art) running to megabytes — so an uncapped stack was a genuine
// memory leak: every click and every keystroke pushed another complete copy of the
// banner and nothing ever freed them. 50 is deep enough that nobody undoes past it in
// practice, and bounds worst-case memory to something predictable.
const MAX_HISTORY = 50

// A burst of edits to the same field — typing into a text input, dragging a colour
// picker or a number stepper — should collapse into one undo step, not one per
// keystroke. Same coalesce key within this window keeps the entry already on the
// stack instead of pushing another; a different field, or a pause, starts a new one.
const COALESCE_MS = 600

// Canvas size and stop points ride along with elements/groups: undoing a resize or a
// stop-point change used to silently do nothing (the snapshot didn't carry them),
// which read as undo skipping a step. Toolbar re-derives its size dropdown from the
// store, so restoring these keeps the UI in sync.
function snapshot() {
  const s = useCanvasStore.getState()
  return JSON.stringify({
    elements: s.elements,
    groups: s.groups,
    canvasWidth: s.canvasWidth,
    canvasHeight: s.canvasHeight,
    animStopPoints: s.animStopPoints,
  })
}

function restore(json) {
  useCanvasStore.setState(JSON.parse(json))
}

export const useHistoryStore = create((set, get) => ({
  past: [],
  future: [],
  coalesceKey: null,
  coalesceAt: 0,

  // `key` (optional) opts this call into coalescing — pass a stable identifier for the
  // field being edited (see PropertiesSection). Omit it for discrete actions (add,
  // delete, drag, resize), which should always get their own undo step.
  saveState: (key = null) => {
    const now = Date.now()
    const { coalesceKey, coalesceAt } = get()
    if (key && key === coalesceKey && now - coalesceAt < COALESCE_MS) {
      // Mid-burst: the entry already on the stack holds the pre-burst state, which is
      // exactly what this burst should undo back to. Just extend the window.
      set({ coalesceAt: now, future: [] })
      return
    }
    const snap = snapshot()
    set((s) => ({
      past: [...s.past, snap].slice(-MAX_HISTORY),
      future: [],
      coalesceKey: key,
      coalesceAt: now,
    }))
  },

  undo: () => {
    const { past, future } = get()
    if (!past.length) return
    const current = snapshot()
    restore(past[past.length - 1])
    set({
      past: past.slice(0, -1),
      future: [current, ...future].slice(0, MAX_HISTORY),
      coalesceKey: null,
    })
  },

  redo: () => {
    const { past, future } = get()
    if (!future.length) return
    const current = snapshot()
    restore(future[0])
    set({
      past: [...past, current].slice(-MAX_HISTORY),
      future: future.slice(1),
      coalesceKey: null,
    })
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}))
