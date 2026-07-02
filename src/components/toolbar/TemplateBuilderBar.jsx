import React, { useState } from 'react'
import { useUiStore } from '../../store/uiStore.js'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useAuthStore } from '../../store/authStore.js'

export default function TemplateBuilderBar() {
  const { templateBuilder, setTemplateBuilder } = useUiStore()
  const { elements, canvasWidth, canvasHeight } = useCanvasStore()
  const { token } = useAuthStore()

  const [name, setName] = useState(templateBuilder?.name || '')
  const category = templateBuilder?.category || 'custom'
  const [customHtml, setCustomHtml] = useState(templateBuilder?.customHtml || '')
  const [customJs, setCustomJs] = useState(templateBuilder?.customJs || '')
  const [customCss, setCustomCss] = useState(templateBuilder?.customCss || '')
  const [customManifest, setCustomManifest] = useState(templateBuilder?.customManifest || '')
  const [showCode, setShowCode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  if (!templateBuilder) return null

  const restore = () => {
    useCanvasStore.setState(templateBuilder.snapshot)
  }

  const handleCancel = () => {
    restore()
    setTemplateBuilder(null)
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('Template name is required'); return }
    const sizeKey = `${canvasWidth}x${canvasHeight}`
    if (!templateBuilder.sizeId && (templateBuilder.siblingSizes || []).includes(sizeKey)) {
      setError(`This template already has a ${sizeKey} size — change the canvas size or edit that size instead.`)
      return
    }
    let cleanManifest = customManifest.trim()
    if (cleanManifest) {
      // Accept either bare JSON or a pasted `FT.manifest({...});` statement.
      const wrapped = cleanManifest.match(/^FT\.manifest\(\s*([\s\S]*?)\s*\)\s*;?\s*$/)
      if (wrapped) cleanManifest = wrapped[1]
      try { JSON.parse(cleanManifest) } catch { setError('Custom Manifest must be valid JSON'); return }
    }
    setSaving(true)
    setError(null)
    try {
      const { sizeId, templateId } = templateBuilder
      const qs = sizeId ? `?sizeId=${sizeId}` : (templateId ? `?templateId=${templateId}` : '')
      // Auto-detect {{tokenName}} / {{type.tokenName}} placeholders in the custom code so
      // the ad builder can show typed fill-in inputs (image/video/text) for them.
      const tokenMatches = `${customHtml} ${customJs} ${customCss} ${cleanManifest}`.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)
      const tokenKeys = [...new Set([...tokenMatches].map((m) => m[1]))]
      const variables = tokenKeys.map((key) => {
        const dot = key.indexOf('.')
        if (dot > 0) {
          const type = key.slice(0, dot)
          const label = key.slice(dot + 1)
          if (type === 'image' || type === 'video' || type === 'text') return { key, type, label }
        }
        return { key, type: 'text', label: key }
      })
      const res = await fetch(`/api/templates${qs}`, {
        method: sizeId ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, width: canvasWidth, height: canvasHeight, elements, variables, customHtml, customJs, customCss, customManifest: cleanManifest }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save template')
      restore()
      setTemplateBuilder(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-purple-900/40 border-b border-purple-700 shrink-0">
      <div className="px-3 py-2 flex items-center gap-2">
        <i className="fa-solid fa-table-columns text-purple-300" style={{ fontSize: 13 }} />
        <span className="text-purple-200 text-xs font-medium shrink-0">
          {templateBuilder.sizeId
            ? `Editing ${canvasWidth}×${canvasHeight}${templateBuilder.name ? ` — ${templateBuilder.name}` : ''}`
            : templateBuilder.templateId ? 'Adding Size' : 'New Template'}
        </span>
        {(templateBuilder.siblingSizes || []).length > 0 && (
          <span className="text-purple-300/70 text-xs shrink-0">
            Other sizes: {templateBuilder.siblingSizes.join(', ')}
          </span>
        )}

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template name"
          className="bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none w-44"
        />
        <button
          onClick={() => setShowCode((v) => !v)}
          title="Use raw HTML/CSS/JS for bespoke effects the drag-and-drop elements can't do"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-colors ${
            showCode ? 'bg-purple-700 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-purple-500'
          }`}
        >
          <i className="fa-solid fa-code" style={{ fontSize: 11 }} /> Custom Code
        </button>

        {error && <span className="text-red-400 text-xs">{error}</span>}

        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleCancel} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-xs">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium"
          >
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>

      {showCode && (
        <div className="px-3 pb-3 space-y-2">
          {customHtml.trim() && (
            <p className="text-xs text-yellow-300 bg-yellow-900/30 border border-yellow-800 rounded px-2 py-1.5">
              Custom HTML is set — this template will render entirely from your HTML/JS/CSS instead of the drag-and-drop elements on the canvas.
            </p>
          )}
          <p className="text-xs text-gray-500 px-1">
            Use <code className="text-purple-300">{'{{image.name}}'}</code>, <code className="text-purple-300">{'{{video.name}}'}</code>, or <code className="text-purple-300">{'{{text.name}}'}</code> in the code below for typed fill-in inputs (image upload, video picker, text field) — plain <code className="text-purple-300">{'{{name}}'}</code> defaults to text.
          </p>
          <div>
            <label className="text-xs text-purple-200 block mb-1">Custom HTML <span className="text-gray-400">(replaces the element-based rendering entirely — paste a full bespoke banner's body markup)</span></label>
            <textarea
              value={customHtml}
              onChange={(e) => setCustomHtml(e.target.value)}
              rows={6}
              placeholder="<div id=&quot;banner&quot;>...</div>"
              spellCheck={false}
              className="w-full bg-gray-900 text-gray-100 rounded px-2 py-1.5 text-xs font-mono border border-gray-700 focus:border-purple-500 focus:outline-none resize-y"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-purple-200 block mb-1">Custom JS <span className="text-gray-400">(runs standalone — define your own init/onload, jQuery + GSAP + myFT are available)</span></label>
              <textarea
                value={customJs}
                onChange={(e) => setCustomJs(e.target.value)}
                rows={6}
                placeholder="function init() { ... } window.onload = init;"
                spellCheck={false}
                className="w-full bg-gray-900 text-gray-100 rounded px-2 py-1.5 text-xs font-mono border border-gray-700 focus:border-purple-500 focus:outline-none resize-y"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-purple-200 block mb-1">Custom CSS <span className="text-gray-400">(injected into the exported banner's stylesheet)</span></label>
              <textarea
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                rows={6}
                placeholder="/* full styles for your custom markup */"
                spellCheck={false}
                className="w-full bg-gray-900 text-gray-100 rounded px-2 py-1.5 text-xs font-mono border border-gray-700 focus:border-purple-500 focus:outline-none resize-y"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-purple-200 block mb-1">Custom Manifest <span className="text-gray-400">(JSON object merged into manifest.js's FT.manifest({'{'}...{'}'}) — overrides auto-generated fields like videos/trackingEvents if you set them here)</span></label>
            <textarea
              value={customManifest}
              onChange={(e) => setCustomManifest(e.target.value)}
              rows={4}
              placeholder='{"hideBrowsers": ["ie8", "ie9"], "clickTagCount": 2}'
              spellCheck={false}
              className="w-full bg-gray-900 text-gray-100 rounded px-2 py-1.5 text-xs font-mono border border-gray-700 focus:border-purple-500 focus:outline-none resize-y"
            />
          </div>
        </div>
      )}
    </div>
  )
}
