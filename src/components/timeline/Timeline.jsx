import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Film, Play, Square, Eye, EyeOff, Sparkles, Copy, Trash2, GripVertical, FolderPlus } from 'lucide-react'
import gsap from 'gsap'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'

const PX_PER_SEC = 80

export default function Timeline() {
  const { elements, selectedId, setSelected, deleteElement, duplicateElement, toggleVisibility, reorderElements, updateElement } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const { openModal } = useUiStore()
  const [duration, setDuration] = useState(5)
  const [loop, setLoop] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(0)
  const tlRef = useRef(null)
  const rafRef = useRef(null)
  const rowDragIdx = useRef(null)
  const trackScrollRef = useRef(null)
  const rulerScrollRef = useRef(null)

  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex)
  const totalWidth = duration * PX_PER_SEC + 120
  const rulerMarks = Array.from({ length: Math.floor(duration / 0.5) + 1 }, (_, i) => i * 0.5)

  // Sync ruler scroll with track scroll
  const onTrackScroll = (e) => {
    if (rulerScrollRef.current) rulerScrollRef.current.scrollLeft = e.target.scrollLeft
  }

  // Playhead animation loop
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
      onComplete: () => {
        setPlaying(false)
        cancelAnimationFrame(rafRef.current)
        setPlayhead(0)
      },
    })

    elements.forEach((el) => {
      const dom = document.getElementById(el.id)
      if (!dom) return
      ;(el.animations || []).forEach((anim) => {
        const start = anim.startTime || 0
        const dur = anim.duration || 1
        const ease = anim.ease || 'power1.out'

        switch (anim.type) {
          case 'fadeIn':    tl.fromTo(dom, { autoAlpha: 0 }, { autoAlpha: el.opacity ?? 1, duration: dur, ease }, start); break
          case 'fadeOut':   tl.to(dom, { autoAlpha: 0, duration: dur, ease }, start); break
          case 'slideLeft': tl.fromTo(dom, { x: -400 }, { x: 0, duration: dur, ease }, start); break
          case 'slideRight':tl.fromTo(dom, { x: 400 }, { x: 0, duration: dur, ease }, start); break
          case 'slideUp':   tl.fromTo(dom, { y: -400 }, { y: 0, duration: dur, ease }, start); break
          case 'slideDown': tl.fromTo(dom, { y: 400 }, { y: 0, duration: dur, ease }, start); break
          case 'slideToLeft':  tl.to(dom, { x: -400, duration: dur, ease }, start); break
          case 'slideToRight': tl.to(dom, { x: 400, duration: dur, ease }, start); break
          case 'slideToUp':    tl.to(dom, { y: -400, duration: dur, ease }, start); break
          case 'slideToDown':  tl.to(dom, { y: 400, duration: dur, ease }, start); break
          case 'scaleIn':  tl.fromTo(dom, { scale: 0 }, { scale: 1, duration: dur, ease }, start); break
          case 'scaleOut': tl.to(dom, { scale: 0, duration: dur, ease }, start); break
          case 'rotate90':  tl.to(dom, { rotation: 90,  duration: dur, ease }, start); break
          case 'rotate180': tl.to(dom, { rotation: 180, duration: dur, ease }, start); break
          case 'rotate270': tl.to(dom, { rotation: 270, duration: dur, ease }, start); break
          case 'rotate360': tl.to(dom, { rotation: 360, duration: dur, ease }, start); break
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

  // ── Row drag-to-reorder ─────────────────────────────────────────────────────
  const onRowDragStart = (e, idx) => { rowDragIdx.current = idx }
  const onRowDragOver = (e) => e.preventDefault()
  const onRowDrop = (e, toIdx) => {
    if (rowDragIdx.current === null || rowDragIdx.current === toIdx) return
    const fromEl = sorted[rowDragIdx.current]
    const toEl = sorted[toIdx]
    const fromReal = elements.findIndex((el) => el.id === fromEl.id)
    const toReal = elements.findIndex((el) => el.id === toEl.id)
    saveState()
    reorderElements(fromReal, toReal)
    rowDragIdx.current = null
  }

  const onDelete = (id) => { saveState(); deleteElement(id) }
  const onDuplicate = (id) => { saveState(); duplicateElement(id) }

  const playheadLeft = playhead * PX_PER_SEC

  return (
    <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold flex items-center gap-2 text-white">
          <Film size={15} className="text-purple-400" /> Animation Timeline
        </h3>
        <div className="flex items-center gap-3">
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
        {/* Header row: label column + scrollable ruler */}
        <div className="flex border-b border-gray-700 bg-gray-900" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          {/* Fixed label column header */}
          <div className="flex items-center justify-between px-2 py-1 bg-gray-800 border-r border-gray-700 shrink-0" style={{ width: 250 }}>
            <span className="text-xs text-gray-400 font-semibold">LAYER</span>
            <button title="Create Empty Group" className="text-gray-600 hover:text-yellow-300 px-1 rounded">
              <FolderPlus size={13} />
            </button>
          </div>
          {/* Scrollable ruler — mirrors track scroll */}
          <div ref={rulerScrollRef} className="flex-1 overflow-hidden relative h-8" style={{ pointerEvents: 'none' }}>
            <div className="relative h-full" style={{ width: totalWidth }}>
              {rulerMarks.map((t) => (
                <div key={t} className="absolute top-0 bottom-0" style={{ left: t * PX_PER_SEC }}>
                  <div className="absolute top-0 bottom-0 w-px bg-gray-700" />
                  <span className="absolute top-0.5 text-gray-400 select-none" style={{ fontSize: 10, left: 3 }}>{t}s</span>
                </div>
              ))}
              {/* Playhead marker in ruler */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-20"
                style={{ left: playheadLeft, display: playing || playhead > 0 ? 'block' : 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Tracks */}
        <div
          ref={trackScrollRef}
          onScroll={onTrackScroll}
          style={{ maxHeight: 178, minHeight: 178, overflowY: 'auto', overflowX: 'auto' }}
        >
          {sorted.length === 0 && (
            <div className="flex items-center justify-center text-gray-500 text-sm" style={{ height: 178 }}>
              Add elements and animations to see timeline
            </div>
          )}
          {sorted.map((el, idx) => (
            <div
              key={el.id}
              draggable
              onDragStart={(e) => onRowDragStart(e, idx)}
              onDragOver={onRowDragOver}
              onDrop={(e) => onRowDrop(e, idx)}
              className="flex border-b border-gray-700"
              style={{ minHeight: 38, userSelect: 'none', minWidth: totalWidth + 250 }}
            >
              {/* Fixed label column */}
              <div
                onClick={() => setSelected(el.id)}
                className={`flex items-center gap-1 px-1 cursor-pointer border-r border-gray-700 transition-colors shrink-0 sticky left-0 z-10 ${
                  selectedId === el.id ? 'bg-blue-500/20 border-r-blue-500' : 'bg-gray-800 hover:bg-blue-500/10'
                } ${!el.visible ? 'opacity-50' : ''}`}
                style={{ width: 250 }}
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

              {/* Track content */}
              <div className="relative" style={{ width: totalWidth, background: 'rgb(17,24,39)', flexShrink: 0 }}>
                {/* Playhead line in track */}
                {(playing || playhead > 0) && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-20 pointer-events-none" style={{ left: playheadLeft }} />
                )}
                {(el.animations || []).map((anim, animIdx) => (
                  <DraggableAnimBlock
                    key={animIdx}
                    anim={anim}
                    animIdx={animIdx}
                    element={el}
                    duration={duration}
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
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Draggable animation block ────────────────────────────────────────────────
function DraggableAnimBlock({ anim, onUpdate, onDelete, duration }) {
  const blockRef = useRef(null)

  // Drag body = move startTime
  const onBodyMouseDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const origStart = anim.startTime || 0

    const onMove = (mv) => {
      const dx = mv.clientX - startX
      const newStart = Math.max(0, Math.min(duration - (anim.duration || 1), origStart + dx / PX_PER_SEC))
      onUpdate({ ...anim, startTime: Math.round(newStart * 10) / 10 })
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Drag right edge = resize duration
  const onResizeMouseDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const origDur = anim.duration || 1
    const origStart = anim.startTime || 0

    const onMove = (mv) => {
      const dx = mv.clientX - startX
      const newDur = Math.max(0.1, Math.min(duration - origStart, origDur + dx / PX_PER_SEC))
      onUpdate({ ...anim, duration: Math.round(newDur * 10) / 10 })
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const left = (anim.startTime || 0) * PX_PER_SEC
  const width = Math.max((anim.duration || 1) * PX_PER_SEC, 30)

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
      >
        ✕
      </button>
      {/* Right resize handle */}
      <div
        onMouseDown={onResizeMouseDown}
        className="absolute top-0 bottom-0 flex items-center justify-center"
        style={{ right: -4, width: 8, cursor: 'ew-resize', zIndex: 10 }}
        title="Drag to resize duration"
      >
        <div style={{ width: 3, height: 14, borderRadius: 2, background: 'rgba(255,255,255,0.7)' }} />
      </div>
    </div>
  )
}

// ── Track button ─────────────────────────────────────────────────────────────
function TrackBtn({ title, onClick, children, danger }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex items-center justify-center rounded transition-all ${
        danger
          ? 'text-gray-500 hover:bg-red-500/20 hover:text-red-400'
          : 'text-blue-400 hover:bg-blue-500/20 hover:text-white'
      }`}
      style={{ width: 24, height: 24, background: danger ? 'transparent' : 'rgba(59,130,246,0.15)', border: 'none', flexShrink: 0 }}
    >
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
