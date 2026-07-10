import React from 'react'
import { Field, TextInput, SelectInput } from '../left/PropertiesSection.jsx'

// Matches Timeline.jsx's layerLabel so an element reads the same name here as it does
// in the layer list (including any name the user set there via double-click rename) —
// a bare "Rectangle (a1b2c)" id suffix wasn't enough to tell which shape was which.
function layerLabel(el) {
  if (el.name) return el.name
  if (el.type === 'text') return el.text?.slice(0, 20) || 'Text'
  if (el.type === 'shape') return el.shapeType === 'circle' ? 'Circle' : 'Rectangle'
  return el.type.charAt(0).toUpperCase() + el.type.slice(1)
}

export default function InvisibleProperties({ el, update, save, elements = [] }) {
  const trackingType = el.trackingType || 'standard'
  const isHoverEffect = trackingType === 'none'
  // Sorted by zIndex (top of stack first) to match the layer list's own ordering, so the
  // "#N" position shown alongside each name lines up with what the user sees there.
  const byLayerOrder = [...elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
  const shapeEls = byLayerOrder.filter((e) => e.type === 'shape' && e.id !== el.id)
  const textEls = byLayerOrder.filter((e) => e.type === 'text' && e.id !== el.id)

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
          <Field label="Background element">
            <SelectInput value={el.hoverBgId || ''} onChange={(v) => save({ hoverBgId: v || null })}>
              <option value="">None</option>
              {shapeEls.map((e, i) => <option key={e.id} value={e.id}>{layerLabel(e)} (#{i + 1})</option>)}
            </SelectInput>
          </Field>
          <Field label="Text element">
            <SelectInput value={el.hoverTextId || ''} onChange={(v) => save({ hoverTextId: v || null })}>
              <option value="">None</option>
              {textEls.map((e, i) => <option key={e.id} value={e.id}>{layerLabel(e)} (#{i + 1})</option>)}
            </SelectInput>
          </Field>
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs text-gray-300">
              <input type="checkbox" checked={el.swapFillColor !== false} onChange={(e) => save({ swapFillColor: e.target.checked })} />
              Swap fill color
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-300">
              <input type="checkbox" checked={el.swapTextColor !== false} onChange={(e) => save({ swapTextColor: e.target.checked })} />
              Swap text color
            </label>
          </div>
          <p className="text-xs text-gray-500">
            On mouse in, the checked colors swap between the two elements above; on mouse out, they swap back. Position this invisible layer over the elements it targets (e.g. a CTA button). Rename layers in the layer list (double-click the name) to tell them apart here.
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
