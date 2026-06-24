import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Film, Play, Square, Eye, EyeOff, Sparkles, Copy, Trash2, GripVertical, FolderPlus, ChevronRight, ChevronDown, ZoomIn, ZoomOut } from 'lucide-react'
import gsap from 'gsap'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'

const BASE_PX_PER_SEC = 80

export default function Timeline() {
  const { elements, selectedId, setSelected, deleteElement, duplicateElement, toggleVisibility, reorderElements, updateElement } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const { openModal } = useUiStore()
  const [duration, setDuration] = useState(5)
  const [loop, setLoop] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(0)
  const [timeZoom, setTimeZoom] = useState(1)          // 0.5x … 4x
  const [groups, setGroups] = useState([])              // [{id, name, collapsed}]
  const [elementGroups, setElementGroups] = useState({}) // {elementId: groupId}
  const tlRef = useRef(null)
  const rafRef = useRef(null)
  const rowDragIdx = useRef(null)
  const trackScrollRef = useRef(null)
  const rulerScrollRef = useRef(null)

  const PX_PER_SEC = BASE_PX_PER_SEC * timeZoom
  const totalWidth = duration * PX_PER_SEC + 120

  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex)

  const rulerStep = timeZoom >= 2 ? 0.25 : timeZoom >= 1 ? 0.5 : 1
  const rulerMarks = Array.from({ length: Math.floor(duration / rulerStep) + 1 }, (_, i) => i * rulerStep)

  // Sync ruler scroll with track scroll
  const onTrackScroll = (e) => {
    if (rulerScrollRef.current) rulerScrollRef.current.scrollLeft = e.target.scrollLeft
  }

  // Playhead RAF
  const tickPlayhead = useCallback(() => {
    if (!tlRef.current) return
    setPlayhead(tlRef.current.time())
    rafRef.current = requestAnimationFrame(tickPlayhead)
  }, [])

  // ── Play / Stop ─────────────────────────────────────────────────────────────
  const play = useCallback(() => {
    if (tlRef.current) tlRef.current.kill()
    cancelAnimationFrame(rafRef.current)

    const tl = gsap.timeline({
      repeat: loop - 1,
      onComplete: () => { setPlaying(false); cancelAnimationFrame(rafRef.current); setPlayhead(0) },
    })

    elements.forEach((el) => {
      const dom = document.getElementById(el.id)
      if (!dom) return
      ;(el.animations || []).forEach((anim) => {
        const start = anim.startTime || 0
        const dur = anim.duration || 1
        const ease = anim.ease || 'power1.out'
        switch (anim.type) {
          case 'fadeIn':       tl.fromTo(dom, { autoAlpha: 0 }, { autoAlpha: el.opacity ?? 1, duration: dur, ease }, start); break
          case 'fadeOut':      tl.to(dom, { autoAlpha: 0, duration: dur, ease }, start); break
          case 'slideLeft':    tl.fromTo(dom, { x: -400 }, { x: 0, duration: dur, ease }, start); break
          case 'slideRight':   tl.fromTo(dom, { x: 400 }, { x: 0, duration: dur, ease }, start); break
          case 'slideUp':      tl.fromTo(dom, { y: -400 }, { y: 0, duration: dur, ease }, start); break
          case 'slideDown':    tl.fromTo(dom, { y: 400 }, { y: 0, duration: dur, ease }, start); break
          case 'slideToLeft':  tl.to(dom, { x: -400, duration: dur, ease }, start); break
          case 'slideToRight': tl.to(dom, { x: 400, duration: dur, ease }, start); break
          case 'slideToUp':    tl.to(dom, { y: -400, duration: dur, ease }, start); break
          case 'slideToDown':  tl.to(dom, { y: 400, duration: dur, ease }, start); break
          case 'scaleIn':      tl.fromTo(dom, { scale: 0 }, { scale: 1, duration: dur, ease }, start); break
          case 'scaleOut':     tl.to(dom, { scale: 0, duration: dur, ease }, start); break
          case 'rotate90':     tl.to(dom, { rotation: 90, duration: dur, ease }, start); break
          case 'rotate180':    tl.to(dom, { rotation: 180, duration: dur, ease }, start); break
          case 'rotate270':    tl.to(dom, { rotation: 270, duration: dur, ease }, start); break
          case 'rotate360':    tl.to(dom, { rotation: 360, duration: dur, ease }, start); break
          default: break
        }
      })
    })

    tlRef.current = tl
    setPlaying(true)
    rafRef.current = requestAnimationFrame(tickPlayhead)
  }, [elements, loop, tickPlayhead])

  const stop = useCallback(() => {
    if (tlRef.current) { tlRef.current.kill(); tlRef.current = null }
    cancelAnimationFrame(rafRef.current)
    elements.forEach((el) => {
      const dom = document.getElementById(el.id)
      if (dom) gsap.set(dom, { clearProps: 'all' })
    })
    setPlaying(false)
    setPlayhead(0)
  }, [elements])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // ── Groups ──────────────────────────────────────────────────────────────────
  const createGroup = () => {
    const id = `grp_${Date.now()}`
    const name = `Group ${groups.length + 1}`
    setGroups((g) => [...g, { id, name, collapsed: false }])
  }

  const deleteGroup = (id) => {
    setGroups((g) => g.filter((grp) => grp.id !== id))
    // Unassign all elements that were in this group
    setElementGroups((eg) => {
      const next = { ...eg }
      Object.keys(next).forEach((k) => { if (next[k] === id) delete next[k] })
      return next
    })
  }

  const toggleGroup = (id) => {
    setGroups((g) => g.map((grp) => grp.id === id ? { ...grp, collapsed: !grp.collapsed } : grp))
  }

  // ── Row drag ────────────────────────────────────────────────────────────────
  // rowDragIdx tracks the sorted[] index of the element being dragged
  const onRowDragStart = (e, elId) => { rowDragIdx.current = elId; e.dataTransfer.effectAllowed = 'move' }
  const onRowDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }

  // Drop on another element row → reorder in elements array
  const onRowDrop = (e, toElId) => {
    e.preventDefault()
    const fromElId = rowDragIdx.current
    if (!fromElId || fromElId === toElId) return
    // Only reorder, don't reassign group
    const fromReal = elements.findIndex((el) => el.id === fromElId)
    const toReal = elements.findIndex((el) => el.id === toElId)
    if (fromReal === -1 || toReal === -1) return
    saveState()
    reorderElements(fromReal, toReal)
    rowDragIdx.current = null
  }

  // Drop on a group header → assign element to that group
  const onGroupDrop = (e, groupId) => {
    e.preventDefault()
    const fromElId = rowDragIdx.current
    if (!fromElId) return
    setElementGroups((eg) => ({ ...eg, [fromElId]: groupId }))
    rowDragIdx.current = null
  }

  // Drop on the "ungrouped" zone → remove from group
  const onUngroupDrop = (e) => {
    e.preventDefault()
    const fromElId = rowDragIdx.current
    if (!fromElId) return
    setElementGroups((eg) => { const next = { ...eg }; delete next[fromElId]; return next })
    rowDragIdx.current = null
  }

  const onDelete = (id) => { saveState(); deleteElement(id) }
  const onDuplicate = (id) => { saveState(); duplicateElement(id) }

  const playheadLeft = playhead * PX_PER_SEC

  // Build rows: groups (with their children) then ungrouped elements
  const rows = []
  groups.forEach((grp) => {
    rows.push({ type: 'group', grp })
    if (!grp.collapsed) {
      sorted.filter((el) => elementGroups[el.id] === grp.id).forEach((el, idx) => {
        rows.push({ type: 'element', el, idx: sorted.indexOf(el), inGroup: true })
      })
    }
  })
  sorted.filter((el) => !elementGroups[el.id]).forEach((el, idx) => {
    rows.push({ type: 'element', el, idx: sorted.indexOf(el), inGroup: false })
  })

  return (
    <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold flex items-center gap-2 text-white">
          <Film size={15} className="text-purple-400" /> Animation Timeline
        </h3>
        <div className="flex items-center gap-2">
          {/* Timeline zoom */}
          <div className="flex items-center gap-1 bg-gray-900 rounded px-2 py-1">
            <label className="text-xs text-gray-400">Timeline:</label>
            <button onClick={() => setTimeZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))} className="text-gray-400 hover:text-white px-1" title="Zoom out timeline">
              <ZoomOut size={12} />
            </button>
            <span className="text-xs text-gray-300 w-8 text-center">{Math.round(timeZoom * 100)}%</span>
            <button onClick={() => setTimeZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} className="text-gray-400 hover:text-white px-1" title="Zoom in timeline">
              <ZoomIn size={12} />
            </button>
          </div>
          <div className="flex items-center gap-1 bg-gray-900 rounded px-2 py-1">
            <label className="text-xs text-gray-400">Duration:</label>
            <input type="number" value={duration} step={0.5} min={1} max={30}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="bg-gray-700 rounded px-2 py-0.5 text-sm w-14 text-white" />
          </div>
          <div className="flex items-center gap-1 bg-gray-900 rounded px-2 py-1">
            <label className="text-xs text-gray-400">Loop:</label>
            <input type="number" value={loop} min={1} max={999}
              onChange={(e) => setLoop(Number(e.target.value))}
              className="bg-gray-700 rounded px-2 py-0.5 text-sm w-14 text-white" />
          </div>
          <button
            onClick={playing ? stop : play}
            className={`flex items-center gap-1 text-white px-3 py-1 rounded text-sm ${playing ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {playing ? <><Square size={11} /> Stop</> : <><Play size={11} /> Play</>}
          </button>
        </div>
      </div>

      {/* Timeline container */}
      <div className="bg-gray-900 rounded-lg overflow-hidden" style={{ height: 215 }}>
        {/* Ruler row */}
        <div className="flex border-b border-gray-700 bg-gray-900" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <div className="flex items-center justify-between px-2 py-1 bg-gray-800 border-r border-gray-700 shrink-0" style={{ width: 250 }}>
            <span className="text-xs text-gray-400 font-semibold">LAYER</span>
            <button title="Create Group" onClick={createGroup} className="text-gray-600 hover:text-yellow-300 px-1 rounded">
              <FolderPlus size={13} />
            </button>
          </div>
          <div ref={rulerScrollRef} className="flex-1 overflow-hidden relative h-8" style={{ pointerEvents: 'none' }}>
            <div className="relative h-full" style={{ width: totalWidth, minWidth: '100%' }}>
              {rulerMarks.map((t) => (
                <div key={t} className="absolute top-0 bottom-0" style={{ left: t * PX_PER_SEC }}>
                  <div className="absolute top-0 bottom-0 w-px bg-gray-700" />
                  <span className="absolute top-0.5 text-gray-400 select-none" style={{ fontSize: 10, left: 3 }}>{t}s</span>
                </div>
              ))}
              {(playing || playhead > 0) && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-20" style={{ left: playheadLeft }} />
              )}
            </div>
          </div>
        </div>

        {/* Tracks */}
        <div ref={trackScrollRef} onScroll={onTrackScroll}
          style={{ maxHeight: 178, minHeight: 178, overflowY: 'auto', overflowX: 'auto' }}>
          {rows.length === 0 && (
            <div className="flex items-center justify-center text-gray-500 text-sm" style={{ height: 178 }}>
              Add elements and animations to see timeline
            </div>
          )}
          {rows.map((row, rowIdx) => {
            if (row.type === 'group') {
              const { grp } = row
              return (
                <div key={grp.id}
                  onDragOver={onRowDragOver}
                  onDrop={(e) => onGroupDrop(e, grp.id)}
                  className="flex border-b border-gray-700 bg-yellow-900/20"
                  style={{ minHeight: 32, minWidth: totalWidth + 250, userSelect: 'none' }}>
                  <div className="flex items-center gap-1 px-2 bg-yellow-900/30 border-r border-gray-700 shrink-0 sticky left-0 z-10"
                    style={{ width: 250 }}>
                    <button onClick={() => toggleGroup(grp.id)} className="flex items-center gap-1 flex-1 min-w-0 cursor-pointer">
                      {grp.collapsed ? <ChevronRight size={12} className="text-yellow-400 shrink-0" /> : <ChevronDown size={12} className="text-yellow-400 shrink-0" />}
                      <span className="flex-1 text-xs text-yellow-300 font-semibold truncate text-left">{grp.name}</span>
                    </button>
                    <TrackBtn title="Delete Group" onClick={() => deleteGroup(grp.id)} danger>
                      <Trash2 size={13} />
                    </TrackBtn>
                  </div>
                  <div className="flex-1 relative" style={{ background: 'rgb(17,24,39)', minWidth: totalWidth }}>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-xs text-yellow-900/60">drop layers here</span>
                    </div>
                  </div>
                </div>
              )
            }

            const { el, idx, inGroup } = row
            return (
              <div
                key={el.id}
                draggable
                onDragStart={(e) => onRowDragStart(e, el.id)}
                onDragOver={onRowDragOver}
                onDrop={(e) => { e.stopPropagation(); onRowDrop(e, el.id) }}
                className="flex border-b border-gray-700"
                style={{ minHeight: 38, userSelect: 'none', minWidth: totalWidth + 250 }}
              >
                <div
                  onClick={() => setSelected(el.id)}
                  className={`flex items-center gap-1 px-1 cursor-pointer border-r border-gray-700 transition-colors shrink-0 sticky left-0 z-10 ${
                    selectedId === el.id ? 'bg-blue-500/20 border-r-blue-500' : 'bg-gray-800 hover:bg-blue-500/10'
                  } ${!el.visible ? 'opacity-50' : ''}`}
                  style={{ width: 250, paddingLeft: inGroup ? 20 : 4 }}
                >
                  <GripVertical size={12} className="text-gray-500 cursor-grab shrink-0" />
                  <span className="flex-1 truncate text-gray-200 text-xs">{layerLabel(el)}</span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <TrackBtn title={el.visible ? 'Hide' : 'Show'} onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id) }}>
                      {el.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </TrackBtn>
                    <TrackBtn title="Add Animation" onClick={(e) => { e.stopPropagation(); setSelected(el.id); openModal('animation') }}>
                      <Sparkles size={13} />
                    </TrackBtn>
                    <TrackBtn title="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(el.id) }}>
                      <Copy size={13} />
                    </TrackBtn>
                    <TrackBtn title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(el.id) }} danger>
                      <Trash2 size={13} />
                    </TrackBtn>
                  </div>
                </div>

                <div className="relative" style={{ minWidth: totalWidth, flexGrow: 1, background: 'rgb(17,24,39)' }}>
                  {(playing || playhead > 0) && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-20 pointer-events-none" style={{ left: playheadLeft }} />
                  )}
                  {(el.animations || []).map((anim, animIdx) => (
                    <DraggableAnimBlock
                      key={animIdx}
                      anim={anim}
                      duration={duration}
                      pxPerSec={PX_PER_SEC}
                      onUpdate={(newAnim) => {
                        const anims = [...(el.animations || [])]
                        anims[animIdx] = newAnim
                        updateElement(el.id, { animations: anims })
                      }}
                      onDelete={() => {
                        const anims = (el.animations || []).filter((_, i) => i !== animIdx)
                        updateElement(el.id, { animations: anims })
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Draggable animation block ────────────────────────────────────────────────
function DraggableAnimBlock({ anim, onUpdate, onDelete, duration, pxPerSec }) {
  const blockRef = useRef(null)

  const onBodyMouseDown = (e) => {
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX
    const origStart = anim.startTime || 0
    const onMove = (mv) => {
      const newStart = Math.max(0, Math.min(duration - (anim.duration || 1), origStart + (mv.clientX - startX) / pxPerSec))
      onUpdate({ ...anim, startTime: Math.round(newStart * 10) / 10 })
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }

  const onResizeMouseDown = (e) => {
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX
    const origDur = anim.duration || 1
    const origStart = anim.startTime || 0
    const onMove = (mv) => {
      const newDur = Math.max(0.1, Math.min(duration - origStart, origDur + (mv.clientX - startX) / pxPerSec))
      onUpdate({ ...anim, duration: Math.round(newDur * 10) / 10 })
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }

  const left = (anim.startTime || 0) * pxPerSec
  const width = Math.max((anim.duration || 1) * pxPerSec, 30)

  return (
    <div
      ref={blockRef}
      onMouseDown={onBodyMouseDown}
      className="absolute top-1.5 flex items-center rounded select-none group"
      style={{
        left, width, height: 26, cursor: 'move',
        background: 'linear-gradient(135deg,rgba(139,92,246,0.8),rgba(168,85,247,0.8))',
        border: '1px solid rgba(139,92,246,1)',
        fontSize: 10, fontWeight: 600, color: 'white', overflow: 'visible', whiteSpace: 'nowrap',
      }}
      title={`${anim.type} | ${anim.startTime}s → ${(anim.startTime || 0) + (anim.duration || 1)}s`}
    >
      <span className="flex-1 truncate pl-2 overflow-hidden">{anim.type}</span>
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="hidden group-hover:flex items-center justify-center rounded-full mx-1 shrink-0"
        style={{ width: 14, height: 14, background: 'rgba(239,68,68,0.9)', fontSize: 9 }}
      >✕</button>
      <div
        onMouseDown={onResizeMouseDown}
        className="absolute top-0 bottom-0 flex items-center justify-center"
        style={{ right: -4, width: 8, cursor: 'ew-resize', zIndex: 10 }}
      >
        <div style={{ width: 3, height: 14, borderRadius: 2, background: 'rgba(255,255,255,0.7)' }} />
      </div>
    </div>
  )
}

function TrackBtn({ title, onClick, children, danger }) {
  return (
    <button title={title} onClick={onClick}
      className={`flex items-center justify-center rounded transition-all ${danger ? 'text-gray-500 hover:bg-red-500/20 hover:text-red-400' : 'text-blue-400 hover:bg-blue-500/20 hover:text-white'}`}
      style={{ width: 24, height: 24, background: danger ? 'transparent' : 'rgba(59,130,246,0.15)', border: 'none', flexShrink: 0 }}>
      {children}
    </button>
  )
}

function layerLabel(el) {
  if (el.type === 'text') return el.text?.slice(0, 20) || 'Text'
  if (el.type === 'image') return el.filename || 'Image'
  if (el.type === 'video') return el.videoName || 'Video'
  if (el.type === 'clickthrough') return `Clickthrough ${el.clickIndex || 1}`
  return el.type.charAt(0).toUpperCase() + el.type.slice(1)
}
