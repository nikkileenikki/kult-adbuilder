// Admin-configurable choice of AI provider/model for Design with AI (functions/api/
// ai-design.js reads this same table directly). API keys are never stored here or
// returned to the client — they stay Cloudflare secrets; this endpoint only reports
// whether each provider's secret is configured, so the admin UI can warn if a provider
// is selected without its key set.
const MODELS = {
  anthropic: [
    { value: 'claude-sonnet-5', label: 'Claude Sonnet 5 (recommended)' },
    { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 (highest quality, slower)' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fastest, cheapest)' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o mini (fastest, cheapest)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-5.6-terra', label: 'GPT-5.6 Terra (primary creative and brand)' },
    { value: 'gpt-5.6-sol', label: 'GPT-5.6 Sol (premium brand guide and final review)' },
    { value: 'gpt-5.6-luna', label: 'GPT-5.6 Luna (bulk copy and validation)' },
  ],
}

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const row = await env.DB.prepare('SELECT provider, model FROM ai_settings WHERE id = ?').bind('default').first()

  return json({
    provider: row?.provider || 'anthropic',
    model: row?.model || 'claude-sonnet-5',
    models: MODELS,
    keysConfigured: {
      anthropic: !!env.ANTHROPIC_API_KEY,
      openai: !!env.OPENAI_API_KEY,
    },
  })
}

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)
  const caller = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(session.user_id).first()
  if (!caller || caller.role !== 'admin') return json({ error: 'Forbidden' }, 403)

  const { provider, model } = await request.json()
  const validModels = MODELS[provider]
  if (!validModels) return json({ error: `Unknown provider: ${provider}` }, 400)
  if (!validModels.some((m) => m.value === model)) return json({ error: `Unknown model "${model}" for provider "${provider}"` }, 400)

  const now = Math.floor(Date.now() / 1000)
  await env.DB.prepare(`
    INSERT INTO ai_settings (id, provider, model, updated_at)
    VALUES ('default', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET provider = excluded.provider, model = excluded.model, updated_at = excluded.updated_at
  `).bind(provider, model, now).run()

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
