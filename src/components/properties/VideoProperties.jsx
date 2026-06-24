import React from 'react'
import { Section, Row, TextInput } from './PropertiesPanel.jsx'

export default function VideoProperties({ el, update, save }) {
  return (
    <Section title="Video">
      <Row label="URL"><TextInput value={el.videoUrl || ''} onChange={(v) => save({ videoUrl: v })} /></Row>
      <Row label="Name"><TextInput value={el.videoName || ''} onChange={(v) => save({ videoName: v })} /></Row>
      <Row label="Trigger">
        <select
          value={el.playTrigger || 'autoplay'}
          onChange={(e) => save({ playTrigger: e.target.value })}
          className="w-full px-1 py-0.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200"
        >
          <option value="autoplay">Autoplay</option>
          <option value="mouseover">Mouseover</option>
          <option value="click">Click</option>
        </select>
      </Row>
      <Row label="Muted">
        <input type="checkbox" checked={!!el.muted} onChange={(e) => save({ muted: e.target.checked })} className="accent-violet-500" />
      </Row>
      <Row label="Controls">
        <input type="checkbox" checked={!!el.controls} onChange={(e) => save({ controls: e.target.checked })} className="accent-violet-500" />
      </Row>
    </Section>
  )
}
