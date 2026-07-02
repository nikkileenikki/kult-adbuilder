import React, { useState } from 'react'
import { useUiStore } from '../../store/uiStore.js'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useAuthStore } from '../../store/authStore.js'

const CATEGORIES = ['standard', 'carousel', 'catfish', 'custom']

export default function TemplateBuilderBar() {
  const { templateBuilder, setTemplateBuilder } = useUiStore()
  const { elements, canvasWidth, canvasHeight } = useCanvasStore()
  const { token } = useAuthStore()

  const [name, setName] = useState(templateBuilder?.name || '')
  const [category, setCategory] = useState(templateBuilder?.category || 'custom')
  const [customJs, setCustomJs] = useState(templateBuilder?.customJs || '')
  const [customCss, setCustomCss] = useState(templateBuilder?.customCss || '')
  const [showCode, setShowCode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  if (!templateBuilder) return null

  const restore = () => {
    useCanvasStore.setState(templateBuilder.snapshot)
  }

  const handleCancel = () => {
    restore()
    setTemplateBuilder(null)
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('Template name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const editingId = templateBuilder.editingTemplateId
      const res = await fetch(`/api/templates${editingId ? `?id=${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, width: canvasWidth, height: canvasHeight, elements, customJs, customCss }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save template')
      restore()
      setTemplateBuilder(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-purple-900/40 border-b border-purple-700 shrink-0">
      <div className="px-3 py-2 flex items-center gap-2">
        <i className="fa-solid fa-table-columns text-purple-300" style={{ fontSize: 13 }} />
        <span className="text-purple-200 text-xs font-medium shrink-0">
          {templateBuilder.editingTemplateId ? 'Editing Template' : 'New Template'}
        </span>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template name"
          className="bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none w-44"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-gray-800 rounded px-2 py-1 text-sm text-white border border-gray-700 focus:border-purple-500 focus:outline-none"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <button
          onClick={() => setShowCode((v) => !v)}
          title="Add custom JS/CSS for interactive effects beyond drag-and-drop elements"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-colors ${
            showCode ? 'bg-purple-700 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-500'
          }`}
        >
          <i className="fa-solid fa-code" style={{ fontSize: 11 }} /> Custom Code
        </button>

        {error && <span className="text-red-400 text-xs">{error}</span>}

        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleCancel} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-xs">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium"
          >
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>

      {showCode && (
        <div className="px-3 pb-3 flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-purple-200 block mb-1">Custom JS <span className="text-gray-400">(injected into the exported banner's script, runs after elements load — reference elements by their id)</span></label>
            <textarea
              value={customJs}
              onChange={(e) => setCustomJs(e.target.value)}
              rows={6}
              placeholder="// e.g. custom carousel/catfish interaction logic"
              spellCheck={false}
              className="w-full bg-gray-900 text-gray-100 rounded px-2 py-1.5 text-xs font-mono border border-gray-700 focus:border-purple-500 focus:outline-none resize-y"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-purple-200 block mb-1">Custom CSS <span className="text-gray-400">(injected into the exported banner's stylesheet)</span></label>
            <textarea
              value={customCss}
              onChange={(e) => setCustomCss(e.target.value)}
              rows={6}
              placeholder="/* e.g. custom transitions, effects */"
              spellCheck={false}
              className="w-full bg-gray-900 text-gray-100 rounded px-2 py-1.5 text-xs font-mono border border-gray-700 focus:border-purple-500 focus:outline-none resize-y"
            />
          </div>
        </div>
      )}
    </div>
  )
}
