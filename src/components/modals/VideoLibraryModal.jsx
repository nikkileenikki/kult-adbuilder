import React, { useState, useRef } from 'react'
import useEscapeKey from '../../hooks/useEscapeKey.js'

const QUALITY_OPTIONS = [
  { value: '240p', label: '240p', height: 240 },
  { value: '360p', label: '360p', height: 360 },
  { value: '480p', label: '480p', height: 480 },
  { value: 'custom', label: 'Custom', height: null },
]

function Modal({ children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-3xl shadow-2xl max-h-[85vh] flex flex-col">
        {children}
      </div>
    </div>
  )
}

function VideoRow({ video, actionLabel, onAction, actionDisabled, highlight, ratioCheckbox }) {
  return (
    <div className="flex items-center justify-between bg-gray-800 rounded px-3 py-2">
      {ratioCheckbox}
      <div className="min-w-0 mr-3">
        <p className="text-sm text-gray-200 truncate">{video.name}</p>
        <p className="text-xs text-gray-500">
          {video.width && video.height ? `${video.width}×${video.height} · ` : ''}
          {video.sizeMb ? `${video.sizeMb} MB` : ''}
          {video.sizeMb && video.createdAt ? ' · ' : ''}
          {video.createdAt ? new Date(video.createdAt).toLocaleString() : ''}
        </p>
      </div>
      <button
        onClick={() => onAction(video)}
        disabled={actionDisabled}
        className={`text-xs rounded px-2.5 py-1 shrink-0 disabled:opacity-40 ${
          highlight ? 'bg-green-700 text-white' : 'bg-purple-700 hover:bg-purple-600 text-white'
        }`}
      >
        {actionLabel}
      </button>
    </div>
  )
}

const MAX_FILE_MB = 100
const SIZE_WARNING_MB = 10

export default function VideoLibraryModal({
  onClose,
  libraryName,
  uploaded,
  transcoded,
  loading,
  onRefresh,
  onTranscode,
  encodingId,
  onSelectTranscoded,
  selectedVideoUrl,
  libraryId,
  fileRef,
  fileInfo,
  uploading,
  uploadStatus,
  onFileChange,
  onUpload,
}) {
  const [quality, setQuality] = useState('480p')
  const [customWidth, setCustomWidth] = useState(1920)
  const [customHeight, setCustomHeight] = useState(1080)
  const [ratioVideoId, setRatioVideoId] = useState(null)
  useEscapeKey(onClose)

  // Linked width/height — editing one recalculates the other from a fixed aspect
  // ratio held here, not from the other field's last *rounded* value. Deriving from
  // the displayed (rounded) pair each time would compound rounding error on every
  // keystroke until the ratio visibly drifted from the original. Defaults to an
  // exact 16:9 (1920/1080) until a specific source video is picked for its ratio.
  const ratioRef = useRef(customWidth / customHeight)
  const onCustomWidthChange = (v) => {
    const w = Number(v)
    setCustomWidth(w)
    if (w > 0) setCustomHeight(Math.max(1, Math.round(w / ratioRef.current)))
  }
  const onCustomHeightChange = (v) => {
    const h = Number(v)
    setCustomHeight(h)
    if (h > 0) setCustomWidth(Math.max(1, Math.round(h * ratioRef.current)))
  }
  const pickRatioVideo = (video) => {
    if (!video.width || !video.height) return
    const isSame = ratioVideoId === video.id
    setRatioVideoId(isSame ? null : video.id)
    ratioRef.current = isSame ? 1920 / 1080 : video.width / video.height
    setCustomWidth(isSame ? 1920 : video.width)
    setCustomHeight(isSame ? 1080 : video.height)
  }
  const videoUrlFor = (v) => `${libraryId}/${v.name.replace(/\.[^.]+$/, '')}`
  const statusColor = {
    success: 'text-green-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    info: 'text-gray-400',
  }

  return (
    <Modal>
      <div className="flex items-start justify-between mb-1 gap-3">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2 shrink-0">
          <i className="fa-solid fa-film text-purple-400" />
          Video Library
        </h2>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={onRefresh} disabled={loading} className="text-gray-400 hover:text-white transition-colors">
            <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`} style={{ fontSize: 12 }} />
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4 break-words">
        Library: <span className="text-gray-300">{libraryName}</span>
      </p>

      <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3 mb-4 flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={onFileChange}
          className="flex-1 min-w-0 text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600 cursor-pointer"
        />
        <button
          onClick={onUpload}
          disabled={uploading || !fileInfo || (fileInfo && parseFloat(fileInfo.sizeMb) > MAX_FILE_MB)}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded px-3 py-1.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shrink-0"
        >
          <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 11 }} />
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {(fileInfo || uploadStatus) && (
        <div className="mb-3 -mt-2 space-y-1">
          {fileInfo && <p className="text-xs text-gray-500">{fileInfo.name} · {fileInfo.sizeMb} MB</p>}
          {uploadStatus && (
            <p className={`text-xs ${statusColor[uploadStatus.type] || 'text-gray-400'}`}>
              {uploadStatus.type === 'info' && <i className="fa-solid fa-spinner fa-spin mr-1" style={{ fontSize: 10 }} />}
              {uploadStatus.message}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-1">
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-2 gap-2">
            <p className="text-xs text-gray-400 font-medium">Uploaded ({uploaded.length})</p>
            <div className="flex items-center gap-1">
              {quality === 'custom' && (
                <>
                  <input
                    type="number"
                    min={1}
                    max={7680}
                    value={customWidth}
                    onChange={(e) => onCustomWidthChange(e.target.value)}
                    title="Target width in pixels — height adjusts automatically to keep the aspect ratio"
                    className="bg-gray-700 text-gray-200 text-xs rounded px-1.5 py-0.5 border border-gray-600 w-14"
                  />
                  <span className="text-gray-500 text-xs">×</span>
                  <input
                    type="number"
                    min={1}
                    max={4320}
                    value={customHeight}
                    onChange={(e) => onCustomHeightChange(e.target.value)}
                    title="Target height in pixels — width adjusts automatically to keep the aspect ratio"
                    className="bg-gray-700 text-gray-200 text-xs rounded px-1.5 py-0.5 border border-gray-600 w-14"
                  />
                </>
              )}
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="bg-gray-700 text-gray-200 text-xs rounded px-1.5 py-0.5 border border-gray-600"
              >
                {QUALITY_OPTIONS.map((q) => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
            </div>
          </div>
          {quality === 'custom' && (
            <p className="text-xs text-gray-500 mb-1.5 -mt-1">
              Check a video below to calculate the ratio from its own dimensions.
            </p>
          )}
          <div className="space-y-1.5">
            {uploaded.length === 0 && <p className="text-xs text-gray-600 italic">No uploaded videos yet.</p>}
            {uploaded.map((v) => (
              <VideoRow
                key={v.id}
                video={v}
                actionLabel={encodingId === v.id ? 'Encoding…' : 'Transcode'}
                actionDisabled={encodingId === v.id || (quality === 'custom' && !(customWidth > 0 && customHeight > 0))}
                onAction={(video) => {
                  const q = QUALITY_OPTIONS.find((o) => o.value === quality)
                  const height = quality === 'custom' ? customHeight : q.height
                  const label = quality === 'custom' ? `${customWidth}x${customHeight}` : q.value
                  const width = quality === 'custom' ? customWidth : undefined
                  onTranscode(video, height, label, width)
                }}
                ratioCheckbox={quality === 'custom' && v.width && v.height ? (
                  <input
                    type="checkbox"
                    checked={ratioVideoId === v.id}
                    onChange={() => pickRatioVideo(v)}
                    title="Use this video's dimensions to set the custom aspect ratio"
                    className="mr-2 w-3.5 h-3.5 shrink-0"
                  />
                ) : null}
              />
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-xs text-gray-400 mb-2 font-medium">Transcoded ({transcoded.length})</p>
          <div className="space-y-1.5">
            {transcoded.length === 0 && <p className="text-xs text-gray-600 italic">No transcoded videos yet.</p>}
            {transcoded.map((v) => (
              <VideoRow
                key={v.id}
                video={v}
                actionLabel={videoUrlFor(v) === selectedVideoUrl ? 'Selected' : 'Use'}
                highlight={videoUrlFor(v) === selectedVideoUrl}
                onAction={onSelectTranscoded}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
