import React, { useRef, useState } from 'react'
import { Film, Play, Square, Eye, EyeOff, Lock, Unlock, Sparkles, Copy, X, GripVertical, FolderPlus } from 'lucide-react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'

const DURATION = 5 // seconds
const PX_PER_SEC = 60
const RULER_MARKS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

export default function Timeline() {
  const { elements, selectedId, setSelected, deleteElement, duplicateElement, toggleVisibility, toggleLock, reorderElements } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const { openModal } = useUiStore()
  const [duration, setDuration] = useState(5)
  const [loop, setLoop] = useState(1)
  const dragIdx = useRef(null)

  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex)

  const onDragStart = (e, idx) => { dragIdx.current = idx }
  const onDragOver = (e) => e.preventDefault()
  const onDrop = (e, toIdx) => {
    if (dragIdx.current === null || dragIdx.current === toIdx) return
    const fromEl = sorted[dragIdx.current]
    const toEl = sorted[toIdx]
    const fromReal = elements.findIndex((el) => el.id === fromEl.id)
    const toReal = elements.findIndex((el) => el.id === toEl.id)
    saveState()
    reorderElements(fromReal, toReal)
    dragIdx.current = null
  }

  const onDelete = (id) => { saveState(); deleteElement(id) }
  const onDuplicate = (id) => { saveState(); duplicateElement(id) }

  return (
    <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 p-3" style={{ scrollbarWidth: 'none' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold flex items-center gap-2 text-white">
          <Film size={15} className="text-purple-400" /> Animation Timeline
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-800 rounded px-2 py-1">
            <label className="text-xs text-gray-400">Duration:</label>
            <input type="number" value={duration} step={0.5} min={1} max={30} onChange={(e) => setDuration(Number(e.target.value))}
              className="bg-gray-700 rounded px-2 py-0.5 text-sm w-14 text-white" />
          </div>
          <div className="flex items-center gap-1 bg-gray-800 rounded px-2 py-1">
            <label className="text-xs text-gray-400">Loop:</label>
            <input type="number" value={loop} min={1} max={999} onChange={(e) => setLoop(Number(e.target.value))}
              className="bg-gray-700 rounded px-2 py-0.5 text-sm w-14 text-white" />
          </div>
          <button className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"><Play size={11} /> Play</button>
          <button className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"><Square size={11} /> Stop</button>
        </div>
      </div>

      {/* Timeline container */}
      <div className="bg-gray-900 rounded-lg overflow-hidden" style={{ height: 215 }}>
        {/* Header row: LAYER label + ruler */}
        <div className="flex border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
          <div className="flex items-center justify-between px-2 py-1 bg-gray-800 border-r border-gray-700" style={{ width: 250, minWidth: 250 }}>
            <span className="text-xs text-gray-400 font-semibold">LAYER</span>
            <button title="Create Empty Group" className="text-gray-600 hover:text-yellow-300 px-1 rounded transition-colors">
              <FolderPlus size={13} />
            </button>
          </div>
          <div className="flex-1 relative h-8">
            <div className="absolute inset-0 flex">
              {RULER_MARKS.map((t) => (
                <div key={t} className="absolute" style={{ left: t * PX_PER_SEC }}>
                  <div className="absolute top-0 bottom-0 w-px bg-gray-700" />
                  <span className="absolute top-0.5 text-xs text-gray-400" style={{ transform: 'translateX(-50%)', fontSize: 10 }}>{t}s</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tracks */}
        <ul className="overflow-y-auto" style={{ maxHeight: 180, minHeight: 180, listStyle: 'none', padding: 0, margin: 0, scrollbarWidth: 'none' }}>
          {sorted.length === 0 && (
            <li className="flex items-center justify-center text-gray-500 text-sm" style={{ height: 180 }}>
              Add elements and animations to see timeline
            </li>
          )}
          {sorted.map((el, idx) => (
            <li
              key={el.id}
              draggable
              onDragStart={(e) => onDragStart(e, idx)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, idx)}
              className={`flex border-b border-gray-700 ${selectedId === el.id ? 'selected' : ''}`}
              style={{ minHeight: 38, cursor: 'move', userSelect: 'none' }}
            >
              {/* Label column */}
              <div
                onClick={() => setSelected(el.id)}
                className={`flex items-center justify-between gap-1 px-1 cursor-pointer transition-colors border-r border-gray-700 ${
                  selectedId === el.id ? 'bg-blue-500/20 border-r-blue-500' : 'bg-gray-800 hover:bg-blue-500/10'
                } ${!el.visible ? 'opacity-50' : ''} ${el.locked ? 'is-locked' : ''}`}
                style={{ width: 250, minWidth: 250, fontSize: 12, overflow: 'hidden' }}
              >
                <span className="flex items-center gap-1 flex-1 min-w-0">
                  <GripVertical size={11} className="text-gray-500 cursor-grab shrink-0" />
                  <span className="truncate text-gray-200">{layerLabel(el)}</span>
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <TrackBtn title={el.visible ? 'Hide' : 'Show'} onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id) }}>
                    {el.visible ? <Eye size={10} /> : <EyeOff size={10} />}
                  </TrackBtn>
                  <TrackBtn title={el.locked ? 'Unlock' : 'Lock'} onClick={(e) => { e.stopPropagation(); toggleLock(el.id) }}>
                    {el.locked ? <Lock size={10} /> : <Unlock size={10} />}
                  </TrackBtn>
                  <TrackBtn title="Add Animation" onClick={(e) => { e.stopPropagation(); setSelected(el.id); openModal('animation') }}>
                    <Sparkles size={10} />
                  </TrackBtn>
                  <TrackBtn title="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(el.id) }}>
                    <Copy size={10} />
                  </TrackBtn>
                  <TrackBtn title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(el.id) }}>
                    <X size={10} />
                  </TrackBtn>
                </div>
              </div>

              {/* Track content */}
              <div className="flex-1 relative" style={{ background: 'rgb(17,24,39)' }}>
                {(el.animations || []).map((anim, i) => (
                  <AnimBlock key={i} anim={anim} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function TrackBtn({ title, onClick, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex items-center justify-center rounded px-1 py-0.5 text-xs text-blue-400 hover:bg-blue-500/20 hover:text-white transition-all"
      style={{ background: 'rgba(59,130,246,0.2)', border: 'none', minWidth: 22, fontSize: 11 }}
    >
      {children}
    </button>
  )
}

function AnimBlock({ anim }) {
  const left = (anim.startTime || 0) * PX_PER_SEC
  const width = Math.max((anim.duration || 1) * PX_PER_SEC, 20)
  return (
    <div
      className="absolute top-1.5 flex items-center px-2 rounded overflow-hidden"
      style={{
        left, width, height: 26,
        background: 'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(168,85,247,0.8))',
        border: '1px solid rgba(139,92,246,1)',
        fontSize: 10, fontWeight: 600, color: 'white', whiteSpace: 'nowrap',
      }}
    >
      {anim.type}
    </div>
  )
}

function layerLabel(el) {
  if (el.type === 'text') return el.text?.slice(0, 20) || 'Text'
  if (el.type === 'image') return el.filename || 'Image'
  if (el.type === 'video') return el.videoName || 'Video'
  if (el.type === 'clickthrough') return `Clickthrough ${el.clickIndex || 1}`
  return el.type.charAt(0).toUpperCase() + el.type.slice(1)
}
