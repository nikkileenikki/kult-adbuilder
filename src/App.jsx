import React, { useEffect } from 'react'
import Toolbar from './components/toolbar/Toolbar.jsx'
import Canvas from './components/canvas/Canvas.jsx'
import LayersPanel from './components/layers/LayersPanel.jsx'
import PropertiesPanel from './components/properties/PropertiesPanel.jsx'
import Timeline from './components/timeline/Timeline.jsx'
import { useHistoryStore } from './store/historyStore.js'
import { useUiStore } from './store/uiStore.js'
import AddTextModal from './components/modals/AddTextModal.jsx'
import AddShapeModal from './components/modals/AddShapeModal.jsx'

export default function App() {
  const { activeModal } = useUiStore()
  const { undo, redo } = useHistoryStore()

  useEffect(() => {
    const onKey = (e) => {
      if (activeModal) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeModal, undo, redo])

  return (
    <div className="flex flex-col h-screen bg-[#0f0f1a] text-slate-200 select-none">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <LayersPanel />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Canvas />
          <Timeline />
        </div>
        <PropertiesPanel />
      </div>
      {activeModal === 'addText' && <AddTextModal />}
      {activeModal === 'addShape' && <AddShapeModal />}
    </div>
  )
}
