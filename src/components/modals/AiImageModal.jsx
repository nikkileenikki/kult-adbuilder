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

// Optional stylistic direction appended to the prompt client-side — gives explicit
// access to non-abstract results (real photos/scenes, illustration, 3D, ...) instead
// of the model defaulting to abstract color blends when no style is specified.
const STYLE_PRESETS = [
  { value: '', label: "No preference (use my wording as-is)" },
  { value: 'photo', label: 'Photo / real scene', modifier: 'Photorealistic photograph with natural lighting, shot in a real environment or setting relevant to the subject — not an abstract or illustrated look.' },
  { value: 'illustration', label: 'Illustration', modifier: 'Digital illustration with clean linework and flat or lightly shaded color.' },
  { value: 'render3d', label: '3D render', modifier: '3D rendered scene with studio lighting and realistic materials.' },
  { value: 'flat', label: 'Flat design', modifier: 'Flat, minimal graphic design style with simple geometric shapes, no gradients or photorealism.' },
  { value: 'gradient', label: 'Gradient', modifier: 'Smooth, minimal color gradient, no imagery or texture.' },
  { value: 'abstract', label: 'Abstract', modifier: 'Abstract composition of shapes and blended colors.' },
  { value: 'watercolor', label: 'Watercolor', modifier: 'Watercolor painting style with soft edges and visible paper texture.' },
]

export default function AiImageModal({ onClose }) {
  const { token } = useAuthStore()
  const { addElement, canvasWidth, canvasHeight } = useCanvasStore()
  const { activeBrandId } = useUiStore()
  const { saveState } = useHistoryStore()
  useEscapeKey(onClose)

  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError('Describe the image first'); return }

    const styleModifier = STYLE_PRESETS.find((s) => s.value === style)?.modifier
    const fullPrompt = styleModifier ? `${prompt}\n\nStyle: ${styleModifier}` : prompt

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, width: canvasWidth, height: canvasHeight, brandId: activeBrandId || null }),
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
        placeholder="e.g. A sunlit outdoor running track, empty, morning light"
        className="w-full bg-gray-800 text-gray-100 rounded px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none resize-y mb-3"
      />

      <label className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-400">Style</span>
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="bg-gray-800 rounded px-2 py-1 text-xs text-white border border-gray-700 focus:border-purple-500 focus:outline-none"
        >
          {STYLE_PRESETS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label>

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
