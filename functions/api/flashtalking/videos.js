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
  const authHeader = { Authorization: `Basic ${basic}` }

  const fetchByStatus = async (encodedStatus) => {
    const items = []
    let page = 1
    let totalPages = 1
    while (page <= totalPages) {
      const res = await fetch(
        `${FT_BASE}/creative-libraries/${libraryId}/asset/video?encodedStatus=${encodedStatus}&page=${page}&rpp=100`,
        { headers: authHeader }
      )
      const rawText = await res.text()
      if (!res.ok) {
        throw new Error(JSON.stringify({ status: res.status, detail: rawText }))
      }
      let data
      try { data = JSON.parse(rawText) } catch { data = { items: [] } }
      const pageItems = Array.isArray(data) ? data : (data.items || [])
      items.push(...pageItems)
      totalPages = data.totalPages || 1
      page++
    }
    return items
  }

  const normalize = (items) => {
    const normalized = items.map((it) => ({
      id: it.id,
      videoSource: it.videoSource,
      name: it.name || it.filename || `video-${it.id}`,
      sizeMb: (it.filesize || it.fileSize) ? ((it.filesize || it.fileSize) / 1024 / 1024).toFixed(2) : null,
      createdAt: it.lastModified || it.createdAt || it.dateCreated || it.uploadedAt || it.uploadDate || null,
    }))
    normalized.sort((a, b) => {
      if (a.createdAt && b.createdAt) return new Date(b.createdAt) - new Date(a.createdAt)
      return (b.id || 0) - (a.id || 0)
    })
    return normalized
  }

  try {
    const [rawUploaded, rawTranscoded] = await Promise.all([fetchByStatus(0), fetchByStatus(1)])
    return json({
      uploaded: normalize(rawUploaded),
      transcoded: normalize(rawTranscoded),
      // Raw FT payloads for both filter values — inspect via browser devtools if a bucket looks wrong,
      // since FT doesn't publicly document what encodedStatus values mean.
      debug: { rawUploadedSample: rawUploaded.slice(0, 3), rawUploadedCount: rawUploaded.length, rawTranscodedSample: rawTranscoded.slice(0, 3), rawTranscodedCount: rawTranscoded.length },
    })
  } catch (err) {
    let detail = err.message
    try {
      const parsed = JSON.parse(err.message)
      return json({ error: `FT asset list failed: ${parsed.status}`, detail: parsed.detail }, 502)
    } catch {
      return json({ error: 'FT asset list failed', detail }, 502)
    }
  }
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
