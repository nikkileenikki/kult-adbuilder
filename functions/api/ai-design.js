// AI banner design — picks the best-fit layout from a small pre-built catalog and
// writes copy for its roles, given a free-text brief. The layout *geometry* is fixed/
// human-designed (see src/utils/aiLayouts.js); this endpoint only ever returns a
// layoutId + short copy strings, never coordinates, so output can't come out broken.
//
// Keep this catalog in sync with src/utils/aiLayouts.js's NORMALIZED_LAYOUTS (id,
// label, role names) — Cloudflare Pages Functions can't reliably bundle a cross-import
// from src/, so it's mirrored here in compact form rather than imported.
const LAYOUT_CATALOG = [
  { id: 'stack-center', label: 'Centered stack', roles: ['headline', 'subhead', 'cta'] },
  { id: 'left-align-stack', label: 'Left-aligned stack', roles: ['headline', 'subhead', 'cta'] },
  { id: 'headline-only-bold', label: 'Bold headline, no subhead', roles: ['headline', 'cta'] },
  { id: 'top-headline-bottom-cta', label: 'Top headline, full-width CTA bar', roles: ['headline', 'subhead', 'cta'] },
  { id: 'split-text-cta-right', label: 'Headline left, CTA pinned right', roles: ['headline', 'cta'] },
  { id: 'body-copy-block', label: 'Headline + short body copy', roles: ['headline', 'body', 'cta'] },
]

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: 'AI design is not configured (missing ANTHROPIC_API_KEY)' }, 500)
  }

  const body = await request.json()
  const brief = (body.brief || '').trim()
  const width = Number(body.canvasWidth)
  const height = Number(body.canvasHeight)
  if (!brief) return json({ error: 'brief is required' }, 400)
  if (!width || !height) return json({ error: 'canvasWidth and canvasHeight are required' }, 400)

  const guide = await env.DB.prepare('SELECT * FROM brand_guide WHERE id = ?').bind('default').first().catch(() => null)
  const brandContext = guide && (guide.tone || guide.notes)
    ? `\n\nBrand guide — write copy consistent with this:\n${guide.tone ? `Tone/voice: ${guide.tone}\n` : ''}${guide.notes ? `Notes: ${guide.notes}` : ''}`
    : ''

  const system = `You design ad banner copy. You are given a fixed catalog of layouts, each with a list of "roles" (text slots). Pick the single best-fit layout for the brief and write short, punchy copy for each of its roles.
Rules:
- headline: max ~40 characters
- subhead/body: max ~70 characters
- cta: max ~20 characters, an action phrase (e.g. "Shop Now", "Get Started")
- Return ONLY valid JSON, no markdown fences, no commentary, matching exactly: {"layoutId": "...", "copy": {"role": "text", ...}}
- "copy" must have exactly one entry per role the chosen layout declares — no more, no fewer.${brandContext}`

  const userMsg = `Banner size: ${width}x${height}
Brief: ${brief}

Available layouts:
${LAYOUT_CATALOG.map((l) => `- id: "${l.id}" (${l.label}) — roles: ${l.roles.join(', ')}`).join('\n')}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 512,
        system,
        messages: [{ role: 'user', content: userMsg }],
      }),
    })
    const data = await res.json()
    if (!res.ok) return json({ error: data.error?.message || 'AI request failed' }, 502)

    const raw = (data.content || []).map((c) => c.text || '').join('').trim()
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      return json({ error: 'AI returned an unparseable response' }, 502)
    }

    const layout = LAYOUT_CATALOG.find((l) => l.id === parsed.layoutId)
    if (!layout) return json({ error: `AI picked an unknown layout: ${parsed.layoutId}` }, 502)

    const copy = {}
    layout.roles.forEach((role) => { copy[role] = String(parsed.copy?.[role] || '').trim() })

    const palette = guide && (guide.primary_color || guide.secondary_color || guide.accent_color || guide.text_color)
      ? {
          ...(guide.primary_color ? { bg: guide.primary_color } : {}),
          ...(guide.accent_color ? { accent: guide.accent_color } : {}),
          ...(guide.secondary_color ? { subtext: guide.secondary_color } : {}),
          ...(guide.text_color ? { text: guide.text_color, accentText: guide.text_color } : {}),
        }
      : null

    return json({ layoutId: layout.id, copy, palette })
  } catch (err) {
    return json({ error: err.message || 'AI request failed' }, 502)
  }
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
