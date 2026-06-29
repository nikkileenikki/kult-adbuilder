export async function onRequestPatch({ request, env }) {
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

  const { id, disabled, role } = await request.json()
  if (!id) return json({ error: 'id is required' }, 400)

  // Prevent admin from disabling themselves
  if (id === session.user_id && disabled === true) {
    return json({ error: 'Cannot disable your own account' }, 400)
  }

  const fields = []
  const values = []

  if (disabled !== undefined) { fields.push('disabled = ?'); values.push(disabled ? 1 : 0) }
  if (role !== undefined) { fields.push('role = ?'); values.push(role) }
  if (!fields.length) return json({ error: 'Nothing to update' }, 400)

  fields.push('updated_at = ?')
  values.push(now)
  values.push(id)

  await env.DB.prepare(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run()

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
