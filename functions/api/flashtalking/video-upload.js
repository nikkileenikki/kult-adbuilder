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

  const uploadRawText = await uploadRes.text()
  if (!uploadRes.ok) {
    return json({ error: `FT upload-many failed: ${uploadRes.status}`, detail: uploadRawText }, 502)
  }

  let uploadData
  try { uploadData = JSON.parse(uploadRawText) } catch { uploadData = uploadRawText }

  const uploadJob = Array.isArray(uploadData) ? uploadData[0] : uploadData
  if (!uploadJob?.uploadUrl || !uploadJob?.jobId) {
    return json({ error: 'Unexpected FT upload response', detail: uploadData }, 502)
  }

  // Return the upload slot to the client — client PUTs to S3 directly then calls /video-s3-done
  return json({ ok: true, uploadUrl: uploadJob.uploadUrl, jobId: uploadJob.jobId, contentType: file.type || 'video/mp4', phase: 'slot' })
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
