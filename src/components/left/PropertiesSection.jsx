import React, { useState, useEffect } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import TextProperties from '../properties/TextProperties.jsx'
import ShapeProperties from '../properties/ShapeProperties.jsx'
import ImageProperties from '../properties/ImageProperties.jsx'
import VideoProperties from '../properties/VideoProperties.jsx'
import ClickthroughProperties from '../properties/ClickthroughProperties.jsx'
import AlignPad from '../properties/AlignPad.jsx'

export default function PropertiesSection() {
  const { elements, selectedId, updateElement, canvasHeight, canvasWidth } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const el = elements.find((e) => e.id === selectedId)
  if (!el) return null

  const update = (patch) => updateElement(selectedId, patch)
  const save = (patch) => { saveState(); update(patch) }

  const isLocked = el.locked
  const ratioLocked = el.type === 'image' && el.lockAspectRatio && el.width && el.height
  const currentRatio = el.width && el.height ? el.width / el.height : 1
  const ratio = ratioLocked ? currentRatio : null

  const saveWidth = (v) => {
    const w = Math.max(1, v)
    save(ratio ? { width: w, height: Math.round(w / ratio) } : { width: w })
  }
  const saveHeight = (v) => {
    const h = Math.max(1, v)
    save(ratio ? { height: h, width: Math.round(h * ratio) } : { height: h })
  }

  // Fill canvas height while preserving current aspect ratio
  const fillHeight = () => {
    const r = currentRatio
    save({ height: canvasHeight, width: Math.round(canvasHeight * r) })
  }

  return (
    <div className="mb-3 relative">
      <h2 className="text-base font-semibold mb-2 text-white">Properties</h2>
      <div className={`space-y-2 bg-gray-900 rounded-lg p-3 ${isLocked ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="grid grid-cols-2 gap-2 pb-2 border-b border-gray-700">
          {/* Width / Height with lock + fill-height */}
          <div className="col-span-2">
            <div className="flex items-end gap-1">
              <div className="flex-1">
                <label className="text-xs text-gray-400">Width</label>
                <NumInput value={el.width} onChange={saveWidth} />
              </div>
              <div className="flex flex-col gap-1 pb-0.5">
                <button
                  tabIndex={-1}
                  onClick={() => save({ lockAspectRatio: !el.lockAspectRatio })}
                  title={ratioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                  className={`flex items-center justify-center rounded transition-colors ${ratioLocked ? 'text-blue-400' : 'text-gray-600 hover:text-gray-400'}`}
                  style={{ width: 20, height: 20 }}
                >
                  <i className={`fa-solid ${ratioLocked ? 'fa-link' : 'fa-link'}`} style={{ fontSize: 10 }} />
                </button>
                {el.type === 'image' && (
                  <button
                    tabIndex={-1}
                    onClick={fillHeight}
                    title="Fill canvas height keeping ratio"
                    className="flex items-center justify-center rounded text-gray-600 hover:text-green-400 transition-colors"
                    style={{ width: 20, height: 20 }}
                  >
                    <i className="fa-solid fa-arrows-up-down" style={{ fontSize: 10 }} />
                  </button>
                )}
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400">Height</label>
                <NumInput value={el.height} onChange={saveHeight} />
              </div>
            </div>
          </div>

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
  const [local, setLocal] = useState(String(value ?? ''))

  useEffect(() => { setLocal(String(value ?? '')) }, [value])

  return (
    <input
      type="number" value={local} min={min} max={max} placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = parseFloat(local)
        if (!isNaN(n)) onChange(n)
        else setLocal(String(value ?? ''))
      }}
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
