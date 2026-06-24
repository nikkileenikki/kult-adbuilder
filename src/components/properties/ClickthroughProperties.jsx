import React from 'react'
import { Field, NumInput, TextInput, SelectInput } from '../left/PropertiesSection.jsx'

export default function ClickthroughProperties({ el, update, save }) {
  return (
    <div className="space-y-2 pb-2 border-b border-gray-700">
      <Field label="Click URL">
        <TextInput value={el.url || ''} placeholder="https://kult.my" onChange={(v) => save({ url: v })} />
      </Field>
      <Field label={<>Click Index <span className="text-gray-500 text-xs">(myFT.clickTag)</span></>}>
        <NumInput value={el.clickIndex || 1} min={1} max={10} onChange={(v) => save({ clickIndex: v })} />
      </Field>
      <Field label="Target">
        <SelectInput value={el.target || '_blank'} onChange={(v) => save({ target: v })}>
          <option value="_blank">New Window (_blank)</option>
          <option value="_self">Same Window (_self)</option>
          <option value="_parent">Parent Frame (_parent)</option>
          <option value="_top">Top Frame (_top)</option>
        </SelectInput>
      </Field>
    </div>
  )
}
