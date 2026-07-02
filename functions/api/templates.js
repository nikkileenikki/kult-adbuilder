export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const templateRows = await env.DB.prepare(
    'SELECT id, name, category, created_by, created_at, updated_at FROM templates ORDER BY created_at DESC'
  ).all()
  const sizeRows = await env.DB.prepare(
    'SELECT id, template_id, width, height, data, custom_html, custom_js, custom_css, custom_manifest, created_at, updated_at FROM template_sizes ORDER BY created_at ASC'
  ).all()

  const sizesByTemplate = new Map()
  for (const r of sizeRows.results || []) {
    const size = {
      id: r.id,
      width: r.width,
      height: r.height,
      data: JSON.parse(r.data),
      customHtml: r.custom_html || '',
      customJs: r.custom_js || '',
      customCss: r.custom_css || '',
      customManifest: r.custom_manifest || '',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }
    if (!sizesByTemplate.has(r.template_id)) sizesByTemplate.set(r.template_id, [])
    sizesByTemplate.get(r.template_id).push(size)
  }

  const items = (templateRows.results || []).map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    createdBy: t.created_by,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    sizes: sizesByTemplate.get(t.id) || [],
  })).filter((t) => t.sizes.length > 0)

  return json({ items })
}

// Create a new template (with its first size), or add a new size to an existing
// template if ?templateId= is given.
export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const caller = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(session.user_id).first()
  if (!caller || caller.role !== 'admin') return json({ error: 'Forbidden' }, 403)

  const url = new URL(request.url)
  const templateId = url.searchParams.get('templateId')
  const body = await request.json()
  const { name, category, width, height, elements, variables, customHtml, customJs, customCss, customManifest } = body

  if (!width || !height) return json({ error: 'width and height are required' }, 400)
  if (!Array.isArray(elements)) return json({ error: 'elements must be an array' }, 400)

  const data = JSON.stringify({ elements, variables: variables || [] })

  if (templateId) {
    const existing = await env.DB.prepare('SELECT id FROM templates WHERE id = ?').bind(templateId).first()
    if (!existing) return json({ error: 'Template not found' }, 404)

    const sizeId = crypto.randomUUID()
    await env.DB.prepare(
      'INSERT INTO template_sizes (id, template_id, width, height, data, custom_html, custom_js, custom_css, custom_manifest) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(sizeId, templateId, width, height, data, customHtml || '', customJs || '', customCss || '', customManifest || '').run()
    await env.DB.prepare('UPDATE templates SET updated_at = unixepoch() WHERE id = ?').bind(templateId).run()

    return json({ ok: true, id: templateId, sizeId })
  }

  if (!name) return json({ error: 'name is required' }, 400)

  const id = crypto.randomUUID()
  const sizeId = crypto.randomUUID()
  await env.DB.prepare(
    'INSERT INTO templates (id, name, category, created_by) VALUES (?, ?, ?, ?)'
  ).bind(id, name, category || 'custom', session.user_id).run()
  await env.DB.prepare(
    'INSERT INTO template_sizes (id, template_id, width, height, data, custom_html, custom_js, custom_css, custom_manifest) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(sizeId, id, width, height, data, customHtml || '', customJs || '', customCss || '', customManifest || '').run()

  return json({ ok: true, id, sizeId })
}

// Update a specific size (?sizeId=). Optionally rename/recategorize the parent template too.
export async function onRequestPut({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const caller = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(session.user_id).first()
  if (!caller || caller.role !== 'admin') return json({ error: 'Forbidden' }, 403)

  const url = new URL(request.url)
  const sizeId = url.searchParams.get('sizeId')
  if (!sizeId) return json({ error: 'sizeId query param is required' }, 400)

  const existing = await env.DB.prepare('SELECT template_id FROM template_sizes WHERE id = ?').bind(sizeId).first()
  if (!existing) return json({ error: 'Size not found' }, 404)

  const body = await request.json()
  const { name, category, width, height, elements, variables, customHtml, customJs, customCss, customManifest } = body

  if (!width || !height) return json({ error: 'width and height are required' }, 400)
  if (!Array.isArray(elements)) return json({ error: 'elements must be an array' }, 400)

  const data = JSON.stringify({ elements, variables: variables || [] })

  await env.DB.prepare(
    'UPDATE template_sizes SET width = ?, height = ?, data = ?, custom_html = ?, custom_js = ?, custom_css = ?, custom_manifest = ?, updated_at = unixepoch() WHERE id = ?'
  ).bind(width, height, data, customHtml || '', customJs || '', customCss || '', customManifest || '', sizeId).run()

  if (name) {
    await env.DB.prepare(
      'UPDATE templates SET name = ?, category = ?, updated_at = unixepoch() WHERE id = ?'
    ).bind(name, category || 'custom', existing.template_id).run()
  }

  return json({ ok: true })
}

// Delete a specific size (?sizeId=) — deletes the whole template too if it was the last size.
// Or delete an entire template and all its sizes (?id=).
export async function onRequestDelete({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const caller = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(session.user_id).first()
  if (!caller || caller.role !== 'admin') return json({ error: 'Forbidden' }, 403)

  const url = new URL(request.url)
  const sizeId = url.searchParams.get('sizeId')
  const id = url.searchParams.get('id')

  if (sizeId) {
    const existing = await env.DB.prepare('SELECT template_id FROM template_sizes WHERE id = ?').bind(sizeId).first()
    if (!existing) return json({ error: 'Size not found' }, 404)
    await env.DB.prepare('DELETE FROM template_sizes WHERE id = ?').bind(sizeId).run()
    const remaining = await env.DB.prepare('SELECT COUNT(*) as n FROM template_sizes WHERE template_id = ?').bind(existing.template_id).first()
    if (!remaining || remaining.n === 0) {
      await env.DB.prepare('DELETE FROM templates WHERE id = ?').bind(existing.template_id).run()
    }
    return json({ ok: true })
  }

  if (id) {
    await env.DB.prepare('DELETE FROM templates WHERE id = ?').bind(id).run()
    return json({ ok: true })
  }

  return json({ error: 'sizeId or id query param is required' }, 400)
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
