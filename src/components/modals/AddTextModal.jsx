import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'

export default function AddTextModal() {
  const [text, setText] = useState('Your text here')
  const [fontSize, setFontSize] = useState(24)
  const [color, setColor] = useState('#000000')
  const { addElement } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const { closeModal } = useUiStore()

  const onAdd = () => {
    saveState()
    addElement({ type: 'text', text, fontSize, color, width: 200, height: 50 })
    closeModal()
  }

  return (
    <Modal title="Add Text" onClose={closeModal}>
      <label className="block text-xs text-slate-400 mb-1">Text content</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full px-2 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded text-slate-200 mb-3 resize-none"
      />
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1">Font size</label>
          <input type="number" value={fontSize} min={6} max={300} onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-slate-200" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
            className="w-10 h-8 rounded cursor-pointer bg-transparent border border-slate-600" />
        </div>
      </div>
      <button onClick={onAdd} className="w-full py-2 bg-violet-600 hover:bg-violet-500 rounded text-sm font-medium">
        Add Text
      </button>
    </Modal>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1e2d4a] rounded-lg p-5 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
