import React, { useState, useRef, useEffect } from 'react'
import { useUiStore } from '../../store/uiStore.js'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { exportBannerZip, saveBannerJSON, loadBannerJSON } from '../../utils/exportBanner.js'

const PRESET_SIZES = [
  { value: '300x250', label: '300x250 (Medium Rectangle)', w: 300, h: 250 },
  { value: '300x600', label: '300x600 (Half Page)', w: 300, h: 600 },
  { value: '320x480', label: '320x480 (Mobile Portrait)', w: 320, h: 480 },
  { value: '800x600', label: '800x600 (Large Rectangle)', w: 800, h: 600 },
  { value: '970x250', label: '970x250 (Billboard)', w: 970, h: 250 },
  { value: '320x50',  label: '320x50 (Mobile Banner)', w: 320, h: 50 },
  { value: 'custom',  label: 'Custom Size', w: null, h: null },
]

export default function Toolbar() {
  const { elements, canvasWidth, canvasHeight, setCanvasSize } = useCanvasStore()
  const { saveState, undo, redo } = useHistoryStore()
  const { openModal } = useUiStore()
  const [bannerName, setBannerName] = useState('ad-banner')
  const [sizeValue, setSizeValue] = useState('300x250')
  const [customW, setCustomW] = useState(300)
  const [customH, setCustomH] = useState(250)
  const [zoom, setZoom] = useState(100)
  const [menuOpen, setMenuOpen] = useState(false)
  const [politeLoad, setPoliteLoad] = useState(true)
  const menuRef = useRef(null)
  const loadInputRef = useRef(null)

  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const onSizeChange = (e) => {
    const val = e.target.value
    setSizeValue(val)
    const preset = PRESET_SIZES.find((p) => p.value === val)
    if (preset && preset.w) setCanvasSize(preset.w, preset.h)
  }

  const applyCustom = () => setCanvasSize(customW, customH)

  const clearAll = () => {
    if (!elements.length) return
    if (!confirm('Clear all elements?')) return
    saveState()
    useCanvasStore.setState({ elements: [], selectedId: null })
  }

  const changeZoom = (delta) => setZoom((z) => Math.min(200, Math.max(25, z + delta)))

  const handleExportZip = async () => {
    setMenuOpen(false)
    await exportBannerZip({ elements, canvasWidth, canvasHeight, bannerName, politeLoad })
  }

  const handleSave = () => {
    setMenuOpen(false)
    saveBannerJSON({ elements, canvasWidth, canvasHeight, bannerName })
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
      if (data.elements) useCanvasStore.setState({ elements: data.elements, selectedId: null })
    })
    e.target.value = ''
  }

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-2 flex items-center gap-3 flex-wrap shrink-0">
      {/* Banner name */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400 whitespace-nowrap">Banner Name:</label>
        <input
          type="text" value={bannerName} onChange={(e) => setBannerName(e.target.value)}
          className="bg-gray-700 text-white rounded px-2 py-1 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none w-36"
        />
      </div>

      {/* Canvas size */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400 whitespace-nowrap">Canvas Size:</label>
        <select value={sizeValue} onChange={onSizeChange} className="bg-gray-700 rounded px-2 py-1 text-sm text-white">
          {PRESET_SIZES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {sizeValue === 'custom' && (
          <>
            <input type="number" value={customW} onChange={(e) => setCustomW(Number(e.target.value))}
              className="bg-gray-700 rounded px-2 py-1 text-sm w-16 text-white" placeholder="Width" />
            <input type="number" value={customH} onChange={(e) => setCustomH(Number(e.target.value))}
              className="bg-gray-700 rounded px-2 py-1 text-sm w-16 text-white" placeholder="Height" />
            <button onClick={applyCustom} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm">Apply</button>
          </>
        )}
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-1 border-l border-gray-600 pl-3">
        <label className="text-xs text-gray-400">Zoom:</label>
        <button onClick={() => changeZoom(-25)} className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded" title="Zoom out">
          <i className="fa-solid fa-magnifying-glass-minus" style={{ fontSize: 13 }} />
        </button>
        <input type="number" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} min={25} max={200} step={25}
          className="bg-gray-700 text-white rounded px-2 py-1 text-sm w-14 text-center border border-gray-600 focus:border-blue-500 focus:outline-none" />
        <span className="text-xs text-gray-400">%</span>
        <button onClick={() => changeZoom(25)} className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded" title="Zoom in">
          <i className="fa-solid fa-magnifying-glass-plus" style={{ fontSize: 13 }} />
        </button>
        <button onClick={() => setZoom(100)} className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded" title="Reset zoom">
          <i className="fa-solid fa-compress" style={{ fontSize: 13 }} />
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button onClick={() => openModal('templates')} className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm">
          <i className="fa-solid fa-table-columns" style={{ fontSize: 13 }} /> Templates
        </button>
        <button onClick={undo} className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm">
          <i className="fa-solid fa-rotate-left" style={{ fontSize: 13 }} /> Undo
        </button>
        <button onClick={redo} className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm">
          <i className="fa-solid fa-rotate-right" style={{ fontSize: 13 }} /> Redo
        </button>
        <button onClick={clearAll} className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
          <i className="fa-solid fa-trash" style={{ fontSize: 13 }} /> Clear All
        </button>

        {/* Import/Export dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
          >
            <i className="fa-solid fa-file-zipper" style={{ fontSize: 13 }} />
            Import / Export
            <i className="fa-solid fa-chevron-down" style={{ fontSize: 11 }} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1 text-gray-800 text-sm">
              <MenuItem icon="fa-floppy-disk" iconClass="text-blue-500" label="Save Banner (.json)" onClick={handleSave} />
              <MenuItem icon="fa-folder-open" iconClass="text-indigo-500" label="Load Banner (.json)" onClick={handleLoad} />
              <div className="border-t border-gray-200 my-1" />
              <label
                className="w-full flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer select-none"
                title="Defers asset loading until page load is complete."
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={politeLoad}
                  onChange={(e) => setPoliteLoad(e.target.checked)}
                  className="mr-3 w-4 h-4 text-blue-600"
                />
                <span>Polite Load</span>
              </label>
              <MenuItem icon="fa-file-zipper" iconClass="text-green-500" label="Export as ZIP" onClick={handleExportZip} />
              <MenuItem icon="fa-play" iconClass="text-purple-500" label="Preview Animation" onClick={() => { setMenuOpen(false); alert('Open the exported index.html in a browser to preview.') }} />
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
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 transition-colors text-left">
      <i className={`fa-solid ${icon} ${iconClass}`} style={{ fontSize: 14, width: 14 }} />
      {label}
    </button>
  )
}
