import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '../utils/idbStorage.js'

let nextId = Date.now()
const uid = (type) => `${type}_${nextId++}`

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

// Two timeline stop points within this many seconds of each other cause the
// animation to auto-pause, get resumed, and almost immediately (0.1-0.2s later) hit
// the next one and re-pause — reading as the animation randomly stopping right after
// it started. addAnimStopPoint/setAnimStopPoints collapse anything closer than this
// down to a single point instead of allowing near-duplicates.
const MIN_STOP_GAP = 0.2
function dedupeStopPoints(points) {
  const sorted = [...points].sort((a, b) => a - b)
  const out = []
  sorted.forEach((v) => {
    if (out.length && v - out[out.length - 1] < MIN_STOP_GAP) return
    out.push(v)
  })
  return out
}

// A "layer" in the timeline is either a single ungrouped element or an entire group
// (moved/positioned as one atomic unit). Groups carry their own `zIndex` — independent
// of their members' — specifically so an *empty* group still has a real position to
// sort/insert against; without it, an empty group had nothing to compare against and
// could never participate in a reorder (drop) at all.
function buildBlocks(elements, groups) {
  const groupIds = new Set(groups.map((g) => g.id))
  const byGroup = {}
  const ungrouped = []
  elements.forEach((el) => {
    if (el.folderId && groupIds.has(el.folderId)) {
      ;(byGroup[el.folderId] ||= []).push(el)
    } else {
      ungrouped.push(el)
    }
  })
  Object.values(byGroup).forEach((els) => els.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)))

  const blocks = [
    ...ungrouped.map((el) => ({ key: el.id, kind: 'element', els: [el] })),
    ...groups.map((g) => ({ key: `group:${g.id}`, kind: 'group', grp: g, els: byGroup[g.id] || [] })),
  ]
  const sortZ = (b) => b.kind === 'group' ? (b.grp.zIndex ?? 0) : (b.els[0].zIndex || 0)
  blocks.sort((a, b) => sortZ(b) - sortZ(a))
  return blocks
}

// Flattens an ordered block list back into fresh zIndex values — one "slot" per block
// (so an empty group still consumes a slot and keeps a real position), then one slot
// per element inside a group block, most-slots-at-the-top. This keeps canvas stacking
// (element zIndex) exactly matching what the timeline/layers list displays, and keeps
// groups and elements comparable in the same numeric space for future reorders.
function applyBlockOrder(blocks) {
  let z = blocks.reduce((n, b) => n + 1 + (b.kind === 'group' ? b.els.length : 0), 0)
  const elZ = {}
  const grpZ = {}
  blocks.forEach((b) => {
    if (b.kind === 'group') {
      grpZ[b.grp.id] = z; z -= 1
      b.els.forEach((el) => { elZ[el.id] = z; z -= 1 })
    } else {
      elZ[b.els[0].id] = z; z -= 1
    }
  })
  return { elZ, grpZ }
}

function topZIndex(elements, groups) {
  return Math.max(0, ...elements.map((e) => e.zIndex || 0), ...groups.map((g) => g.zIndex || 0))
}

export const useCanvasStore = create(persist((set, get) => ({
  elements: [],
  groups: [], // {id, name, collapsed, zIndex}
  selectedId: null,
  canvasWidth: 300,
  canvasHeight: 250,
  animDuration: 5,
  animLoop: 1,
  // Global pause points on the whole timeline (seconds, sorted ascending) — the
  // animation plays from 0 as normal and automatically holds at each in turn, then a
  // separate invisible-layer "Resume Timeline" action (see InvisibleProperties.jsx)
  // continues it from wherever it stopped, until the next stop point (if any) is
  // reached. Distinct from an invisible layer's own "jump to X seconds" action, which
  // just seeks without stopping normal playback.
  animStopPoints: [],
  snapLines: { x: [], y: [] },
  activeTemplate: null,
  setActiveTemplate: (tpl) => set({ activeTemplate: tpl }),
  setSnapLines: (lines) => set({ snapLines: lines }),
  clearSnapLines: () => set({ snapLines: { x: [], y: [] } }),
  setAnimDuration: (v) => set({ animDuration: Math.max(1, Math.min(60, v)) }),
  setAnimLoop: (v) => set({ animLoop: Math.max(1, Math.min(999, v)) }),
  setAnimStopPoints: (arr) => set({ animStopPoints: dedupeStopPoints(arr) }),
  addAnimStopPoint: (v) => set((s) => ({
    animStopPoints: dedupeStopPoints([...s.animStopPoints, Math.max(0, Math.min(s.animDuration, v))]),
  })),
  updateAnimStopPoint: (oldValue, newValue) => set((s) => {
    const clamped = Math.max(0, Math.min(s.animDuration, newValue))
    // Refuses the move (keeps oldValue) rather than silently landing on/near another
    // point — two stop points within MIN_STOP_GAP of each other meant playback
    // auto-paused, got resumed, and immediately (0.1-0.2s later) hit the next one
    // and re-paused, which read as the animation randomly stopping almost right
    // after it started.
    const tooClose = s.animStopPoints.some((v) => v !== oldValue && Math.abs(v - clamped) < MIN_STOP_GAP)
    if (tooClose) return {}
    return {
      animStopPoints: s.animStopPoints
        .map((v) => (v === oldValue ? clamped : v))
        .sort((a, b) => a - b),
    }
  }),
  removeAnimStopPoint: (v) => set((s) => ({ animStopPoints: s.animStopPoints.filter((p) => p !== v) })),

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
      zIndex: topZIndex(get().elements, get().groups) + 1,
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
      zIndex: topZIndex(get().elements, get().groups) + 1,
    }
    set((s) => ({ elements: [...s.elements, copy], selectedId: copy.id }))
  },

  // Reorders the timeline's layer stack by id — `fromKey`/`toKey` are either an element
  // id or "group:<id>" — moving the dragged layer to sit at the dropped-on layer's
  // position. Blocks are ordered against each other by their current zIndex (elements)
  // or the group's own dedicated zIndex (see buildBlocks), the same order the timeline
  // actually displays, rather than by raw index into the underlying elements array;
  // those two orders silently diverge as soon as elements are added/grouped out of
  // insertion order, which is what made dragging (especially inside/around a group)
  // produce a result that didn't match the drag at all.
  reorderElements: (fromKey, toKey) => set((s) => {
    const blocks = buildBlocks(s.elements, s.groups)
    const fromIdx = blocks.findIndex((b) => b.key === fromKey)
    const toIdx = blocks.findIndex((b) => b.key === toKey)
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return {}
    const [moved] = blocks.splice(fromIdx, 1)
    blocks.splice(toIdx, 0, moved)

    const { elZ, grpZ } = applyBlockOrder(blocks)
    return {
      elements: s.elements.map((el) => elZ[el.id] ? { ...el, zIndex: elZ[el.id] } : el),
      groups: s.groups.map((g) => grpZ[g.id] ? { ...g, zIndex: grpZ[g.id] } : g),
    }
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
  // A new group is inserted directly above the currently selected layer (its own block,
  // whether that's a plain element or another group) rather than always landing at the
  // very bottom of the stack.
  createGroup: (name) => {
    const id = uid('grp')
    set((s) => {
      const newGroup = { id, name: name || `Group ${s.groups.length + 1}`, collapsed: false, zIndex: 0 }
      const blocks = buildBlocks(s.elements, [...s.groups, newGroup])
      const newIdx = blocks.findIndex((b) => b.key === `group:${id}`)
      const [newBlock] = blocks.splice(newIdx, 1)
      const selIdx = s.selectedId ? blocks.findIndex((b) => b.els.some((el) => el.id === s.selectedId)) : -1
      blocks.splice(selIdx === -1 ? 0 : selIdx, 0, newBlock)

      const { elZ, grpZ } = applyBlockOrder(blocks)
      return {
        elements: s.elements.map((el) => elZ[el.id] ? { ...el, zIndex: elZ[el.id] } : el),
        groups: [...s.groups.map((g) => grpZ[g.id] ? { ...g, zIndex: grpZ[g.id] } : g), { ...newGroup, zIndex: grpZ[id] }],
      }
    })
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
    animStopPoints: state.animStopPoints,
    activeTemplate: state.activeTemplate,
  }),
}))
