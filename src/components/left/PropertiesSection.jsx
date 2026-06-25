import React from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import TextProperties from '../properties/TextProperties.jsx'
import ShapeProperties from '../properties/ShapeProperties.jsx'
import ImageProperties from '../properties/ImageProperties.jsx'
import VideoProperties from '../properties/VideoProperties.jsx'
import ClickthroughProperties from '../properties/ClickthroughProperties.jsx'
import AlignPad from '../properties/AlignPad.jsx'

export default function PropertiesSection() {
  const { elements, selectedId, updateElement } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const el = elements.find((e) => e.id === selectedId)
  if (!el) return null

  const update = (patch) => updateElement(selectedId, patch)
  const save = (patch) => { saveState(); update(patch) }

  const isLocked = el.locked

  return (
    <div className="mb-3 relative">
      <h2 className="text-base font-semibold mb-2 text-white">Properties</h2>
      <div className={`space-y-2 bg-gray-900 rounded-lg p-3 ${isLocked ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="grid grid-cols-2 gap-2 pb-2 border-b border-gray-700">
          <Field label="Width">
            <NumInput value={el.width} onChange={(v) => save({ width: Math.max(1, v) })} />
          </Field>
          <Field label="Height">
            <NumInput value={el.height} onChange={(v) => save({ height: Math.max(1, v) })} />
          </Field>
          <Field label="X Position">
            <NumInput value={el.x} onChange={(v) => save({ x: v })} />
          </Field>
          <Field label="Y Position">
            <NumInput value={el.y} onChange={(v) => save({ y: v })} />
          </Field>
          <Field label="Rotation">
            <NumInput value={el.rotation} onChange={(v) => save({ rotation: v })} placeholder="degrees" />
          </Field>
          <Field label="Opacity">
            <input
              type="range" min={0} max={1} step={0.1} value={el.opacity}
              onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
              className="w-full accent-blue-500 mt-1"
            />
            <div className="text-xs text-gray-500 text-right">{Math.round(el.opacity * 100)}%</div>
          </Field>
        </div>

        <AlignPad el={el} save={save} />

        {el.type === 'text' && <TextProperties el={el} update={update} save={save} />}
        {el.type === 'shape' && <ShapeProperties el={el} update={update} save={save} />}
        {el.type === 'image' && <ImageProperties el={el} update={update} save={save} />}
        {el.type === 'video' && <VideoProperties el={el} update={update} save={save} />}
        {el.type === 'clickthrough' && <ClickthroughProperties el={el} update={update} save={save} />}
      </div>

      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{ background: 'rgba(17,24,39,0.62)', backdropFilter: 'blur(1px)' }}>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-sm font-semibold text-gray-200 shadow-lg">
            <i className="fa-solid fa-lock" /> Locked layer
          </div>
        </div>
      )}
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-gray-400">{label}</label>
      {children}
    </div>
  )
}

export function NumInput({ value, onChange, min, max, placeholder }) {
  return (
    <input
      type="number" value={value} min={min} max={max} placeholder={placeholder}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-gray-800 rounded px-2 py-1.5 text-sm text-gray-100"
    />
  )
}

export function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text" value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-800 rounded px-2 py-1.5 text-sm text-gray-100"
    />
  )
}

export function SelectInput({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-800 rounded px-2 py-1.5 text-sm text-gray-100"
    >
      {children}
    </select>
  )
}
