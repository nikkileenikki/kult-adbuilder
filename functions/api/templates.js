export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const rows = await env.DB.prepare(
    'SELECT id, name, category, width, height, data, custom_js, custom_css, created_by, created_at, updated_at FROM templates ORDER BY created_at DESC'
  ).all()

  const items = (rows.results || []).map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    width: r.width,
    height: r.height,
    data: JSON.parse(r.data),
    customJs: r.custom_js || '',
    customCss: r.custom_css || '',
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))

  return json({ items })
}

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const caller = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(session.user_id).first()
  if (!caller || caller.role !== 'admin') return json({ error: 'Forbidden' }, 403)

  const body = await request.json()
  const { name, category, width, height, elements, customJs, customCss } = body

  if (!name) return json({ error: 'name is required' }, 400)
  if (!width || !height) return json({ error: 'width and height are required' }, 400)
  if (!Array.isArray(elements)) return json({ error: 'elements must be an array' }, 400)

  const id = crypto.randomUUID()
  const data = JSON.stringify({ elements })

  await env.DB.prepare(
    'INSERT INTO templates (id, name, category, width, height, data, custom_js, custom_css, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, name, category || 'custom', width, height, data, customJs || '', customCss || '', session.user_id).run()

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

  const existing = await env.DB.prepare('SELECT id FROM templates WHERE id = ?').bind(id).first()
  if (!existing) return json({ error: 'Template not found' }, 404)

  const body = await request.json()
  const { name, category, width, height, elements, customJs, customCss } = body

  if (!name) return json({ error: 'name is required' }, 400)
  if (!width || !height) return json({ error: 'width and height are required' }, 400)
  if (!Array.isArray(elements)) return json({ error: 'elements must be an array' }, 400)

  const data = JSON.stringify({ elements })

  await env.DB.prepare(
    'UPDATE templates SET name = ?, category = ?, width = ?, height = ?, data = ?, custom_js = ?, custom_css = ?, updated_at = unixepoch() WHERE id = ?'
  ).bind(name, category || 'custom', width, height, data, customJs || '', customCss || '', id).run()

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

  await env.DB.prepare('DELETE FROM templates WHERE id = ?').bind(id).run()

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
