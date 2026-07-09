// Named brand guides (Nike, Uniqlo, ...) referenced by AI banner design so
// generations stay on-brand. Any authenticated user can read the list; only admins
// can create/edit/delete.
export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const rows = await env.DB.prepare('SELECT * FROM brands ORDER BY name ASC').all()
  return json({ brands: rows.results || [] })
}

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const caller = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(session.user_id).first()
  if (!caller || caller.role !== 'admin') return json({ error: 'Forbidden' }, 403)

  const body = await request.json()
  const name = (body.name || '').trim()
  if (!name) return json({ error: 'name is required' }, 400)

  const id = crypto.randomUUID()
  await env.DB.prepare(
    `INSERT INTO brands (id, name, primary_color, secondary_color, accent_color, text_color, font_family, tone, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, name,
    body.primaryColor || '', body.secondaryColor || '', body.accentColor || '', body.textColor || '',
    body.fontFamily || '', body.tone || '', body.notes || ''
  ).run()

  return json({ ok: true, id })
}

export async function onRequestPut({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const caller = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(session.user_id).first()
  if (!caller || caller.role !== 'admin') return json({ error: 'Forbidden' }, 403)

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return json({ error: 'id query param is required' }, 400)

  const existing = await env.DB.prepare('SELECT id FROM brands WHERE id = ?').bind(id).first()
  if (!existing) return json({ error: 'Brand not found' }, 404)

  const body = await request.json()
  const name = (body.name || '').trim()
  if (!name) return json({ error: 'name is required' }, 400)

  await env.DB.prepare(
    `UPDATE brands SET name = ?, primary_color = ?, secondary_color = ?, accent_color = ?, text_color = ?,
       font_family = ?, tone = ?, notes = ?, updated_at = unixepoch() WHERE id = ?`
  ).bind(
    name, body.primaryColor || '', body.secondaryColor || '', body.accentColor || '', body.textColor || '',
    body.fontFamily || '', body.tone || '', body.notes || '', id
  ).run()

  return json({ ok: true })
}

export async function onRequestDelete({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const caller = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(session.user_id).first()
  if (!caller || caller.role !== 'admin') return json({ error: 'Forbidden' }, 403)

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return json({ error: 'id query param is required' }, 400)

  await env.DB.prepare('DELETE FROM brands WHERE id = ?').bind(id).run()
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
