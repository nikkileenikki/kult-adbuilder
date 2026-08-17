import React, { useState } from 'react'
import { useAuthStore } from '../../store/authStore.js'
import BrandGuideContent from './BrandGuideContent.jsx'
import UserManagementPage from '../auth/UserManagementPage.jsx'
import AiSettingsContent from './AiSettingsContent.jsx'
import FtReportTestContent from './FtReportTestContent.jsx'

const TABS = [
  { id: 'brand', label: 'Brand Guide', icon: 'fa-swatchbook', adminOnly: false },
  { id: 'users', label: 'User Management', icon: 'fa-users', adminOnly: true },
  { id: 'ai', label: 'AI Settings', icon: 'fa-wand-magic-sparkles', adminOnly: true },
  { id: 'ftReportTest', label: 'FT Report Test', icon: 'fa-flask', adminOnly: true },
]

export default function SettingsPage({ onClose }) {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const [tab, setTab] = useState('brand')

  const tabs = TABS.filter((t) => !t.adminOnly || isAdmin)

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center gap-3">
        <span className="text-white font-bold text-sm tracking-wide">
          <span className="text-purple-400">KULT</span> AD
        </span>
        <div className="w-px h-5 bg-gray-700" />
        <span className="text-gray-200 text-sm font-medium">Settings</span>
        <button
          onClick={onClose}
          className="ml-auto flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded text-xs border border-gray-700"
        >
          <i className="fa-solid fa-arrow-left" style={{ fontSize: 12 }} /> Back to Editor
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Nav */}
        <div className="w-52 shrink-0 border-r border-gray-700 p-3 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                tab === t.id ? 'bg-purple-700 text-white' : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <i className={`fa-solid ${t.icon}`} style={{ fontSize: 13, width: 14 }} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {tab === 'brand' && <BrandGuideContent />}
          {tab === 'users' && isAdmin && <UserManagementPage embedded />}
          {tab === 'ai' && isAdmin && <AiSettingsContent />}
          {tab === 'ftReportTest' && isAdmin && <FtReportTestContent />}
        </div>
      </div>
    </div>
  )
}
