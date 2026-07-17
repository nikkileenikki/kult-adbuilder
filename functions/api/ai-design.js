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

  // Provider/model is an admin-configurable choice (see ai-settings.js) — API keys
  // themselves always stay Cloudflare secrets, never stored in the DB.
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
  const width = Number(body.canvasWidth)
  const height = Number(body.canvasHeight)
  if (!brief) return json({ error: 'brief is required' }, 400)
  if (!width || !height) return json({ error: 'canvasWidth and canvasHeight are required' }, 400)

  const brandId = body.brandId || null
  const guide = brandId
    ? await env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(brandId).first().catch(() => null)
    : null
  // Always tell the model the brand's actual name (when one is selected), not just
  // tone/notes — without this the model was never told which brand it's designing for
  // at all when tone/notes were left blank, so it had no way to recall a real, known
  // brand's actual colors/identity, and follow-up turns ("add a video") had nothing to
  // remind them which brand was in play either.
  const brandContext = guide
    ? `\n\nBrand: "${guide.name}". If you recognize this as a real, known brand, use your actual knowledge of its visual identity (colors, tone) to inform this design. Keep designing for this same brand across every turn in this chat, including follow-ups that don't repeat the brand name.${guide.tone ? `\nTone/voice: ${guide.tone}` : ''}${guide.notes ? `\nNotes: ${guide.notes}` : ''}`
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
        `${i + 1}. Brief: "${h.brief}" -> layoutId: "${h.layoutId}", copy: ${JSON.stringify(h.copy)}, palette: ${JSON.stringify(h.palette || null)}, adjustments: ${JSON.stringify(h.adjustments || null)}, cornerStyle: ${JSON.stringify(h.cornerStyle || null)}, fonts: ${JSON.stringify(h.fonts || null)}, backgroundStyle: ${JSON.stringify(h.backgroundStyle || null)}`
      ).join('\n')}\n\nUnless the new brief clearly asks for a different layout/full redo, keep the same layoutId as the most recent turn and only change the copy/palette/adjustments/cornerStyle/fonts/backgroundStyle fields the new brief actually asks to change — carry over the rest unchanged from the most recent turn. If the brief asks to change a color (e.g. "make it darker", "use red instead"), that's exactly what the "palette" field is for — actually change the relevant hex value(s) from the previous turn rather than repeating them. If the brief asks to move/resize something (e.g. "make the headline bigger", "move the CTA down a bit"), that's what "adjustments" is for. If the brief asks to change the corner rounding (e.g. "make the buttons square", "round the corners more"), that's what "cornerStyle" is for. If the brief asks to change fonts (e.g. "use a different font", "make it feel more elegant"), that's what "fonts" is for. If the brief asks to change the background (e.g. "make it a gradient", "add some texture"), that's what "backgroundStyle" is for.`
    : ''

  const copyRules = `Copy rules:
- headline: max ~40 characters
- subhead/body: max ~70 characters
- cta: max ~20 characters. Write a real ad's call-to-action verb phrase a person would click — "Sign Up Free", "Get Your Quote", "Book Now", "Start Today". Never just restate the offer/product/service name as the CTA (e.g. if the brief is about a "health check", the CTA is NOT "Get Health Check" — that's the offer, not an action-driven click prompt).
- badge: max ~14 characters, a short label/callout (e.g. "New", "Limited Time", "50% Off")
- price: max ~12 characters, a price or discount (e.g. "$49", "30% Off", "From $9/mo")
- secondaryCta: max ~20 characters, an alternate action distinct from "cta" (e.g. cta "Buy Now", secondaryCta "Learn More")
- stat: max ~10 characters, a standout number or statistic (e.g. "50% Off", "4.9★", "10,000+")
- body1/body2: max ~50 characters each, short standalone feature/benefit lines (e.g. "Free shipping", "24/7 support") — not a continuation of one sentence across both
- In "quote-callout", the "body" role is a short customer quote (include the quotation marks) and the "headline" role is the attribution (e.g. "— Jane D., Verified Buyer"), not a headline`

  const paletteRules = `Palette rules:
- bg = background, text = headline color, subtext = secondary text color, accent = CTA/button color, all as hex.
- If the brief names a specific, recognizable real-world brand or company, use your actual knowledge of that brand's real visual identity (their known primary/secondary brand colors) — not a generic guess or an unrelated palette. If you're not confident of a named brand's real colors, say so and choose a professional palette that fits its industry/tone instead of inventing colors and presenting them as the brand's own.
- Otherwise, choose colors deliberately for the brief's tone/industry — not a default/placeholder palette.
- "text" and "subtext" must contrast clearly against "bg" (don't pick near-identical colors).
- Do not default to the same "safe" palette (e.g. a blue background with a yellow/orange accent) regardless of brief — that combination should only appear when it's actually the right fit (e.g. it's the named brand's real colors), never as a generic fallback. Vary hue, saturation, and which color plays bg vs accent based on what this specific brief actually calls for.`

  const adjustmentRules = `Layout adjustment rules:
- The chosen layout's geometry is fixed and already safe (nothing overlaps the logo/video zone or goes off-canvas) — you are choosing copy and color, not designing from scratch.
- You MAY optionally nudge a role's box slightly if it clearly improves the fit for this specific brief (e.g. a role needs a bit more room for unusually long copy, or something should sit a little closer to another element). This is a small nudge, not a redesign.
- If you do, keep each nudge tiny: dx/dw as a fraction of canvas width, dy/dh as a fraction of canvas height, each between -0.06 and 0.06 (i.e. at most ~6% of the canvas). Most of the time no adjustment is needed at all — omit "adjustments" entirely, or omit any role that doesn't need one.`

  const cornerRules = `Corner style rules:
- "cornerStyle" controls how rounded the CTA/badge/price buttons are: "sharp" (square corners — serious/corporate/financial/legal tone), "soft" (gently rounded — most general-purpose brands), or "pill" (fully rounded ends — playful/consumer/lifestyle/app-like tone).
- Pick whichever matches the brand's real visual identity if one is named/known, otherwise the brief's tone/industry. Default to "soft" if genuinely unsure.`

  const FONT_WHITELIST = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black']
  const fontRules = `Font pairing rules:
- "fonts" picks a deliberate font pairing from this exact whitelist only (no other font names): ${FONT_WHITELIST.map((f) => `"${f}"`).join(', ')}.
- Provide three values: "headline" (used for headline/stat roles), "body" (used for subhead/body/body1/body2 roles), "cta" (used for cta/secondaryCta/badge/price button labels).
- Pick a pairing that matches the brand/tone — e.g. "Georgia" headline + "Verdana" body reads editorial/trustworthy, "Impact" or "Arial Black" headline reads bold/energetic, "Times New Roman" reads formal/legal/financial, "Trebuchet MS"/"Verdana" reads modern/friendly. Don't default to "Arial" everywhere unless it's genuinely the best fit — every banner using the same font is exactly what this is meant to avoid.
- Headline and body should usually differ enough to create real pairing contrast, but stay legible together.`

  const backgroundRules = `Background style rules:
- "backgroundStyle" is one of: "solid" (flat brand color — clean/corporate/minimal), "gradient" (smooth blend from "bg" to "accent" — modern/energetic/tech), "abstract" (soft geometric shapes/blobs — playful/consumer/creative), "watercolor" (soft painterly texture — lifestyle/wellness/organic).
- Choose whichever fits the brand's real visual identity if known, otherwise the brief's tone/industry/offer. Default to "solid" if genuinely unsure.
- A "gradient" background renders directly from your "bg" and "accent" hex values — the same palette rules apply (no default blue-to-yellow, no generic fallback). Pick the actual bg/accent hues that fit this brief; the gradient should look different for a finance brand than for a fitness brand than for a bakery.`

  const userMsg = `Banner size: ${width}x${height}
Brief: ${brief}

Available layouts:
${LAYOUT_CATALOG.map((l) => `- id: "${l.id}" (${l.label}) — roles: ${l.roles.join(', ')}`).join('\n')}`

  // Two-step generation: first let the model reason in plain text (what the named
  // brand is actually known for, which layout fits the offer, draft copy, why this
  // palette), then a second call converts that reasoning into strict JSON. Asking for
  // strict JSON directly in one shot consistently produced shallower brand/color
  // judgment and weaker CTA copy (e.g. restating the offer as the CTA) than giving the
  // model room to actually think it through first.
  const reasoningSystem = `You are a senior ad designer reasoning out loud (plain text, not JSON) about a banner brief.
First judge whether the brief actually gives you enough to design from — at minimum, what's being advertised/promoted. If it's too vague (e.g. no product/offer/subject at all), or you genuinely need a clarifying answer before you could design something sensible, or you have an important suggestion worth raising instead of silently guessing (e.g. the brief conflicts with the brand guide, or a much better angle than what was asked exists) — say so plainly, explain what's missing or what you'd suggest, and stop there; don't invent placeholder specifics to force a design through.
Otherwise, design the banner. Cover, briefly:
1. If the brief names a recognizable real-world brand/company: what that brand is actually known for and its real primary/secondary colors and tone — be specific, and say plainly if you're not confident of the exact colors rather than guessing.
2. Which of the available layouts best fits this offer and why.
3. Draft the actual copy for every role that layout requires.
4. The final hex palette (bg/text/subtext/accent) and why it suits the brand/tone, checking text contrasts clearly against bg.
5. Whether any role's box would benefit from a small nudge (and if so, roughly which direction/how much) — most briefs need none.
6. Which corner style (sharp/soft/pill) fits the brand/tone.
7. Which font pairing (headline/body/cta) fits the brand/tone.
8. Which background style (solid/gradient/abstract/watercolor) fits the brand/tone.
${copyRules}
${paletteRules}
${adjustmentRules}
${cornerRules}
${fontRules}
${backgroundRules}
Keep this to a few short paragraphs — reasoning, not a full essay.${brandContext}${paletteContext}${followUpContext}`

  const jsonSystem = `Convert the design reasoning already worked out in this conversation into the final answer. Don't re-derive anything — extract what the reasoning already settled on.

If the reasoning decided to ask for clarification or give a suggestion instead of designing, output: {"type": "reply", "message": "..."} — "message" is the actual clarifying question or suggestion to show the user, written directly to them (not a description of the reasoning).

Otherwise output the banner: {"type": "banner", "layoutId": "...", "copy": {"role": "text", ...}, "palette": {"bg":"#hex","text":"#hex","subtext":"#hex","accent":"#hex"}, "adjustments": {"role": {"dx":0,"dy":0,"dw":0,"dh":0}, ...}, "cornerStyle": "sharp" | "soft" | "pill", "fonts": {"headline":"...","body":"...","cta":"..."}, "backgroundStyle": "solid" | "gradient" | "abstract" | "watercolor"}
${copyRules}
${paletteRules}
${adjustmentRules}
${cornerRules}
${fontRules}
${backgroundRules}
Output rules:
- Return ONLY valid JSON, no markdown fences, no commentary, matching exactly one of the two shapes above.
- For "banner": "copy" must have exactly one entry per role the chosen layout declares — no more, no fewer. "adjustments" is optional — omit it, or omit any role within it, when no nudge is needed. "cornerStyle" is required, one of sharp/soft/pill. "fonts" is required, all three values from the whitelist. "backgroundStyle" is required, one of solid/gradient/abstract/watercolor.`

  // Dispatches to whichever provider is configured (see ai-settings.js) — same
  // system/messages/maxTokens contract either way, callers don't need to know which
  // provider is actually behind it.
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
    const reasoning = await callModel(reasoningSystem, [{ role: 'user', content: userMsg }], 700)

    let raw = await callModel(jsonSystem, [
      { role: 'user', content: userMsg },
      { role: 'assistant', content: reasoning },
      { role: 'user', content: 'Output only the final JSON now, based on the reasoning above.' },
    ], 500)
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

    if (parsed.type === 'reply') {
      const message = String(parsed.message || '').trim()
      return json({ type: 'reply', message: message || "Could you share a bit more detail about what this banner is for?" })
    }

    const requestedId = String(parsed.layoutId || '').trim()
    // Case/whitespace-insensitive match — the catalog only ever has one id per
    // spelling, so this can't accidentally match the wrong layout.
    const layout = LAYOUT_CATALOG.find((l) => l.id === requestedId)
      || LAYOUT_CATALOG.find((l) => l.id.toLowerCase() === requestedId.toLowerCase())
    if (!layout) return json({ error: `AI picked an unknown layout: ${parsed.layoutId}` }, 502)

    const copy = {}
    layout.roles.forEach((role) => { copy[role] = asText(parsed.copy?.[role]) })

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

    // Re-clamped here too (not just client-side in applyAdjustment) so a stray huge
    // value from the model can't even get as far as the client before being capped —
    // defense in depth for what's meant to be a small nudge, never a redesign.
    const ADJUST_LIMIT = 0.06
    const clampAdj = (v) => Math.max(-ADJUST_LIMIT, Math.min(ADJUST_LIMIT, Number(v) || 0))
    const adjustments = {}
    if (parsed.adjustments && typeof parsed.adjustments === 'object') {
      layout.roles.forEach((role) => {
        const a = parsed.adjustments[role]
        if (a && typeof a === 'object') {
          const dx = clampAdj(a.dx), dy = clampAdj(a.dy), dw = clampAdj(a.dw), dh = clampAdj(a.dh)
          if (dx || dy || dw || dh) adjustments[role] = { dx, dy, dw, dh }
        }
      })
    }

    const CORNER_STYLES = new Set(['sharp', 'soft', 'pill'])
    const cornerStyle = CORNER_STYLES.has(parsed.cornerStyle) ? parsed.cornerStyle : 'soft'

    const validFont = (v) => FONT_WHITELIST.includes(v) ? v : 'Arial'
    const fonts = {
      headline: validFont(parsed.fonts?.headline),
      body: validFont(parsed.fonts?.body),
      cta: validFont(parsed.fonts?.cta),
    }

    const BACKGROUND_STYLES = new Set(['solid', 'gradient', 'abstract', 'watercolor'])
    const backgroundStyle = BACKGROUND_STYLES.has(parsed.backgroundStyle) ? parsed.backgroundStyle : 'solid'

    return json({ type: 'banner', layoutId: layout.id, copy, palette, adjustments: Object.keys(adjustments).length ? adjustments : null, cornerStyle, fonts, backgroundStyle })
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
// made it all the way to the canvas. This unwraps the common shapes before falling
// back to a plain string coercion.
function asText(v) {
  if (typeof v === 'string') return v.trim()
  if (v == null) return ''
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(' ').trim()
  if (typeof v === 'object') {
    for (const key of ['text', 'value', 'content', 'copy']) {
      if (typeof v[key] === 'string') return v[key].trim()
    }
  }
  return String(v).trim()
}
