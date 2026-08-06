import React from 'react'
import { Field, TextInput, SelectInput, NumInput } from '../left/PropertiesSection.jsx'
import { useCanvasStore } from '../../store/canvasStore.js'
import { layerLabel } from '../../utils/layerLabel.js'

let nextActionId = Date.now()

// A target can be a single element id, or "group:<id>" to apply the effect to every
// element in that timeline group at once — resolved into concrete elements at export
// time (see buildHoverEffectJS in exportBanner.js).
function GroupOptions({ groups }) {
  if (!groups.length) return null
  return (
    <optgroup label="Groups">
      {groups.map((g) => <option key={g.id} value={`group:${g.id}`}>{g.name}</option>)}
    </optgroup>
  )
}

export default function InvisibleProperties({ el, update, save, elements = [] }) {
  const { groups } = useCanvasStore()
  const trackingType = el.trackingType || 'standard'
  const isHoverEffect = trackingType === 'none'
  // Sorted by zIndex (top of stack first) to match the layer list's own ordering, so the
  // "#N" position shown alongside each name lines up with what the user sees there.
  const byLayerOrder = [...elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
  const shapeEls = byLayerOrder.filter((e) => e.type === 'shape' && e.id !== el.id)
  const textEls = byLayerOrder.filter((e) => e.type === 'text' && e.id !== el.id)
  const allEls = byLayerOrder.filter((e) => e.id !== el.id)

  const addAction = () => {
    const action = { id: `action_${nextActionId++}`, type: 'jumpToTime', time: 0, targetId: '', visibility: 'show' }
    save({ actions: [...(el.actions || []), action] })
  }
  const updateAction = (id, patch) => {
    save({ actions: (el.actions || []).map((a) => a.id === id ? { ...a, ...patch } : a) })
  }
  const removeAction = (id) => {
    save({ actions: (el.actions || []).filter((a) => a.id !== id) })
  }

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
                <GroupOptions groups={groups} />
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
                <GroupOptions groups={groups} />
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
                <GroupOptions groups={groups} />
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

          <div className="pt-2 border-t border-gray-700 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-300">Actions</p>
              <button onClick={addAction} className="text-xs text-purple-400 hover:text-purple-300">+ Add Action</button>
            </div>
            <p className="text-xs text-gray-500">
              Runs on the same "Fire On" trigger above, alongside the tracking event.
            </p>
            {(el.actions || []).map((action) => (
              <div key={action.id} className="space-y-1.5 bg-gray-800/50 rounded p-2">
                <div className="flex items-center gap-1.5">
                  <SelectInput value={action.type} onChange={(v) => updateAction(action.id, { type: v })}>
                    <option value="jumpToTime">Jump to X seconds of timeline</option>
                    <option value="restart">Restart timeline (jump to 0s)</option>
                    <option value="resume">Resume timeline (from stopping point)</option>
                    <option value="toggleElement">Show/hide element</option>
                  </SelectInput>
                  <button onClick={() => removeAction(action.id)} className="ml-auto text-gray-500 hover:text-red-400 shrink-0">
                    <i className="fa-solid fa-trash" style={{ fontSize: 12 }} />
                  </button>
                </div>

                {action.type === 'jumpToTime' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400 shrink-0">Jump to</span>
                    <NumInput value={action.time || 0} min={0} onChange={(v) => updateAction(action.id, { time: v })} />
                    <span className="text-xs text-gray-400 shrink-0">sec</span>
                  </div>
                )}

                {action.type === 'toggleElement' && (
                  <>
                    <SelectInput value={action.targetId || ''} onChange={(v) => updateAction(action.id, { targetId: v })}>
                      <option value="">Target element…</option>
                      {allEls.map((e, i) => <option key={e.id} value={e.id}>{layerLabel(e)} (#{i + 1})</option>)}
                      <GroupOptions groups={groups} />
                    </SelectInput>
                    <SelectInput value={action.visibility || 'show'} onChange={(v) => updateAction(action.id, { visibility: v })}>
                      <option value="show">Show</option>
                      <option value="hide">Hide</option>
                      <option value="toggle">Toggle</option>
                    </SelectInput>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
