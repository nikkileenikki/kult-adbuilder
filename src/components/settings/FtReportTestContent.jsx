import React, { useState } from 'react'
import { useAuthStore } from '../../store/authStore.js'

// Temporary diagnostic — checks whether the configured FT_EMAIL/FT_PASSWORD have
// access to Flashtalking's Reporting API (a separate host/product from the CRM API
// the rest of the app uses). Also offers a one-click check against the existing,
// known-working Libraries endpoint, to tell a general session/auth problem apart from
// something specific to the Reporting API itself. Remove this once no longer needed —
// it and its backing route (functions/api/flashtalking/test-report.js) aren't part of
// the app's normal feature set.
export default function FtReportTestContent() {
  const { token } = useAuthStore()

  const [reportId, setReportId] = useState('')
  // 'legacy' (report-request.flashtalking.net) turned out to be the real, working
  // host — it returned a proper structured Flashtalking XML error
  // (<errorCode>204</errorCode><error>no reports found</error>) for a report ID that
  // doesn't exist, meaning auth succeeded and the API itself responded. 'crm'
  // (api.flashtalking.net/crm/v1, same host+auth as the working Libraries call) was
  // ruled out — it 404s with a generic server error page, meaning that route doesn't
  // exist there at all.
  const [host, setHost] = useState('legacy')
  const [loading, setLoading] = useState(null) // 'report' | 'libraries' | null
  const [result, setResult] = useState(null)

  const run = async (which) => {
    setLoading(which)
    setResult(null)
    try {
      // Empty id -> "Display Report List" (lists what actually exists on this
      // account); an id -> "Display Report Status" for that specific report.
      const params = new URLSearchParams()
      if (reportId) params.set('id', reportId)
      params.set('host', host)
      const qs = params.toString()
      const url = which === 'report'
        ? `/api/flashtalking/test-report${qs ? `?${qs}` : ''}`
        : '/api/flashtalking/libraries'
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setResult({ which, httpStatus: res.status, data })
    } catch (err) {
      setResult({ which, error: err.message })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h2 className="text-white font-semibold text-sm flex items-center gap-2 mb-1">
          <i className="fa-solid fa-flask text-purple-400" />
          Flashtalking Reporting API Test
        </h2>
        <p className="text-xs text-gray-500">
          Temporary diagnostic — checks whether the account's credentials can reach Flashtalking's Reporting API. Remove this once done.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400 shrink-0">Report ID</label>
        <input
          value={reportId}
          onChange={(e) => setReportId(e.target.value)}
          placeholder="leave blank to list all reports"
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400 shrink-0">API Host</label>
        <select
          value={host}
          onChange={(e) => setHost(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
        >
          <option value="legacy">report-request.flashtalking.net — real API, confirmed working</option>
          <option value="crm">CRM API (api.flashtalking.net/crm/v1) — ruled out, no /report route</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => run('report')}
          disabled={loading !== null}
          className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
        >
          {loading === 'report' ? 'Testing…' : reportId ? 'Test Report Status' : 'List All Reports'}
        </button>
        <button
          onClick={() => run('libraries')}
          disabled={loading !== null}
          title="Sanity check against the already-working Libraries endpoint, to rule out a general session/auth problem"
          className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 border border-gray-700 rounded-lg py-2 text-sm font-medium transition-colors"
        >
          {loading === 'libraries' ? 'Testing…' : 'Test Libraries API (sanity check)'}
        </button>
      </div>

      {result && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-1.5">
          <p className="text-xs text-gray-400">
            {result.which === 'report' ? 'Reporting API' : 'Libraries API'} — {result.error ? 'request failed' : `HTTP ${result.httpStatus}`}
          </p>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all max-h-64 overflow-auto select-text" style={{ userSelect: 'text' }}>
            {result.error || JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
