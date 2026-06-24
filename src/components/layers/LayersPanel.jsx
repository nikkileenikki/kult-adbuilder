import React, { useRef } from 'react'
import { Eye, EyeOff, Lock, Unlock, Trash2, Copy, Type, Square, Image, Video, MousePointer, Layers } from 'lucide-react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'

const TYPE_ICONS = {
  text: Type,
  shape: Square,
  image: Image,
  video: Video,
  clickthrough: MousePointer,
  invisible: Layers,
}

export default function LayersPanel() {
  const { elements, selectedId, setSelected, deleteElement, duplicateElement, toggleVisibility, toggleLock, reorderElements } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const dragIdx = useRef(null)

  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex)

  const onDelete = (id) => { saveState(); deleteElement(id) }
  const onDuplicate = (id) => { saveState(); duplicateElement(id) }

  const onDragStart = (e, idx) => { dragIdx.current = idx }
  const onDragOver = (e) => e.preventDefault()
  const onDrop = (e, toIdx) => {
    if (dragIdx.current === null || dragIdx.current === toIdx) return
    const fromEl = sorted[dragIdx.current]
    const toEl = sorted[toIdx]
    const fromRealIdx = elements.findIndex(e => e.id === fromEl.id)
    const toRealIdx = elements.findIndex(e => e.id === toEl.id)
    saveState()
    reorderElements(fromRealIdx, toRealIdx)
    dragIdx.current = null
  }

  return (
    <div className="w-48 flex flex-col bg-[#16213e] border-r border-slate-700 shrink-0">
      <div className="px-3 py-2 text-xs font-semibold text-slate-400 border-b border-slate-700 uppercase tracking-wide">
        Layers
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map((el, idx) => {
          const Icon = TYPE_ICONS[el.type] || Layers
          const isSelected = selectedId === el.id
          return (
            <div
              key={el.id}
              draggable
              onDragStart={(e) => onDragStart(e, idx)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, idx)}
              onClick={() => setSelected(el.id)}
              className={`flex items-center gap-1 px-2 py-1.5 cursor-pointer border-b border-slate-800 text-xs group ${
                isSelected ? 'bg-violet-900/40 text-white' : 'text-slate-300 hover:bg-slate-700/40'
              } ${!el.visible ? 'opacity-40' : ''}`}
            >
              <Icon size={11} className="shrink-0 text-slate-400" />
              <span className="flex-1 truncate">{layerLabel(el)}</span>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                <LayerBtn icon={el.visible ? Eye : EyeOff} onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id) }} />
                <LayerBtn icon={el.locked ? Lock : Unlock} onClick={(e) => { e.stopPropagation(); toggleLock(el.id) }} />
                <LayerBtn icon={Copy} onClick={(e) => { e.stopPropagation(); onDuplicate(el.id) }} />
                <LayerBtn icon={Trash2} onClick={(e) => { e.stopPropagation(); onDelete(el.id) }} danger />
              </div>
            </div>
          )
        })}
        {elements.length === 0 && (
          <div className="px-3 py-4 text-xs text-slate-500 text-center">No layers yet</div>
        )}
      </div>
    </div>
  )
}

function LayerBtn({ icon: Icon, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`p-0.5 rounded hover:bg-slate-600 ${danger ? 'hover:text-red-400' : ''}`}
    >
      <Icon size={10} />
    </button>
  )
}

function layerLabel(el) {
  if (el.type === 'text') return el.text?.slice(0, 18) || 'Text'
  if (el.type === 'image') return el.filename || 'Image'
  if (el.type === 'video') return el.videoName || 'Video'
  if (el.type === 'clickthrough') return `Click ${el.clickIndex || 1}`
  return el.type.charAt(0).toUpperCase() + el.type.slice(1)
}
