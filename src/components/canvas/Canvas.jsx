import React, { useRef, useCallback, useState, useEffect } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useUiStore } from '../../store/uiStore.js'
import CanvasElement from './CanvasElement.jsx'
import { buildPreviewHtml } from '../../utils/exportBanner.js'

export default function Canvas() {
  const { elements, canvasWidth, canvasHeight, setSelected, snapLines, activeTemplate } = useCanvasStore()
  const { canvasZoom } = useUiStore()
  const containerRef = useRef(null)
  const scale = canvasZoom / 100

  const handleBgClick = useCallback((e) => {
    if (e.target === e.currentTarget) setSelected(null)
  }, [setSelected])

  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)
  const isAdvanced = !!activeTemplate?.customHtml
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewKey, setPreviewKey] = useState(0)

  useEffect(() => {
    if (!isAdvanced) return
    let cancelled = false
    buildPreviewHtml({ elements, canvasWidth, canvasHeight, activeTemplate })
      .then((html) => { if (!cancelled) setPreviewHtml(html) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isAdvanced, elements, canvasWidth, canvasHeight, activeTemplate])

  const handleRefreshPreview = useCallback(() => {
    setPreviewKey((k) => k + 1)
  }, [])

  return (
    <div
      ref={containerRef}
      id="canvas-viewport"
      className="flex-1 overflow-auto bg-gray-900"
      style={{ background: 'rgba(30,41,59,0.7)' }}
    >
      <div className="min-w-full min-h-full flex items-center justify-center p-10" style={{ boxSizing: 'border-box' }}>
        {/* Outer div matches the visually-scaled size so transform doesn't cause layout overflow */}
        <div style={{ width: canvasWidth * scale, height: canvasHeight * scale, flexShrink: 0, position: 'relative' }}>
        {/* Canvas wrapper — dark overlay outside via box-shadow */}
        <div
          id="canvasWrapper"
          className="relative shadow-2xl"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            boxShadow: '0 0 0 2000px rgba(30,41,59,0.5), inset 0 0 0 1px rgba(255,255,255,0.1)',
          }}
        >
          {isAdvanced ? (
            <iframe
              key={previewKey}
              title="Template preview"
              srcDoc={previewHtml}
              sandbox="allow-scripts allow-same-origin"
              style={{ width: canvasWidth, height: canvasHeight, border: 'none', display: 'block', background: '#fff' }}
            />
          ) : (
          /* Checkerboard canvas */
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
            {/* Outside-canvas overlay: dims overflowing elements via box-shadow spread */}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 9000, boxShadow: '0 0 0 2000px rgba(30,41,59,0.5)' }} />
            {/* Snap guide lines */}
            {snapLines.x.map((lx, i) => (
              <div key={`sx${i}`} className="absolute top-0 bottom-0 pointer-events-none"
                style={{ left: lx - 0.5, width: 1, background: 'rgba(59,130,246,0.9)', zIndex: 9100 }} />
            ))}
            {snapLines.y.map((ly, i) => (
              <div key={`sy${i}`} className="absolute left-0 right-0 pointer-events-none"
                style={{ top: ly - 0.5, height: 1, background: 'rgba(59,130,246,0.9)', zIndex: 9100 }} />
            ))}
          </div>
          )}
        </div>
        {isAdvanced && (
          <button
            onClick={handleRefreshPreview}
            title="Refresh / replay custom template"
            className="absolute bottom-12 right-2 flex items-center justify-center rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
            style={{ width: 34, height: 34, zIndex: 9200 }}
          >
            <i className="fa-solid fa-rotate-right" style={{ fontSize: 14 }} />
          </button>
        )}
        </div>
      </div>
    </div>
  )
}
