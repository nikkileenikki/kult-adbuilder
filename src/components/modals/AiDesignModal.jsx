import React, { useState } from 'react'
import { useAuthStore } from '../../store/authStore.js'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { buildElementsFromLayout } from '../../utils/aiLayouts.js'
import useEscapeKey from '../../hooks/useEscapeKey.js'

function Modal({ children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        {children}
      </div>
    </div>
  )
}

export default function AiDesignModal({ onClose }) {
  const { token } = useAuthStore()
  const { elements, canvasWidth, canvasHeight } = useCanvasStore()
  const { saveState } = useHistoryStore()
  useEscapeKey(onClose)

  const [brief, setBrief] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGenerate = async () => {
    if (!brief.trim()) { setError('Describe the banner first (product, offer, tone, etc.)'); return }
    if (elements.length > 0 && !confirm('This replaces the current canvas elements. Continue?')) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-design', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, canvasWidth, canvasHeight }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI design failed')

      const newElements = buildElementsFromLayout(data.layoutId, canvasWidth, canvasHeight, data.copy)
      if (!newElements.length) throw new Error('AI picked an unknown layout')

      saveState()
      let nextId = Date.now()
      const withIds = newElements.map((el) => ({
        id: `${el.type}_${nextId++}`,
        rotation: 0, opacity: 1, visible: true, locked: false, folderId: null, animations: [],
        ...el,
      }))
      useCanvasStore.setState({ elements: withIds, selectedId: null })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">
          <i className="fa-solid fa-wand-magic-sparkles text-purple-400" />
          Design with AI
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Describe the product, offer, and tone — Claude picks a layout from a pre-built catalog and writes the copy. This replaces the current canvas elements.
      </p>

      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={4}
        placeholder="e.g. Summer sale for a running shoe brand, 30% off, energetic and bold tone, CTA to shop now"
        className="w-full bg-gray-800 text-gray-100 rounded px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none resize-y mb-3"
      />

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-xs">
          Cancel
        </button>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5"
        >
          {loading ? <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 11 }} /> Designing…</> : 'Generate'}
        </button>
      </div>
    </Modal>
  )
}
