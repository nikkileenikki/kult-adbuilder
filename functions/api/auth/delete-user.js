export async function onRequestDelete({ request, env }) {
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

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return json({ error: 'id query param is required' }, 400)

  if (id === session.user_id) return json({ error: 'Cannot delete your own account' }, 400)

  // Delete sessions first, then user
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run()
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()

  return json({ ok: true })
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
