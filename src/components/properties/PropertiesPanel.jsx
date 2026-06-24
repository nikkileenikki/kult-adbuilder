import React from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import TextProperties from './TextProperties.jsx'
import ShapeProperties from './ShapeProperties.jsx'
import ImageProperties from './ImageProperties.jsx'
import VideoProperties from './VideoProperties.jsx'
import ClickthroughProperties from './ClickthroughProperties.jsx'

export default function PropertiesPanel() {
  const { elements, selectedId, updateElement } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const el = elements.find((e) => e.id === selectedId)

  const update = (patch) => updateElement(selectedId, patch)
  const save = (patch) => { saveState(); update(patch) }

  if (!el) {
    return (
      <div className="w-56 bg-[#16213e] border-l border-slate-700 flex items-center justify-center">
        <p className="text-xs text-slate-500">Select an element</p>
      </div>
    )
  }

  return (
    <div className="w-56 bg-[#16213e] border-l border-slate-700 flex flex-col overflow-y-auto shrink-0">
      <div className="px-3 py-2 text-xs font-semibold text-slate-400 border-b border-slate-700 uppercase tracking-wide">
        Properties
      </div>

      <Section title="Transform">
        <Row label="X"><NumInput value={el.x} onChange={(v) => save({ x: v })} /></Row>
        <Row label="Y"><NumInput value={el.y} onChange={(v) => save({ y: v })} /></Row>
        <Row label="W"><NumInput value={el.width} onChange={(v) => save({ width: Math.max(1, v) })} /></Row>
        <Row label="H"><NumInput value={el.height} onChange={(v) => save({ height: Math.max(1, v) })} /></Row>
        <Row label="Rot"><NumInput value={el.rotation} onChange={(v) => save({ rotation: v })} /></Row>
        <Row label="Opacity">
          <input
            type="range" min={0} max={1} step={0.01} value={el.opacity}
            onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
            className="w-full accent-violet-500"
          />
        </Row>
      </Section>

      {el.type === 'text' && <TextProperties el={el} update={update} save={save} />}
      {el.type === 'shape' && <ShapeProperties el={el} update={update} save={save} />}
      {el.type === 'image' && <ImageProperties el={el} update={update} save={save} />}
      {el.type === 'video' && <VideoProperties el={el} update={update} save={save} />}
      {el.type === 'clickthrough' && <ClickthroughProperties el={el} update={update} save={save} />}
    </div>
  )
}

export function Section({ title, children }) {
  return (
    <div className="border-b border-slate-700 px-3 py-2">
      <div className="text-xs text-slate-500 mb-1.5 font-medium">{title}</div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

export function Row({ label, children }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 w-10 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export function NumInput({ value, onChange, min, max }) {
  return (
    <input
      type="number" value={value} min={min} max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full px-1.5 py-0.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200"
    />
  )
}

export function TextInput({ value, onChange }) {
  return (
    <input
      type="text" value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-1.5 py-0.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200"
    />
  )
}

export function ColorInput({ value, onChange }) {
  return (
    <input
      type="color" value={value || '#000000'}
      onChange={(e) => onChange(e.target.value)}
      className="w-8 h-6 rounded cursor-pointer bg-transparent border border-slate-600"
    />
  )
}
