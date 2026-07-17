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

  const fieldRules = `Field rules:
- name: the brand's actual name, taken directly from the brief. If the brief doesn't clearly state one, derive a short plausible one that fits the description — never a generic placeholder like "Brand" or "Company".
- primaryColor/secondaryColor/accentColor/textColor: hex colors (#rrggbb). primaryColor is the main brand color (e.g. typical background), textColor must contrast clearly against primaryColor, accentColor is for CTAs/highlights and should stand out against primaryColor. Every field must trace back to something in the brief or (for a recognized brand) that brand's real known colors — never arbitrary/unrelated colors.
- fontFamily: pick ONE pairing-friendly value from exactly this whitelist, written as a single font name (not a pairing, not a CSS stack): ${FONT_WHITELIST.map((f) => `"${f}"`).join(', ')}. The choice must fit the brand's actual tone/industry as reasoned above, not be arbitrary.
- tone: 1 short sentence describing the brand's voice (e.g. "Confident, energetic, no exclamation points"), grounded in the brief's industry/audience.
- notes: 1-2 short sentences of other useful context (taglines, do's/don'ts, positioning) that plausibly fits this specific brand — or "" if nothing meaningful to add.`

  // Two-step generation, same pattern as ai-design.js: letting the model reason in
  // plain text first (is this a brand it actually recognizes? what's the brief's
  // industry/audience/tone?) before locking in fields produced much more grounded,
  // brief-specific results than asking for the JSON directly — a one-shot JSON request
  // tended to just pick arbitrary-looking colors/tone disconnected from the brief.
  const reasoningSystem = `You are a senior brand strategist reasoning out loud (plain text, not JSON) about a short brief (a brand name and/or description) before filling in a brand guide form.
Cover, briefly:
1. Does the brief name a recognizable real-world brand/company? If so, say what you actually know about its real visual identity (actual primary/secondary/accent colors, typical tone) — be specific, and say plainly if you're not confident of its exact real colors rather than guessing, in which case fall back to a professional palette/tone fitting its known industry/positioning instead.
2. If the brief is generic/original (not a recognizable real brand), what industry/audience/positioning does it imply, and what coherent, deliberate identity (colors, tone) fits that specific brief — not a default/generic choice.
3. The final hex palette (primary/secondary/accent/text) and why each color fits, checking text contrasts clearly against primary.
4. Which font (from a fixed whitelist) fits the brand's tone.
5. A one-sentence tone/voice description and any other useful notes (taglines, do's/don'ts) that plausibly fit this specific brand.
${fieldRules}
Keep this to a short paragraph or two — reasoning, not a full essay.`

  const jsonSystem = `Convert the brand-guide reasoning already worked out in this conversation into the final answer. Don't re-derive anything — extract what the reasoning already settled on.

Output ONLY valid JSON, no markdown fences, no commentary, in exactly this shape:
{"name": "...", "primaryColor": "#hex", "secondaryColor": "#hex", "accentColor": "#hex", "textColor": "#hex", "fontFamily": "...", "tone": "...", "notes": "..."}
${fieldRules}`

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
    const reasoning = await callModel(reasoningSystem, [{ role: 'user', content: userMsg }], 600)

    let raw = await callModel(jsonSystem, [
      { role: 'user', content: userMsg },
      { role: 'assistant', content: reasoning },
      { role: 'user', content: 'Output only the final JSON now, based on the reasoning above.' },
    ], 400)
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
