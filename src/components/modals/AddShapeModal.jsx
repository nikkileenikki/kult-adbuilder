import React, { useState } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { Modal } from './AddTextModal.jsx'

export default function AddShapeModal() {
  const [shapeType, setShapeType] = useState('rectangle')
  const [fillColor, setFillColor] = useState('#7c3aed')
  const { addElement } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const { closeModal } = useUiStore()

  const onAdd = () => {
    saveState()
    const size = shapeType === 'circle' ? { width: 100, height: 100 } : { width: 200, height: 100 }
    addElement({ type: 'shape', shapeType, fillColor, ...size })
    closeModal()
  }

  return (
    <Modal title="Add Shape" onClose={closeModal}>
      <label className="block text-xs text-slate-400 mb-1">Shape type</label>
      <div className="flex gap-2 mb-3">
        {['rectangle', 'circle'].map((s) => (
          <button
            key={s}
            onClick={() => setShapeType(s)}
            className={`flex-1 py-1.5 text-xs rounded capitalize ${shapeType === s ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300'}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs text-slate-400">Fill color</label>
        <input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)}
          className="w-10 h-8 rounded cursor-pointer bg-transparent border border-slate-600" />
      </div>
      <button onClick={onAdd} className="w-full py-2 bg-violet-600 hover:bg-violet-500 rounded text-sm font-medium">
        Add Shape
      </button>
    </Modal>
  )
}
