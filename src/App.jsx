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
  const { selectedId, deleteElement, elements, updateElement } = useCanvasStore()
  const { saveState } = useHistoryStore()

  const ARROW_DELTA = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }

  useEffect(() => {
    let lastArrowSave = 0
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
      if (ARROW_DELTA[e.key] && selectedId) {
        const el = elements.find((el2) => el2.id === selectedId)
        if (!el || el.locked) return
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const [dx, dy] = ARROW_DELTA[e.key]
        // One history entry per nudge "session" (a burst of key repeats), not one per
        // pixel — saving on every keydown would make undo take forever to back out of.
        const now = Date.now()
        if (now - lastArrowSave > 500) { saveState(); lastArrowSave = now }
        updateElement(selectedId, { x: el.x + dx * step, y: el.y + dy * step })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeModal, undo, redo, selectedId, deleteElement, saveState, elements, updateElement])

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
