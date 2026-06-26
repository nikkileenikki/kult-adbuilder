import React, { useState, useRef, useEffect } from 'react'
import { useUiStore } from '../../store/uiStore.js'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { exportBannerZip, saveBannerJSON, loadBannerJSON } from '../../utils/exportBanner.js'

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
  const { elements, canvasWidth, canvasHeight, setCanvasSize, animDuration, animLoop, setAnimDuration, setAnimLoop, activeTemplate } = useCanvasStore()
  const { saveState, undo, redo } = useHistoryStore()
  const { openModal, canvasZoom: zoom, setCanvasZoom: setZoom } = useUiStore()
  const [bannerName, setBannerName] = useState('ad-banner')
  const [sizeValue, setSizeValue] = useState('300x250')
  const [customW, setCustomW] = useState(300)
  const [customH, setCustomH] = useState(250)
  const [menuOpen, setMenuOpen] = useState(false)
  const [politeLoad, setPoliteLoad] = useState(true)
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
    setZoom(Math.max(25, Math.min(200, Math.floor(scale * 100 / 25) * 25)))
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

  const handleExportZip = async () => {
    setMenuOpen(false)
    await exportBannerZip({ elements, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate })
  }

  const handleSave = () => {
    setMenuOpen(false)
    saveBannerJSON({ elements, canvasWidth, canvasHeight, bannerName, animDuration, animLoop })
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
      if (data.canvasWidth && data.canvasHeight) setCanvasSize(data.canvasWidth, data.canvasHeight)
      if (data.bannerName) setBannerName(data.bannerName)
      if (data.animDuration) setAnimDuration(data.animDuration)
      if (data.animLoop) setAnimLoop(data.animLoop)
      if (data.elements) useCanvasStore.setState({ elements: data.elements, selectedId: null })
    })
    e.target.value = ''
  }

  return (
    <div className="bg-gray-900 border-b border-gray-700 px-3 py-2 flex items-center gap-2 shrink-0">

      {/* Brand */}
      <span className="text-white font-bold text-sm tracking-wide mr-1 shrink-0" style={{ letterSpacing: '0.05em' }}>
        <span className="text-purple-400">KULT</span> AD
      </span>

      <div className="w-px h-5 bg-gray-700 shrink-0" />

      {/* Banner name */}
      <input
        type="text" value={bannerName} onChange={(e) => setBannerName(e.target.value)}
        title="Banner name"
        placeholder="Banner name"
        className="bg-gray-800 text-white rounded px-2 py-1 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none w-32"
      />

      <div className="w-px h-5 bg-gray-700 shrink-0" />

      {/* Canvas size */}
      <div className="flex items-center gap-1.5">
        <i className="fa-solid fa-crop-simple text-gray-400 shrink-0" style={{ fontSize: 12 }} />
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
        <span className="bg-gray-800 text-gray-100 rounded border border-gray-700 text-xs tabular-nums text-center select-none"
          style={{ minWidth: 46, padding: '4px 6px' }}>{zoom}%</span>
        <button onClick={() => setZoom(zoom + 25)} title="Zoom in"
          className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700">
          <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />
        </button>
        <button onClick={() => fitZoom(canvasWidth, canvasHeight)} title="Fit canvas to screen"
          className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 rounded border border-gray-700">
          <i className="fa-solid fa-compress" style={{ fontSize: 11 }} />
        </button>
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-1.5">

        {/* Undo / Redo */}
        <button onClick={undo} title="Undo"
          className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700">
          <i className="fa-solid fa-rotate-left" style={{ fontSize: 13 }} />
        </button>
        <button onClick={redo} title="Redo"
          className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700">
          <i className="fa-solid fa-rotate-right" style={{ fontSize: 13 }} />
        </button>

        <div className="w-px h-5 bg-gray-700" />

        <button onClick={() => openModal('templates')}
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 px-2.5 py-1.5 rounded text-xs border border-gray-700">
          <i className="fa-solid fa-table-columns" style={{ fontSize: 12 }} /> Templates
        </button>

        {/* Import/Export dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded text-xs"
          >
            <i className="fa-solid fa-file-export" style={{ fontSize: 12 }} />
            File
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
              <div className="border-t border-gray-700 my-1" />
              <MenuItem icon="fa-trash" iconClass="text-red-400" label="Clear All" onClick={() => { setMenuOpen(false); clearAll() }} />
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input for load */}
      <input ref={loadInputRef} type="file" accept=".json" className="hidden" onChange={handleLoadFile} />
    </div>
  )
}

function MenuItem({ icon, iconClass, label, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-700 transition-colors text-left text-gray-200">
      <i className={`fa-solid ${icon} ${iconClass}`} style={{ fontSize: 13, width: 14 }} />
      {label}
    </button>
  )
}
