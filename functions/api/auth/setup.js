// First-admin bootstrap for a brand-new deployment.
//
// This used to be unauthenticated, guarded only by "no users exist yet", and shipped
// alongside a public/setup.html form — both labelled "delete after use", both still
// live in production long after. That guard holds only as long as the users table is
// non-empty: a restore from an empty backup, a bad migration, or a fresh D1 binding
// would have briefly opened an unauthenticated path to creating an admin account on a
// public URL.
//
// It now needs SETUP_TOKEN, a Cloudflare secret that is simply not set in normal
// operation — with no secret configured the endpoint doesn't exist as far as callers
// can tell. To bootstrap a new environment: set the secret, POST here with a matching
// `token`, then unset it. The empty-users check is kept as a second, independent
// condition so a leaked token still can't touch a populated instance.
export async function onRequestPost({ request, env }) {
  // 404 rather than 403 — a disabled endpoint shouldn't confirm it exists.
  if (!env.SETUP_TOKEN) return json({ error: 'Not found' }, 404)

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { token, username, display_name, email, password } = body || {}
  if (!token || !timingSafeEqual(String(token), String(env.SETUP_TOKEN))) {
    return json({ error: 'Not found' }, 404)
  }

  const count = await env.DB.prepare('SELECT COUNT(*) as n FROM users').first()
  if (count.n > 0) {
    return json({ error: 'Setup already complete — users already exist.' }, 403)
  }

  if (!username || !display_name || !email || !password) {
    return json({ error: 'username, display_name, email and password are required' }, 400)
  }

  const password_hash = await hashPassword(password)
  const id = crypto.randomUUID()

  try {
    await env.DB.prepare(
      'INSERT INTO users (id, username, display_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, username, display_name, email, password_hash, 'admin').run()
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return json({ error: 'Username or email already exists' }, 409)
    return json({ error: 'Server error' }, 500)
  }

  return json({ ok: true, message: 'Admin account created. Unset SETUP_TOKEN now.' })
}

// Compares in time independent of how far the strings match, so the token can't be
// recovered a character at a time from response timing.
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iterations = 100000
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial, 256
  )
  const saltB64 = bytesToBase64url(salt)
  const hashB64 = bytesToBase64url(new Uint8Array(derived))
  return `pbkdf2:sha256:${iterations}:${saltB64}:${hashB64}`
}

function bytesToBase64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
