import React from 'react'
import { Section, Row, NumInput, TextInput } from './PropertiesPanel.jsx'

export default function ClickthroughProperties({ el, update, save }) {
  return (
    <Section title="Clickthrough">
      <Row label="URL"><TextInput value={el.url || ''} onChange={(v) => save({ url: v })} /></Row>
      <Row label="Index"><NumInput value={el.clickIndex || 1} min={1} onChange={(v) => save({ clickIndex: v })} /></Row>
      <Row label="Target">
        <select
          value={el.target || '_blank'}
          onChange={(e) => save({ target: e.target.value })}
          className="w-full px-1 py-0.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200"
        >
          <option value="_blank">_blank</option>
          <option value="_self">_self</option>
          <option value="_top">_top</option>
        </select>
      </Row>
    </Section>
  )
}
