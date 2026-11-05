import React from 'react'
import AddElementsSection from './AddElementsSection.jsx'
import PropertiesSection from './PropertiesSection.jsx'
import TemplatePanel from './TemplatePanel.jsx'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useAuthStore } from '../../store/authStore.js'

export default function LeftPanel({ onOpenSettings }) {
  const { selectedId, activeTemplate } = useCanvasStore()
  const { user, token, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    clearAuth()
  }

  return (
    // w-64 is 224px here, not Tailwind's nominal 256: index.css sets the root font size
    // to 14px and widths are in rem (the previous w-80 was 280px, not 320). shrink-0
    // keeps it fixed regardless of what the main column is asked to fit.
    <div className="w-64 shrink-0 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden max-h-screen">
      <div className="p-2.5 flex-1 overflow-y-auto">
        <h1 className="text-base font-bold mb-2.5 flex items-center gap-2 text-white">
          <i className="fa-solid fa-layer-group text-blue-400" />
          Ad Builder
        </h1>
        {activeTemplate && <TemplatePanel />}
        <AddElementsSection />
        {selectedId && <PropertiesSection />}
      </div>

      {/* Footer — user identity, settings (brand guide / user management), logout */}
      {user && (
        <div className="px-2.5 py-2 border-t border-gray-700 flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-gray-400 truncate flex-1 min-w-0">{user.display_name}</span>
          <button
            onClick={onOpenSettings}
            title="Settings"
            className="w-7 h-7 flex items-center justify-center bg-gray-900 hover:bg-gray-700 text-gray-400 hover:text-purple-400 rounded border border-gray-700 transition-colors"
          >
            <i className="fa-solid fa-gear" style={{ fontSize: 13 }} />
          </button>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="w-7 h-7 flex items-center justify-center bg-gray-900 hover:bg-gray-700 text-gray-400 hover:text-red-400 rounded border border-gray-700 transition-colors"
          >
            <i className="fa-solid fa-right-from-bracket" style={{ fontSize: 13 }} />
          </button>
        </div>
      )}
    </div>
  )
}
