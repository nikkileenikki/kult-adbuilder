import React, { useState, useEffect } from 'react'
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
  const { elements, canvasWidth, canvasHeight, animDuration, animLoop } = useCanvasStore()

  const [apiToken, setApiToken] = useState('')
  const [libraryId, setLibraryId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [status, setStatus] = useState(null) // { type: 'success'|'error', message }

  const authHeaders = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch('/api/flashtalking/credentials', { headers: authHeaders })
      .then((r) => r.json())
      .then((data) => {
        if (data.credentials) {
          setApiToken(data.credentials.api_token)
          setLibraryId(data.credentials.library_id)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSaveCredentials = async () => {
    if (!apiToken.trim() || !libraryId.trim()) {
      setStatus({ type: 'error', message: 'Both API token and Library ID are required' })
      return
    }
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/flashtalking/credentials', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_token: apiToken.trim(), library_id: libraryId.trim() }),
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
    if (!apiToken.trim() || !libraryId.trim()) {
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
          <div>
            <label className="block text-xs text-gray-400 mb-1">API Token</label>
            <input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Your Flashtalking API token"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Creative Library ID</label>
            <input
              type="text"
              value={libraryId}
              onChange={(e) => setLibraryId(e.target.value)}
              placeholder="e.g. 228657"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
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
              disabled={publishing || !apiToken || !libraryId}
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
