import React from 'react'
import { Field, NumInput } from '../left/PropertiesSection.jsx'

export default function ImageProperties({ el, update, save }) {
  return (
    <div className="space-y-2 pb-2 border-b border-gray-700">
      <Field label="Border Radius">
        <NumInput value={el.borderRadius || 0} min={0} max={200} onChange={(v) => save({ borderRadius: v })} />
      </Field>
    </div>
  )
}
