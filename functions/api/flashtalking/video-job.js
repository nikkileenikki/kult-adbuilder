const FT_BASE = 'https://api.flashtalking.net/crm/v1'

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  if (!env.FT_EMAIL || !env.FT_PASSWORD) {
    return json({ error: 'Flashtalking credentials not configured' }, 500)
  }

  const url = new URL(request.url)
  const jobId = url.searchParams.get('job_id')
  if (!jobId) return json({ error: 'job_id is required' }, 400)

  const basic = btoa(`${env.FT_EMAIL}:${env.FT_PASSWORD}`)
  const res = await fetch(`${FT_BASE}/jobs/${jobId}`, {
    headers: { Authorization: `Basic ${basic}` },
  })

  if (!res.ok) {
    const text = await res.text()
    return json({ error: `FT job fetch failed: ${res.status}`, detail: text }, 502)
  }

  const data = await res.json()
  const status = data.status?.toLowerCase()
  const done = status === 'complete' || status === 'completed'
  const failed = status === 'failed' || status === 'error'

  if (failed) {
    return json({ ok: false, status, error: 'Job failed', detail: data })
  }

  if (!done) {
    return json({ ok: false, status, pending: true })
  }

  // Job complete — extract result fields for encode jobs
  const result = data.result || data
  const sizeMb = result.fileSize ? (result.fileSize / 1024 / 1024).toFixed(2) : null

  return json({
    ok: true,
    status,
    videoId: result.id,
    name: result.name,
    sizeMb,
    oversized: sizeMb !== null && parseFloat(sizeMb) > 2.5,
  })
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
