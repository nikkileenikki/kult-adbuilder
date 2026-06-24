import React, { useState, useRef, useEffect } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'

const PRESET_SIZES = [
  { label: '300x250 (Medium Rectangle)', w: 300, h: 250 },
  { label: '300x600 (Half Page)', w: 300, h: 600 },
  { label: '320x480 (Mobile Portrait)', w: 320, h: 480 },
  { label: '800x600 (Large Rectangle)', w: 800, h: 600 },
  { label: '970x250 (Billboard)', w: 970, h: 250 },
  { label: '320x50 (Mobile Banner)', w: 320, h: 50 },
  { label: 'Custom Size', w: null, h: null },
]

export default function Toolbar() {
  const { elements, canvasWidth, canvasHeight, setCanvasSize } = useCanvasStore()
  const { saveState, undo, redo } = useHistoryStore()
  const [bannerName, setBannerName] = useState('ad-banner')
  const [sizeKey, setSizeKey] = useState('300x250')
  const [customW, setCustomW] = useState(300)
  const [customH, setCustomH] = useState(250)
  const [zoom, setZoom] = useState(100)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const onClickOutside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const onSizeChange = (e) => {
    const val = e.target.value
    setSizeKey(val)
    if (val !== 'Custom Size') {
      const preset = PRESET_SIZES.find((p) => p.label.startsWith(val))
      if (preset) setCanvasSize(preset.w, preset.h)
    }
  }

  const applyCustomSize = () => setCanvasSize(customW, customH)

  const clearAll = () => {
    if (!elements.length) return
    if (!confirm('Clear all elements?')) return
    saveState()
    useCanvasStore.setState({ elements: [], selectedId: null })
  }

  const changeZoom = (delta) => setZoom((z) => Math.min(200, Math.max(25, z + delta)))

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
        <select value={sizeKey} onChange={onSizeChange} className="bg-gray-700 rounded px-2 py-1 text-sm text-white">
          {PRESET_SIZES.map((p) => (
            <option key={p.label} value={p.label.split(' ')[0]}>{p.label}</option>
          ))}
        </select>
        {sizeKey === 'Custom' && (
          <>
            <input type="number" value={customW} onChange={(e) => setCustomW(Number(e.target.value))}
              className="bg-gray-700 rounded px-2 py-1 text-sm w-16 text-white" placeholder="Width" />
            <input type="number" value={customH} onChange={(e) => setCustomH(Number(e.target.value))}
              className="bg-gray-700 rounded px-2 py-1 text-sm w-16 text-white" placeholder="Height" />
            <button onClick={applyCustomSize} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm">Apply</button>
          </>
        )}
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-2 border-l border-gray-600 pl-3">
        <label className="text-xs text-gray-400">Zoom:</label>
        <button onClick={() => changeZoom(-25)} className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm">－</button>
        <input type="number" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} min={25} max={200} step={25}
          className="bg-gray-700 text-white rounded px-2 py-1 text-sm w-16 text-center border border-gray-600 focus:border-blue-500 focus:outline-none" />
        <span className="text-xs text-gray-400">%</span>
        <button onClick={() => changeZoom(25)} className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm">＋</button>
        <button onClick={() => setZoom(100)} className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm" title="Reset zoom">⤡</button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Undo/Redo */}
        <button onClick={undo} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm">↩ Undo</button>
        <button onClick={redo} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm">↪ Redo</button>

        {/* Clear */}
        <button onClick={clearAll} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
          🗑 Clear All
        </button>

        {/* Import/Export dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
          >
            📁 Import / Export ▾
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1 text-gray-800 text-sm">
              <MenuItem label="💾 Save Banner" onClick={() => { setMenuOpen(false) }} />
              <MenuItem label="📂 Load Banner" onClick={() => { setMenuOpen(false) }} />
              <div className="border-t border-gray-200 my-1" />
              <label className="w-full flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer">
                <input type="checkbox" defaultChecked className="mr-3 w-4 h-4 text-blue-600" />
                <span>Polite Load</span>
              </label>
              <MenuItem label="📦 Export as ZIP" onClick={() => { setMenuOpen(false) }} />
              <MenuItem label="▶ Preview Animation" onClick={() => { setMenuOpen(false) }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MenuItem({ label, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center px-4 py-2 hover:bg-gray-100 transition-colors text-left">
      {label}
    </button>
  )
}
