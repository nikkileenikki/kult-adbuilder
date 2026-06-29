// Admin-only endpoint to create users (requires admin session token)
export async function onRequestPost({ request, env }) {
  // Verify caller is admin
  const token = getBearerToken(request)
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const now = Math.floor(Date.now() / 1000)
  const session = await env.DB.prepare(
    'SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first()
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const caller = await env.DB.prepare(
    'SELECT role FROM users WHERE id = ?'
  ).bind(session.user_id).first()
  if (!caller || caller.role !== 'admin') return json({ error: 'Forbidden' }, 403)

  const { username, display_name, email, password, role = 'user' } = await request.json()
  if (!username || !display_name || !email || !password) {
    return json({ error: 'username, display_name, email and password are required' }, 400)
  }

  const password_hash = await hashPassword(password)
  const id = crypto.randomUUID()

  try {
    await env.DB.prepare(
      'INSERT INTO users (id, username, display_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, username, display_name, email, password_hash, role).run()
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return json({ error: 'Username or email already exists' }, 409)
    return json({ error: 'Server error' }, 500)
  }

  return json({ ok: true, id })
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

function getBearerToken(request) {
  const auth = request.headers.get('Authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
