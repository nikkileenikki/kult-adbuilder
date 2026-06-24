import React from 'react'
import { Play, Square } from 'lucide-react'
import { useCanvasStore } from '../../store/canvasStore.js'

export default function Timeline() {
  const { elements } = useCanvasStore()

  return (
    <div className="h-36 bg-[#0d1b2a] border-t border-slate-700 flex flex-col shrink-0">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-700">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Timeline</span>
        <button className="ml-auto flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300">
          <Play size={11} /> Play
        </button>
        <button className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300">
          <Square size={11} /> Stop
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {elements.length === 0 && (
          <div className="flex items-center justify-center h-full text-xs text-slate-600">
            No elements — add some to animate
          </div>
        )}
        {elements.map((el) => (
          <TimelineRow key={el.id} element={el} />
        ))}
      </div>
    </div>
  )
}

function TimelineRow({ element }) {
  const label = element.type === 'text'
    ? (element.text?.slice(0, 16) || 'Text')
    : element.type.charAt(0).toUpperCase() + element.type.slice(1)

  return (
    <div className="flex items-center border-b border-slate-800 h-7">
      <div className="w-32 px-2 text-xs text-slate-400 truncate shrink-0">{label}</div>
      <div className="flex-1 relative h-full">
        {(element.animations || []).map((anim, i) => (
          <AnimBlock key={i} anim={anim} />
        ))}
      </div>
    </div>
  )
}

function AnimBlock({ anim }) {
  const start = (anim.startTime || 0) * 60
  const width = (anim.duration || 1) * 60

  return (
    <div
      className="absolute top-1 h-5 rounded text-xs flex items-center px-1 text-white overflow-hidden bg-violet-600"
      style={{ left: start, width: Math.max(width, 20) }}
      title={anim.type}
    >
      {anim.type}
    </div>
  )
}
