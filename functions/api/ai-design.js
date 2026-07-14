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
  { id: 'side-strip-cta', label: 'Full-height CTA strip on the right', roles: ['headline', 'subhead', 'cta'] },
  { id: 'corner-badge', label: 'Corner badge with headline', roles: ['badge', 'headline', 'cta'] },
  { id: 'right-panel-stack', label: 'Right-aligned text panel', roles: ['headline', 'subhead', 'cta'] },
  { id: 'big-cta-focus', label: 'Small headline, oversized CTA', roles: ['headline', 'cta'] },
  { id: 'price-tag-callout', label: 'Price badge, headline left', roles: ['price', 'headline', 'subhead', 'cta'] },
  { id: 'mirrored-split', label: 'CTA left, headline right', roles: ['cta', 'headline'] },
  { id: 'quote-callout', label: 'Quote-style body with attribution', roles: ['body', 'headline', 'cta'] },
  { id: 'row-banner', label: 'Single row: headline, subhead, CTA', roles: ['headline', 'subhead', 'cta'] },
  { id: 'minimal-teaser', label: 'Minimal teaser, generous whitespace', roles: ['headline', 'cta'] },
  { id: 'double-cta-choice', label: 'Headline with two CTA choices', roles: ['headline', 'cta', 'secondaryCta'] },
  { id: 'stat-callout', label: 'Big stat/number callout', roles: ['stat', 'subhead', 'cta'] },
  { id: 'bottom-corner-cta', label: 'Headline top-left, CTA bottom-right corner', roles: ['headline', 'subhead', 'cta'] },
  { id: 'logo-forward', label: 'Large logo area, compact copy below', roles: ['headline', 'cta'] },
  { id: 'two-line-features', label: 'Headline with two feature lines', roles: ['headline', 'body1', 'body2', 'cta'] },
  { id: 'video-full-bg', label: 'Full-bleed video, caption overlay', roles: ['headline', 'subhead', 'cta'] },
  { id: 'video-left-text-right', label: 'Video left half, copy right half', roles: ['headline', 'subhead', 'cta'] },
  { id: 'video-top-text-bottom', label: 'Video top, headline + CTA bottom strip', roles: ['headline', 'cta'] },
  { id: 'video-frame-center', label: 'Centered video frame, headline + CTA', roles: ['headline', 'cta'] },
  { id: 'video-side-strip', label: 'Video strip right, copy left', roles: ['headline', 'subhead', 'cta'] },
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

  const brandId = body.brandId || null
  const guide = brandId
    ? await env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(brandId).first().catch(() => null)
    : null
  const brandContext = guide && (guide.tone || guide.notes)
    ? `\n\nBrand guide — write copy consistent with this:\n${guide.tone ? `Tone/voice: ${guide.tone}\n` : ''}${guide.notes ? `Notes: ${guide.notes}` : ''}`
    : ''
  // Any brand-guide color the user actually configured is a hard constraint (set later,
  // after the AI's own palette pick) — but tell the model which fields are already
  // spoken for so it doesn't waste effort matching a color it can't actually control.
  const guideColorFields = guide
    ? [
        guide.primary_color && 'bg', guide.accent_color && 'accent',
        guide.secondary_color && 'subtext', guide.text_color && 'text',
      ].filter(Boolean)
    : []
  const paletteContext = guideColorFields.length
    ? `\n\nThe brand guide already fixes these palette fields — still return a full palette, but know that ${guideColorFields.join(', ')} will be overridden by the brand guide's own colors regardless of what you choose for them.`
    : ''

  // `history`: prior turns in this chat, each { brief, layoutId, copy, palette } — lets
  // a follow-up like "make the headline shorter" or "use a darker blue" refine the last
  // result instead of generating an unrelated new one. Turns referencing a layoutId
  // that no longer exists (e.g. a layout was renamed/removed since the turn was
  // recorded) are dropped rather than telling the model to "keep" an id it can't pick —
  // that mismatch was the main cause of the "AI picked an unknown layout" error.
  const history = Array.isArray(body.history)
    ? body.history.filter((h) => LAYOUT_CATALOG.some((l) => l.id === h?.layoutId)).slice(-5)
    : []
  const followUpContext = history.length
    ? `\n\nThis is a follow-up in an ongoing chat. Prior turns (most recent last):\n${history.map((h, i) =>
        `${i + 1}. Brief: "${h.brief}" -> layoutId: "${h.layoutId}", copy: ${JSON.stringify(h.copy)}, palette: ${JSON.stringify(h.palette || null)}`
      ).join('\n')}\n\nUnless the new brief clearly asks for a different layout/full redo, keep the same layoutId as the most recent turn and only change the copy/palette fields the new brief actually asks to change — carry over the rest unchanged from the most recent turn. If the brief asks to change a color (e.g. "make it darker", "use red instead"), that's exactly what the "palette" field is for — actually change the relevant hex value(s) from the previous turn rather than repeating them.`
    : ''

  const system = `You design ad banner copy and color palette. You are given a fixed catalog of layouts, each with a list of "roles" (text slots). Pick the single best-fit layout for the brief, write short, punchy copy for each of its roles, and choose a color palette.
Copy rules:
- headline: max ~40 characters
- subhead/body: max ~70 characters
- cta: max ~20 characters. Write a real ad's call-to-action verb phrase a person would click — "Sign Up Free", "Get Your Quote", "Book Now", "Start Today". Never just restate the offer/product/service name as the CTA (e.g. if the brief is about a "health check", the CTA is NOT "Get Health Check" — that's the offer, not an action-driven click prompt).
- badge: max ~14 characters, a short label/callout (e.g. "New", "Limited Time", "50% Off")
- price: max ~12 characters, a price or discount (e.g. "$49", "30% Off", "From $9/mo")
- secondaryCta: max ~20 characters, an alternate action distinct from "cta" (e.g. cta "Buy Now", secondaryCta "Learn More")
- stat: max ~10 characters, a standout number or statistic (e.g. "50% Off", "4.9★", "10,000+")
- body1/body2: max ~50 characters each, short standalone feature/benefit lines (e.g. "Free shipping", "24/7 support") — not a continuation of one sentence across both
- In "quote-callout", the "body" role is a short customer quote (include the quotation marks) and the "headline" role is the attribution (e.g. "— Jane D., Verified Buyer"), not a headline
Palette rules:
- Always return a "palette" object: {"bg":"#hex","text":"#hex","subtext":"#hex","accent":"#hex"} (bg = background, text = headline color, subtext = secondary text color, accent = CTA/button color).
- If the brief names a specific, recognizable real-world brand or company, use your knowledge of that brand's actual, real visual identity (their known primary/secondary brand colors) — not a generic guess or an unrelated palette. If you're not confident of a named brand's real colors, choose a professional palette that fits its industry/tone instead of inventing colors and presenting them as the brand's own.
- Otherwise, choose colors deliberately for the brief's tone/industry — not a default/placeholder palette.
- "text" and "subtext" must contrast clearly against "bg" (don't return near-identical colors).
Output rules:
- Return ONLY valid JSON, no markdown fences, no commentary, matching exactly: {"layoutId": "...", "copy": {"role": "text", ...}, "palette": {"bg":"#hex","text":"#hex","subtext":"#hex","accent":"#hex"}}
- "copy" must have exactly one entry per role the chosen layout declares — no more, no fewer.${brandContext}${paletteContext}${followUpContext}`

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

    let raw = (data.content || []).map((c) => c.text || '').join('').trim()
    // The model is told "no markdown fences", but strip them defensively if present —
    // a stray ```json wrapper otherwise fails JSON.parse entirely and surfaces as a
    // confusing error even though the payload itself is fine.
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (fenced) raw = fenced[1]
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Last resort: grab the first {...} block in case there's leading/trailing prose.
      const braced = raw.match(/\{[\s\S]*\}/)
      if (!braced) return json({ error: 'AI returned an unparseable response' }, 502)
      try {
        parsed = JSON.parse(braced[0])
      } catch {
        return json({ error: 'AI returned an unparseable response' }, 502)
      }
    }

    const requestedId = String(parsed.layoutId || '').trim()
    // Case/whitespace-insensitive match — the catalog only ever has one id per
    // spelling, so this can't accidentally match the wrong layout.
    const layout = LAYOUT_CATALOG.find((l) => l.id === requestedId)
      || LAYOUT_CATALOG.find((l) => l.id.toLowerCase() === requestedId.toLowerCase())
    if (!layout) return json({ error: `AI picked an unknown layout: ${parsed.layoutId}` }, 502)

    const copy = {}
    layout.roles.forEach((role) => { copy[role] = String(parsed.copy?.[role] || '').trim() })

    // The AI's own color choice (informed by real brand knowledge when the brief names
    // one) is the baseline — a configured brand guide color, where the user explicitly
    // set one, always wins over it for that specific field. Without this, "palette" was
    // only ever populated from the brand guide, so an AI-picked palette (or a follow-up
    // "change the color to X") had no way to actually reach the rendered banner at all.
    const hexRe = /^#?([0-9a-f]{6})$/i
    const aiPalette = {}
    if (parsed.palette && typeof parsed.palette === 'object') {
      ;['bg', 'text', 'subtext', 'accent'].forEach((key) => {
        const m = hexRe.exec(String(parsed.palette[key] || '').trim())
        if (m) aiPalette[key] = `#${m[1]}`
      })
    }
    const guidePalette = {
      ...(guide?.primary_color ? { bg: guide.primary_color } : {}),
      ...(guide?.accent_color ? { accent: guide.accent_color } : {}),
      ...(guide?.secondary_color ? { subtext: guide.secondary_color } : {}),
      ...(guide?.text_color ? { text: guide.text_color } : {}),
    }
    const merged = { ...aiPalette, ...guidePalette }
    const palette = Object.keys(merged).length ? merged : null

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
