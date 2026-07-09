import React, { useState } from 'react'
import { Field, NumInput } from '../left/PropertiesSection.jsx'
import AiImageModal from '../modals/AiImageModal.jsx'

export default function ImageProperties({ el, update, save }) {
  const [showAiImage, setShowAiImage] = useState(false)

  return (
    <div className="space-y-2 pb-2 border-b border-gray-700">
      <button
        onClick={() => setShowAiImage(true)}
        className="w-full flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
      >
        <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 12 }} /> Generate with AI
      </button>
      <Field label="Border Radius">
        <NumInput value={el.borderRadius || 0} min={0} max={200} onChange={(v) => save({ borderRadius: v })} />
      </Field>

      {showAiImage && (
        <AiImageModal
          onClose={() => setShowAiImage(false)}
          targetWidth={el.width}
          targetHeight={el.height}
          onGenerated={({ src, width, height }) => save({ src, filename: 'ai-image.png', width, height })}
        />
      )}
    </div>
  )
}
