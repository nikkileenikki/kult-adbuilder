const FT_BASE = 'https://api.flashtalking.net/crm/v1'

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  if (!env.FT_EMAIL || !env.FT_PASSWORD) {
    return json({ error: 'Flashtalking credentials not configured' }, 500)
  }

  const url = new URL(request.url)
  const libraryId = url.searchParams.get('library_id')
  if (!libraryId) return json({ error: 'library_id is required' }, 400)

  const basic = btoa(`${env.FT_EMAIL}:${env.FT_PASSWORD}`)
  const items = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const res = await fetch(`${FT_BASE}/creative-libraries/${libraryId}/asset/video?page=${page}&rpp=100`, {
      headers: { Authorization: `Basic ${basic}` },
    })
    const rawText = await res.text()
    if (!res.ok) {
      return json({ error: `FT asset list failed: ${res.status}`, detail: rawText }, 502)
    }
    let data
    try { data = JSON.parse(rawText) } catch { data = { items: [] } }
    const pageItems = Array.isArray(data) ? data : (data.items || [])
    items.push(...pageItems)
    totalPages = data.totalPages || 1
    page++
  }

  // Encoded assets carry an encoded/source video id; raw uploads don't.
  const normalized = items.map((it) => ({
    id: it.id,
    name: it.name || it.filename || `video-${it.id}`,
    sizeMb: it.fileSize ? (it.fileSize / 1024 / 1024).toFixed(2) : null,
    encoded: !!(it.videoSource || it.sourceId || it.encoded),
    raw: it,
  }))

  return json({
    uploaded: normalized.filter((v) => !v.encoded),
    transcoded: normalized.filter((v) => v.encoded),
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
