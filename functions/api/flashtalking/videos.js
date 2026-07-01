const FT_BASE = 'https://api.flashtalking.net/crm/v1'
const STATUS_VALUES_TO_TRY = [0, 1, 2, 3]

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env)
  if (!session) return json({ error: 'Unauthorized' }, 401)

  if (!env.FT_EMAIL || !env.FT_PASSWORD) {
    return json({ error: 'Flashtalking credentials not configured' }, 500)
  }

  const url = new URL(request.url)
  const libraryId = url.searchParams.get('library_id')
  if (!libraryId) return json({ error: 'library_id is required' }, 400)

  const basic = btoa(`${env.FT_EMAIL}:${env.FT_PASSWORD}`)
  const authHeader = { Authorization: `Basic ${basic}` }

  const fetchByStatus = async (encodedStatus) => {
    const items = []
    let page = 1
    let totalPages = 1
    while (page <= totalPages) {
      const res = await fetch(
        `${FT_BASE}/creative-libraries/${libraryId}/asset/video?encodedStatus=${encodedStatus}&page=${page}&rpp=100`,
        { headers: authHeader }
      )
      const rawText = await res.text()
      if (!res.ok) {
        // Not every status value is necessarily valid — skip ones FT rejects instead of failing the whole request.
        return []
      }
      let data
      try { data = JSON.parse(rawText) } catch { data = { items: [] } }
      const pageItems = Array.isArray(data) ? data : (data.items || [])
      items.push(...pageItems)
      totalPages = data.totalPages || 1
      page++
    }
    return items
  }

  // FT's asset "url" is a storage key like "dve-video-store/uploads/xxx.mp4" (bucket/key),
  // not a resolvable link. Best-effort virtual-hosted-style S3 URL for canvas preview playback.
  const buildPreviewUrl = (storageKey) => {
    if (!storageKey) return null
    if (/^https?:\/\//.test(storageKey)) return storageKey
    const [bucket, ...rest] = storageKey.split('/')
    if (!bucket || rest.length === 0) return null
    return `https://${bucket}.s3.amazonaws.com/${rest.join('/')}`
  }

  try {
    const resultsByStatus = await Promise.all(STATUS_VALUES_TO_TRY.map(fetchByStatus))
    const byId = new Map()
    resultsByStatus.forEach((items) => {
      items.forEach((it) => {
        if (!byId.has(it.id)) byId.set(it.id, it)
      })
    })
    const allItems = [...byId.values()]

    // Classify per-item using the asset's own encoded/encodeStatus field rather than
    // trusting which query bucket it came back under.
    const isEncoded = (it) => {
      const v = it.encoded ?? it.encodeStatus
      return v !== undefined && v !== null && Number(v) !== 0
    }

    const normalize = (items) => {
      const normalized = items.map((it) => ({
        id: it.id,
        videoSource: it.videoSource,
        name: it.name || it.filename || `video-${it.id}`,
        sizeMb: (it.filesize || it.fileSize) ? ((it.filesize || it.fileSize) / 1024 / 1024).toFixed(2) : null,
        createdAt: it.lastModified || it.createdAt || it.dateCreated || it.uploadedAt || it.uploadDate || null,
        width: it.bbwidth || it.width || null,
        height: it.bbheight || it.height || null,
        previewUrl: buildPreviewUrl(it.url),
      }))
      normalized.sort((a, b) => {
        if (a.createdAt && b.createdAt) return new Date(b.createdAt) - new Date(a.createdAt)
        return (b.id || 0) - (a.id || 0)
      })
      return normalized
    }

    const uploadedRaw = allItems.filter((it) => !isEncoded(it))
    const transcodedRaw = allItems.filter((it) => isEncoded(it))

    return json({
      uploaded: normalize(uploadedRaw),
      transcoded: normalize(transcodedRaw),
      debug: {
        totalItemsFetched: allItems.length,
        countsByStatusQuery: STATUS_VALUES_TO_TRY.reduce((acc, s, i) => {
          acc[s] = resultsByStatus[i].length
          return acc
        }, {}),
        uploadedCount: uploadedRaw.length,
        transcodedCount: transcodedRaw.length,
        transcodedSample: transcodedRaw.slice(0, 3),
      },
    })
  } catch (err) {
    return json({ error: 'FT asset list failed', detail: err.message }, 502)
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
