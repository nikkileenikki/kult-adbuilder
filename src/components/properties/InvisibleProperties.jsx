import React from 'react'
import { Field, TextInput, SelectInput } from '../left/PropertiesSection.jsx'

export default function InvisibleProperties({ el, update, save }) {
  return (
    <div className="space-y-2 pb-2 border-b border-gray-700">
      <Field label={<>Tracking Event Name <span className="text-gray-500 text-xs">(myFT.tracker)</span></>}>
        <TextInput value={el.trackingName || ''} placeholder="swipeLeft" onChange={(v) => save({ trackingName: v })} />
      </Field>
      <Field label="Event Type">
        <SelectInput value={el.trackingType || 'standard'} onChange={(v) => save({ trackingType: v })}>
          <option value="standard">Standard (fires once)</option>
          <option value="string">String (repeatable, with data)</option>
        </SelectInput>
      </Field>
      <Field label="Fire On">
        <SelectInput value={el.triggerOn || 'click'} onChange={(v) => save({ triggerOn: v })}>
          <option value="click">Click / Tap</option>
          <option value="hover">Hover</option>
          <option value="swipeLeft">Swipe Left</option>
          <option value="swipeRight">Swipe Right</option>
        </SelectInput>
      </Field>
    </div>
  )
}
