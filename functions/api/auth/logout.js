export async function onRequestPost({ request, env }) {
  const token = getBearerToken(request)
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

function getBearerToken(request) {
  const auth = request.headers.get('Authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}
