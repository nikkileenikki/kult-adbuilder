export async function onRequestPost({ request, env }) {
  try {
    const { username, password } = await request.json()
    if (!username || !password) {
      return json({ error: 'Username and password required' }, 400)
    }

    const user = await env.DB.prepare(
      'SELECT id, username, display_name, email, role, password_hash FROM users WHERE username = ?'
    ).bind(username).first()

    if (!user) return json({ error: 'Invalid credentials' }, 401)

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) return json({ error: 'Invalid credentials' }, 401)

    // Create session token
    const token = crypto.randomUUID() + '-' + crypto.randomUUID()
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days

    await env.DB.prepare(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(token, user.id, expiresAt).run()

    return json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        role: user.role,
      }
    })
  } catch (err) {
    return json({ error: 'Server error' }, 500)
  }
}

// Timing-safe password verify using Web Crypto (PBKDF2)
async function verifyPassword(password, storedHash) {
  try {
    // storedHash format: "pbkdf2:sha256:iterations:salt:hash" (all base64url)
    const [, , iterStr, saltB64, hashB64] = storedHash.split(':')
    const iterations = parseInt(iterStr)
    const salt = base64urlToBytes(saltB64)
    const expected = base64urlToBytes(hashB64)

    const keyMaterial = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
    )
    const derived = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
      keyMaterial, 256
    )
    const actual = new Uint8Array(derived)
    // constant-time compare
    if (actual.length !== expected.length) return false
    let diff = 0
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i]
    return diff === 0
  } catch {
    return false
  }
}

function base64urlToBytes(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
