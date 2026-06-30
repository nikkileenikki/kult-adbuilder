import React, { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../../store/authStore.js'
import { useCanvasStore } from '../../store/canvasStore.js'
import { buildBannerZipBlob } from '../../utils/exportBanner.js'

function Modal({ children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        {children}
      </div>
    </div>
  )
}

export default function FlashTalkingModal({ onClose, bannerName, politeLoad, activeTemplate }) {
  const { token } = useAuthStore()
  const { elements, canvasWidth, canvasHeight } = useCanvasStore()

  const [ftEmail, setFtEmail] = useState('')
  const [ftPassword, setFtPassword] = useState('')
  const [selectedLibrary, setSelectedLibrary] = useState(null)
  const [libraries, setLibraries] = useState([])
  const [librarySearch, setLibrarySearch] = useState('')
  const [showLibraryList, setShowLibraryList] = useState(false)
  const [loadingLibraries, setLoadingLibraries] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [status, setStatus] = useState(null)

  const listRef = useRef(null)
  const authHeaders = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch('/api/flashtalking/credentials', { headers: authHeaders })
      .then((r) => r.json())
      .then((data) => {
        if (data.credentials) {
          setFtEmail(data.credentials.ft_email || '')
          if (data.credentials.library_id) {
            setSelectedLibrary({
              id: data.credentials.library_id,
              name: data.credentials.library_name || data.credentials.library_id,
              advertiserName: data.credentials.library_advertiser || '',
            })
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (listRef.current && !listRef.current.contains(e.target)) setShowLibraryList(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchLibraries = async () => {
    if (!ftEmail.trim() || !ftPassword.trim()) {
      setStatus({ type: 'error', message: 'Enter your Flashtalking email and password first' })
      return
    }
    setLoadingLibraries(true)
    setStatus(null)

    // Save credentials first (which fetches the token), then load libraries
    try {
      const saveRes = await fetch('/api/flashtalking/credentials', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ft_email: ftEmail.trim(), ft_password: ftPassword.trim(), library_id: selectedLibrary?.id || '', library_name: selectedLibrary?.name || '', library_advertiser: selectedLibrary?.advertiserName || '' }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error || 'Authentication failed')

      const res = await fetch('/api/flashtalking/libraries', { headers: authHeaders })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch libraries')
      setLibraries(data.items || [])
      setShowLibraryList(true)
      setLibrarySearch('')
      setStatus({ type: 'success', message: 'Authenticated successfully' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoadingLibraries(false)
    }
  }

  const handleSaveCredentials = async () => {
    if (!ftEmail.trim() || !ftPassword.trim()) {
      setStatus({ type: 'error', message: 'Email and password are required' })
      return
    }
    if (!selectedLibrary) {
      setStatus({ type: 'error', message: 'Select a Creative Library' })
      return
    }
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/flashtalking/credentials', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ft_email: ftEmail.trim(),
          ft_password: ftPassword.trim(),
          library_id: String(selectedLibrary.id),
          library_name: selectedLibrary.name,
          library_advertiser: selectedLibrary.advertiserName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setStatus({ type: 'success', message: 'Credentials saved' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!selectedLibrary) {
      setStatus({ type: 'error', message: 'Save your credentials first' })
      return
    }
    setPublishing(true)
    setStatus(null)
    try {
      const filename = `${bannerName || 'banner'}.zip`
      const blob = await buildBannerZipBlob({ elements, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate })
      const form = new FormData()
      form.append('file', blob, filename)
      form.append('filename', filename)

      const res = await fetch('/api/flashtalking/publish', {
        method: 'POST',
        headers: authHeaders,
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Publish failed')

      const action = data.action === 'overwritten' ? 'Overwritten' : 'Imported'
      setStatus({ type: 'success', message: `${action} successfully — Creative ID: ${data.creativeId}` })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setPublishing(false)
    }
  }

  const filteredLibraries = libraries.filter((l) => {
    const q = librarySearch.toLowerCase()
    return l.name.toLowerCase().includes(q) || l.advertiserName.toLowerCase().includes(q)
  })

  return (
    <Modal>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">
          <i className="fa-solid fa-cloud-arrow-up text-purple-400" />
          Publish to Flashtalking
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm text-center py-4">Loading…</p>
      ) : (
        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Flashtalking Email</label>
            <input
              type="email"
              value={ftEmail}
              onChange={(e) => setFtEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Flashtalking Password</label>
            <input
              type="password"
              value={ftPassword}
              onChange={(e) => setFtPassword(e.target.value)}
              placeholder="Your Innovid Hub password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Creative Library picker */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Creative Library</label>
            <div className="relative" ref={listRef}>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={fetchLibraries}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:border-purple-500 flex items-center justify-between hover:border-gray-500 transition-colors"
                >
                  {selectedLibrary ? (
                    <span className="text-white truncate">{selectedLibrary.name}</span>
                  ) : (
                    <span className="text-gray-500">Select a library…</span>
                  )}
                  {loadingLibraries
                    ? <i className="fa-solid fa-spinner fa-spin text-gray-400 ml-2 shrink-0" style={{ fontSize: 11 }} />
                    : <i className="fa-solid fa-chevron-down text-gray-400 ml-2 shrink-0" style={{ fontSize: 10 }} />
                  }
                </button>
              </div>

              {selectedLibrary?.advertiserName && (
                <p className="text-xs text-gray-500 mt-1 ml-1">{selectedLibrary.advertiserName}</p>
              )}

              {showLibraryList && (
                <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-gray-700">
                    <input
                      type="text"
                      value={librarySearch}
                      onChange={(e) => setLibrarySearch(e.target.value)}
                      placeholder="Search libraries…"
                      autoFocus
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {filteredLibraries.length === 0 ? (
                      <p className="text-gray-500 text-xs px-3 py-3">No libraries found</p>
                    ) : (
                      filteredLibraries.map((lib) => (
                        <button
                          key={lib.id}
                          type="button"
                          onClick={() => { setSelectedLibrary(lib); setShowLibraryList(false) }}
                          className={`w-full text-left px-3 py-2.5 hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-0 ${selectedLibrary?.id === lib.id ? 'bg-purple-900/30' : ''}`}
                        >
                          <p className="text-sm text-white truncate">{lib.name}</p>
                          {lib.advertiserName && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">{lib.advertiserName}</p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSaveCredentials}
            disabled={saving}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            {saving ? 'Saving…' : 'Save Credentials'}
          </button>

          <div className="border-t border-gray-700 pt-4">
            <p className="text-xs text-gray-500 mb-3">
              Banner: <span className="text-gray-300">{bannerName || 'banner'}.zip</span>
              <span className="ml-2 text-gray-500">({canvasWidth}×{canvasHeight})</span>
            </p>
            <button
              onClick={handlePublish}
              disabled={publishing || !selectedLibrary}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 13 }} />
              {publishing ? 'Publishing…' : 'Publish to Flashtalking'}
            </button>
          </div>

          {status && (
            <p className={`text-xs rounded-lg px-3 py-2 ${status.type === 'success' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
              {status.message}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
