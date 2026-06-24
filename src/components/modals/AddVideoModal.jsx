import React, { useState } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { Modal } from './AddTextModal.jsx'

export default function AddVideoModal() {
  const [videoUrl, setVideoUrl] = useState('')
  const [videoName, setVideoName] = useState('video1')
  const [playTrigger, setPlayTrigger] = useState('autoplay')
  const [muted, setMuted] = useState(true)
  const [controls, setControls] = useState(false)
  const { addElement } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const { closeModal } = useUiStore()

  const onAdd = () => {
    saveState()
    addElement({ type: 'video', videoUrl, videoName, playTrigger, muted, controls, width: 300, height: 250 })
    closeModal()
  }

  return (
    <Modal title="Add Video" onClose={closeModal}>
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Video URL</label>
          <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="220952/video"
            className="w-full px-2 py-1.5 text-sm bg-gray-700 rounded text-gray-200" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Video Name/ID</label>
          <input type="text" value={videoName} onChange={(e) => setVideoName(e.target.value)} placeholder="video1"
            className="w-full px-2 py-1.5 text-sm bg-gray-700 rounded text-gray-200" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Start Playing When</label>
          <select value={playTrigger} onChange={(e) => setPlayTrigger(e.target.value)}
            className="w-full px-2 py-1.5 text-sm bg-gray-700 rounded text-gray-200">
            <option value="autoplay">Autoplay</option>
            <option value="mouseover">Mouse Over</option>
            <option value="click">Click/Tap</option>
          </select>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} className="w-4 h-4" />
            Muted
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={controls} onChange={(e) => setControls(e.target.checked)} className="w-4 h-4" />
            Controls
          </label>
        </div>
      </div>
      <button onClick={onAdd} className="w-full py-2 bg-red-600 hover:bg-red-500 rounded text-sm font-medium text-white">
        Add Video
      </button>
    </Modal>
  )
}
