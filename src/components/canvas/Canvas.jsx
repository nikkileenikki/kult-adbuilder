import React, { useRef, useCallback } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import CanvasElement from './CanvasElement.jsx'

export default function Canvas() {
  const { elements, canvasWidth, canvasHeight, setSelected } = useCanvasStore()
  const containerRef = useRef(null)

  const handleBgClick = useCallback((e) => {
    if (e.target === e.currentTarget) setSelected(null)
  }, [setSelected])

  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto flex items-center justify-center bg-[#0a0a14] p-8"
    >
      <div
        className="relative shadow-2xl shadow-black/60 ring-1 ring-slate-600"
        style={{ width: canvasWidth, height: canvasHeight, background: '#fff', flexShrink: 0 }}
        onClick={handleBgClick}
      >
        {sorted.map((el) => (
          <CanvasElement key={el.id} element={el} canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
        ))}
      </div>
    </div>
  )
}
