import React, { useRef, useState } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'
import AiImageModal from '../modals/AiImageModal.jsx'

export default function AddElementsSection() {
  const { addElement } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const { openModal } = useUiStore()
  const fileRef = useRef(null)
  const [showAiImage, setShowAiImage] = useState(false)

  const readFiles = (files) => {
    const { canvasWidth, canvasHeight } = useCanvasStore.getState()
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const src = ev.target.result
        const img = new Image()
        img.onload = () => {
          const scale = Math.min(canvasWidth / img.naturalWidth, canvasHeight / img.naturalHeight)
          const w = Math.round(img.naturalWidth * scale)
          const h = Math.round(img.naturalHeight * scale)
          saveState()
          addElement({ type: 'image', src, filename: file.name, width: w, height: h, x: 0, y: 0, borderRadius: 0 })
        }
        img.src = src
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
    const { canvasWidth, canvasHeight } = useCanvasStore.getState()
    addElement({ type: 'clickthrough', x: 0, y: 0, width: canvasWidth, height: canvasHeight, url: '', clickIndex: 1, target: '_blank' })
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
          <i className="fa-solid fa-upload fa-xl mx-auto text-gray-500 mb-1 block" />
          <p className="text-xs text-gray-400">Upload or Drop Images</p>
          <p className="text-xs text-gray-500 mt-0.5">JPG, PNG, GIF, SVG, WEBP</p>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/svg+xml,image/webp" multiple className="hidden" onChange={onFileChange} />

        <AddBtn onClick={() => setShowAiImage(true)} icon="fa-wand-magic-sparkles" className="bg-purple-600 hover:bg-purple-700 w-full">Generate Image with AI</AddBtn>

        <div className="grid grid-cols-2 gap-2">
          <AddBtn onClick={() => openModal('addText')} icon="fa-t" className="bg-blue-600 hover:bg-blue-700">Text</AddBtn>
          <AddBtn onClick={() => openModal('addShape')} icon="fa-shapes" className="bg-teal-600 hover:bg-teal-700">Shape</AddBtn>
        </div>

        <AddBtn onClick={() => openModal('addVideo')} icon="fa-film" className="bg-red-600 hover:bg-red-700 w-full">Add Video</AddBtn>
        <AddBtn onClick={addInvisible} icon="fa-eye-slash" className="bg-gray-600 hover:bg-gray-700 w-full">Add Invisible Layer</AddBtn>
        <AddBtn onClick={addClickthrough} icon="fa-arrow-pointer" className="bg-purple-600 hover:bg-purple-700 w-full">Add Clickthrough</AddBtn>
      </div>

      {showAiImage && <AiImageModal onClose={() => setShowAiImage(false)} />}
    </div>
  )
}

function AddBtn({ onClick, icon, className, children }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-1.5 text-white py-2 rounded transition-colors text-sm ${className}`}>
      <i className={`fa-solid ${icon}`} style={{ fontSize: 12 }} />
      {children}
    </button>
  )
}

