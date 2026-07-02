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
        body: JSON.stringify({ name, category, width: canvasWidth, height: canvasHeight, elements }),
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
    <div className="bg-purple-900/40 border-b border-purple-700 px-3 py-2 flex items-center gap-2 shrink-0">
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
  )
}
