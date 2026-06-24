import React, { useRef } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'

export default function AddElementsSection() {
  const { addElement } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const { openModal } = useUiStore()
  const fileRef = useRef(null)

  const onFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        saveState()
        addElement({ type: 'image', src: ev.target.result, filename: file.name, width: 200, height: 150, borderRadius: 0 })
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
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
          className="border-2 border-dashed border-gray-600 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 transition-colors"
        >
          <div className="text-2xl text-gray-500 mb-1">☁</div>
          <p className="text-xs text-gray-400">Upload Images</p>
          <p className="text-xs text-gray-500 mt-0.5">JPG, PNG, GIF, SVG, WEBP</p>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/svg+xml,image/webp" multiple className="hidden" onChange={onFileChange} />

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => openModal('addText')}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors text-sm"
          >
            🔤 Text
          </button>
          <button
            onClick={() => openModal('addShape')}
            className="bg-teal-600 hover:bg-teal-700 text-white py-2 rounded transition-colors text-sm"
          >
            ◼ Shape
          </button>
        </div>

        <button
          onClick={() => openModal('addVideo')}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded transition-colors text-sm"
        >
          ▶ Add Video
        </button>

        <button
          onClick={addInvisible}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded transition-colors text-sm"
        >
          👁 Add Invisible Layer
        </button>

        <button
          onClick={addClickthrough}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded transition-colors text-sm"
        >
          🖱 Add Clickthrough
        </button>
      </div>
    </div>
  )
}
