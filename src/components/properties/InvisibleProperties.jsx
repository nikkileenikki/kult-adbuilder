import React from 'react'
import { Field, TextInput, SelectInput } from '../left/PropertiesSection.jsx'

function layerLabel(el) {
  if (el.type === 'text') return el.text?.slice(0, 20) || 'Text'
  if (el.type === 'shape') return el.shapeType === 'circle' ? 'Circle' : 'Rectangle'
  return el.type.charAt(0).toUpperCase() + el.type.slice(1)
}

export default function InvisibleProperties({ el, update, save, elements = [] }) {
  const trackingType = el.trackingType || 'standard'
  const isHoverEffect = trackingType === 'none'
  const shapeEls = elements.filter((e) => e.type === 'shape' && e.id !== el.id)
  const textEls = elements.filter((e) => e.type === 'text' && e.id !== el.id)

  return (
    <div className="space-y-2 pb-2 border-b border-gray-700">
      <Field label="Event Type">
        <SelectInput value={trackingType} onChange={(v) => save({ trackingType: v })}>
          <option value="none">None (mouse in/out effect only)</option>
          <option value="standard">Standard (fires once)</option>
          <option value="string">String (repeatable, with data)</option>
        </SelectInput>
      </Field>

      {isHoverEffect ? (
        <>
          <Field label={<>Background element <span className="text-gray-500 text-xs">(swaps fill color)</span></>}>
            <SelectInput value={el.hoverBgId || ''} onChange={(v) => save({ hoverBgId: v || null })}>
              <option value="">None</option>
              {shapeEls.map((e) => <option key={e.id} value={e.id}>{layerLabel(e)} ({e.id.slice(-5)})</option>)}
            </SelectInput>
          </Field>
          <Field label={<>Text element <span className="text-gray-500 text-xs">(swaps text color)</span></>}>
            <SelectInput value={el.hoverTextId || ''} onChange={(v) => save({ hoverTextId: v || null })}>
              <option value="">None</option>
              {textEls.map((e) => <option key={e.id} value={e.id}>{layerLabel(e)} ({e.id.slice(-5)})</option>)}
            </SelectInput>
          </Field>
          <p className="text-xs text-gray-500">
            On mouse in, the background and text colors swap; on mouse out, they swap back. Position this invisible layer over the elements it targets (e.g. a CTA button).
          </p>
        </>
      ) : (
        <>
          <Field label={<>Tracking Event Name <span className="text-gray-500 text-xs">(myFT.tracker)</span></>}>
            <TextInput value={el.trackingName || ''} placeholder="customEvent" onChange={(v) => save({ trackingName: v })} />
          </Field>
          <Field label="Fire On">
            <SelectInput value={el.triggerOn || 'click'} onChange={(v) => save({ triggerOn: v })}>
              <option value="click">Click / Tap</option>
              <option value="hover">Hover</option>
              <option value="swipeLeft">Swipe Left</option>
              <option value="swipeRight">Swipe Right</option>
            </SelectInput>
          </Field>
        </>
      )}
    </div>
  )
}
