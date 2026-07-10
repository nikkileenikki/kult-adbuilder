import React, { useState, useRef, useEffect } from 'react'
import { useUiStore } from '../../store/uiStore.js'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useAuthStore } from '../../store/authStore.js'
import { exportBannerZip, saveBannerJSON, loadBannerJSON } from '../../utils/exportBanner.js'
import FlashTalkingModal from '../modals/FlashTalkingModal.jsx'
import LibraryPickerModal from '../modals/LibraryPickerModal.jsx'
import VideoAssetsModal from '../modals/VideoAssetsModal.jsx'
import PreviewModal from '../modals/PreviewModal.jsx'

const PRESET_SIZES = [
  { value: '300x250', label: '300×250', w: 300, h: 250 },
  { value: '300x600', label: '300×600', w: 300, h: 600 },
  { value: '320x480', label: '320×480', w: 320, h: 480 },
  { value: '800x600', label: '800×600', w: 800, h: 600 },
  { value: '970x250', label: '970×250', w: 970, h: 250 },
  { value: '320x50',  label: '320×50',  w: 320, h: 50 },
  { value: 'custom',  label: 'Custom',  w: null, h: null },
]

export default function Toolbar() {
  const { elements, groups, canvasWidth, canvasHeight, setCanvasSize, animDuration, animLoop, setAnimDuration, setAnimLoop, activeTemplate } = useCanvasStore()
  const { saveState, undo, redo } = useHistoryStore()
  const { openModal, canvasZoom: zoom, setCanvasZoom: setZoom, ftLibrary, activeBrandId, setActiveBrandId, brandListVersion } = useUiStore()
  const { token } = useAuthStore()

  const [bannerName, setBannerName] = useState(() => localStorage.getItem('kult-adbuilder-bannerName') || 'ad-banner')
  const [sizeValue, setSizeValue] = useState('300x250')
  const [customW, setCustomW] = useState(300)
  const [customH, setCustomH] = useState(250)
  const [menuOpen, setMenuOpen] = useState(false)
  const [politeLoad, setPoliteLoad] = useState(() => {
    const stored = localStorage.getItem('kult-adbuilder-politeLoad')
    return stored === null ? true : stored === 'true'
  })

  useEffect(() => {
    localStorage.setItem('kult-adbuilder-bannerName', bannerName)
  }, [bannerName])

  useEffect(() => {
    localStorage.setItem('kult-adbuilder-politeLoad', String(politeLoad))
  }, [politeLoad])

  // canvasWidth/canvasHeight are persisted (IndexedDB) and hydrate asynchronously after
  // mount, so sizeValue's '300x250' initial default was stale until the user touched the
  // dropdown themselves — e.g. a 970x250 session showed "300x250" in the selector after a
  // refresh even though the canvas itself was the right size. Keep the dropdown in sync
  // whenever the actual canvas size changes, from hydration or anywhere else.
  useEffect(() => {
    const preset = PRESET_SIZES.find((p) => p.w === canvasWidth && p.h === canvasHeight)
    if (preset) {
      setSizeValue(preset.value)
    } else {
      setSizeValue('custom')
      setCustomW(canvasWidth)
      setCustomH(canvasHeight)
    }
  }, [canvasWidth, canvasHeight])
  const [showPublish, setShowPublish] = useState(false)
  const [showLibraryPicker, setShowLibraryPicker] = useState(false)
  const [showVideoAssets, setShowVideoAssets] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [brands, setBrands] = useState([])

  useEffect(() => {
    fetch('/api/brand-guide', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setBrands(data.brands || []))
      .catch(() => {})
  }, [token, brandListVersion])
  const menuRef = useRef(null)
  const loadInputRef = useRef(null)

  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const fitZoom = (w, h) => {
    const vp = document.getElementById('canvas-viewport')
    if (!vp) return
    const { clientWidth, clientHeight } = vp
    const padding = 80 // 40px each side (p-10)
    const scale = Math.min((clientWidth - padding) / w, (clientHeight - padding) / h)
    setZoom(Math.max(25, Math.min(200, Math.round(scale * 100 / 5) * 5)))
  }

  const onSizeChange = (e) => {
    const val = e.target.value
    setSizeValue(val)
    const preset = PRESET_SIZES.find((p) => p.value === val)
    if (preset && preset.w) {
      setCanvasSize(preset.w, preset.h)
      // defer until after the canvas re-renders with the new size
      requestAnimationFrame(() => fitZoom(preset.w, preset.h))
    }
  }

  const applyCustom = () => {
    setCanvasSize(customW, customH)
    requestAnimationFrame(() => fitZoom(customW, customH))
  }

  const clearAll = () => {
    if (!elements.length) return
    if (!confirm('Clear all elements?')) return
    saveState()
    useCanvasStore.setState({ elements: [], selectedId: null })
  }

  const resetCanvas = () => {
    if (!confirm('Reset canvas? This clears all elements, canvas size, and banner settings — cannot be undone.')) return
    saveState()
    useCanvasStore.setState({
      elements: [], groups: [], selectedId: null,
      canvasWidth: 300, canvasHeight: 250,
      animDuration: 5, animLoop: 1,
      activeTemplate: null,
    })
    setBannerName('ad-banner')
    setSizeValue('300x250')
    setZoom(100)
  }

  const handleExportZip = async () => {
    setMenuOpen(false)
    await exportBannerZip({ elements, groups, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate })
  }

  const handleSave = () => {
    setMenuOpen(false)
    saveBannerJSON({ elements, groups, canvasWidth, canvasHeight, bannerName, animDuration, animLoop, activeTemplate })
  }

  const handleLoad = () => {
    setMenuOpen(false)
    loadInputRef.current?.click()
  }

  const handleLoadFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    loadBannerJSON(file, (err, data) => {
      if (err) { alert('Failed to load banner file'); return }
      saveState()
      const w = data.canvasWidth
      const h = data.canvasHeight
      if (w && h) {
        setCanvasSize(w, h)
        const match = PRESET_SIZES.find((p) => p.w === w && p.h === h)
        setSizeValue(match ? match.value : 'custom')
        if (!match) { setCustomW(w); setCustomH(h) }
        requestAnimationFrame(() => fitZoom(w, h))
      }
      if (data.bannerName) setBannerName(data.bannerName)
      if (data.animDuration) setAnimDuration(data.animDuration)
      if (data.animLoop) setAnimLoop(data.animLoop)
      if (data.elements) useCanvasStore.setState({ elements: data.elements, selectedId: null })
      useCanvasStore.setState({ groups: data.groups || [], activeTemplate: data.template || null })
    })
    e.target.value = ''
  }

  return (
    <div className="bg-gray-900 border-b border-gray-700 px-3 py-2 flex items-center gap-2 shrink-0">

      {/* Banner name */}
      <input
        type="text" value={bannerName} onChange={(e) => setBannerName(e.target.value.replace(/ /g, '-'))}
        title="Banner name"
        placeholder="Banner name"
        className="bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none w-32"
      />

      <div className="w-px h-5 bg-gray-700 shrink-0" />

      {/* Canvas size */}
      <div className="flex items-center gap-1.5">
        <select value={sizeValue} onChange={onSizeChange}
          className="bg-gray-800 rounded px-2 py-1 text-sm text-white border border-gray-700 focus:border-blue-500 focus:outline-none">
          {PRESET_SIZES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {sizeValue === 'custom' && (
          <>
            <input type="number" value={customW} onChange={(e) => setCustomW(Number(e.target.value))}
              className="bg-gray-800 rounded px-2 py-1 text-sm w-16 text-white border border-gray-700" placeholder="W" />
            <span className="text-gray-500 text-xs">×</span>
            <input type="number" value={customH} onChange={(e) => setCustomH(Number(e.target.value))}
              className="bg-gray-800 rounded px-2 py-1 text-sm w-16 text-white border border-gray-700" placeholder="H" />
            <button onClick={applyCustom} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs">Apply</button>
          </>
        )}
      </div>

      <div className="w-px h-5 bg-gray-700 shrink-0" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <button onClick={() => setZoom(zoom - 25)} title="Zoom out"
          className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700">
          <i className="fa-solid fa-minus" style={{ fontSize: 10 }} />
        </button>
        <ZoomInput zoom={zoom} setZoom={setZoom} />
        <button onClick={() => setZoom(zoom + 25)} title="Zoom in"
          className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700">
          <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />
        </button>
        <button onClick={() => fitZoom(canvasWidth, canvasHeight)} title="Fit canvas to screen"
          className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 rounded border border-gray-700">
          <i className="fa-solid fa-compress" style={{ fontSize: 11 }} />
        </button>

        <div className="w-px h-5 bg-gray-700 shrink-0" />

        {/* Undo / Redo */}
        <button onClick={undo} title="Undo"
          className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700">
          <i className="fa-solid fa-rotate-left" style={{ fontSize: 12 }} />
        </button>
        <button onClick={redo} title="Redo"
          className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700">
          <i className="fa-solid fa-rotate-right" style={{ fontSize: 12 }} />
        </button>

        <button onClick={resetCanvas} title="Reset canvas to a blank state"
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-red-900/40 hover:border-red-700 hover:text-red-400 text-gray-300 px-2.5 py-1.5 rounded text-xs border border-gray-700 transition-colors">
          <i className="fa-solid fa-arrow-rotate-left" style={{ fontSize: 12 }} /> Reset
        </button>
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-1.5">

        {/* Brand select — used by Design with AI / Generate Image with AI */}
        <select
          value={activeBrandId || ''}
          onChange={(e) => setActiveBrandId(e.target.value || null)}
          title="Brand guide used by AI banner/image generation"
          className={`px-2.5 py-1.5 rounded text-xs border transition-colors max-w-32 ${
            activeBrandId
              ? 'bg-purple-900/40 border-purple-600 text-purple-300'
              : 'bg-gray-800 border-gray-600 text-gray-400'
          }`}
        >
          <option value="">No Brand</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        {/* Library pill */}
        <button
          onClick={() => setShowLibraryPicker(true)}
          title="Select Creative Library"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border transition-colors ${
            ftLibrary
              ? 'bg-purple-900/40 border-purple-600 text-purple-300 hover:bg-purple-900/60'
              : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-purple-500 hover:text-purple-400'
          }`}
        >
          <i className="fa-solid fa-layer-group" style={{ fontSize: 11 }} />
          <span className="max-w-28 truncate">{ftLibrary ? ftLibrary.name : 'Select Library'}</span>
          <i className="fa-solid fa-chevron-down" style={{ fontSize: 9 }} />
        </button>

        <button onClick={() => openModal('templates')}
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 px-2.5 py-1.5 rounded text-xs border border-gray-700">
          <i className="fa-solid fa-table-columns" style={{ fontSize: 12 }} /> Templates
        </button>

        <button
          onClick={() => setShowVideoAssets(true)}
          title="Upload and transcode videos for the selected library"
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 px-2.5 py-1.5 rounded text-xs border border-gray-700">
          <i className="fa-solid fa-film" style={{ fontSize: 12 }} /> Video Assets
        </button>

        <button
          onClick={() => setShowPreview(true)}
          title="Preview the actual export HTML (hover effects, video time-cues, etc.)"
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 px-2.5 py-1.5 rounded text-xs border border-gray-700">
          <i className="fa-solid fa-eye" style={{ fontSize: 12 }} /> Preview
        </button>

        {/* Export / Publish dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded text-xs"
          >
            <i className="fa-solid fa-file-export" style={{ fontSize: 12 }} />
            Export
            <i className="fa-solid fa-chevron-down" style={{ fontSize: 10 }} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 py-1 text-sm">
              <MenuItem icon="fa-floppy-disk" iconClass="text-blue-400" label="Save Banner (.json)" onClick={handleSave} />
              <MenuItem icon="fa-folder-open" iconClass="text-indigo-400" label="Load Banner (.json)" onClick={handleLoad} />
              <div className="border-t border-gray-700 my-1" />
              <label
                className="w-full flex items-center px-4 py-2 hover:bg-gray-700 cursor-pointer select-none text-gray-200"
                title="Defers asset loading until page load is complete."
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox" checked={politeLoad}
                  onChange={(e) => setPoliteLoad(e.target.checked)}
                  className="mr-3 w-4 h-4 text-blue-600"
                />
                <span>Polite Load</span>
              </label>
              <MenuItem icon="fa-file-zipper" iconClass="text-green-400" label="Export as ZIP" onClick={handleExportZip} />
              <MenuItem
                icon="fa-cloud-arrow-up"
                iconClass={ftLibrary ? 'text-purple-400' : 'text-gray-600'}
                label="Publish to Flashtalking"
                disabled={!ftLibrary}
                title={ftLibrary ? undefined : 'Select a library first'}
                onClick={() => { setMenuOpen(false); setShowPublish(true) }}
              />
              <div className="border-t border-gray-700 my-1" />
              <MenuItem icon="fa-trash" iconClass="text-red-400" label="Clear All" onClick={() => { setMenuOpen(false); clearAll() }} />
            </div>
          )}
        </div>

      </div>

      {/* Hidden file input for load */}
      <input ref={loadInputRef} type="file" accept=".json" className="hidden" onChange={handleLoadFile} />

      {showLibraryPicker && (
        <LibraryPickerModal onClose={() => setShowLibraryPicker(false)} />
      )}

      {showPublish && ftLibrary && (
        <FlashTalkingModal
          onClose={() => setShowPublish(false)}
          bannerName={bannerName}
          politeLoad={politeLoad}
          activeTemplate={activeTemplate}
        />
      )}

      {showVideoAssets && (
        <VideoAssetsModal onClose={() => setShowVideoAssets(false)} />
      )}

      {showPreview && (
        <PreviewModal onClose={() => setShowPreview(false)} />
      )}
    </div>
  )
}

function ZoomInput({ zoom, setZoom }) {
  const [local, setLocal] = useState(String(zoom))
  useEffect(() => { setLocal(String(zoom)) }, [zoom])
  return (
    <input
      type="number"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = parseInt(local, 10)
        if (!isNaN(n)) setZoom(Math.max(25, Math.min(200, n)))
        else setLocal(String(zoom))
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      className="bg-gray-800 text-gray-100 rounded border border-gray-700 text-xs tabular-nums text-center"
      style={{ minWidth: 46, width: 46, padding: '4px 2px', MozAppearance: 'textfield' }}
    />
  )
}

function MenuItem({ icon, iconClass, label, onClick, disabled, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors text-left text-gray-200"
    >
      <i className={`fa-solid ${icon} ${iconClass}`} style={{ fontSize: 13, width: 14 }} />
      {label}
    </button>
  )
}
