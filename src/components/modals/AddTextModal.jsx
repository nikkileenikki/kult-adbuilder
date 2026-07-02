import React, { useState } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'
import useEscapeKey from '../../hooks/useEscapeKey.js'

export default function AddTextModal() {
  const [text, setText] = useState('')
  const [fontSize, setFontSize] = useState(24)
  const [color, setColor] = useState('#000000')
  const { addElement } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const { closeModal } = useUiStore()

  const onAdd = () => {
    saveState()
    addElement({ type: 'text', text: text || 'Text', fontSize, color, width: 200, height: 50 })
    closeModal()
  }

  return (
    <Modal title="Add Text" onClose={closeModal}>
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Text content</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Enter text..."
            className="w-full px-2 py-1.5 text-sm bg-gray-700 rounded text-gray-200 resize-none" />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-400 block mb-1">Font size</label>
            <input type="number" value={fontSize} min={6} max={300} onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-sm bg-gray-700 rounded text-gray-200" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Color</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
              className="w-10 h-8 rounded cursor-pointer bg-transparent border border-gray-600" />
          </div>
        </div>
      </div>
      <button onClick={onAdd} className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium text-white">
        Add Text
      </button>
    </Modal>
  )
}

export function Modal({ title, onClose, children }) {
  useEscapeKey(onClose)
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-gray-800 rounded-lg p-4 w-96 shadow-xl text-gray-100" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><i className="fa-solid fa-xmark" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
