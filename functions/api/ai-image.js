// Generates an image from a text prompt via OpenAI's image API and returns it as a
// base64 data URI, ready to drop straight into an image element's `src`. Requires an
// OPENAI_API_KEY secret (separate from ANTHROPIC_API_KEY, which is only used for the
// layout/copy design endpoint) — not yet configured, add via
// `wrangler pages secret put OPENAI_API_KEY`.
const SUPPORTED_SIZES = ['1024x1024', '1536x1024', '1024x1536']

function pickSize(width, height) {
  const ratio = width / height
  if (ratio > 1.2) return '1536x1024'
  if (ratio < 0.83) return '1024x1536'
  return '1024x1024'
}

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  if (!env.OPENAI_API_KEY) {
    return json({ error: 'AI image generation is not configured (missing OPENAI_API_KEY)' }, 500)
  }

  const body = await request.json()
  const prompt = (body.prompt || '').trim()
  const width = Number(body.width) || 1024
  const height = Number(body.height) || 1024
  if (!prompt) return json({ error: 'prompt is required' }, 400)

  // Client can request an explicit OpenAI-supported size (e.g. from a size picker);
  // otherwise fall back to nearest match for the given width/height.
  const size = SUPPORTED_SIZES.includes(body.size) ? body.size : pickSize(width, height)

  // The user's own prompt always drives subject, composition, and style — brand
  // guide info is supporting flavor only, never a literal constraint. Earlier
  // wording ("use a color palette consistent with: #hex...") got over-indexed on,
  // pushing every generation toward abstract color-blend renders regardless of what
  // was actually asked for.
  let fullPrompt = prompt
  if (body.brandId) {
    const guide = await env.DB.prepare('SELECT * FROM brands WHERE id = ?').bind(body.brandId).first().catch(() => null)
    if (guide) {
      const parts = []
      if (guide.tone) parts.push(`Brand mood/tone for inspiration: ${guide.tone}`)
      if (guide.notes) parts.push(`Brand notes for inspiration: ${guide.notes}`)
      const colors = [guide.primary_color, guide.secondary_color, guide.accent_color].filter(Boolean)
      if (colors.length) parts.push(`These brand colors (${colors.join(', ')}) can subtly inform the palette if it fits naturally — do not force them literally, and prioritize the subject/style/composition described above over exact color matching.`)
      if (parts.length) fullPrompt = `${prompt}\n\n${parts.join('\n')}`
    }
  }

  // Hard requirement (not advisory, unlike brand color guidance above): generated
  // images are dropped straight onto a banner as a background/asset, so any baked-in
  // text or logo would be unreadable at banner scale and can't be edited afterward.
  fullPrompt += '\n\nDo not include any text, words, letters, numbers, captions, watermarks, or logos anywhere in the image.'

  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: fullPrompt,
        size,
        n: 1,
      }),
    })
    const data = await res.json()
    if (!res.ok) return json({ error: data.error?.message || 'Image generation failed' }, 502)

    const b64 = data.data?.[0]?.b64_json
    if (!b64) return json({ error: 'No image returned' }, 502)

    const [w, h] = size.split('x').map(Number)
    return json({ image: `data:image/png;base64,${b64}`, width: w, height: h })
  } catch (err) {
    return json({ error: err.message || 'Image generation failed' }, 502)
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
