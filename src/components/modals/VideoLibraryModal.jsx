import React, { useState } from 'react'
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

function VideoRow({ video, actionLabel, onAction, actionDisabled, highlight }) {
  return (
    <div className="flex items-center justify-between bg-gray-800 rounded px-3 py-2">
      <div className="min-w-0 mr-3">
        <p className="text-sm text-gray-200 truncate">{video.name}</p>
        <p className="text-xs text-gray-500">
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
  const [customHeight, setCustomHeight] = useState(480)
  useEscapeKey(onClose)
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
                <input
                  type="number"
                  min={16}
                  max={4320}
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  title="Target height in pixels — width is derived automatically to keep the source aspect ratio"
                  className="bg-gray-700 text-gray-200 text-xs rounded px-1.5 py-0.5 border border-gray-600 w-16"
                />
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
          <div className="space-y-1.5">
            {uploaded.length === 0 && <p className="text-xs text-gray-600 italic">No uploaded videos yet.</p>}
            {uploaded.map((v) => (
              <VideoRow
                key={v.id}
                video={v}
                actionLabel={encodingId === v.id ? 'Encoding…' : 'Transcode'}
                actionDisabled={encodingId === v.id || (quality === 'custom' && !(customHeight > 0))}
                onAction={(video) => {
                  const q = QUALITY_OPTIONS.find((o) => o.value === quality)
                  const height = quality === 'custom' ? customHeight : q.height
                  const label = quality === 'custom' ? `${customHeight}p` : q.value
                  onTranscode(video, height, label)
                }}
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
