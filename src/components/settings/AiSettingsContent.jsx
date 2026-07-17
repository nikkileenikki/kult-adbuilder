import React, { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../store/authStore.js'

// Admin-only: which AI provider/model Design with AI uses server-side. API keys
// themselves are Cloudflare secrets set outside the app — this only picks provider +
// model; /api/ai-settings reports whether each provider's secret is actually
// configured so a mismatched selection is visible before it causes a failed request.
export default function AiSettingsContent() {
  const { token } = useAuthStore()
  const authHeader = { Authorization: `Bearer ${token}` }

  const [provider, setProvider] = useState('anthropic')
  const [model, setModel] = useState('')
  const [models, setModels] = useState({ anthropic: [], openai: [] })
  const [keysConfigured, setKeysConfigured] = useState({ anthropic: false, openai: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/ai-settings', { headers: authHeader })
      .then((r) => r.json())
      .then((data) => {
        setProvider(data.provider)
        setModel(data.model)
        setModels(data.models || { anthropic: [], openai: [] })
        setKeysConfigured(data.keysConfigured || { anthropic: false, openai: false })
      })
      .catch(() => setStatus({ type: 'error', message: 'Failed to load AI settings' }))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  const onProviderChange = (v) => {
    setProvider(v)
    setModel(models[v]?.[0]?.value || '')
  }

  const onSave = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/ai-settings', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setStatus({ type: 'success', message: 'Saved.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>

  const keyMissing = !keysConfigured[provider]

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">AI Settings</h2>
        <p className="text-sm text-gray-400">
          Choose which AI provider and model Design with AI uses to generate banner copy, layout, and color palette.
        </p>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">Provider</label>
        <select
          value={provider}
          onChange={(e) => onProviderChange(e.target.value)}
          className="w-full bg-gray-800 rounded px-3 py-2 text-sm text-gray-100 border border-gray-700 focus:border-purple-500 focus:outline-none"
        >
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full bg-gray-800 rounded px-3 py-2 text-sm text-gray-100 border border-gray-700 focus:border-purple-500 focus:outline-none"
        >
          {(models[provider] || []).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {keyMissing && (
        <div className="text-xs text-amber-400 bg-amber-950/30 border border-amber-900 rounded px-3 py-2 flex items-start gap-2">
          <i className="fa-solid fa-triangle-exclamation mt-0.5" style={{ fontSize: 12 }} />
          <span>
            No {provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'} secret is configured for this provider yet.
            Design with AI will fail until it's set in the Cloudflare Pages project settings.
          </span>
        </div>
      )}

      <button
        onClick={onSave}
        disabled={saving}
        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>

      {status && (
        <p className={`text-xs ${status.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{status.message}</p>
      )}
    </div>
  )
}
