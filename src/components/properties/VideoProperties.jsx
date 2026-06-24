import React from 'react'
import { Field, TextInput, SelectInput } from '../left/PropertiesSection.jsx'

export default function VideoProperties({ el, update, save }) {
  return (
    <div className="space-y-2 pb-2 border-b border-gray-700">
      <Field label="Video URL">
        <TextInput value={el.videoUrl || ''} placeholder="220952/video" onChange={(v) => save({ videoUrl: v })} />
      </Field>
      <Field label="Video Name/ID">
        <TextInput value={el.videoName || ''} placeholder="video1" onChange={(v) => save({ videoName: v })} />
      </Field>
      <Field label="Start Playing When">
        <SelectInput value={el.playTrigger || 'autoplay'} onChange={(v) => save({ playTrigger: v })}>
          <option value="autoplay">Autoplay</option>
          <option value="mouseover">Mouse Over</option>
          <option value="click">Click/Tap</option>
        </SelectInput>
      </Field>
      <div className="flex gap-4">
        <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
          <input type="checkbox" checked={!!el.muted} onChange={(e) => save({ muted: e.target.checked })} className="w-4 h-4" />
          Muted
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
          <input type="checkbox" checked={!!el.controls} onChange={(e) => save({ controls: e.target.checked })} className="w-4 h-4" />
          Controls
        </label>
      </div>
    </div>
  )
}
