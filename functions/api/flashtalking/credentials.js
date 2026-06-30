export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const row = await env.DB.prepare(
    'SELECT ft_email, library_id, library_name, library_advertiser FROM flashtalking_credentials WHERE user_id = ?'
  ).bind(session.user_id).first()

  return json({ credentials: row || null })
}

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const { ft_email, ft_password, library_id, library_name, library_advertiser } = await request.json()
  if (!ft_email || !ft_password) return json({ error: 'Email and password are required' }, 400)

  const now = Math.floor(Date.now() / 1000)

  // Store email and password (password stored for use in proxied calls)
  await env.DB.prepare(`
    INSERT INTO flashtalking_credentials (user_id, ft_email, ft_password, library_id, library_name, library_advertiser, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      ft_email = excluded.ft_email,
      ft_password = excluded.ft_password,
      library_id = excluded.library_id,
      library_name = excluded.library_name,
      library_advertiser = excluded.library_advertiser,
      updated_at = excluded.updated_at
  `).bind(session.user_id, ft_email, ft_password, library_id || '', library_name || '', library_advertiser || '', now).run()

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
