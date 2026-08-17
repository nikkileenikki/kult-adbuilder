import React, { useState } from 'react'
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

// Temporary diagnostic — checks whether the configured FT_EMAIL/FT_PASSWORD have
// access to Flashtalking's Reporting API (a separate host/product from the CRM API
// the rest of the app uses). Also offers a one-click check against the existing,
// known-working Libraries endpoint, to tell a general session/auth problem apart from
// something specific to the Reporting API itself. Remove this once no longer needed —
// it and its backing route (functions/api/flashtalking/test-report.js) aren't part of
// the app's normal feature set.
export default function FtReportTestModal({ onClose }) {
  const { token } = useAuthStore()
  useEscapeKey(onClose)

  const [reportId, setReportId] = useState('325957')
  const [loading, setLoading] = useState(null) // 'report' | 'libraries' | null
  const [result, setResult] = useState(null)

  const run = async (which) => {
    setLoading(which)
    setResult(null)
    try {
      const url = which === 'report' ? `/api/flashtalking/test-report?id=${encodeURIComponent(reportId)}` : '/api/flashtalking/libraries'
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
    <Modal>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">
          <i className="fa-solid fa-flask text-purple-400" />
          Flashtalking Reporting API Test
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Temporary diagnostic — checks whether the account's credentials can reach Flashtalking's Reporting API. Remove this once done.
        </p>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 shrink-0">Report ID</label>
          <input
            value={reportId}
            onChange={(e) => setReportId(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => run('report')}
            disabled={loading !== null}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            {loading === 'report' ? 'Testing…' : 'Test Reporting API'}
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
            <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all max-h-64 overflow-auto">
              {result.error || JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  )
}
