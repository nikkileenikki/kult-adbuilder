export async function onRequestGet({ request, env }) {
  const token = getBearerToken(request)
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const now = Math.floor(Date.now() / 1000)
  const session = await env.DB.prepare(
    'SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first()
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const caller = await env.DB.prepare(
    'SELECT role FROM users WHERE id = ?'
  ).bind(session.user_id).first()
  if (!caller || caller.role !== 'admin') return json({ error: 'Forbidden' }, 403)

  const { results } = await env.DB.prepare(
    'SELECT id, username, display_name, email, role, disabled, created_at FROM users ORDER BY created_at ASC'
  ).all()

  return json({ users: results })
}

function getBearerToken(request) {
  const auth = request.headers.get('Authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
