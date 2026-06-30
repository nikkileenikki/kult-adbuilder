import React, { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../../store/authStore.js'
import { useUiStore } from '../../store/uiStore.js'

let cachedLibraries = null

function Modal({ children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        {children}
      </div>
    </div>
  )
}

export default function LibraryPickerModal({ onClose }) {
  const { token } = useAuthStore()
  const { ftLibrary, setFtLibrary } = useUiStore()

  const [libraries, setLibraries] = useState(cachedLibraries || [])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(!cachedLibraries)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(ftLibrary)

  useEffect(() => {
    if (cachedLibraries) return
    fetch('/api/flashtalking/libraries', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return }
        cachedLibraries = data.items || []
        setLibraries(cachedLibraries)
      })
      .catch(() => setError('Failed to load libraries'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = libraries.filter((l) => {
    const q = search.toLowerCase()
    return l.name.toLowerCase().includes(q) || l.advertiserName.toLowerCase().includes(q)
  })

  const handleConfirm = () => {
    setFtLibrary(selected)
    onClose()
  }

  return (
    <Modal>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">
          <i className="fa-solid fa-layer-group text-purple-400" />
          Select Creative Library
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      {error && (
        <p className="text-xs bg-red-900/40 text-red-400 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search libraries…"
          autoFocus
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-700 mb-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
            <i className="fa-solid fa-spinner fa-spin" /> Loading libraries…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-xs px-3 py-4 text-center">No libraries found</p>
        ) : (
          filtered.map((lib) => (
            <button
              key={lib.id}
              type="button"
              onClick={() => setSelected(lib)}
              className={`w-full text-left px-3 py-2.5 hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-0 ${selected?.id === lib.id ? 'bg-purple-900/30' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white truncate">{lib.name}</p>
                  {lib.advertiserName && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{lib.advertiserName}</p>
                  )}
                </div>
                {selected?.id === lib.id && (
                  <i className="fa-solid fa-circle-check text-purple-400 shrink-0 ml-2" style={{ fontSize: 14 }} />
                )}
              </div>
            </button>
          ))
        )}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!selected}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
      >
        {selected ? `Use "${selected.name}"` : 'Select a library'}
      </button>
    </Modal>
  )
}
