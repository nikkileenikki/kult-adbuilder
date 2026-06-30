const FT_BASE = 'https://api.flashtalking.net/crm/v1'

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const creds = await env.DB.prepare(
    'SELECT api_token FROM flashtalking_credentials WHERE user_id = ?'
  ).bind(session.user_id).first()

  if (!creds) return json({ error: 'No Flashtalking credentials configured' }, 400)

  // Fetch all pages
  const items = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const res = await fetch(`${FT_BASE}/creative-libraries?page=${page}&rpp=100&sort=name:asc`, {
      headers: { Authorization: `ApiToken ${creds.api_token}` },
    })
    if (!res.ok) {
      const text = await res.text()
      return json({ error: `Flashtalking error: ${res.status}`, detail: text }, 502)
    }
    const data = await res.json()
    items.push(...(data.items || []))
    totalPages = data.totalPages || 1
    page++
  }

  return json({ items: items.map((l) => ({ id: l.id, name: l.name, advertiserName: l.advertiserName || '' })) })
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
