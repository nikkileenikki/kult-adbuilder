// MP4 export — renders the banner's GSAP timeline to a video file, entirely in the
// browser.
//
// This sits strictly *on top* of the existing export pipeline: it consumes the HTML
// that buildPreviewHtml() already produces and never changes how banners are built.
// A video export is therefore always a faithful render of the same artifact the ZIP
// export ships, not a second, divergent interpretation of the editor state.
//
// The approach is seek-and-capture, not screen recording. The exported banner drives
// everything from a single GSAP timeline (`window.tl`), so tl.seek(n / fps) renders
// frame n deterministically — the same pixels every run, no dropped frames, and no
// dependence on how fast the capture machine happens to be. Each frame is rasterised
// through an <svg><foreignObject> snapshot of the live DOM and handed to WebCodecs
// with an explicit timestamp, so wall-clock capture time has no effect on playback
// speed. A 5s banner is a 5s video whether each frame took 5ms or 500ms.
//
// What it deliberately cannot represent: see analyzeVideoExport below.

import { Muxer, ArrayBufferTarget } from 'mp4-muxer'

export const VIDEO_FPS_CHOICES = [24, 25, 30, 60]
export const DEFAULT_FPS = 30

// H.264 baseline — the codec every social platform and NLE accepts. Chromium builds
// without proprietary codecs (and non-Chrome engines) fall back to VP9, which is still
// a valid MP4 but not universally importable, so the UI says so when it happens.
const CODEC_PREFS = [
  { codec: 'avc1.42001F', muxer: 'avc', label: 'H.264' },
  { codec: 'avc1.42E01E', muxer: 'avc', label: 'H.264' },
  { codec: 'vp09.00.10.08', muxer: 'vp9', label: 'VP9' },
]

// Rough "looks clean at banner sizes" target. Banners are small and mostly flat colour
// and text, where H.264 is very efficient — but text edges are exactly what low
// bitrates smear, so this is deliberately generous rather than minimal.
function bitrateFor(width, height, fps) {
  const pixels = width * height
  return Math.round(Math.max(1_000_000, Math.min(12_000_000, pixels * fps * 0.22)))
}

/**
 * Describes what a video export of this banner would lose, so the UI can warn before
 * the user spends time on a render.
 *
 * Video is linear; banners are not necessarily. Rather than block the export (a
 * stopped or interactive banner still has a perfectly good straight-through render
 * that is useful as a social asset), we state plainly what the file will and won't
 * contain and let the user decide.
 *
 * Returns { warnings: [{ id, title, detail }], blockers: [...] }.
 */
export function analyzeVideoExport({ elements = [], animStopPoints = [] } = {}) {
  const warnings = []
  const blockers = []
  const visible = elements.filter((el) => el.visible)

  if (animStopPoints.length) {
    const list = [...animStopPoints].sort((a, b) => a - b).map((t) => `${t}s`).join(', ')
    warnings.push({
      id: 'stopPoints',
      title: `${animStopPoints.length} timeline stop point${animStopPoints.length > 1 ? 's' : ''} will be ignored`,
      detail: `The video plays straight through ${list} without pausing. In the real banner the animation holds at ${animStopPoints.length > 1 ? 'each of these points' : 'this point'} until a viewer interaction resumes it — a video has no way to wait, so the timeline is rendered as one continuous take.`,
    })
  }

  // Anything that only happens because a viewer did something. The render captures the
  // timeline's own playback, so none of these fire.
  const interactive = visible.filter((el) =>
    el.type === 'clickthrough' ||
    (el.type === 'invisible' && ((el.actions || []).length || (el.trackingType && el.trackingType !== 'none')))
  )
  const hover = visible.filter((el) =>
    el.type === 'invisible' && ((el.hoverBgId && el.hoverBgColor) || (el.hoverTextId && el.hoverTextColor) || (el.hoverScaleId && el.hoverScaleFactor))
  )
  const interactiveCount = new Set([...interactive, ...hover].map((el) => el.id)).size

  if (interactiveCount) {
    warnings.push({
      id: 'interactions',
      title: `${interactiveCount} interactive layer${interactiveCount > 1 ? 's' : ''} will not be recorded`,
      detail: 'Clickthroughs, hover effects, tracking events and invisible-layer actions (jump to time, restart, show/hide) all need a viewer to trigger them. The video records the timeline playing on its own, so none of these fire and any animation that only happens after an interaction will be missing.',
    })
  }

  // <ft-video> is a Flashtalking custom element resolved at ad-serve time. There is no
  // real <video> in the preview DOM to rasterise, so these come out blank rather than
  // subtly wrong — worth saying out loud.
  const videoLayers = visible.filter((el) => el.type === 'video')
  if (videoLayers.length) {
    warnings.push({
      id: 'videoLayers',
      title: `${videoLayers.length} video layer${videoLayers.length > 1 ? 's' : ''} will render blank`,
      detail: 'Video layers are resolved by Flashtalking when the ad is served, so there is no footage in the editor to capture. They will appear as empty areas in the exported file.',
    })
  }

  if (!visible.length) blockers.push({ id: 'empty', title: 'Nothing to render', detail: 'The banner has no visible layers.' })
  if (typeof window !== 'undefined' && typeof window.VideoEncoder === 'undefined') {
    blockers.push({
      id: 'noWebCodecs',
      title: 'This browser cannot encode video',
      detail: 'Video export needs the WebCodecs API. Chrome, Edge and Opera support it; Safari and Firefox currently do not.',
    })
  }

  return { warnings, blockers }
}

async function pickCodec(width, height, bitrate) {
  for (const pref of CODEC_PREFS) {
    try {
      const support = await VideoEncoder.isConfigSupported({ codec: pref.codec, width, height, bitrate })
      if (support.supported) return pref
    } catch { /* unsupported codec strings throw rather than report false */ }
  }
  return null
}

// H.264 requires even dimensions; odd-sized banners (e.g. 300x251) otherwise fail to
// configure. Rounding up by a pixel is invisible next to refusing the export.
function evenUp(n) { return n % 2 === 0 ? n : n + 1 }

/**
 * Renders the banner to an MP4 Blob.
 *
 * @param {string}   opts.html       Output of buildPreviewHtml()
 * @param {number}   opts.width/height  Canvas size
 * @param {number}   opts.duration   Seconds (animDuration)
 * @param {number}   opts.fps
 * @param {function} opts.onProgress ({ phase, frame, totalFrames }) => void
 * @param {AbortSignal} opts.signal
 * @returns {Promise<{ blob, codecLabel, width, height, fps, frames }>}
 */
export async function renderBannerVideo({ html, width, height, duration, fps = DEFAULT_FPS, onProgress = () => {}, signal }) {
  const outW = evenUp(Math.round(width))
  const outH = evenUp(Math.round(height))
  const totalFrames = Math.max(1, Math.round(duration * fps))
  const bitrate = bitrateFor(outW, outH, fps)

  const throwIfAborted = () => { if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError') }

  const codec = await pickCodec(outW, outH, bitrate)
  if (!codec) throw new Error('No supported video codec found in this browser.')

  onProgress({ phase: 'loading', frame: 0, totalFrames })

  // The iframe has to be laid out for getComputedStyle to return real values, so it is
  // moved off-screen rather than hidden — display:none or visibility:hidden would give
  // us a document with no geometry and every frame would come out empty.
  const frame = document.createElement('iframe')
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin')
  Object.assign(frame.style, {
    position: 'fixed', left: '-10000px', top: '0',
    width: `${width}px`, height: `${height}px`, border: '0', opacity: '0', pointerEvents: 'none',
  })
  frame.srcdoc = html
  document.body.appendChild(frame)

  let muxer, encoder
  try {
    const win = await waitForTimeline(frame, signal)
    throwIfAborted()

    // Stop points are a property of the interactive banner, not of its animation. The
    // exported script keeps them in a top-level `ktStops` array and pauses the timeline
    // in an onUpdate watcher — emptying the array from out here disables that watcher
    // for the render without the banner code needing to know video export exists.
    // (analyzeVideoExport has already told the user this is going to happen.)
    try { win.ktStops = [] } catch { /* cross-origin shouldn't happen with srcdoc */ }
    win.tl.pause()

    // Fonts must be resolved before the first capture or early frames rasterise in a
    // fallback face — a difference that is very visible in a side-by-side.
    try { await win.document.fonts.ready } catch { /* not all engines expose this */ }
    await inlineImages(win.document)
    throwIfAborted()

    const target = new ArrayBufferTarget()
    muxer = new Muxer({
      target,
      video: { codec: codec.muxer, width: outW, height: outH, frameRate: fps },
      fastStart: 'in-memory', // moov atom up front, so the file streams/previews properly
    })

    let encodeError = null
    encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => { encodeError = e },
    })
    encoder.configure({ codec: codec.codec, width: outW, height: outH, bitrate, framerate: fps })

    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d', { alpha: false })

    for (let i = 0; i < totalFrames; i++) {
      throwIfAborted()
      if (encodeError) throw encodeError

      win.tl.seek(i / fps)
      // Two frames: one for GSAP's write to land in the DOM, one for style/layout to
      // settle before we read computed values back out.
      await nextFrame(win)
      await nextFrame(win)

      const image = await rasterize(win, width, height)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, outW, outH)
      ctx.drawImage(image, 0, 0)

      const videoFrame = new VideoFrame(canvas, {
        timestamp: Math.round((i / fps) * 1_000_000), // microseconds
        duration: Math.round(1_000_000 / fps),
      })
      // A keyframe every ~2s keeps seeking responsive in players and editors without
      // inflating the file the way all-keyframe output would.
      encoder.encode(videoFrame, { keyFrame: i % (fps * 2) === 0 })
      videoFrame.close()

      // Backpressure: without this the whole banner queues up in encoder memory at once.
      if (encoder.encodeQueueSize > fps) {
        await new Promise((r) => setTimeout(r, 0))
      }

      onProgress({ phase: 'rendering', frame: i + 1, totalFrames })
    }

    onProgress({ phase: 'encoding', frame: totalFrames, totalFrames })
    await encoder.flush()
    if (encodeError) throw encodeError
    muxer.finalize()

    return {
      blob: new Blob([target.buffer], { type: 'video/mp4' }),
      codecLabel: codec.label,
      width: outW, height: outH, fps, frames: totalFrames,
    }
  } finally {
    try { encoder?.state !== 'closed' && encoder?.close() } catch { /* already torn down */ }
    frame.remove()
  }
}

function nextFrame(win) {
  return new Promise((resolve) => (win.requestAnimationFrame || requestAnimationFrame)(() => resolve()))
}

// The banner builds its timeline inside window.onload, so `tl` appears some time after
// the iframe's load event. Poll for it rather than racing.
function waitForTimeline(frame, signal, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const tick = () => {
      if (signal?.aborted) return reject(new DOMException('Export cancelled', 'AbortError'))
      let win
      try { win = frame.contentWindow } catch { return reject(new Error('Could not read the banner preview.')) }
      if (win?.tl && typeof win.tl.seek === 'function' && win.tl.duration() >= 0 && win.gsap) return resolve(win)
      if (Date.now() - started > timeoutMs) {
        return reject(new Error('The banner did not finish loading in time. Check that it previews correctly first.'))
      }
      setTimeout(tick, 50)
    }
    tick()
  })
}

// Any image still served over http(s) would taint the canvas and make every frame
// unreadable, so pull them in as data URIs first. Uploads in this app are already
// base64, so in practice this is a no-op guard for template-supplied artwork.
async function inlineImages(doc) {
  const imgs = [...doc.querySelectorAll('img')].filter((img) => /^https?:/i.test(img.src))
  await Promise.all(imgs.map(async (img) => {
    try {
      const res = await fetch(img.src, { mode: 'cors' })
      const blob = await res.blob()
      img.src = await new Promise((resolve, reject) => {
        const fr = new FileReader()
        fr.onload = () => resolve(fr.result)
        fr.onerror = reject
        fr.readAsDataURL(blob)
      })
      await img.decode().catch(() => {})
    } catch {
      // Left as-is: it may still be CORS-clean, and if it isn't, rasterize() reports a
      // clear "couldn't read the frame" error rather than silently producing garbage.
    }
  }))
}

// Snapshots the live DOM into a bitmap.
//
// <foreignObject> renders with the browser's own engine, so gradients, border-radius,
// text-shadow, blend modes and font rendering all come out exactly as they do on
// screen — unlike a DOM-reimplementing rasteriser. The catch is that the SVG is a
// closed document with no access to the page's stylesheets, so every computed style
// has to be flattened onto the cloned nodes first.
async function rasterize(win, width, height) {
  const doc = win.document
  const source = doc.getElementById('container') || doc.body
  const clone = source.cloneNode(true)

  const srcNodes = [source, ...source.querySelectorAll('*')]
  const dstNodes = [clone, ...clone.querySelectorAll('*')]
  for (let i = 0; i < srcNodes.length; i++) {
    const dst = dstNodes[i]
    if (!dst) continue
    const cs = win.getComputedStyle(srcNodes[i])
    let text = ''
    for (const prop of cs) text += `${prop}:${cs.getPropertyValue(prop)};`
    dst.setAttribute('style', text)
  }

  const bodyBg = win.getComputedStyle(doc.body).backgroundColor
  const markup = new XMLSerializer().serializeToString(clone)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;position:relative;background:${bodyBg}">` +
    markup +
    `</div></foreignObject></svg>`

  // Two non-obvious constraints here, both verified against Chromium, and both of
  // which fail as an opaque "VideoFrames can't be created from tainted sources":
  //
  //   1. The URL must be a data: URL, not a blob: URL. Chrome treats an SVG image
  //      loaded from blob: as not origin-clean even though blob: is same-origin.
  //   2. The result must be drawn as an HTMLImageElement. Routing it through
  //      createImageBitmap() taints the canvas too, as does passing the image
  //      straight to the VideoFrame constructor.
  //
  // So: data: URL -> <img> -> drawImage. Changing either half re-breaks encoding.
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  try {
    return await loadImage(url)
  } catch {
    throw new Error('Could not read a frame of the banner. This usually means an image is loaded from another domain that blocks reuse.')
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('frame render failed'))
    img.src = url
  })
}

export function downloadVideoBlob(blob, bannerName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${bannerName || 'banner'}.mp4`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
