import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '../utils/idbStorage.js'

let nextId = Date.now()
const uid = (type) => `${type}_${nextId++}`

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

export const useCanvasStore = create(persist((set, get) => ({
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

  // Reorders by element id against the zIndex-sorted (top-of-stack-first) order — the
  // same order the timeline/layers list actually displays — rather than by raw index
  // into the underlying elements array. Those two orders silently diverge as soon as
  // elements are added/grouped out of their original insertion order, which is exactly
  // why dragging to reorder (especially inside a group) used to produce a result that
  // didn't match the direction/position of the drag at all.
  reorderElements: (fromId, toId) => set((s) => {
    const sorted = [...s.elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
    const fromIdx = sorted.findIndex((e) => e.id === fromId)
    const toIdx = sorted.findIndex((e) => e.id === toId)
    if (fromIdx === -1 || toIdx === -1) return {}
    const [moved] = sorted.splice(fromIdx, 1)
    sorted.splice(toIdx, 0, moved)
    const zMap = {}
    sorted.forEach((el, i) => { zMap[el.id] = sorted.length - i })
    return { elements: s.elements.map((el) => ({ ...el, zIndex: zMap[el.id] })) }
  }),

  toggleVisibility: (id) => set((s) => ({
    elements: s.elements.map((el) => el.id === id ? { ...el, visible: !el.visible } : el),
  })),

  toggleLock: (id) => set((s) => ({
    elements: s.elements.map((el) => el.id === id ? { ...el, locked: !el.locked } : el),
  })),

  // Groups (timeline layer folders). Membership lives on each element's own `folderId`
  // rather than a separate id-map, so it can't drift out of sync with the elements
  // array and survives element add/duplicate/delete without extra bookkeeping.
  createGroup: (name) => {
    const id = uid('grp')
    set((s) => ({ groups: [...s.groups, { id, name: name || `Group ${s.groups.length + 1}`, collapsed: false }] }))
    return id
  },

  deleteGroup: (id) => set((s) => ({
    groups: s.groups.filter((g) => g.id !== id),
    elements: s.elements.map((el) => el.folderId === id ? { ...el, folderId: null } : el),
  })),

  renameGroup: (id, name) => set((s) => ({
    groups: s.groups.map((g) => g.id === id ? { ...g, name } : g),
  })),

  toggleGroupCollapsed: (id) => set((s) => ({
    groups: s.groups.map((g) => g.id === id ? { ...g, collapsed: !g.collapsed } : g),
  })),

  reorderGroups: (fromId, toId) => set((s) => {
    const groups = [...s.groups]
    const fromIdx = groups.findIndex((g) => g.id === fromId)
    const toIdx = groups.findIndex((g) => g.id === toId)
    if (fromIdx === -1 || toIdx === -1) return {}
    const [moved] = groups.splice(fromIdx, 1)
    groups.splice(toIdx, 0, moved)
    return { groups }
  }),
}), {
  name: 'kult-adbuilder-canvas',
  // IndexedDB instead of localStorage — elements can carry large base64 images
  // (uploads, AI-generated art) that reliably blow past localStorage's ~5-10MB quota.
  storage: createJSONStorage(() => idbStorage),
  partialize: (state) => ({
    elements: state.elements,
    groups: state.groups,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    animDuration: state.animDuration,
    animLoop: state.animLoop,
    activeTemplate: state.activeTemplate,
  }),
}))
