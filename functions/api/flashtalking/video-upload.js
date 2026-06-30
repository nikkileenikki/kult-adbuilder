const FT_BASE = 'https://api.flashtalking.net/crm/v1'

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  if (!env.FT_EMAIL || !env.FT_PASSWORD) {
    return json({ error: 'Flashtalking credentials not configured' }, 500)
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const libraryId = formData.get('library_id')
  const filename = formData.get('filename') || file?.name || 'video.mp4'

  if (!file) return json({ error: 'file is required' }, 400)
  if (!libraryId) return json({ error: 'library_id is required' }, 400)

  const basic = btoa(`${env.FT_EMAIL}:${env.FT_PASSWORD}`)
  const authHeader = { Authorization: `Basic ${basic}` }

  // Step 1: Request upload slot — get S3 URL + job ID
  const uploadForm = new FormData()
  uploadForm.append('filename', filename)
  const uploadRes = await fetch(`${FT_BASE}/creative-libraries/${libraryId}/asset/video/upload-many`, {
    method: 'POST',
    headers: authHeader,
    body: uploadForm,
  })

  if (!uploadRes.ok) {
    const text = await uploadRes.text()
    return json({ error: `FT upload-many failed: ${uploadRes.status}`, detail: text }, 502)
  }

  const uploadData = await uploadRes.json()
  const uploadJob = uploadData?.[0]
  if (!uploadJob?.uploadUrl || !uploadJob?.jobId) {
    return json({ error: 'Unexpected FT upload response', detail: uploadData }, 502)
  }

  // Step 2: PUT file to S3
  const fileBuffer = await file.arrayBuffer()
  const s3Res = await fetch(uploadJob.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'video/mp4' },
    body: fileBuffer,
  })

  if (!s3Res.ok) {
    return json({ error: `S3 upload failed: ${s3Res.status}` }, 502)
  }

  // Return jobId immediately — client polls /api/flashtalking/video-job for status
  return json({ ok: true, jobId: uploadJob.jobId, phase: 'upload' })
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
