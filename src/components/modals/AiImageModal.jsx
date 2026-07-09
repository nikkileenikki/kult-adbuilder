import React, { useState } from 'react'
import { useAuthStore } from '../../store/authStore.js'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
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

export default function AiImageModal({ onClose }) {
  const { token } = useAuthStore()
  const { addElement, canvasWidth, canvasHeight } = useCanvasStore()
  const { activeBrandId } = useUiStore()
  const { saveState } = useHistoryStore()
  useEscapeKey(onClose)

  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError('Describe the image first'); return }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, width: canvasWidth, height: canvasHeight, brandId: activeBrandId || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Image generation failed')

      const scale = Math.min(canvasWidth / data.width, canvasHeight / data.height)
      const w = Math.round(data.width * scale)
      const h = Math.round(data.height * scale)

      saveState()
      addElement({ type: 'image', src: data.image, filename: 'ai-image.png', width: w, height: h, x: 0, y: 0, borderRadius: 0 })
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
          <i className="fa-solid fa-image text-purple-400" />
          Generate Image with AI
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Describe the image — it's generated and added as a new image element scaled to fit the canvas.
      </p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        placeholder="e.g. Abstract watercolor splash in blue and orange, no text"
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
          {loading ? <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 11 }} /> Generating…</> : 'Generate'}
        </button>
      </div>
    </Modal>
  )
}
