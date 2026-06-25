import { create } from 'zustand'

let nextId = 1
const uid = (type) => `${type}_${nextId++}`

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

export const useCanvasStore = create((set, get) => ({
  elements: [],
  groups: [],
  selectedId: null,
  canvasWidth: 300,
  canvasHeight: 250,
  animDuration: 5,
  animLoop: 1,
  snapLines: { x: [], y: [] },
  activeTemplate: null,
  setActiveTemplate: (tpl) => set({ activeTemplate: tpl }),
  setSnapLines: (lines) => set({ snapLines: lines }),
  clearSnapLines: () => set({ snapLines: { x: [], y: [] } }),
  setAnimDuration: (v) => set({ animDuration: Math.max(1, Math.min(60, v)) }),
  setAnimLoop: (v) => set({ animLoop: Math.max(1, Math.min(999, v)) }),

  setCanvasSize: (w, h) => set({
    canvasWidth: clamp(w, 50, 2000),
    canvasHeight: clamp(h, 50, 2000),
  }),

  setSelected: (id) => set({ selectedId: id }),

  addElement: (partial) => {
    const base = {
      id: uid(partial.type || 'element'),
      x: 20, y: 20, width: 200, height: 50,
      rotation: 0, opacity: 1,
      zIndex: get().elements.length + 1,
      visible: true, locked: false,
      folderId: null,
      animations: [],
    }
    const el = { ...base, ...partial }
    set((s) => ({ elements: [...s.elements, el], selectedId: el.id }))
    return el.id
  },

  updateElement: (id, patch) => set((s) => ({
    elements: s.elements.map((el) => el.id === id ? { ...el, ...patch } : el),
  })),

  deleteElement: (id) => set((s) => ({
    elements: s.elements.filter((el) => el.id !== id),
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),

  duplicateElement: (id) => {
    const el = get().elements.find((e) => e.id === id)
    if (!el) return
    const copy = {
      ...el,
      id: uid(el.type),
      x: el.x + 10,
      y: el.y + 10,
      zIndex: get().elements.length + 1,
    }
    set((s) => ({ elements: [...s.elements, copy], selectedId: copy.id }))
  },

  reorderElements: (fromIndex, toIndex) => set((s) => {
    const els = [...s.elements]
    const [moved] = els.splice(fromIndex, 1)
    els.splice(toIndex, 0, moved)
    return { elements: els.map((el, i) => ({ ...el, zIndex: i + 1 })) }
  }),

  toggleVisibility: (id) => set((s) => ({
    elements: s.elements.map((el) => el.id === id ? { ...el, visible: !el.visible } : el),
  })),

  toggleLock: (id) => set((s) => ({
    elements: s.elements.map((el) => el.id === id ? { ...el, locked: !el.locked } : el),
  })),
}))
