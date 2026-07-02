import React, { useRef, useState } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'

export default function TemplatePanel() {
  const { activeTemplate, elements, selectedId, setSelected, updateElement, setActiveTemplate } = useCanvasStore()
  const { saveState } = useHistoryStore()

  if (!activeTemplate) return null

  const getEl = (varKey) => elements.find((el) => el.templateVar === varKey)

  const handleImageUpload = (varKey, file) => {
    const el = getEl(varKey)
    if (!el || !file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      saveState()
      updateElement(el.id, { src: e.target.result, filename: file.name })
    }
    reader.readAsDataURL(file)
  }

  const handleTextChange = (varKey, text) => {
    const el = getEl(varKey)
    if (el) updateElement(el.id, { text })
  }

  const handleUrlChange = (varKey, url) => {
    const el = getEl(varKey)
    if (el) updateElement(el.id, { url })
  }

  const handleVideoUrlChange = (varKey, videoUrl) => {
    const el = getEl(varKey)
    if (el) updateElement(el.id, { videoUrl })
  }

  const vars = (activeTemplate.variables || []).filter((v) => v.type !== 'repeater' && v.type !== 'number')
  const tokenVars = activeTemplate.tokenVariables || []

  const handleTokenChange = (tokenName, value) => {
    setActiveTemplate({
      ...activeTemplate,
      tokenValues: { ...(activeTemplate.tokenValues || {}), [tokenName]: value },
    })
  }

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <i className="fa-solid fa-table-columns text-blue-400" style={{ fontSize: 14 }} />
          {activeTemplate.name}
        </h2>
        <button
          onClick={() => setActiveTemplate(null)}
          title="Exit template"
          className="text-gray-500 hover:text-red-400 transition-colors text-xs"
        >
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      {vars.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-2 space-y-1">
          {vars.map((v) => {
            const el = getEl(v.key)
            const isSelected = el && selectedId === el.id
            return (
              <VarRow
                key={v.key}
                v={v}
                el={el}
                isSelected={isSelected}
                onSelect={() => el && setSelected(el.id)}
                onImageUpload={(file) => handleImageUpload(v.key, file)}
                onTextChange={(text) => handleTextChange(v.key, text)}
                onUrlChange={(url) => handleUrlChange(v.key, url)}
                onVideoUrlChange={(url) => handleVideoUrlChange(v.key, url)}
              />
            )
          })}
        </div>
      )}

      {tokenVars.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-2 space-y-2 mt-2">
          <p className="text-xs text-gray-500 px-1">
            Custom code variables — used in this template's raw HTML/JS/CSS, applied on export.
          </p>
          {tokenVars.map((tokenName) => (
            <div key={tokenName} className="px-1">
              <label className="text-xs text-gray-400 font-medium block mb-1">{`{{${tokenName}}}`}</label>
              <input
                type="text"
                value={activeTemplate.tokenValues?.[tokenName] || ''}
                onChange={(e) => handleTokenChange(tokenName, e.target.value)}
                placeholder="Value…"
                className="w-full bg-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VarRow({ v, el, isSelected, onSelect, onImageUpload, onTextChange, onUrlChange, onVideoUrlChange }) {
  const fileRef = useRef(null)

  return (
    <div
      onClick={onSelect}
      className={`rounded-lg p-2 cursor-pointer border transition-colors ${
        isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700/50 hover:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1.5" onClick={(e) => e.stopPropagation()}>
        <VarIcon type={v.type} />
        <span className="text-xs text-gray-400 font-medium">{v.label}</span>
        {v.required && <span className="text-red-400 text-xs ml-auto">*</span>}
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        {(v.type === 'image') && (
          <ImageDropzone el={el} fileRef={fileRef} onImageUpload={onImageUpload} />
        )}

        {(v.type === 'text') && (
          <input
            type="text"
            value={el?.text || ''}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Enter text…"
            className="w-full bg-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}

        {(v.type === 'url' || v.type === 'landing_url') && (
          <input
            type="url"
            value={el?.url || ''}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://…"
            className="w-full bg-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}

        {v.type === 'video' && (
          <input
            type="url"
            value={el?.videoUrl || ''}
            onChange={(e) => onVideoUrlChange(e.target.value)}
            placeholder="Video URL…"
            className="w-full bg-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}
      </div>
    </div>
  )
}

function ImageDropzone({ el, fileRef, onImageUpload }) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) onImageUpload(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      className={`flex items-center gap-2 rounded border cursor-pointer transition-colors ${
        dragging
          ? 'border-blue-400 bg-blue-500/20'
          : 'border-dashed border-gray-600 hover:border-gray-400 hover:bg-gray-700/40'
      } px-2 py-1.5`}
    >
      {el?.src ? (
        <img src={el.src} alt="" className="w-10 h-8 object-cover rounded border border-gray-700 shrink-0" />
      ) : (
        <i className="fa-solid fa-image text-gray-600 shrink-0" style={{ fontSize: 18, width: 40, textAlign: 'center' }} />
      )}
      <span className="text-xs text-gray-400 truncate">
        {el?.filename || (dragging ? 'Drop here' : 'Upload or drop image…')}
      </span>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageUpload(f); e.target.value = '' }} />
    </div>
  )
}

function VarIcon({ type }) {
  const icons = {
    image: 'fa-image',
    text: 'fa-t',
    video: 'fa-film',
    url: 'fa-link',
    landing_url: 'fa-link',
  }
  const icon = icons[type] || 'fa-circle-dot'
  return <i className={`fa-solid ${icon} text-gray-500 shrink-0`} style={{ fontSize: 11 }} />
}
