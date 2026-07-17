// "Build brand with AI" — given a short brief (brand name and/or description), fills
// in a full brand guide (colors, font, tone, notes) for the user to review/edit before
// creating it. Only ever returns field values, never writes to the DB itself — the
// actual create happens through the existing /api/brand-guide POST once the user
// confirms, same as a manually-filled form.
export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const settingsRow = await env.DB.prepare('SELECT provider, model FROM ai_settings WHERE id = ?').bind('default').first()
  const provider = settingsRow?.provider || 'anthropic'
  const model = settingsRow?.model || 'claude-sonnet-5'

  if (provider === 'openai' && !env.OPENAI_API_KEY) {
    return json({ error: 'AI design is not configured (missing OPENAI_API_KEY for the selected provider)' }, 500)
  }
  if (provider === 'anthropic' && !env.ANTHROPIC_API_KEY) {
    return json({ error: 'AI design is not configured (missing ANTHROPIC_API_KEY)' }, 500)
  }

  const body = await request.json()
  const brief = (body.brief || '').trim()
  if (!brief) return json({ error: 'brief is required' }, 400)

  const FONT_WHITELIST = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black']

  const userMsg = `Brief: ${brief}`

  const system = `You are a senior brand strategist filling in a brand guide form from a short brief (a brand name and/or description).
If the brief names a recognizable real-world brand/company, use your actual knowledge of that brand's real visual identity — its actual primary/secondary/accent/text colors and tone of voice — rather than inventing a generic palette. If you're not confident of a named brand's exact real colors, say so isn't possible here (this endpoint always returns a best-effort guide), so instead choose a professional, deliberate palette/tone that fits its known industry/positioning.
If the brief is generic/original (not a recognizable real brand), invent a coherent, deliberate brand identity that fits the brief's description — industry, audience, and tone should all agree with each other.

Output ONLY valid JSON, no markdown fences, no commentary, in exactly this shape:
{"name": "...", "primaryColor": "#hex", "secondaryColor": "#hex", "accentColor": "#hex", "textColor": "#hex", "fontFamily": "...", "tone": "...", "notes": "..."}

Field rules:
- name: the brand's actual name. If the brief doesn't clearly state one, derive a short plausible one from the brief.
- primaryColor/secondaryColor/accentColor/textColor: hex colors (#rrggbb). primaryColor is the main brand color (e.g. typical background), textColor must contrast clearly against primaryColor, accentColor is for CTAs/highlights and should stand out against primaryColor.
- fontFamily: pick ONE pairing-friendly value from exactly this whitelist, written as a single font name (not a pairing, not a CSS stack): ${FONT_WHITELIST.map((f) => `"${f}"`).join(', ')}.
- tone: 1 short sentence describing the brand's voice (e.g. "Confident, energetic, no exclamation points").
- notes: 1-2 short sentences of other useful context (taglines, do's/don'ts, positioning) — or "" if nothing meaningful to add.`

  async function callModel(system, messages, maxTokens) {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'system', content: system }, ...messages],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'AI request failed')
      return (data.choices?.[0]?.message?.content || '').trim()
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'AI request failed')
    return (data.content || []).map((c) => c.text || '').join('').trim()
  }

  try {
    let raw = await callModel(system, [{ role: 'user', content: userMsg }], 500)
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (fenced) raw = fenced[1]
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      const braced = raw.match(/\{[\s\S]*\}/)
      if (!braced) return json({ error: 'AI returned an unparseable response' }, 502)
      try {
        parsed = JSON.parse(braced[0])
      } catch {
        return json({ error: 'AI returned an unparseable response' }, 502)
      }
    }

    const hexRe = /^#?([0-9a-f]{6})$/i
    const validHex = (v) => {
      const m = hexRe.exec(String(v || '').trim())
      return m ? `#${m[1]}` : ''
    }
    const validFont = (v) => FONT_WHITELIST.includes(v) ? v : 'Arial'

    return json({
      name: String(parsed.name || '').trim(),
      primaryColor: validHex(parsed.primaryColor),
      secondaryColor: validHex(parsed.secondaryColor),
      accentColor: validHex(parsed.accentColor),
      textColor: validHex(parsed.textColor),
      fontFamily: validFont(parsed.fontFamily),
      tone: String(parsed.tone || '').trim(),
      notes: String(parsed.notes || '').trim(),
    })
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
