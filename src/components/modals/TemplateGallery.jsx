import React, { useState } from 'react'
import { TEMPLATES } from '../../templates/index.js'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'

const CATEGORY_LABELS = {
  standard: 'Standard',
  carousel: 'Carousel',
  catfish: 'Catfish',
}

const VAR_TYPE_ICONS = {
  image: 'fa-image',
  text: 'fa-t',
  video: 'fa-film',
  url: 'fa-link',
  landing_url: 'fa-link',
  number: null,
}

export default function TemplateGallery() {
  const { closeModal } = useUiStore()
  const { saveState, setCanvasSize } = useCanvasStore()
  const { saveState: hist } = useHistoryStore()
  const [selected, setSelected] = useState(null)

  const loadTemplate = (tpl) => {
    const sizes = Object.values(tpl.sizes)
    if (!sizes.length) return
    const size = sizes[0]
    hist()
    setCanvasSize(size.width, size.height)

    // Stamp unique IDs onto template elements
    let counter = Date.now()
    const elements = (size.elements || []).map((el) => ({
      ...el,
      id: `${el.type}_${counter++}`,
      folderId: null,
    }))

    useCanvasStore.setState({
      elements,
      selectedId: null,
      activeTemplate: tpl,
      animDuration: 5,
      animLoop: 1,
    })
    closeModal()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={closeModal}>
      <div
        className="bg-gray-800 rounded-lg shadow-xl text-gray-100 flex flex-col"
        style={{ width: 640, maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-table-columns text-blue-400" style={{ fontSize: 16 }} />
            Template Gallery
          </h2>
          <button onClick={closeModal} className="text-gray-400 hover:text-white"><i className="fa-solid fa-xmark" style={{ fontSize: 16 }} /></button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-4">
            {TEMPLATES.map((tpl) => {
              const firstSize = Object.values(tpl.sizes)[0]
              const isSelected = selected === tpl.id
              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelected(tpl.id)}
                  onDoubleClick={() => loadTemplate(tpl)}
                  className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    isSelected ? 'border-blue-500' : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {/* Preview area */}
                  <div className="bg-gray-900 flex items-center justify-center" style={{ height: 120 }}>
                    <TemplatePreview tpl={tpl} size={firstSize} />
                  </div>
                  {/* Info */}
                  <div className="bg-gray-700 px-3 py-2">
                    <div className="font-semibold text-sm text-white truncate">{tpl.name}</div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-gray-400">{CATEGORY_LABELS[tpl.category] || tpl.category}</span>
                      <span className="text-xs text-gray-400">{firstSize?.width}×{firstSize?.height}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Variables preview for selected */}
          {selected && (() => {
            const tpl = TEMPLATES.find((t) => t.id === selected)
            if (!tpl) return null
            const vars = tpl.variables || []
            return (
              <div className="mt-4 bg-gray-900 rounded-lg p-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Template Variables</div>
                <div className="grid grid-cols-2 gap-2">
                  {vars.map((v) => {
                    const iconClass = VAR_TYPE_ICONS[v.type] || 'fa-table-columns'
                    return (
                      <div key={v.key} className="flex items-center gap-2 text-sm text-gray-300">
                        {iconClass && <i className={`fa-solid ${iconClass} text-gray-500 shrink-0`} style={{ fontSize: 12 }} />}
                        <span className="truncate">{v.label}</span>
                        {v.required && <span className="text-red-400 text-xs ml-auto">required</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-700">
          <button onClick={closeModal} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded text-sm">Cancel</button>
          <button
            disabled={!selected}
            onClick={() => { const tpl = TEMPLATES.find((t) => t.id === selected); if (tpl) loadTemplate(tpl) }}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded text-sm"
          >
            Use Template
          </button>
        </div>
      </div>
    </div>
  )
}

function TemplatePreview({ tpl, size }) {
  if (!size) return <i className="fa-solid fa-table-columns text-gray-600" style={{ fontSize: 32 }} />

  const W = 100, H = 80
  const scaleX = W / size.width
  const scaleY = H / size.height
  const scale = Math.min(scaleX, scaleY) * 0.9

  return (
    <div
      className="relative bg-white"
      style={{ width: size.width * scale, height: size.height * scale, overflow: 'hidden' }}
    >
      {/* Checkerboard */}
      <div className="absolute inset-0" style={{
        background: `linear-gradient(45deg,#f0f0f0 25%,transparent 25%),linear-gradient(-45deg,#f0f0f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f0f0f0 75%),linear-gradient(-45deg,transparent 75%,#f0f0f0 75%)`,
        backgroundSize: '8px 8px', backgroundPosition: '0 0,0 4px,4px -4px,-4px 0',
        backgroundColor: 'white',
      }} />
      {/* Category badge */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-gray-800/70 rounded px-1.5 py-0.5 text-xs text-white font-medium" style={{ fontSize: 8 }}>
          {tpl.category}
        </div>
      </div>
    </div>
  )
}
