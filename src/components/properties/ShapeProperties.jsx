import React from 'react'
import { Field, NumInput, SelectInput } from '../left/PropertiesSection.jsx'

export default function ShapeProperties({ el, update, save }) {
  return (
    <div className="space-y-2 pb-2 border-b border-gray-700">
      <Field label="Shape Type">
        <SelectInput value={el.shapeType || 'rectangle'} onChange={(v) => save({ shapeType: v })}>
          <option value="rectangle">Rectangle</option>
          <option value="rounded-rectangle">Rounded Rectangle</option>
          <option value="circle">Circle</option>
        </SelectInput>
      </Field>
      <Field label="Fill Color">
        <div className="flex items-center gap-2 mt-0.5">
          <input type="color" value={el.fillColor || '#888888'} onChange={(e) => save({ fillColor: e.target.value })}
            className="flex-1 h-9 bg-gray-800 rounded px-1 py-0.5 cursor-pointer" />
          <label className="flex items-center gap-1 text-xs text-gray-400">
            <input type="checkbox" checked={!!el.transparent} onChange={(e) => save({ transparent: e.target.checked })} className="w-4 h-4" />
            Transparent
          </label>
        </div>
      </Field>
      <Field label="Border">
        <div className="grid grid-cols-3 gap-1 mt-0.5">
          <div>
            <NumInput value={el.borderWidth || 0} min={0} max={50} onChange={(v) => save({ borderWidth: v })} />
            <label className="text-xs text-gray-500">Width (px)</label>
          </div>
          <div>
            <input type="color" value={el.borderColor || '#000000'} onChange={(e) => save({ borderColor: e.target.value })}
              className="w-full h-9 bg-gray-800 rounded px-1 py-0.5 cursor-pointer" />
            <label className="text-xs text-gray-500">Color</label>
          </div>
          <div>
            <NumInput value={el.borderRadius || 0} min={0} max={200} onChange={(v) => save({ borderRadius: v })} />
            <label className="text-xs text-gray-500">Radius (px)</label>
          </div>
        </div>
      </Field>
      <Field label="Shadow">
        <ShadowInputs prefix="shadow" el={el} save={save} spread />
      </Field>
      <Field label="Glow Effect">
        <ShadowInputs prefix="glow" el={el} save={save} spread />
      </Field>
    </div>
  )
}

function ShadowInputs({ prefix, el, save, spread }) {
  return (
    <div className={`grid gap-1 mt-0.5`} style={{ gridTemplateColumns: spread ? 'repeat(5,1fr)' : 'repeat(4,1fr)' }}>
      {['X','Y','Blur','Spread'].filter((_, i) => i < 3 || spread).map((label) => (
        <div key={label}>
          <input type="number" value={el[`${prefix}${label}`] || 0} onChange={(e) => save({ [`${prefix}${label}`]: Number(e.target.value) })}
            className="w-full bg-gray-800 rounded px-1 py-1 text-xs text-gray-100" placeholder={label} />
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      ))}
      <div>
        <input type="color" value={el[`${prefix}Color`] || '#000000'} onChange={(e) => save({ [`${prefix}Color`]: e.target.value })}
          className="w-full h-7 bg-gray-800 rounded" />
        <span className="text-xs text-gray-500">Color</span>
      </div>
    </div>
  )
}
