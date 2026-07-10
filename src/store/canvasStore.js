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

  // Reorders the timeline's layer stack, where a "layer" is either a single ungrouped
  // element or an entire group moved as one atomic block (so a group can be dragged up
  // or down and interleaved with individual layers, not just reordered among other
  // groups). `fromKey`/`toKey` are either an element id or "group:<id>". Blocks are
  // ordered against each other by their current max zIndex — the same order the
  // timeline/layers list actually displays — rather than by raw index into the
  // underlying elements array; those two orders silently diverge as soon as elements
  // are added/grouped out of insertion order, which is what made dragging (especially
  // inside/around a group) produce a result that didn't match the drag at all.
  // zIndex is reassigned across the *entire* flattened result so canvas stacking order
  // always matches what the layer list shows, including each group's own internal
  // (unchanged) child order.
  reorderElements: (fromKey, toKey) => set((s) => {
    const byGroup = {}
    const ungrouped = []
    s.elements.forEach((el) => {
      if (el.folderId && s.groups.some((g) => g.id === el.folderId)) {
        ;(byGroup[el.folderId] ||= []).push(el)
      } else {
        ungrouped.push(el)
      }
    })
    Object.values(byGroup).forEach((els) => els.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)))

    const blocks = [
      ...ungrouped.map((el) => ({ key: el.id, els: [el] })),
      ...s.groups.filter((g) => byGroup[g.id]?.length).map((g) => ({ key: `group:${g.id}`, els: byGroup[g.id] })),
    ]
    const maxZ = (b) => Math.max(...b.els.map((el) => el.zIndex || 0))
    blocks.sort((a, b) => maxZ(b) - maxZ(a))

    const fromIdx = blocks.findIndex((b) => b.key === fromKey)
    const toIdx = blocks.findIndex((b) => b.key === toKey)
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return {}
    const [moved] = blocks.splice(fromIdx, 1)
    blocks.splice(toIdx, 0, moved)

    const flat = blocks.flatMap((b) => b.els)
    const zMap = {}
    flat.forEach((el, i) => { zMap[el.id] = flat.length - i })
    return { elements: s.elements.map((el) => zMap[el.id] ? { ...el, zIndex: zMap[el.id] } : el) }
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
