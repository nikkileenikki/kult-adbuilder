import React from 'react'
import { Section, Row, NumInput, TextInput, ColorInput } from './PropertiesPanel.jsx'

const FONTS = ['sans-serif', 'serif', 'monospace', 'Arial', 'Helvetica', 'Georgia', 'Verdana', 'Impact']

export default function TextProperties({ el, update, save }) {
  return (
    <Section title="Text">
      <Row label="Font">
        <select
          value={el.fontFamily || 'sans-serif'}
          onChange={(e) => save({ fontFamily: e.target.value })}
          className="w-full px-1 py-0.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200"
        >
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </Row>
      <Row label="Size"><NumInput value={el.fontSize || 16} min={6} max={300} onChange={(v) => save({ fontSize: v })} /></Row>
      <Row label="Color"><ColorInput value={el.color || '#000000'} onChange={(v) => save({ color: v })} /></Row>
      <Row label="Align">
        <div className="flex gap-1">
          {['left', 'center', 'right'].map((a) => (
            <button
              key={a}
              onClick={() => save({ textAlign: a })}
              className={`flex-1 py-0.5 text-xs rounded ${el.textAlign === a ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              {a[0].toUpperCase()}
            </button>
          ))}
        </div>
      </Row>
      <Row label="Style">
        <div className="flex gap-1">
          <StyleBtn label="B" active={el.bold} onClick={() => save({ bold: !el.bold })} style={{ fontWeight: 'bold' }} />
          <StyleBtn label="I" active={el.italic} onClick={() => save({ italic: !el.italic })} style={{ fontStyle: 'italic' }} />
          <StyleBtn label="U" active={el.underline} onClick={() => save({ underline: !el.underline })} style={{ textDecoration: 'underline' }} />
        </div>
      </Row>
    </Section>
  )
}

function StyleBtn({ label, active, onClick, style }) {
  return (
    <button
      onClick={onClick}
      style={style}
      className={`flex-1 py-0.5 text-xs rounded ${active ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300'}`}
    >
      {label}
    </button>
  )
}
