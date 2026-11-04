// Serves a Flashtalking CDN video from this app's own origin, for the MP4 export.
//
// The export has to read video pixels back out of a canvas, which the browser only
// allows for footage it fetched under CORS. The CDN does send CORS headers, yet in
// practice that request still fails in some users' browsers even while the same file
// plays fine in the editor canvas (which fetches it without CORS). The cause sits in
// the browser — its cache, an extension, a network filter — out of reach and out of
// sight from here. A server-to-server fetch sidesteps all of it: no CORS, no browser
// cache, and the footage arrives same-origin, so it can never taint the canvas.
//
// The export tries the CDN directly first and only falls back to this, so in the
// common case it costs nothing.
//
// Deliberately narrow, so it can't be used as an open relay: signed-in users only,
// and only video files on Flashtalking's CDN.
const CDN_ORIGIN = 'https://cdn.flashtalking.com'

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  let target
  try {
    target = new URL(new URL(request.url).searchParams.get('src') || '')
  } catch {
    return json({ error: 'src must be a full URL' }, 400)
  }
  if (target.origin !== CDN_ORIGIN || !/\.(mp4|webm)$/i.test(target.pathname)) {
    return json({ error: 'Only Flashtalking CDN video files can be fetched' }, 400)
  }

  const upstream = await fetch(target.toString())
  if (!upstream.ok) {
    // Passed through as-is so the export can tell "no file at this address" (404)
    // apart from anything else, which is the difference the user needs to act on.
    return json({ error: `Flashtalking CDN responded ${upstream.status}` }, upstream.status)
  }

  const headers = new Headers({
    'Content-Type': upstream.headers.get('Content-Type') || 'video/mp4',
    'Cache-Control': 'private, max-age=300',
  })
  const length = upstream.headers.get('Content-Length')
  if (length) headers.set('Content-Length', length)
  return new Response(upstream.body, { status: 200, headers })
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
