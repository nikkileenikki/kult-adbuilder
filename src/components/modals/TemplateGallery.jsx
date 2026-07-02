import React, { useState, useEffect, useCallback } from 'react'
import { TEMPLATES } from '../../templates/index.js'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { useAuthStore } from '../../store/authStore.js'
import useEscapeKey from '../../hooks/useEscapeKey.js'

const CATEGORY_LABELS = {
  standard: 'Standard',
  carousel: 'Carousel',
  catfish: 'Catfish',
  custom: 'Custom',
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
  const { closeModal, setTemplateBuilder } = useUiStore()
  const { saveState, setCanvasSize } = useCanvasStore()
  const { saveState: hist } = useHistoryStore()
  const { token, user } = useAuthStore()
  const [selected, setSelected] = useState(null)
  const [dbTemplates, setDbTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  useEscapeKey(closeModal)

  const refreshDbTemplates = useCallback(() => {
    setLoading(true)
    fetch('/api/templates', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const items = (data.items || []).map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          isCustom: true,
          variables: [],
          customHtml: t.customHtml || '',
          customJs: t.customJs || '',
          customCss: t.customCss || '',
          sizes: {
            [`${t.width}x${t.height}`]: { label: `${t.width}x${t.height}`, width: t.width, height: t.height, elements: t.data.elements || [] },
          },
        }))
        setDbTemplates(items)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    refreshDbTemplates()
  }, [refreshDbTemplates])

  const allTemplates = [...TEMPLATES, ...dbTemplates]

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

  const newTemplate = () => {
    const snapshot = useCanvasStore.getState()
    setTemplateBuilder({ snapshot, editingTemplateId: null, name: '', category: 'custom' })
    useCanvasStore.setState({
      elements: [], groups: [], selectedId: null,
      canvasWidth: 300, canvasHeight: 250,
      animDuration: 5, animLoop: 1,
      activeTemplate: null,
    })
    closeModal()
  }

  const editTemplate = (tpl) => {
    const size = Object.values(tpl.sizes)[0]
    if (!size) return
    const snapshot = useCanvasStore.getState()
    setTemplateBuilder({ snapshot, editingTemplateId: tpl.id, name: tpl.name, category: tpl.category, customHtml: tpl.customHtml || '', customJs: tpl.customJs || '', customCss: tpl.customCss || '' })
    let counter = Date.now()
    const elements = (size.elements || []).map((el) => ({ ...el, id: `${el.type}_${counter++}`, folderId: null }))
    useCanvasStore.setState({
      elements, selectedId: null, activeTemplate: null,
      canvasWidth: size.width, canvasHeight: size.height,
      animDuration: 5, animLoop: 1,
    })
    closeModal()
  }

  const deleteTemplate = async (tpl) => {
    if (!confirm(`Delete template "${tpl.name}"? This cannot be undone.`)) return
    await fetch(`/api/templates?id=${tpl.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    if (selected === tpl.id) setSelected(null)
    refreshDbTemplates()
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
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <button onClick={newTemplate} title="Build a new reusable template"
                className="flex items-center gap-1.5 bg-gray-700 hover:bg-purple-900/40 hover:text-purple-300 text-gray-200 px-2.5 py-1.5 rounded text-xs border border-gray-600 transition-colors">
                <i className="fa-solid fa-plus" style={{ fontSize: 11 }} /> New Template
              </button>
            )}
            <button onClick={closeModal} className="text-gray-400 hover:text-white"><i className="fa-solid fa-xmark" style={{ fontSize: 16 }} /></button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-4">
            {allTemplates.map((tpl) => {
              const firstSize = Object.values(tpl.sizes)[0]
              const isSelected = selected === tpl.id
              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelected(tpl.id)}
                  onDoubleClick={() => loadTemplate(tpl)}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    isSelected ? 'border-blue-500' : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {/* Preview area */}
                  <div className="bg-gray-900 flex items-center justify-center" style={{ height: 120 }}>
                    <TemplatePreview tpl={tpl} size={firstSize} />
                  </div>
                  {tpl.isCustom && user?.role === 'admin' && (
                    <div className="absolute top-1.5 right-1.5 flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); editTemplate(tpl) }}
                        title="Edit template"
                        className="w-6 h-6 flex items-center justify-center bg-gray-900/80 hover:bg-purple-700 text-gray-300 hover:text-white rounded"
                      >
                        <i className="fa-solid fa-pen" style={{ fontSize: 10 }} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteTemplate(tpl) }}
                        title="Delete template"
                        className="w-6 h-6 flex items-center justify-center bg-gray-900/80 hover:bg-red-700 text-gray-300 hover:text-white rounded"
                      >
                        <i className="fa-solid fa-trash" style={{ fontSize: 10 }} />
                      </button>
                    </div>
                  )}
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
            {loading && dbTemplates.length === 0 && (
              <div className="col-span-3 text-center text-gray-500 text-xs py-4">Loading custom templates…</div>
            )}
          </div>

          {/* Variables preview for selected */}
          {selected && (() => {
            const tpl = allTemplates.find((t) => t.id === selected)
            if (!tpl) return null
            const vars = tpl.variables || []
            if (!vars.length) return null
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
            onClick={() => { const tpl = allTemplates.find((t) => t.id === selected); if (tpl) loadTemplate(tpl) }}
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
