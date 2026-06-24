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
      className="flex-1 overflow-auto bg-gray-900"
      style={{ background: 'rgba(30,41,59,0.7)' }}
    >
      <div className="min-w-full min-h-full flex items-center justify-center p-10" style={{ boxSizing: 'border-box' }}>
        {/* Canvas wrapper — dark overlay outside via box-shadow */}
        <div
          id="canvasWrapper"
          className="relative shadow-2xl"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            flexShrink: 0,
            boxShadow: '0 0 0 2000px rgba(30,41,59,0.5), inset 0 0 0 1px rgba(255,255,255,0.1)',
          }}
        >
          {/* Checkerboard canvas */}
          <div
            id="canvas"
            className="w-full h-full relative overflow-visible"
            style={{
              background: `
                linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              backgroundColor: 'white',
            }}
            onClick={handleBgClick}
          >
            {sorted.map((el) => (
              <CanvasElement key={el.id} element={el} canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
