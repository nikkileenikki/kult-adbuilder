import React from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'

const positions = [
  { id: 'top-left',     rotate: -45,  row: 0, col: 0 },
  { id: 'top',          rotate: 0,    row: 0, col: 1 },
  { id: 'top-right',    rotate: 45,   row: 0, col: 2 },
  { id: 'left',         rotate: -90,  row: 1, col: 0 },
  { id: 'center',       label: '•',   row: 1, col: 1 },
  { id: 'right',        rotate: 90,   row: 1, col: 2 },
  { id: 'bottom-left',  rotate: -135, row: 2, col: 0 },
  { id: 'bottom',       rotate: 180,  row: 2, col: 1 },
  { id: 'bottom-right', rotate: 135,  row: 2, col: 2 },
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
            {/* All 8 directions share one rotated fa-arrow-up icon instead of Unicode
                arrow glyphs (↑↓←→↖↗↙↘) — those render inconsistently across
                platforms: the straight ones as thin text glyphs, the diagonal ones as
                full-color emoji on Windows (Windows' default emoji font claims those
                codepoints). A single icon keeps weight/style identical all the way
                around the pad. */}
            {p.rotate != null
              ? <i className="fa-solid fa-arrow-up" style={{ fontSize: 13, transform: `rotate(${p.rotate}deg)` }} />
              : p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
