import React from 'react'
import { Field, NumInput, SelectInput } from '../left/PropertiesSection.jsx'

const FONTS = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black']
const COLORS = ['#FFFFFF', '#000000', '#6B7280', '#EF4444', '#3B82F6', '#10B981', '#F59E0B']

export default function TextProperties({ el, update, save }) {
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
              style={{ background: c, width: 22, height: 22, borderRadius: 4, border: el.color === c ? '2px solid #3b82f6' : '2px solid #444' }}
            />
          ))}
          <input type="color" value={el.color || '#000000'} onChange={(e) => save({ color: e.target.value })}
            style={{ width: 22, height: 22, borderRadius: 4, border: '2px solid #444', cursor: 'pointer', padding: 0, background: 'linear-gradient(135deg,#f00,#ff7f00,#ff0,#0f0,#00f,#8b00ff)' }} />
        </div>
      </Field>
      <div>
        <div className="flex gap-2 mt-1">
          <StyleBtn label="B" bold active={el.bold} onClick={() => save({ bold: !el.bold })} />
          <StyleBtn label="I" italic active={el.italic} onClick={() => save({ italic: !el.italic })} />
          <StyleBtn label="U" underline active={el.underline} onClick={() => save({ underline: !el.underline })} />
        </div>
      </div>
      <Field label="Text Align">
        <div className="flex gap-2 mt-0.5">
          {['left', 'center', 'right'].map((a) => (
            <button
              key={a}
              onClick={() => save({ textAlign: a })}
              className={`flex-1 py-1.5 text-xs rounded transition-colors ${el.textAlign === a ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
            >
              {a === 'left' ? '⬅' : a === 'center' ? '☰' : '➡'}
            </button>
          ))}
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

function StyleBtn({ label, active, onClick, bold, italic, underline }) {
  return (
    <button
      onClick={onClick}
      style={{ fontWeight: bold ? 'bold' : 'normal', fontStyle: italic ? 'italic' : 'normal', textDecoration: underline ? 'underline' : 'none' }}
      className={`flex-1 py-1.5 text-sm rounded transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
    >
      {label}
    </button>
  )
}

function ShadowInputs({ prefix, el, save, spread }) {
  return (
    <div className={`grid gap-1 mt-0.5`} style={{ gridTemplateColumns: spread ? 'repeat(5,1fr)' : 'repeat(4,1fr)' }}>
      <div>
        <input type="number" value={el[`${prefix}X`] || 0} min={-100} max={100} onChange={(e) => save({ [`${prefix}X`]: Number(e.target.value) })}
          className="w-full bg-gray-800 rounded px-1 py-1 text-xs text-gray-100" placeholder="X" />
        <label className="text-xs text-gray-500">X</label>
      </div>
      <div>
        <input type="number" value={el[`${prefix}Y`] || 0} min={-100} max={100} onChange={(e) => save({ [`${prefix}Y`]: Number(e.target.value) })}
          className="w-full bg-gray-800 rounded px-1 py-1 text-xs text-gray-100" placeholder="Y" />
        <label className="text-xs text-gray-500">Y</label>
      </div>
      <div>
        <input type="number" value={el[`${prefix}Blur`] || 0} min={0} max={100} onChange={(e) => save({ [`${prefix}Blur`]: Number(e.target.value) })}
          className="w-full bg-gray-800 rounded px-1 py-1 text-xs text-gray-100" placeholder="Blur" />
        <label className="text-xs text-gray-500">Blur</label>
      </div>
      {spread && (
        <div>
          <input type="number" value={el[`${prefix}Spread`] || 0} min={-50} max={50} onChange={(e) => save({ [`${prefix}Spread`]: Number(e.target.value) })}
            className="w-full bg-gray-800 rounded px-1 py-1 text-xs text-gray-100" placeholder="Spread" />
          <label className="text-xs text-gray-500">Spread</label>
        </div>
      )}
      <div>
        <input type="color" value={el[`${prefix}Color`] || (spread ? '#ffffff' : '#000000')} onChange={(e) => save({ [`${prefix}Color`]: e.target.value })}
          className="w-full h-7 bg-gray-800 rounded" />
        <label className="text-xs text-gray-500">Color</label>
      </div>
    </div>
  )
}
