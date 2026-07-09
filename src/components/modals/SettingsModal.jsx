import React, { useState } from 'react'
import { useAuthStore } from '../../store/authStore.js'
import useEscapeKey from '../../hooks/useEscapeKey.js'
import BrandGuideModal from './BrandGuideModal.jsx'

function Modal({ children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        {children}
      </div>
    </div>
  )
}

function SettingsRow({ icon, label, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
        <i className={`fa-solid ${icon} text-purple-400`} style={{ fontSize: 14 }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-100">{label}</p>
        <p className="text-xs text-gray-500 truncate">{description}</p>
      </div>
      <i className="fa-solid fa-chevron-right text-gray-600 ml-auto shrink-0" style={{ fontSize: 11 }} />
    </button>
  )
}

export default function SettingsModal({ onClose, onOpenUsers }) {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  useEscapeKey(onClose)

  const [showBrandGuide, setShowBrandGuide] = useState(false)

  return (
    <>
      <Modal>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <i className="fa-solid fa-gear text-purple-400" />
            Settings
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="space-y-1">
          <SettingsRow
            icon="fa-swatchbook"
            label="Brand Guide"
            description="Colors, tone, and notes used by AI banner/image generation"
            onClick={() => setShowBrandGuide(true)}
          />
          {isAdmin && onOpenUsers && (
            <SettingsRow
              icon="fa-users"
              label="User Management"
              description="Add, edit, or remove users"
              onClick={() => { onClose(); onOpenUsers() }}
            />
          )}
        </div>
      </Modal>

      {showBrandGuide && (
        <BrandGuideModal onClose={() => setShowBrandGuide(false)} />
      )}
    </>
  )
}
