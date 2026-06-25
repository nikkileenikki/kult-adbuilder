import React, { useState } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { Modal } from './AddTextModal.jsx'

const EASES = ['power1.out','power2.out','power3.out','power1.inOut','back.out','elastic.out','bounce.out','linear']

export default function AnimationModal() {
  const { elements, selectedId, updateElement } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const { closeModal, modalData } = useUiStore()

  // modalData = { elementId, animIdx, anim } when editing, null when adding
  const isEdit = !!modalData

  const initAnim = modalData?.anim || {}
  const initType = (t) => {
    if (!isEdit) return ''
    return t === 'fade' ? (['fadeIn','fadeOut'].includes(initAnim.type) ? initAnim.type : '') :
           t === 'slide' ? (['slideLeft','slideRight','slideUp','slideDown','slideToLeft','slideToRight','slideToUp','slideToDown'].includes(initAnim.type) ? initAnim.type : '') :
           t === 'scale' ? (['scaleIn','scaleOut'].includes(initAnim.type) ? initAnim.type : '') :
           t === 'rotate' ? (['rotate90','rotate180','rotate270','rotate360'].includes(initAnim.type) ? initAnim.type : '') : ''
  }

  const [fade, setFade] = useState(() => initType('fade'))
  const [slide, setSlide] = useState(() => initType('slide'))
  const [scale, setScale] = useState(() => initType('scale'))
  const [rotate, setRotate] = useState(() => initType('rotate'))
  const [slideOffset, setSlideOffset] = useState(initAnim.offset ?? 400)
  const [startTime, setStartTime] = useState(initAnim.startTime ?? 0)
  const [duration, setDuration] = useState(initAnim.duration ?? 1)
  const [ease, setEase] = useState(initAnim.ease ?? 'power1.out')

  const onSave = () => {
    if (isEdit) {
      // Edit mode: replace the single animation at animIdx
      const el = elements.find((e) => e.id === modalData.elementId)
      if (!el) { closeModal(); return }
      const types = [fade, slide, scale, rotate].filter(Boolean)
      const type = types[0] || initAnim.type
      saveState()
      const anims = [...(el.animations || [])]
      const isSlide = type?.startsWith('slide')
      anims[modalData.animIdx] = { type, startTime, duration, ease, ...(isSlide ? { offset: slideOffset } : {}) }
      updateElement(modalData.elementId, { animations: anims })
    } else {
      // Add mode: append one or more animations
      const el = elements.find((e) => e.id === selectedId)
      if (!el) { closeModal(); return }
      const types = [fade, slide, scale, rotate].filter(Boolean)
      if (!types.length) { closeModal(); return }
      saveState()
      const newAnims = types.map((type) => ({ type, startTime, duration, ease, ...(type.startsWith('slide') ? { offset: slideOffset } : {}) }))
      updateElement(selectedId, { animations: [...(el.animations || []), ...newAnims] })
    }
    closeModal()
  }

  return (
    <Modal title={isEdit ? 'Edit Animation' : 'Add Animation'} onClose={closeModal}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Animation Effects</label>
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
        {slide && (
          <div>
            <label className="text-xs text-gray-400 block mb-1">Slide Offset (px)</label>
            <input type="number" value={slideOffset} step={10} min={1}
              onChange={(e) => setSlideOffset(Number(e.target.value))}
              className="w-full bg-gray-700 rounded px-2 py-1.5 text-sm text-gray-200" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Start Time (s)</label>
            <input type="number" value={startTime} step={0.1} min={0}
              onChange={(e) => setStartTime(Number(e.target.value))}
              className="w-full bg-gray-700 rounded px-2 py-1.5 text-sm text-gray-200" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Duration (s)</label>
            <input type="number" value={duration} step={0.1} min={0.1}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-gray-700 rounded px-2 py-1.5 text-sm text-gray-200" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Easing</label>
          <select value={ease} onChange={(e) => setEase(e.target.value)}
            className="w-full bg-gray-700 rounded px-2 py-1.5 text-sm text-gray-200">
            {EASES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <button onClick={onSave}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium text-white">
          {isEdit ? 'Save Changes' : 'Add Animation'}
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
