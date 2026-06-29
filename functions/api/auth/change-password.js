export async function onRequestPost({ request, env }) {
  const token = getBearerToken(request)
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const now = Math.floor(Date.now() / 1000)
  const session = await env.DB.prepare(
    'SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first()
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const caller = await env.DB.prepare(
    'SELECT id, role, password_hash FROM users WHERE id = ?'
  ).bind(session.user_id).first()
  if (!caller) return json({ error: 'Unauthorized' }, 401)

  const { id, current_password, new_password } = await request.json()
  if (!new_password) return json({ error: 'new_password is required' }, 400)

  const targetId = id || caller.id
  const isSelf = targetId === caller.id

  if (isSelf) {
    // Changing own password — current_password required for everyone
    if (!current_password) return json({ error: 'current_password is required' }, 400)
    const valid = await verifyPassword(current_password, caller.password_hash)
    if (!valid) return json({ error: 'Current password is incorrect' }, 403)
  } else {
    // Changing another user's password — admin only
    if (caller.role !== 'admin') return json({ error: 'Forbidden' }, 403)
  }

  const password_hash = await hashPassword(new_password)
  await env.DB.prepare(
    'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?'
  ).bind(password_hash, now, targetId).run()

  // Invalidate all existing sessions for the target user (except current if self)
  if (!isSelf) {
    await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(targetId).run()
  }

  return json({ ok: true })
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

async function verifyPassword(password, storedHash) {
  try {
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
    if (actual.length !== expected.length) return false
    let diff = 0
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i]
    return diff === 0
  } catch { return false }
}

function bytesToBase64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlToBytes(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
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
