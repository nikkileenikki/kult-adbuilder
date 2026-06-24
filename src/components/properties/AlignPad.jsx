import React from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'

const positions = [
  { id: 'top-left',     label: '↖', row: 0, col: 0 },
  { id: 'top',          label: '↑', row: 0, col: 1 },
  { id: 'top-right',    label: '↗', row: 0, col: 2 },
  { id: 'left',         label: '←', row: 1, col: 0 },
  { id: 'center',       label: '•', row: 1, col: 1 },
  { id: 'right',        label: '→', row: 1, col: 2 },
  { id: 'bottom-left',  label: '↙', row: 2, col: 0 },
  { id: 'bottom',       label: '↓', row: 2, col: 1 },
  { id: 'bottom-right', label: '↘', row: 2, col: 2 },
]

export default function AlignPad({ el, save }) {
  const { canvasWidth, canvasHeight } = useCanvasStore()

  const align = (id) => {
    let x = el.x, y = el.y
    if (id.includes('left')) x = 0
    if (id.includes('right')) x = canvasWidth - el.width
    if (!id.includes('left') && !id.includes('right') && (id === 'top' || id === 'bottom' || id === 'center')) x = Math.round((canvasWidth - el.width) / 2)
    if (id === 'center') { x = Math.round((canvasWidth - el.width) / 2); y = Math.round((canvasHeight - el.height) / 2) }
    if (id.includes('top')) y = 0
    if (id.includes('bottom')) y = canvasHeight - el.height
    if (!id.includes('top') && !id.includes('bottom') && (id === 'left' || id === 'right')) y = Math.round((canvasHeight - el.height) / 2)
    save({ x, y })
  }

  return (
    <div className="pb-2 border-b border-gray-700">
      <div
        className="relative mx-auto rounded-lg overflow-hidden"
        style={{
          width: 150, height: 150,
          background: 'rgb(31,41,55)',
          border: '1px solid rgb(75,85,99)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
        }}
      >
        {positions.map((p) => (
          <button
            key={p.id}
            onClick={() => align(p.id)}
            title={`Align ${p.id}`}
            className="flex items-center justify-center text-blue-200 hover:bg-blue-400/20 hover:text-white transition-all text-base"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
