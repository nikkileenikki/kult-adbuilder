import React, { useState } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { Modal } from './AddTextModal.jsx'

export default function AnimationModal() {
  const { elements, selectedId, updateElement } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const { closeModal } = useUiStore()

  const [fade, setFade] = useState('')
  const [slide, setSlide] = useState('')
  const [scale, setScale] = useState('')
  const [rotate, setRotate] = useState('')
  const [startTime, setStartTime] = useState(0)
  const [duration, setDuration] = useState(1)
  const [ease, setEase] = useState('power1.out')

  const onAdd = () => {
    const el = elements.find((e) => e.id === selectedId)
    if (!el) return
    const types = [fade, slide, scale, rotate].filter(Boolean)
    if (!types.length) { closeModal(); return }
    saveState()
    const newAnims = types.map((type) => ({ type, startTime, duration, ease }))
    updateElement(selectedId, { animations: [...(el.animations || []), ...newAnims] })
    closeModal()
  }

  return (
    <Modal title="Add Animation" onClose={closeModal}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Select Animation Effects</label>
          <div className="grid grid-cols-2 gap-2">
            <SelectGroup label="Fade" value={fade} onChange={setFade}>
              <option value="">None</option>
              <option value="fadeIn">Fade In</option>
              <option value="fadeOut">Fade Out</option>
            </SelectGroup>
            <SelectGroup label="Slide" value={slide} onChange={setSlide}>
              <option value="">None</option>
              <option value="slideLeft">From Left</option>
              <option value="slideRight">From Right</option>
              <option value="slideUp">From Top</option>
              <option value="slideDown">From Bottom</option>
              <option value="slideToLeft">To Left</option>
              <option value="slideToRight">To Right</option>
              <option value="slideToUp">To Top</option>
              <option value="slideToDown">To Bottom</option>
            </SelectGroup>
            <SelectGroup label="Scale" value={scale} onChange={setScale}>
              <option value="">None</option>
              <option value="scaleIn">Scale In</option>
              <option value="scaleOut">Scale Out</option>
            </SelectGroup>
            <SelectGroup label="Rotate" value={rotate} onChange={setRotate}>
              <option value="">None</option>
              <option value="rotate90">90°</option>
              <option value="rotate180">180°</option>
              <option value="rotate270">270°</option>
              <option value="rotate360">360°</option>
            </SelectGroup>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Start Time (s)</label>
            <input type="number" value={startTime} step={0.1} min={0} onChange={(e) => setStartTime(Number(e.target.value))}
              className="w-full bg-gray-700 rounded px-2 py-1.5 text-sm text-gray-200" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Duration (s)</label>
            <input type="number" value={duration} step={0.1} min={0.1} onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-gray-700 rounded px-2 py-1.5 text-sm text-gray-200" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Easing</label>
          <select value={ease} onChange={(e) => setEase(e.target.value)}
            className="w-full bg-gray-700 rounded px-2 py-1.5 text-sm text-gray-200">
            <option value="power1.out">Power1 Out</option>
            <option value="power2.out">Power2 Out</option>
            <option value="power3.out">Power3 Out</option>
            <option value="power1.inOut">Power1 InOut</option>
            <option value="back.out">Back Out</option>
            <option value="elastic.out">Elastic Out</option>
            <option value="bounce.out">Bounce Out</option>
            <option value="linear">Linear</option>
          </select>
        </div>
        <button onClick={onAdd} className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium text-white">
          Add Animation
        </button>
      </div>
    </Modal>
  )
}

function SelectGroup({ label, value, onChange, children }) {
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-700 rounded px-2 py-1.5 text-sm text-gray-200">
        {children}
      </select>
    </div>
  )
}
