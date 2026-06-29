// TEMPORARY - delete this file after creating your admin account
export async function onRequestPost({ request, env }) {
  // Only allow if no users exist yet
  const count = await env.DB.prepare('SELECT COUNT(*) as n FROM users').first()
  if (count.n > 0) {
    return json({ error: 'Setup already complete. Delete this endpoint.' }, 403)
  }

  const { username, display_name, email, password } = await request.json()
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

  return json({ ok: true, message: 'Admin account created. Delete /api/auth/setup now.' })
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
