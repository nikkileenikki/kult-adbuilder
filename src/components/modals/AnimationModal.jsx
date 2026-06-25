import React, { useState } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { Modal } from './AddTextModal.jsx'

const EASES = ['power1.out','power2.out','power3.out','power1.inOut','back.out','elastic.out','bounce.out','linear']

const ANIM_GROUPS = [
  { label: 'Fade', options: [
    { value: 'fadeIn', label: 'Fade In' },
    { value: 'fadeOut', label: 'Fade Out' },
  ]},
  { label: 'Slide In', options: [
    { value: 'slideLeft', label: 'From Left' },
    { value: 'slideRight', label: 'From Right' },
    { value: 'slideUp', label: 'From Top' },
    { value: 'slideDown', label: 'From Bottom' },
  ]},
  { label: 'Slide Out', options: [
    { value: 'slideToLeft', label: 'To Left' },
    { value: 'slideToRight', label: 'To Right' },
    { value: 'slideToUp', label: 'To Top' },
    { value: 'slideToDown', label: 'To Bottom' },
  ]},
  { label: 'Scale', options: [
    { value: 'scaleIn', label: 'Scale In' },
    { value: 'scaleOut', label: 'Scale Out' },
  ]},
  { label: 'Rotate', options: [
    { value: 'rotate90', label: '90°' },
    { value: 'rotate180', label: '180°' },
    { value: 'rotate270', label: '270°' },
    { value: 'rotate360', label: '360°' },
  ]},
]

const SLIDE_TYPES = new Set([
  'slideLeft','slideRight','slideUp','slideDown',
  'slideToLeft','slideToRight','slideToUp','slideToDown',
])

export default function AnimationModal() {
  const { elements, selectedId, updateElement } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const { closeModal, modalData } = useUiStore()

  const isEdit = !!modalData
  const initAnim = modalData?.anim || {}

  const [selected, setSelected] = useState(() => new Set([initAnim.type].filter(Boolean)))
  const [slideOffset, setSlideOffset] = useState(String(initAnim.offset ?? 400))
  const [startTime, setStartTime] = useState(initAnim.startTime ?? 0)
  const [duration, setDuration] = useState(initAnim.duration ?? 1)
  const [ease, setEase] = useState(initAnim.ease ?? 'power1.out')

  const hasSlide = [...selected].some((t) => SLIDE_TYPES.has(t))

  const toggle = (value) => {
    if (isEdit) {
      // Edit mode: single-select (editing one block at a time)
      setSelected(new Set([value]))
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(value)) next.delete(value); else next.add(value)
        return next
      })
    }
  }

  const onSave = () => {
    const parsedOffset = slideOffset === '' ? 400 : Math.max(1, Number(slideOffset))
    if (isEdit) {
      const el = elements.find((e) => e.id === modalData.elementId)
      if (!el) { closeModal(); return }
      const type = [...selected][0] || initAnim.type
      saveState()
      const anims = [...(el.animations || [])]
      anims[modalData.animIdx] = { type, startTime, duration, ease, ...(SLIDE_TYPES.has(type) ? { offset: parsedOffset } : {}) }
      updateElement(modalData.elementId, { animations: anims })
    } else {
      const el = elements.find((e) => e.id === selectedId)
      if (!el || !selected.size) { closeModal(); return }
      saveState()
      const newAnims = [...selected].map((type) => ({
        type, startTime, duration, ease,
        ...(SLIDE_TYPES.has(type) ? { offset: parsedOffset } : {}),
      }))
      updateElement(selectedId, { animations: [...(el.animations || []), ...newAnims] })
    }
    closeModal()
  }

  return (
    <Modal title={isEdit ? 'Edit Animation' : 'Add Animation'} onClose={closeModal}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">
            {isEdit ? 'Animation Type' : 'Animation Effects'}{!isEdit && selected.size > 0 && <span className="text-blue-400 ml-1">({selected.size} selected)</span>}
          </label>
          <div className="space-y-2">
            {ANIM_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="text-xs text-gray-500 mb-1">{group.label}</div>
                <div className="flex flex-wrap gap-1">
                  {group.options.map((opt) => {
                    const active = selected.has(opt.value)
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggle(opt.value)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {hasSlide && (
          <div>
            <label className="text-xs text-gray-400 block mb-1">Slide Offset (px)</label>
            <input type="number" value={slideOffset} step={10} min={1}
              onChange={(e) => setSlideOffset(e.target.value)}
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
          {isEdit ? 'Save Changes' : `Add Animation${selected.size > 1 ? ` (${selected.size})` : ''}`}
        </button>
      </div>
    </Modal>
  )
}
