import React, { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore.js'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { buildElementsFromLayout, BACKGROUND_STYLES, findLayout } from '../../utils/aiLayouts.js'

// "Design with AI" as a chat, pinned to the bottom-right of the canvas viewport (see
// Canvas.jsx). Conversation history is plain component state — intentionally NOT
// persisted, so it lives for the session and is gone on refresh — and is sent back to
// /api/ai-design on every turn so follow-ups ("make the headline shorter") refine the
// previous result instead of generating an unrelated new one.
export default function AiChatPanel() {
  const { token } = useAuthStore()
  const { elements, canvasWidth, canvasHeight } = useCanvasStore()
  const { activeBrandId } = useUiStore()
  const { saveState } = useHistoryStore()

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([]) // { role: 'user'|'assistant'|'error', text }
  const [history, setHistory] = useState([]) // { brief, layoutId, copy } — sent back for follow-ups
  const [input, setInput] = useState('')
  const [backgroundStyle, setBackgroundStyle] = useState('solid')
  const [backgroundPrompt, setBackgroundPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  const handleSend = async () => {
    const brief = input.trim()
    if (!brief) return
    if (backgroundStyle === 'other' && !backgroundPrompt.trim()) {
      setMessages((m) => [...m, { role: 'error', text: 'Describe the background image you want first.' }])
      return
    }

    setMessages((m) => [...m, { role: 'user', text: brief }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai-design', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, canvasWidth, canvasHeight, brandId: activeBrandId || null, history }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI design failed')

      let backgroundImage = null
      if (backgroundStyle === 'other') {
        const imgRes = await fetch('/api/ai-image', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: backgroundPrompt, width: canvasWidth, height: canvasHeight, brandId: activeBrandId || null }),
        })
        const imgData = await imgRes.json()
        if (!imgRes.ok) throw new Error(imgData.error || 'Background image generation failed')
        backgroundImage = imgData.image
      }

      const newElements = buildElementsFromLayout(data.layoutId, canvasWidth, canvasHeight, data.copy, backgroundStyle, data.palette, backgroundImage)
      if (!newElements.length) throw new Error('AI picked an unknown layout')

      saveState()
      let nextId = Date.now()
      const withIds = newElements.map((el) => ({
        id: `${el.type}_${nextId++}`,
        rotation: 0, opacity: 1, visible: true, locked: false, folderId: null, animations: [],
        ...el,
      }))
      useCanvasStore.setState({ elements: withIds, selectedId: null })

      setHistory((h) => [...h, { brief, layoutId: data.layoutId, copy: data.copy }])
      const layoutLabel = findLayout(data.layoutId)?.label || data.layoutId
      setMessages((m) => [...m, { role: 'assistant', text: `Applied "${layoutLabel}" layout to the canvas.` }])
    } catch (err) {
      setMessages((m) => [...m, { role: 'error', text: err.message }])
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <>
      {open && (
        <div
          className="absolute bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
          style={{ bottom: 66, right: 16, width: 340, height: 460, zIndex: 9300 }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0">
            <span className="text-white text-xs font-semibold flex items-center gap-1.5">
              <i className="fa-solid fa-wand-magic-sparkles text-purple-400" />
              Design with AI
            </span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors">
              <i className="fa-solid fa-xmark" style={{ fontSize: 13 }} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {messages.length === 0 && (
              <p className="text-xs text-gray-500">
                Describe the banner (product, offer, tone). Follow-up messages refine the last result — e.g. "make the headline shorter".
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`text-xs rounded-lg px-2.5 py-1.5 max-w-[90%] ${
                m.role === 'user' ? 'bg-purple-700 text-white ml-auto' :
                m.role === 'error' ? 'bg-red-900/40 text-red-300' :
                'bg-gray-800 text-gray-200'
              }`}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="text-xs rounded-lg px-2.5 py-1.5 bg-gray-800 text-gray-400 max-w-[90%]">
                <i className="fa-solid fa-spinner fa-spin mr-1.5" style={{ fontSize: 10 }} /> Designing…
              </div>
            )}
          </div>

          <div className="border-t border-gray-700 p-2 space-y-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <select
                value={backgroundStyle}
                onChange={(e) => setBackgroundStyle(e.target.value)}
                className="bg-gray-800 rounded px-1.5 py-1 text-xs text-white border border-gray-700 focus:border-purple-500 focus:outline-none"
              >
                {BACKGROUND_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {backgroundStyle === 'other' && (
                <input
                  type="text"
                  value={backgroundPrompt}
                  onChange={(e) => setBackgroundPrompt(e.target.value)}
                  placeholder="Background image prompt…"
                  className="flex-1 min-w-0 bg-gray-800 text-gray-100 rounded px-2 py-1 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none"
                />
              )}
            </div>
            <div className="flex items-end gap-1.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={2}
                placeholder="Describe the banner or a follow-up tweak…"
                className="flex-1 min-w-0 bg-gray-800 text-gray-100 rounded px-2 py-1.5 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none resize-none"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="shrink-0 w-8 h-8 flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded"
              >
                <i className="fa-solid fa-paper-plane" style={{ fontSize: 12 }} />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        title="Design with AI"
        className="absolute bottom-4 right-4 flex items-center justify-center rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
        style={{ width: 44, height: 44, zIndex: 9200 }}
      >
        <i className={`fa-solid ${open ? 'fa-chevron-down' : 'fa-wand-magic-sparkles'}`} style={{ fontSize: 16 }} />
      </button>
    </>
  )
}
