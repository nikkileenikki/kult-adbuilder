import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore.js'
import useEscapeKey from '../../hooks/useEscapeKey.js'

function Modal({ children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg shadow-2xl">
        {children}
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-24 shrink-0">{label}</span>
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-gray-700 bg-gray-800 cursor-pointer shrink-0"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        className="flex-1 min-w-0 bg-gray-800 text-gray-100 rounded px-2 py-1 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none"
      />
    </label>
  )
}

export default function BrandGuideModal({ onClose }) {
  const { token, user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  useEscapeKey(onClose)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    primaryColor: '', secondaryColor: '', accentColor: '', textColor: '', fontFamily: '', tone: '', notes: '',
  })

  useEffect(() => {
    fetch('/api/brand-guide', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.guide) {
          setForm({
            primaryColor: data.guide.primary_color || '',
            secondaryColor: data.guide.secondary_color || '',
            accentColor: data.guide.accent_color || '',
            textColor: data.guide.text_color || '',
            fontFamily: data.guide.font_family || '',
            tone: data.guide.tone || '',
            notes: data.guide.notes || '',
          })
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const set = (key) => (v) => setForm((f) => ({ ...f, [key]: v }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/brand-guide', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save brand guide')
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">
          <i className="fa-solid fa-swatchbook text-purple-400" />
          Brand Guide
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Used by "Design with AI" to keep colors and copy on-brand across every generation.
      </p>

      {loading ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Primary" value={form.primaryColor} onChange={set('primaryColor')} />
            <ColorField label="Secondary" value={form.secondaryColor} onChange={set('secondaryColor')} />
            <ColorField label="Accent" value={form.accentColor} onChange={set('accentColor')} />
            <ColorField label="Text" value={form.textColor} onChange={set('textColor')} />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Font Family</label>
            <input
              type="text"
              value={form.fontFamily}
              onChange={(e) => set('fontFamily')(e.target.value)}
              placeholder="e.g. Helvetica, Arial, sans-serif"
              disabled={!isAdmin}
              className="w-full bg-gray-800 text-gray-100 rounded px-2 py-1.5 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Tone / Voice</label>
            <textarea
              value={form.tone}
              onChange={(e) => set('tone')(e.target.value)}
              rows={2}
              placeholder="e.g. Confident, energetic, no exclamation points"
              disabled={!isAdmin}
              className="w-full bg-gray-800 text-gray-100 rounded px-2 py-1.5 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none resize-y disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes')(e.target.value)}
              rows={2}
              placeholder="Taglines, do's/don'ts, anything else the AI should know"
              disabled={!isAdmin}
              className="w-full bg-gray-800 text-gray-100 rounded px-2 py-1.5 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none resize-y disabled:opacity-50"
            />
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-xs">
          {isAdmin ? 'Cancel' : 'Close'}
        </button>
        {isAdmin && (
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
    </Modal>
  )
}
