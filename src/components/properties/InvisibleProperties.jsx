import React from 'react'
import { Field, TextInput, SelectInput, NumInput } from '../left/PropertiesSection.jsx'

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
  const allEls = byLayerOrder.filter((e) => e.id !== el.id)

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
          <p className="text-xs text-gray-500 -mt-1">
            Position this invisible layer over the element(s) it targets (e.g. a CTA button). Rename layers in the layer list (double-click the name) to tell them apart below.
          </p>

          <div className="space-y-1.5 pt-1 border-t border-gray-700">
            <p className="text-xs font-semibold text-gray-300">Hover color</p>
            <Field label="Background element">
              <SelectInput value={el.hoverBgId || ''} onChange={(v) => save({ hoverBgId: v || null })}>
                <option value="">None</option>
                {shapeEls.map((e, i) => <option key={e.id} value={e.id}>{layerLabel(e)} (#{i + 1})</option>)}
              </SelectInput>
            </Field>
            {el.hoverBgId && (
              <Field label="Background color on hover">
                <input
                  type="color"
                  value={el.hoverBgColor || '#ffffff'}
                  onChange={(e) => save({ hoverBgColor: e.target.value })}
                  className="w-full h-8 bg-gray-800 rounded border border-gray-700 cursor-pointer"
                />
              </Field>
            )}
            <Field label="Text element">
              <SelectInput value={el.hoverTextId || ''} onChange={(v) => save({ hoverTextId: v || null })}>
                <option value="">None</option>
                {textEls.map((e, i) => <option key={e.id} value={e.id}>{layerLabel(e)} (#{i + 1})</option>)}
              </SelectInput>
            </Field>
            {el.hoverTextId && (
              <Field label="Text color on hover">
                <input
                  type="color"
                  value={el.hoverTextColor || '#000000'}
                  onChange={(e) => save({ hoverTextColor: e.target.value })}
                  className="w-full h-8 bg-gray-800 rounded border border-gray-700 cursor-pointer"
                />
              </Field>
            )}
          </div>

          <div className="space-y-1.5 pt-1 border-t border-gray-700">
            <p className="text-xs font-semibold text-gray-300">Hover scale</p>
            <Field label="Element to scale">
              <SelectInput value={el.hoverScaleId || ''} onChange={(v) => save({ hoverScaleId: v || null })}>
                <option value="">None</option>
                {allEls.map((e, i) => <option key={e.id} value={e.id}>{layerLabel(e)} (#{i + 1})</option>)}
              </SelectInput>
            </Field>
            {el.hoverScaleId && (
              <Field label="Scale factor">
                <NumInput value={el.hoverScaleFactor || 1.1} min={0.5} max={3} onChange={(v) => save({ hoverScaleFactor: v })} />
              </Field>
            )}
          </div>

          <p className="text-xs text-gray-500">
            On mouse in, the chosen colors/scale apply; on mouse out, everything reverts to its original color and size.
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
