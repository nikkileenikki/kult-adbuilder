import React from 'react'
import AddElementsSection from './AddElementsSection.jsx'
import PropertiesSection from './PropertiesSection.jsx'
import { useCanvasStore } from '../../store/canvasStore.js'

export default function LeftPanel() {
  const { selectedId } = useCanvasStore()

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col overflow-y-auto max-h-screen">
      <div className="p-3 flex-1 overflow-y-auto">
        <h1 className="text-xl font-bold mb-3 flex items-center gap-2 text-white">
          <i className="fa-solid fa-layer-group text-blue-400" />
          Ad Builder
        </h1>
        <AddElementsSection />
        {selectedId && <PropertiesSection />}
      </div>
    </div>
  )
}
