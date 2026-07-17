import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore.js'
import { useUiStore } from '../../store/uiStore.js'

const BLANK = {
  name: '', primaryColor: '', secondaryColor: '', accentColor: '', textColor: '', fontFamily: '', tone: '', notes: '',
}

function ColorField({ label, value, onChange, disabled }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-8 h-8 rounded border border-gray-700 bg-gray-800 cursor-pointer shrink-0 disabled:opacity-50"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        disabled={disabled}
        className="flex-1 min-w-0 bg-gray-800 text-gray-100 rounded px-2 py-1 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
      />
    </label>
  )
}

// Named brand guides (Nike, Uniqlo, ...) — embeddable content (no modal chrome), used
// inside SettingsPage. Bumps uiStore.brandListVersion on any change so the header's
// Brand select (used by AI generation) stays in sync.
export default function BrandGuideContent() {
  const { token, user } = useAuthStore()
  const { refreshBrandList } = useUiStore()
  const isAdmin = user?.role === 'admin'

  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null) // null = "+ New Brand"
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [aiOpen, setAiOpen] = useState(false)
  const [aiBrief, setAiBrief] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

  const load = () => {
    setLoading(true)
    fetch('/api/brand-guide', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setBrands(data.brands || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [token])

  const selectBrand = (brand) => {
    if (!brand) {
      setSelectedId(null)
      setForm(BLANK)
      return
    }
    setSelectedId(brand.id)
    setForm({
      name: brand.name || '',
      primaryColor: brand.primary_color || '',
      secondaryColor: brand.secondary_color || '',
      accentColor: brand.accent_color || '',
      textColor: brand.text_color || '',
      fontFamily: brand.font_family || '',
      tone: brand.tone || '',
      notes: brand.notes || '',
    })
  }

  const set = (key) => (v) => setForm((f) => ({ ...f, [key]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Brand name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const qs = selectedId ? `?id=${selectedId}` : ''
      const res = await fetch(`/api/brand-guide${qs}`, {
        method: selectedId ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save brand')
      load()
      refreshBrandList()
      if (!selectedId) selectBrand(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Fills the (unsaved) form from an AI-generated draft — the user still reviews/edits
  // every field and clicks "Create Brand" themselves, same as filling it in by hand.
  const handleAiBuild = async () => {
    const brief = aiBrief.trim()
    if (!brief) return
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai-brand', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI brand generation failed')
      setSelectedId(null)
      setForm({
        name: data.name || '',
        primaryColor: data.primaryColor || '',
        secondaryColor: data.secondaryColor || '',
        accentColor: data.accentColor || '',
        textColor: data.textColor || '',
        fontFamily: data.fontFamily || '',
        tone: data.tone || '',
        notes: data.notes || '',
      })
      setAiOpen(false)
      setAiBrief('')
    } catch (err) {
      setAiError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedId) return
    if (!confirm(`Delete "${form.name}"?`)) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/brand-guide?id=${selectedId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete brand')
      selectBrand(null)
      load()
      refreshBrandList()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-white font-semibold text-base mb-1">Brand Guide</h2>
      <p className="text-xs text-gray-500 mb-4">
        Save a guide per brand (Nike, Uniqlo, ...) — pick one when using "Design with AI" to keep colors and copy on-brand.
      </p>

      <div className="flex gap-6" style={{ minHeight: 420 }}>
        {/* Brand list */}
        <div className="w-44 shrink-0 border-r border-gray-700 pr-4 overflow-y-auto">
          {isAdmin && (
            <button
              onClick={() => selectBrand(null)}
              className={`w-full text-left text-xs px-2 py-1.5 rounded mb-1 ${!selectedId ? 'bg-purple-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
            >
              <i className="fa-solid fa-plus mr-1" style={{ fontSize: 10 }} /> New Brand
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => { setAiOpen((v) => !v); setAiError(null) }}
              className={`w-full text-left text-xs px-2 py-1.5 rounded mb-3 ${aiOpen ? 'bg-purple-700 text-white' : 'text-purple-300 hover:bg-gray-800'}`}
            >
              <i className="fa-solid fa-wand-magic-sparkles mr-1" style={{ fontSize: 10 }} /> Build with AI
            </button>
          )}
          {loading && <p className="text-xs text-gray-600 italic px-2">Loading…</p>}
          {!loading && brands.length === 0 && <p className="text-xs text-gray-600 italic px-2">No brands yet.</p>}
          {brands.map((b) => (
            <button
              key={b.id}
              onClick={() => selectBrand(b)}
              className={`w-full text-left text-xs px-2 py-1.5 rounded truncate mb-0.5 ${selectedId === b.id ? 'bg-purple-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
            >
              {b.name}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0 space-y-3">
          {aiOpen && (
            <div className="bg-gray-800/60 border border-purple-800 rounded-lg p-3 space-y-2">
              <p className="text-xs text-gray-400">
                Describe the brand (name and/or a short description) — the AI will fill in the fields below for you to review before creating it.
              </p>
              <div className="flex items-end gap-1.5">
                <textarea
                  value={aiBrief}
                  onChange={(e) => setAiBrief(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiBuild() } }}
                  rows={2}
                  placeholder="e.g. Nike, or: a cozy neighborhood coffee shop called Fernwood"
                  className="flex-1 min-w-0 bg-gray-900 text-gray-100 rounded px-2 py-1.5 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none resize-none"
                />
                <button
                  onClick={handleAiBuild}
                  disabled={aiLoading || !aiBrief.trim()}
                  className="shrink-0 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white px-3 py-1.5 rounded text-xs font-medium"
                >
                  {aiLoading ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 11 }} /> : 'Fill in'}
                </button>
              </div>
              {aiError && <p className="text-xs text-red-400">{aiError}</p>}
            </div>
          )}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Brand Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
              placeholder="e.g. Nike"
              disabled={!isAdmin}
              className="w-full bg-gray-800 text-gray-100 rounded px-2 py-1.5 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Primary" value={form.primaryColor} onChange={set('primaryColor')} disabled={!isAdmin} />
            <ColorField label="Secondary" value={form.secondaryColor} onChange={set('secondaryColor')} disabled={!isAdmin} />
            <ColorField label="Accent" value={form.accentColor} onChange={set('accentColor')} disabled={!isAdmin} />
            <ColorField label="Text" value={form.textColor} onChange={set('textColor')} disabled={!isAdmin} />
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

          {error && <p className="text-xs text-red-400">{error}</p>}

          {isAdmin && (
            <div className="flex gap-2 pt-1">
              {selectedId && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="bg-red-900/40 hover:bg-red-900/70 text-red-300 px-3 py-1.5 rounded text-xs mr-auto"
                >
                  Delete
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium"
              >
                {saving ? 'Saving…' : selectedId ? 'Save Changes' : 'Create Brand'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
