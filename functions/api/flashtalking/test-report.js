// One-off diagnostic: checks whether the configured FT_EMAIL/FT_PASSWORD have access
// to Flashtalking's Reporting API — pass ?id=<reportID> to probe a specific report,
// e.g. /api/flashtalking/test-report?id=325957.
//
// `host=crm` (default) tries reports under the same host+auth as the already-working
// /api/flashtalking/libraries endpoint (api.flashtalking.net/crm/v1) — this account
// only ever authenticates with FT_EMAIL/FT_PASSWORD (no separate devKey/appKey), which
// matches the newer CRM API's plain Basic-auth pattern, not the older
// devKey/appKey-plus-token-exchange API a legacy reference client pointed at
// report-request.flashtalking.net. `host=legacy` is kept only to rule that host back
// in if it turns out to matter.
const FT_CRM_BASE = 'https://api.flashtalking.net/crm/v1'
const FT_LEGACY_BASE = 'https://report-request.flashtalking.net'

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  if (!env.FT_EMAIL || !env.FT_PASSWORD) {
    return json({ error: 'Flashtalking credentials not configured' }, 500)
  }

  const url = new URL(request.url)
  const reportId = url.searchParams.get('id')
  const base = url.searchParams.get('host') === 'legacy' ? FT_LEGACY_BASE : FT_CRM_BASE
  const basic = btoa(`${env.FT_EMAIL}:${env.FT_PASSWORD}`)

  // No id -> "Display Report List" (GET /report); an id -> "Display Report Status"
  // for that specific report (GET /report/<id>).
  const target = reportId ? `${base}/report/${reportId}` : `${base}/report`
  const res = await fetch(target, {
    headers: { Authorization: `Basic ${basic}` },
  })
  const text = await res.text()
  let body = text
  try { body = JSON.parse(text) } catch (_) { /* keep as text */ }

  return json({ ok: res.ok, status: res.status, url: target, body })
}

async function getSession(request, env) {
  const token = getBearerToken(request)
  if (!token) return null
  const now = Math.floor(Date.now() / 1000)
  return env.DB.prepare(
    'SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first()
}

function getBearerToken(request) {
  const auth = request.headers.get('Authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
