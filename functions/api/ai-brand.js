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

  // Spelled out explicitly rather than just "Brief: Nike" — a bare brand name with no
  // framing left some models unsure whether they were being asked to design a banner,
  // write ad copy, or something else. Being explicit that the deliverable is a full
  // brand guide (name/colors/font/tone/notes) keeps every model on task regardless of
  // how terse the brief itself is.
  const userMsg = `Create a full brand guide (name, primary/secondary/accent/text colors, font, tone of voice, notes) for this brand, based on the following brief:\n${brief}`

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
      // gpt-5.x models are reasoning models served via the newer Responses API, not
      // Chat Completions — they take `instructions` + `input` and `max_output_tokens`
      // (not `max_tokens`), and support a `reasoning.effort` knob Chat Completions
      // doesn't have. Older models (gpt-4o, gpt-4-turbo, ...) keep using the Chat
      // Completions endpoint they were already validated against.
      if (/^gpt-5/.test(model)) {
        // Reasoning tokens count against max_output_tokens on these models — at
        // "medium" effort the model could burn the whole budget on internal reasoning
        // and leave nothing for the actual visible output, coming back as empty text
        // (surfaced to users as "AI returned an unparseable response"). "low" effort
        // plus a generous token headroom keeps a real answer in the budget; these are
        // short, well-specified extraction/copy tasks that don't need deep reasoning.
        const res = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            instructions: system,
            input: messages.map((m) => ({ role: m.role, content: m.content })),
            max_output_tokens: Math.max(maxTokens * 2, maxTokens + 500),
            reasoning: { effort: 'low' },
            text: { verbosity: 'medium' },
          }),
          // Without an explicit cap, a stuck/slow upstream request can run past the
          // platform's own hard request timeout — that kills the connection outright
          // instead of letting us return a clean JSON error, which surfaces to the
          // browser as a bare "Failed to fetch" with no useful explanation. Failing
          // fast here (well under that ceiling) always leaves time to respond.
          signal: AbortSignal.timeout(25000),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error?.message || 'AI request failed')
        // `output_text` is a convenience getter added by OpenAI's official SDKs — the
        // raw REST response doesn't include it, the text lives nested in
        // output[].content[] items of type "output_text". Reading data.output_text
        // directly here always came back undefined/empty.
        return (data.output || [])
          .flatMap((o) => o.content || [])
          .filter((c) => c.type === 'output_text')
          .map((c) => c.text || '')
          .join('')
          .trim()
      }

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
        signal: AbortSignal.timeout(25000),
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
      signal: AbortSignal.timeout(25000),
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
      name: asText(parsed.name),
      primaryColor: validHex(parsed.primaryColor),
      secondaryColor: validHex(parsed.secondaryColor),
      accentColor: validHex(parsed.accentColor),
      textColor: validHex(parsed.textColor),
      fontFamily: validFont(parsed.fontFamily),
      tone: asText(parsed.tone),
      notes: asText(parsed.notes),
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

// Some models occasionally wrap a value in a nested object (e.g. {"text": "..."})
// instead of returning the plain string that was asked for — String(anObject) turns
// that into the literal text "[object Object]" rather than throwing, so it silently
// made it all the way into the brand form. This unwraps the common shapes before
// falling back to a plain string coercion.
function asText(v) {
  if (typeof v === 'string') return v.trim()
  if (v == null) return ''
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(' ').trim()
  if (typeof v === 'object') {
    for (const key of ['text', 'value', 'content', 'name']) {
      if (typeof v[key] === 'string') return v[key].trim()
    }
  }
  return String(v).trim()
}
