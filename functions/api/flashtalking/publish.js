const FT_BASE = 'https://api.flashtalking.net/crm/v1'

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const creds = await env.DB.prepare(
    'SELECT api_token, library_id FROM flashtalking_credentials WHERE user_id = ?'
  ).bind(session.user_id).first()

  if (!creds) return json({ error: 'No Flashtalking credentials configured' }, 400)

  const formData = await request.formData()
  const file = formData.get('file')
  const filename = formData.get('filename') || 'banner.zip'

  if (!file) return json({ error: 'file is required' }, 400)

  const { api_token, library_id } = creds

  // Check if a creative with this filename already exists
  const searchUrl = `${FT_BASE}/creative-libraries/${library_id}/creatives?advancedFilter=in(filename,${encodeURIComponent(filename)})`
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `ApiToken ${api_token}` },
  })

  if (!searchRes.ok) {
    const text = await searchRes.text()
    return json({ error: `Flashtalking search failed: ${searchRes.status}`, detail: text }, 502)
  }

  const searchData = await searchRes.json()
  const existing = searchData.items?.[0]

  // Build multipart form for Flashtalking
  const ftForm = new FormData()
  ftForm.append('file', file, filename)

  let ftUrl, method
  if (existing) {
    ftUrl = `${FT_BASE}/creative-libraries/${library_id}/creatives/overwrite/${existing.id}`
    method = 'POST'
  } else {
    ftUrl = `${FT_BASE}/creative-libraries/${library_id}/creatives/import`
    method = 'POST'
  }

  const ftRes = await fetch(ftUrl, {
    method,
    headers: { Authorization: `ApiToken ${api_token}` },
    body: ftForm,
  })

  const ftData = await ftRes.json().catch(() => ({}))

  if (!ftRes.ok) {
    return json({ error: `Flashtalking upload failed: ${ftRes.status}`, detail: ftData }, 502)
  }

  return json({
    ok: true,
    action: existing ? 'overwritten' : 'imported',
    creativeId: ftData.id,
    filename: ftData.filename,
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
