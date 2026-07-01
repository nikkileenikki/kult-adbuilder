const FT_BASE = 'https://api.flashtalking.net/crm/v1'

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  if (!env.FT_EMAIL || !env.FT_PASSWORD) {
    return json({ error: 'Flashtalking credentials not configured' }, 500)
  }

  const body = await request.json()
  const { library_id: libraryId, video_source: videoSource, name, width, height } = body

  if (!libraryId) return json({ error: 'library_id is required' }, 400)
  if (!videoSource) return json({ error: 'video_source is required' }, 400)
  if (!name) return json({ error: 'name is required' }, 400)

  const basic = btoa(`${env.FT_EMAIL}:${env.FT_PASSWORD}`)
  const authHeader = { Authorization: `Basic ${basic}` }

  const encodeSpec = { videoSource: String(videoSource), name }
  if (width) encodeSpec.width = Number(width)
  if (height) encodeSpec.height = Number(height)
  const requestBody = [encodeSpec]

  const encodeRes = await fetch(`${FT_BASE}/creative-libraries/${libraryId}/asset/video/encode-many`, {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  if (!encodeRes.ok) {
    const text = await encodeRes.text()
    return json({ error: `FT encode-many failed: ${encodeRes.status}`, detail: text, sent: requestBody }, 502)
  }

  const encodeData = await encodeRes.json()
  const encodeJob = encodeData?.[0]
  if (!encodeJob?.jobId) {
    return json({ error: 'Unexpected FT encode response', detail: encodeData }, 502)
  }

  // Return jobId immediately — client polls /api/flashtalking/video-job for status
  return json({ ok: true, jobId: encodeJob.jobId, phase: 'encode' })
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
