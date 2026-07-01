const FT_BASE = 'https://api.flashtalking.net/crm/v1'

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  if (!env.FT_EMAIL || !env.FT_PASSWORD) {
    return json({ error: 'Flashtalking credentials not configured' }, 500)
  }

  const body = await request.json()
  const { library_id: libraryId, video_source: videoSource, name } = body

  if (!libraryId) return json({ error: 'library_id is required' }, 400)
  if (!videoSource) return json({ error: 'video_source is required' }, 400)
  if (!name) return json({ error: 'name is required' }, 400)

  const basic = btoa(`${env.FT_EMAIL}:${env.FT_PASSWORD}`)
  const authHeader = { Authorization: `Basic ${basic}` }

  // encode-many keeps rejecting the array-of-{videoSource,name} shape with a bare 400 —
  // try a handful of plausible request shapes and stop at the first one FT accepts.
  const candidates = [
    { label: 'array-videoSource', body: [{ videoSource: String(videoSource), name }] },
    { label: 'object-videoSource', body: { videoSource: String(videoSource), name } },
    { label: 'assets-wrapper', body: { assets: [{ videoSource: String(videoSource), name }] } },
    { label: 'array-source', body: [{ source: String(videoSource), name }] },
    { label: 'array-assetId', body: [{ assetId: String(videoSource), name }] },
  ]

  const attempts = []
  for (const candidate of candidates) {
    const encodeRes = await fetch(`${FT_BASE}/creative-libraries/${libraryId}/asset/video/encode-many`, {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(candidate.body),
    })

    if (encodeRes.ok) {
      const encodeData = await encodeRes.json()
      const encodeJob = Array.isArray(encodeData) ? encodeData[0] : encodeData
      if (encodeJob?.jobId) {
        // Return jobId immediately — client polls /api/flashtalking/video-job for status
        return json({ ok: true, jobId: encodeJob.jobId, phase: 'encode', workingShape: candidate.label })
      }
      attempts.push({ label: candidate.label, status: encodeRes.status, detail: 'ok but no jobId', response: encodeData })
      continue
    }

    const text = await encodeRes.text()
    attempts.push({ label: candidate.label, status: encodeRes.status, detail: text })
  }

  return json({ error: 'FT encode-many failed for all attempted request shapes', attempts }, 502)
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
