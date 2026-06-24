import React from 'react'
import { Section, Row, NumInput } from './PropertiesPanel.jsx'

export default function ImageProperties({ el, update, save }) {
  return (
    <Section title="Image">
      <Row label="Radius"><NumInput value={el.borderRadius || 0} min={0} onChange={(v) => save({ borderRadius: v })} /></Row>
    </Section>
  )
}
