import React, { useRef, useState } from 'react'
import { Palette } from 'lucide-react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { Modal } from './AddTextModal.jsx'

const COLORS = ['#FFFFFF', '#000000', '#6B7280', '#EF4444', '#3B82F6', '#10B981', '#F59E0B']

export default function AddShapeModal() {
  const [shapeType, setShapeType] = useState('rectangle')
  const [width, setWidth] = useState(200)
  const [height, setHeight] = useState(150)
  const [fillColor, setFillColor] = useState('#3B82F6')
  const colorRef = useRef(null)
  const { addElement } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const { closeModal } = useUiStore()

  const onAdd = () => {
    saveState()
    addElement({ type: 'shape', shapeType, fillColor, width, height })
    closeModal()
  }

  return (
    <Modal title="Add Shape" onClose={closeModal}>
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Shape Type</label>
          <select value={shapeType} onChange={(e) => setShapeType(e.target.value)}
            className="w-full px-2 py-1.5 text-sm bg-gray-700 rounded text-gray-200">
            <option value="rectangle">Rectangle</option>
            <option value="circle">Circle</option>
            <option value="rounded-rectangle">Rounded Rectangle</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Width</label>
            <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-sm bg-gray-700 rounded text-gray-200" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Height</label>
            <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-sm bg-gray-700 rounded text-gray-200" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Fill Color</label>
          <div className="flex gap-1.5 flex-wrap mt-1">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setFillColor(c)} title={c}
                style={{ background: c, width: 24, height: 24, borderRadius: 4, border: fillColor === c ? '2px solid #3b82f6' : '2px solid #444', flexShrink: 0 }} />
            ))}
            <button
              onClick={() => colorRef.current?.click()}
              title="Custom color"
              style={{ width: 24, height: 24, borderRadius: 4, border: '2px solid #444', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Palette size={13} className="text-gray-300" />
            </button>
            <input ref={colorRef} type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="hidden" />
          </div>
        </div>
      </div>
      <button onClick={onAdd} className="w-full py-2 bg-teal-600 hover:bg-teal-700 rounded text-sm font-medium text-white">
        Add Shape
      </button>
    </Modal>
  )
}
