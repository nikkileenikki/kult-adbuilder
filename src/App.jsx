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
import TemplateBuilderBar from './components/toolbar/TemplateBuilderBar.jsx'

export default function App({ onOpenSettings }) {
  const { activeModal, templateBuilder } = useUiStore()
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
    // App Shell — full-height flex row: Left Panel sidebar + the main column (Toolbar,
    // optional Template Builder Bar, Canvas viewport, Timeline) plus modal overlays.
    <div className="flex h-screen bg-gray-900 text-gray-100 select-none overflow-hidden">
      {/* Left Panel — layers list, template variables, element property editors, settings */}
      <LeftPanel onOpenSettings={onOpenSettings} />
      {/* Main Column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar — banner name, canvas size, zoom, undo/redo, file menu, publish */}
        <Toolbar />
        {/* Template Builder Bar — purple admin bar shown only while building/editing a template */}
        {templateBuilder && <TemplateBuilderBar />}
        {/* Canvas — the scrollable stage containing the banner (see Canvas.jsx for its internals) */}
        <Canvas />
        {/* Timeline — animation timeline/track editor docked at the bottom */}
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
