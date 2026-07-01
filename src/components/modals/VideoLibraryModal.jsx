import React from 'react'

function Modal({ children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-3xl shadow-2xl max-h-[80vh] flex flex-col">
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
}) {
  const videoUrlFor = (v) => `${libraryId}/${v.name.replace(/\.[^.]+$/, '')}`
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

      <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-1">
        <div className="min-w-0">
          <p className="text-xs text-gray-400 mb-2 font-medium">Uploaded ({uploaded.length})</p>
          <div className="space-y-1.5">
            {uploaded.length === 0 && <p className="text-xs text-gray-600 italic">No uploaded videos yet.</p>}
            {uploaded.map((v) => (
              <VideoRow
                key={v.id}
                video={v}
                actionLabel={encodingId === v.id ? 'Encoding…' : 'Transcode'}
                actionDisabled={encodingId === v.id}
                onAction={onTranscode}
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
