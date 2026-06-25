import React from 'react'
import { Field, NumInput } from '../left/PropertiesSection.jsx'

export default function ImageProperties({ el, update, save }) {
  const locked = !!el.lockAspectRatio

  return (
    <div className="space-y-2 pb-2 border-b border-gray-700">
      <Field label="Border Radius">
        <NumInput value={el.borderRadius || 0} min={0} max={200} onChange={(v) => save({ borderRadius: v })} />
      </Field>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Lock Aspect Ratio</span>
        <button
          onClick={() => save({ lockAspectRatio: !locked })}
          title={locked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${locked ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
        >
          <i className={`fa-solid ${locked ? 'fa-lock' : 'fa-lock-open'}`} style={{ fontSize: 11 }} />
          {locked ? 'Locked' : 'Unlocked'}
        </button>
      </div>
    </div>
  )
}
