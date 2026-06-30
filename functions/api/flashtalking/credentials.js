export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const row = await env.DB.prepare(
    'SELECT api_token, library_id FROM flashtalking_credentials WHERE user_id = ?'
  ).bind(session.user_id).first()

  return json({ credentials: row || null })
}

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const { api_token, library_id } = await request.json()
  if (!api_token || !library_id) return json({ error: 'api_token and library_id are required' }, 400)

  const now = Math.floor(Date.now() / 1000)

  await env.DB.prepare(`
    INSERT INTO flashtalking_credentials (user_id, api_token, library_id, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET api_token = excluded.api_token, library_id = excluded.library_id, updated_at = excluded.updated_at
  `).bind(session.user_id, api_token, library_id, now).run()

  return json({ ok: true })
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
