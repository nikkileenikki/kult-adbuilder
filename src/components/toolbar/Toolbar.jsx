import React from 'react'
import {
  Type, Square, Image, Video, MousePointer, Eye, Undo2, Redo2,
  Trash2, Download, Upload, LayoutTemplate,
} from 'lucide-react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'

export default function Toolbar() {
  const { elements, canvasWidth, canvasHeight, setCanvasSize, addElement } = useCanvasStore()
  const { undo, redo, saveState } = useHistoryStore()
  const { openModal } = useUiStore()

  const addImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        saveState()
        addElement({
          type: 'image',
          src: ev.target.result,
          filename: file.name,
          width: 200, height: 150,
          borderRadius: 0,
        })
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const addClickthrough = () => {
    saveState()
    addElement({
      type: 'clickthrough',
      width: 300, height: 250,
      url: '', clickIndex: 1, target: '_blank',
    })
  }

  const addInvisible = () => {
    saveState()
    addElement({
      type: 'invisible',
      width: 100, height: 100,
    })
  }

  const clearAll = () => {
    if (!elements.length) return
    if (!confirm('Clear all elements?')) return
    saveState()
    useCanvasStore.setState({ elements: [], selectedId: null })
  }

  return (
    <header className="flex items-center gap-1 px-3 py-2 bg-[#16213e] border-b border-slate-700 shrink-0">
      <span className="text-sm font-bold text-violet-400 mr-3">Kult AdBuilder</span>

      <div className="flex items-center gap-1 mr-3">
        <label className="text-xs text-slate-400">W</label>
        <input
          type="number" value={canvasWidth} min={50} max={2000}
          onChange={(e) => setCanvasSize(Number(e.target.value), canvasHeight)}
          className="w-16 px-1 py-0.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200"
        />
        <label className="text-xs text-slate-400">H</label>
        <input
          type="number" value={canvasHeight} min={50} max={2000}
          onChange={(e) => setCanvasSize(canvasWidth, Number(e.target.value))}
          className="w-16 px-1 py-0.5 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200"
        />
      </div>

      <div className="w-px h-5 bg-slate-600 mx-1" />

      <ToolBtn icon={Type} label="Text" onClick={() => openModal('addText')} />
      <ToolBtn icon={Square} label="Shape" onClick={() => openModal('addShape')} />
      <ToolBtn icon={Image} label="Image" onClick={addImage} />
      <ToolBtn icon={Video} label="Video" onClick={() => openModal('addVideo')} />
      <ToolBtn icon={MousePointer} label="Clickthrough" onClick={addClickthrough} />
      <ToolBtn icon={Eye} label="Invisible" onClick={addInvisible} />

      <div className="w-px h-5 bg-slate-600 mx-1" />

      <ToolBtn icon={Undo2} label="Undo" onClick={undo} />
      <ToolBtn icon={Redo2} label="Redo" onClick={redo} />
      <ToolBtn icon={Trash2} label="Clear" onClick={clearAll} />

      <div className="w-px h-5 bg-slate-600 mx-1" />

      <ToolBtn icon={LayoutTemplate} label="Templates" onClick={() => openModal('templates')} />
      <ToolBtn icon={Download} label="Export ZIP" onClick={() => openModal('export')} />
      <ToolBtn icon={Upload} label="Publish" onClick={() => openModal('publish')} />
    </header>
  )
}

function ToolBtn({ icon: Icon, label, onClick }) {
  return (
    <button
      title={label}
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
    >
      <Icon size={14} />
      <span className="hidden lg:inline">{label}</span>
    </button>
  )
}
