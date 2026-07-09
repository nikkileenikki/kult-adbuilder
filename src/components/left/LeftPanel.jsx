import React, { useState } from 'react'
import AddElementsSection from './AddElementsSection.jsx'
import PropertiesSection from './PropertiesSection.jsx'
import TemplatePanel from './TemplatePanel.jsx'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useAuthStore } from '../../store/authStore.js'
import SettingsModal from '../modals/SettingsModal.jsx'

export default function LeftPanel({ onOpenUsers }) {
  const { selectedId, activeTemplate } = useCanvasStore()
  const { user, token, clearAuth } = useAuthStore()
  const [showSettings, setShowSettings] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    clearAuth()
  }

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden max-h-screen">
      <div className="p-3 flex-1 overflow-y-auto">
        <h1 className="text-xl font-bold mb-3 flex items-center gap-2 text-white">
          <i className="fa-solid fa-layer-group text-blue-400" />
          Ad Builder
        </h1>
        {activeTemplate && <TemplatePanel />}
        <AddElementsSection />
        {selectedId && <PropertiesSection />}
      </div>

      {/* Footer — user identity, settings (brand guide / user management), logout */}
      {user && (
        <div className="p-3 border-t border-gray-700 flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 truncate flex-1 min-w-0">{user.display_name}</span>
          <button
            onClick={() => setShowSettings(true)}
            title="Settings"
            className="w-8 h-8 flex items-center justify-center bg-gray-900 hover:bg-gray-700 text-gray-400 hover:text-purple-400 rounded border border-gray-700 transition-colors"
          >
            <i className="fa-solid fa-gear" style={{ fontSize: 13 }} />
          </button>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="w-8 h-8 flex items-center justify-center bg-gray-900 hover:bg-gray-700 text-gray-400 hover:text-red-400 rounded border border-gray-700 transition-colors"
          >
            <i className="fa-solid fa-right-from-bracket" style={{ fontSize: 13 }} />
          </button>
        </div>
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} onOpenUsers={onOpenUsers} />
      )}
    </div>
  )
}
