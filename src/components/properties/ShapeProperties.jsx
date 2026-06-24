import React from 'react'
import { Section, Row, NumInput, ColorInput } from './PropertiesPanel.jsx'

export default function ShapeProperties({ el, update, save }) {
  return (
    <Section title="Shape">
      <Row label="Fill"><ColorInput value={el.fillColor || '#888888'} onChange={(v) => save({ fillColor: v })} /></Row>
      <Row label="Radius"><NumInput value={el.borderRadius || 0} min={0} onChange={(v) => save({ borderRadius: v })} /></Row>
      <Row label="Border">
        <div className="flex gap-1 items-center">
          <NumInput value={el.borderWidth || 0} min={0} onChange={(v) => save({ borderWidth: v })} />
          <ColorInput value={el.borderColor || '#000000'} onChange={(v) => save({ borderColor: v })} />
        </div>
      </Row>
      <Row label="Shadow">
        <input type="checkbox" checked={!!el.shadow} onChange={(e) => save({ shadow: e.target.checked })} className="accent-violet-500" />
      </Row>
    </Section>
  )
}
