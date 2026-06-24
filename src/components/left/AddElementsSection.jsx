import React, { useRef } from 'react'
import { Type, Square, Video, Eye, MousePointer, Upload } from 'lucide-react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'

export default function AddElementsSection() {
  const { addElement } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const { openModal } = useUiStore()
  const fileRef = useRef(null)

  const readFiles = (files) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        saveState()
        addElement({ type: 'image', src: ev.target.result, filename: file.name, width: 200, height: 150, borderRadius: 0 })
      }
      reader.readAsDataURL(file)
    })
  }

  const onFileChange = (e) => {
    readFiles(e.target.files || [])
    e.target.value = ''
  }

  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation() }
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation()
    readFiles(e.dataTransfer.files || [])
  }

  const addClickthrough = () => {
    saveState()
    addElement({ type: 'clickthrough', width: 300, height: 250, url: '', clickIndex: 1, target: '_blank' })
  }

  const addInvisible = () => {
    saveState()
    addElement({ type: 'invisible', width: 100, height: 100 })
  }

  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold mb-2 text-white">Add Elements</h2>
      <div className="space-y-2">
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={onDragOver}
          onDrop={onDrop}
          className="border-2 border-dashed border-gray-600 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 transition-colors"
        >
          <Upload size={24} className="mx-auto text-gray-500 mb-1" />
          <p className="text-xs text-gray-400">Upload or Drop Images</p>
          <p className="text-xs text-gray-500 mt-0.5">JPG, PNG, GIF, SVG, WEBP</p>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/svg+xml,image/webp" multiple className="hidden" onChange={onFileChange} />

        <div className="grid grid-cols-2 gap-2">
          <AddBtn onClick={() => openModal('addText')} icon={Type} className="bg-blue-600 hover:bg-blue-700">Text</AddBtn>
          <AddBtn onClick={() => openModal('addShape')} icon={Square} className="bg-teal-600 hover:bg-teal-700">Shape</AddBtn>
        </div>

        <AddBtn onClick={() => openModal('addVideo')} icon={Video} className="bg-red-600 hover:bg-red-700 w-full">Add Video</AddBtn>
        <AddBtn onClick={addInvisible} icon={Eye} className="bg-gray-600 hover:bg-gray-700 w-full">Add Invisible Layer</AddBtn>
        <AddBtn onClick={addClickthrough} icon={MousePointer} className="bg-purple-600 hover:bg-purple-700 w-full">Add Clickthrough</AddBtn>
      </div>
    </div>
  )
}

function AddBtn({ onClick, icon: Icon, className, children }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-1.5 text-white py-2 rounded transition-colors text-sm ${className}`}>
      <Icon size={13} />
      {children}
    </button>
  )
}

