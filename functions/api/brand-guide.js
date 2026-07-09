// Single-row brand guide, referenced by AI banner design (functions/api/ai-design.js)
// so generations stay on-brand. Any authenticated user can read it (needed by the
// design flow); only admins can edit it.
export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const row = await env.DB.prepare('SELECT * FROM brand_guide WHERE id = ?').bind('default').first()
  return json({ guide: row || null })
}

export async function onRequestPut({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const caller = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(session.user_id).first()
  if (!caller || caller.role !== 'admin') return json({ error: 'Forbidden' }, 403)

  const body = await request.json()
  const { primaryColor, secondaryColor, accentColor, textColor, fontFamily, tone, notes } = body

  await env.DB.prepare(
    `INSERT INTO brand_guide (id, primary_color, secondary_color, accent_color, text_color, font_family, tone, notes, updated_at)
     VALUES ('default', ?, ?, ?, ?, ?, ?, ?, unixepoch())
     ON CONFLICT(id) DO UPDATE SET
       primary_color = excluded.primary_color,
       secondary_color = excluded.secondary_color,
       accent_color = excluded.accent_color,
       text_color = excluded.text_color,
       font_family = excluded.font_family,
       tone = excluded.tone,
       notes = excluded.notes,
       updated_at = unixepoch()`
  ).bind(
    primaryColor || '', secondaryColor || '', accentColor || '', textColor || '', fontFamily || '', tone || '', notes || ''
  ).run()

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
