import React, { useState, useEffect, useCallback } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { buildPreviewHtml } from '../../utils/exportBanner.js'
import useEscapeKey from '../../hooks/useEscapeKey.js'

// Renders the actual generated export HTML (same code path as the real zip export) in
// an iframe, rather than the React canvas approximation — the only way to see hover
// color/scale effects and video time-cue animations actually run, since neither has a
// live preview in the editor canvas itself.
export default function PreviewModal({ onClose }) {
  useEscapeKey(onClose)
  const { elements, groups, canvasWidth, canvasHeight, activeTemplate } = useCanvasStore()
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [iframeKey, setIframeKey] = useState(0)

  const generate = useCallback(() => {
    setLoading(true)
    buildPreviewHtml({ elements, groups, canvasWidth, canvasHeight, bannerName: 'preview', activeTemplate })
      .then((h) => { setHtml(h); setIframeKey((k) => k + 1) })
      .finally(() => setLoading(false))
  }, [elements, groups, canvasWidth, canvasHeight, activeTemplate])

  useEffect(() => { generate() }, [generate])

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col" style={{ maxWidth: '90vw', maxHeight: '90vh' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-eye text-purple-400" style={{ fontSize: 14 }} />
            <h2 className="text-sm font-semibold text-white">Preview</h2>
            <span className="text-xs text-gray-500">{canvasWidth}×{canvasHeight} — actual export output</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={generate} title="Re-run from current state" className="text-gray-400 hover:text-white px-2 py-1 rounded text-xs flex items-center gap-1.5">
              <i className="fa-solid fa-rotate-right" style={{ fontSize: 11 }} /> Refresh
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <i className="fa-solid fa-xmark" style={{ fontSize: 16 }} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center" style={{ background: 'repeating-conic-gradient(#1f2937 0% 25%, #111827 0% 50%) 50% / 24px 24px' }}>
          {loading && !html ? (
            <div className="text-gray-500 text-sm flex items-center gap-2">
              <i className="fa-solid fa-spinner fa-spin" /> Building preview…
            </div>
          ) : (
            <iframe
              key={iframeKey}
              title="Banner preview"
              srcDoc={html}
              sandbox="allow-scripts allow-same-origin"
              style={{ width: canvasWidth, height: canvasHeight, border: 'none', display: 'block', background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
