const FT_BASE = 'https://api.flashtalking.net/crm/v1'
const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 300000 // 5 min — encoding takes longer than upload

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  if (!env.FT_EMAIL || !env.FT_PASSWORD) {
    return json({ error: 'Flashtalking credentials not configured' }, 500)
  }

  const body = await request.json()
  const { library_id: libraryId, video_id: videoId, name, width, height } = body

  if (!libraryId) return json({ error: 'library_id is required' }, 400)
  if (!videoId) return json({ error: 'video_id is required' }, 400)
  if (!name) return json({ error: 'name is required' }, 400)

  const basic = btoa(`${env.FT_EMAIL}:${env.FT_PASSWORD}`)
  const authHeader = { Authorization: `Basic ${basic}` }

  // Step 1: Kick off encode job
  const encodeBody = JSON.stringify([{
    videoSource: videoId,
    name,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  }])

  const encodeRes = await fetch(`${FT_BASE}/creative-libraries/${libraryId}/asset/video/encode-many`, {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: encodeBody,
  })

  if (!encodeRes.ok) {
    const text = await encodeRes.text()
    return json({ error: `FT encode-many failed: ${encodeRes.status}`, detail: text }, 502)
  }

  const encodeData = await encodeRes.json()
  const encodeJob = encodeData?.[0]
  if (!encodeJob?.jobId) {
    return json({ error: 'Unexpected FT encode response', detail: encodeData }, 502)
  }

  // Step 2: Poll encode job until complete
  const jobId = encodeJob.jobId
  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)
    const pollRes = await fetch(`${FT_BASE}/jobs/${jobId}`, { headers: authHeader })
    if (!pollRes.ok) continue

    const pollData = await pollRes.json()
    const status = pollData.status?.toLowerCase()

    if (status === 'complete' || status === 'completed') {
      const encoded = pollData.result || pollData
      const sizeMb = encoded.fileSize ? (encoded.fileSize / 1024 / 1024).toFixed(2) : null
      return json({
        ok: true,
        jobId,
        encodedVideoId: encoded.id,
        name: encoded.name,
        sizeMb,
        oversized: sizeMb !== null && parseFloat(sizeMb) > 2.5,
      })
    }
    if (status === 'failed' || status === 'error') {
      return json({ error: 'FT encode job failed', detail: pollData }, 502)
    }
  }

  return json({ error: 'Encode job timed out after 5 minutes' }, 504)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
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
