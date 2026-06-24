import React, { useEffect } from 'react'
import LeftPanel from './components/left/LeftPanel.jsx'
import Toolbar from './components/toolbar/Toolbar.jsx'
import Canvas from './components/canvas/Canvas.jsx'
import Timeline from './components/timeline/Timeline.jsx'
import { useHistoryStore } from './store/historyStore.js'
import { useUiStore } from './store/uiStore.js'
import { useCanvasStore } from './store/canvasStore.js'
import AddTextModal from './components/modals/AddTextModal.jsx'
import AddShapeModal from './components/modals/AddShapeModal.jsx'
import AddVideoModal from './components/modals/AddVideoModal.jsx'
import AnimationModal from './components/modals/AnimationModal.jsx'
import TemplateGallery from './components/modals/TemplateGallery.jsx'

export default function App() {
  const { activeModal } = useUiStore()
  const { undo, redo } = useHistoryStore()
  const { selectedId, deleteElement } = useCanvasStore()
  const { saveState } = useHistoryStore()

  useEffect(() => {
    const onKey = (e) => {
      if (activeModal) return
      // Ignore when typing in an input / contenteditable
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        saveState()
        deleteElement(selectedId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeModal, undo, redo, selectedId, deleteElement, saveState])

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 select-none overflow-hidden">
      <LeftPanel />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Toolbar />
        <Canvas />
        <Timeline />
      </div>

      {activeModal === 'addText' && <AddTextModal />}
      {activeModal === 'addShape' && <AddShapeModal />}
      {activeModal === 'addVideo' && <AddVideoModal />}
      {activeModal === 'animation' && <AnimationModal />}
      {activeModal === 'templates' && <TemplateGallery />}
    </div>
  )
}
