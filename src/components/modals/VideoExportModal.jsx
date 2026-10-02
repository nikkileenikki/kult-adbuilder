import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { buildPreviewHtml } from '../../utils/exportBanner.js'
import {
  analyzeVideoExport, renderBannerVideo, downloadVideoBlob,
  VIDEO_FPS_CHOICES, DEFAULT_FPS,
} from '../../utils/exportVideo.js'
import useEscapeKey from '../../hooks/useEscapeKey.js'

// Renders the banner's animation to an MP4, for social/paid-social placements.
//
// This is a separate deliverable from the Flashtalking ZIP, not a replacement for it:
// a video can't carry clickthroughs, tracking or stop points, so the ZIP remains the
// only real ad. The warnings below exist so that's clear *before* someone renders and
// ships a file that quietly lost half the creative's behaviour.
export default function VideoExportModal({ onClose, bannerName }) {
  const { elements, groups, canvasWidth, canvasHeight, activeTemplate, animStopPoints, animDuration } = useCanvasStore()

  const [fps, setFps] = useState(DEFAULT_FPS)
  const [status, setStatus] = useState('idle') // idle | working | done | error
  const [progress, setProgress] = useState({ phase: '', frame: 0, totalFrames: 0 })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const abortRef = useRef(null)

  // Escape closes, but never mid-render — cancel explicitly so the iframe and encoder
  // get torn down instead of being orphaned behind a closed modal.
  useEscapeKey(() => { if (status !== 'working') onClose() })
  useEffect(() => () => abortRef.current?.abort(), [])

  const { warnings, blockers } = useMemo(
    () => analyzeVideoExport({ elements, animStopPoints }),
    [elements, animStopPoints]
  )

  const totalFrames = Math.max(1, Math.round(animDuration * fps))

  const run = async () => {
    setStatus('working')
    setError('')
    setResult(null)
    setProgress({ phase: 'loading', frame: 0, totalFrames })
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const html = await buildPreviewHtml({
        elements, groups, canvasWidth, canvasHeight,
        bannerName: bannerName || 'banner',
        activeTemplate, animStopPoints, animDuration,
      })
      const out = await renderBannerVideo({
        html, width: canvasWidth, height: canvasHeight,
        duration: animDuration, fps,
        onProgress: setProgress,
        signal: controller.signal,
      })
      setResult(out)
      setStatus('done')
    } catch (err) {
      if (err?.name === 'AbortError') { setStatus('idle'); return }
      setError(err?.message || 'Video export failed.')
      setStatus('error')
    } finally {
      abortRef.current = null
    }
  }

  const pct = progress.totalFrames ? Math.round((progress.frame / progress.totalFrames) * 100) : 0
  const phaseLabel = {
    loading: 'Loading banner…',
    rendering: `Rendering frame ${progress.frame} of ${progress.totalFrames}`,
    encoding: 'Finishing the file…',
  }[progress.phase] || 'Working…'

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onMouseDown={(e) => { if (e.target === e.currentTarget && status !== 'working') onClose() }}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col w-[540px] max-w-[92vw]"
        style={{ maxHeight: '88vh' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-video text-rose-400" style={{ fontSize: 14 }} />
            <h2 className="text-sm font-semibold text-white">Export as Video</h2>
            <span className="text-xs text-gray-500">{canvasWidth}×{canvasHeight} · {animDuration}s</span>
          </div>
          <button
            onClick={onClose}
            disabled={status === 'working'}
            className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-xmark" style={{ fontSize: 16 }} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
          {blockers.map((b) => (
            <Notice key={b.id} tone="error" icon="fa-circle-exclamation" title={b.title} detail={b.detail} />
          ))}

          {!blockers.length && warnings.map((w) => (
            <Notice key={w.id} tone="warn" icon="fa-triangle-exclamation" title={w.title} detail={w.detail} />
          ))}

          {!blockers.length && !warnings.length && (
            <Notice
              tone="ok"
              icon="fa-circle-check"
              title="This banner renders cleanly to video"
              detail="The animation plays straight through with no stop points or interactive layers, so the video is a complete record of it."
            />
          )}

          {!blockers.length && (
            <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-400 w-20 shrink-0">Frame rate</label>
                <select
                  value={fps}
                  disabled={status === 'working'}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="bg-gray-800 rounded px-2 py-1.5 text-sm text-gray-100 disabled:opacity-50"
                >
                  {VIDEO_FPS_CHOICES.map((f) => <option key={f} value={f}>{f} fps</option>)}
                </select>
                <span className="text-xs text-gray-500">{totalFrames} frames</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Every frame is rendered from the timeline directly, so the result is frame-accurate
                no matter how long the render takes. Larger banners and higher frame rates simply
                take longer.
              </p>
            </div>
          )}

          {status === 'working' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{phaseLabel}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded overflow-hidden">
                <div className="h-full bg-rose-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {status === 'error' && (
            <Notice tone="error" icon="fa-circle-exclamation" title="Export failed" detail={error} />
          )}

          {status === 'done' && result && (
            <Notice
              tone="ok"
              icon="fa-circle-check"
              title={`Rendered ${result.frames} frames at ${result.fps} fps`}
              detail={
                result.codecLabel === 'H.264'
                  ? `${result.width}×${result.height} H.264 MP4 — ready for any social platform or editor.`
                  : `${result.width}×${result.height} ${result.codecLabel} MP4. This browser can't encode H.264, so the file uses ${result.codecLabel} instead — it plays in Chrome but some platforms and editors won't accept it. Export from Chrome or Edge for an H.264 file.`
              }
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-700 shrink-0">
          {status === 'working' ? (
            <button
              onClick={() => abortRef.current?.abort()}
              className="px-3 py-1.5 rounded text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700"
            >
              Close
            </button>
          )}

          {status === 'done' && result ? (
            <button
              onClick={() => downloadVideoBlob(result.blob, bannerName)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-green-600 hover:bg-green-700 text-white"
            >
              <i className="fa-solid fa-download" style={{ fontSize: 11 }} /> Download .mp4
            </button>
          ) : (
            <button
              onClick={run}
              disabled={status === 'working' || !!blockers.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className={`fa-solid ${status === 'working' ? 'fa-spinner fa-spin' : 'fa-video'}`} style={{ fontSize: 11 }} />
              {status === 'error' ? 'Try again' : 'Render video'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const TONES = {
  warn: { box: 'bg-amber-500/10 border-amber-500/30', icon: 'text-amber-400', title: 'text-amber-200' },
  error: { box: 'bg-red-500/10 border-red-500/30', icon: 'text-red-400', title: 'text-red-200' },
  ok: { box: 'bg-emerald-500/10 border-emerald-500/30', icon: 'text-emerald-400', title: 'text-emerald-200' },
}

function Notice({ tone, icon, title, detail }) {
  const t = TONES[tone] || TONES.warn
  return (
    <div className={`flex gap-2.5 rounded-lg border p-3 ${t.box}`}>
      <i className={`fa-solid ${icon} ${t.icon} mt-0.5 shrink-0`} style={{ fontSize: 13 }} />
      <div className="min-w-0">
        <div className={`text-xs font-semibold ${t.title}`}>{title}</div>
        <p className="text-xs text-gray-400 leading-relaxed mt-0.5">{detail}</p>
      </div>
    </div>
  )
}
