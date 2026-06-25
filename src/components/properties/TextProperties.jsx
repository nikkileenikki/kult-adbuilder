import React from 'react'
import { Field, NumInput, SelectInput } from '../left/PropertiesSection.jsx'

const FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black']
const COLORS = ['#FFFFFF', '#000000', '#6B7280', '#EF4444', '#3B82F6', '#10B981', '#F59E0B']

export default function TextProperties({ el, update, save }) {
  const colorInputRef = React.useRef(null)

  return (
    <div className="space-y-2 pb-2 border-b border-gray-700">
      <Field label="Text Content">
        <input
          type="text" value={el.text || ''}
          onChange={(e) => save({ text: e.target.value })}
          className="w-full bg-gray-800 rounded px-2 py-1.5 text-sm text-gray-100"
        />
      </Field>
      <Field label="Font Family">
        <SelectInput value={el.fontFamily || 'Arial'} onChange={(v) => save({ fontFamily: v })}>
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </SelectInput>
      </Field>
      <Field label="Font Size">
        <NumInput value={el.fontSize || 24} min={6} max={300} onChange={(v) => save({ fontSize: v })} />
      </Field>
      <Field label="Color">
        <div className="flex gap-1 flex-wrap mt-0.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => save({ color: c })}
              title={c}
              style={{
                background: c,
                width: 22, height: 22, borderRadius: 4,
                border: el.color === c ? '2px solid #3b82f6' : '2px solid #444',
                flexShrink: 0,
              }}
            />
          ))}
          {/* Custom colour picker trigger */}
          <button
            onClick={() => colorInputRef.current?.click()}
            title="Custom color"
            style={{ width: 22, height: 22, borderRadius: 4, border: '2px solid #444', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <i className="fa-solid fa-palette" style={{ fontSize: 11, color: '#d1d5db' }} />
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={el.color || '#000000'}
            onChange={(e) => save({ color: e.target.value })}
            className="hidden"
          />
        </div>
      </Field>

      <div className="flex gap-2 mt-0.5">
        <StyleBtn icon="fa-bold" active={el.bold} onClick={() => save({ bold: !el.bold })} title="Bold" />
        <StyleBtn icon="fa-italic" active={el.italic} onClick={() => save({ italic: !el.italic })} title="Italic" />
        <StyleBtn icon="fa-underline" active={el.underline} onClick={() => save({ underline: !el.underline })} title="Underline" />
      </div>

      <Field label="Text Align">
        <div className="flex gap-2 mt-0.5">
          <AlignBtn icon="fa-align-left"   value="left"   current={el.textAlign} onClick={() => save({ textAlign: 'left' })} />
          <AlignBtn icon="fa-align-center" value="center" current={el.textAlign} onClick={() => save({ textAlign: 'center' })} />
          <AlignBtn icon="fa-align-right"  value="right"  current={el.textAlign} onClick={() => save({ textAlign: 'right' })} />
        </div>
      </Field>

      <Field label="Text Shadow">
        <ShadowInputs prefix="textShadow" el={el} save={save} />
      </Field>
      <Field label="Glow Effect">
        <ShadowInputs prefix="textGlow" el={el} save={save} spread />
      </Field>
    </div>
  )
}

function StyleBtn({ icon, active, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex-1 flex items-center justify-center py-1.5 rounded transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
    >
      <i className={`fa-solid ${icon}`} style={{ fontSize: 13 }} />
    </button>
  )
}

function AlignBtn({ icon, value, current, onClick }) {
  const active = current === value || (!current && value === 'left')
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center py-1.5 rounded transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
    >
      <i className={`fa-solid ${icon}`} style={{ fontSize: 13 }} />
    </button>
  )
}

function ShadowInputs({ prefix, el, save, spread }) {
  const fields = spread
    ? ['X', 'Y', 'Blur', 'Spread']
    : ['X', 'Y', 'Blur']

  return (
    <div className="grid gap-1 mt-0.5" style={{ gridTemplateColumns: `repeat(${fields.length + 1}, 1fr)` }}>
      {fields.map((label) => {
        const key = label === 'X' ? `${prefix}X` : label === 'Y' ? `${prefix}Y` : label === 'Blur' ? `${prefix}Blur` : `${prefix}Spread`
        return (
          <div key={label}>
            <input
              type="number" value={el[key] || 0}
              min={label === 'Blur' ? 0 : -100} max={label === 'Blur' ? 100 : (label === 'Spread' ? 50 : 100)}
              onChange={(e) => save({ [key]: Number(e.target.value) })}
              className="w-full bg-gray-800 rounded px-1 py-1 text-xs text-gray-100"
              placeholder={label}
            />
            <label className="text-xs text-gray-500">{label === 'X' || label === 'Y' ? `${label} Offset` : label === 'Blur' ? 'Blur Size' : label}</label>
          </div>
        )
      })}
      <div>
        <input
          type="color"
          value={el[`${prefix}Color`] || (spread ? '#ffffff' : '#000000')}
          onChange={(e) => save({ [`${prefix}Color`]: e.target.value })}
          className="w-full h-7 bg-gray-800 rounded"
        />
        <label className="text-xs text-gray-500">Color</label>
      </div>
    </div>
  )
}
