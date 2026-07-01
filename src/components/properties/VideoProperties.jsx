import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Field, TextInput, SelectInput } from '../left/PropertiesSection.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useAuthStore } from '../../store/authStore.js'
import VideoLibraryModal from '../modals/VideoLibraryModal.jsx'

const MAX_FILE_MB = 100
const SIZE_WARNING_MB = 10
const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 600000 // 10 min total client-side budget

export default function VideoProperties({ el, update, save }) {
  const { ftLibrary } = useUiStore()
  const { token } = useAuthStore()
  const fileRef = useRef(null)

  const [uploadStatus, setUploadStatus] = useState(null) // { type, message }
  const [uploading, setUploading] = useState(false)
  const [fileInfo, setFileInfo] = useState(null) // { name, sizeMb }
  const [uploaded, setUploaded] = useState([])
  const [transcoded, setTranscoded] = useState([])
  const [listLoading, setListLoading] = useState(false)
  const [encodingId, setEncodingId] = useState(null)
  const [showLibrary, setShowLibrary] = useState(false)

  const authHeader = { Authorization: `Bearer ${token}` }

  const pollJob = useCallback(async (jobId) => {
    const deadline = Date.now() + POLL_TIMEOUT_MS
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      const res = await fetch(`/api/flashtalking/video-job?job_id=${jobId}`, { headers: authHeader })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Job check failed')
      if (data.pending) continue
      if (!data.ok) throw new Error(data.error || 'Job failed')
      return data
    }
    throw new Error('Timed out waiting for Flashtalking job')
  }, [token])

  const refreshLists = useCallback(async () => {
    if (!ftLibrary) return
    setListLoading(true)
    try {
      const res = await fetch(`/api/flashtalking/videos?library_id=${ftLibrary.id}`, { headers: authHeader })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load videos')
      console.log('[FT] video list debug (JSON):', JSON.stringify(data.debug, null, 2))
      setUploaded(data.uploaded || [])
      setTranscoded(data.transcoded || [])
    } catch (err) {
      setUploadStatus({ type: 'error', message: err.message })
    } finally {
      setListLoading(false)
    }
  }, [ftLibrary, token])

  useEffect(() => {
    refreshLists()
  }, [refreshLists])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const sizeMb = (file.size / 1024 / 1024).toFixed(1)
    setFileInfo({ name: file.name, sizeMb })
    setUploadStatus(
      parseFloat(sizeMb) > MAX_FILE_MB
        ? { type: 'error', message: `File is ${sizeMb} MB — max allowed is ${MAX_FILE_MB} MB` }
        : parseFloat(sizeMb) > SIZE_WARNING_MB
        ? { type: 'warn', message: `Large source file (${sizeMb} MB). Consider trimming to keep encoded output under 2.5 MB.` }
        : null
    )
  }

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file || !ftLibrary) return
    if (file.size / 1024 / 1024 > MAX_FILE_MB) return

    setUploading(true)
    setUploadStatus({ type: 'info', message: 'Uploading video…' })

    try {
      const form = new FormData()
      form.append('file', file, file.name)
      form.append('filename', file.name)
      form.append('library_id', String(ftLibrary.id))

      const uploadRes = await fetch('/api/flashtalking/video-upload', {
        method: 'POST',
        headers: authHeader,
        body: form,
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed')

      setUploadStatus({ type: 'success', message: 'Uploaded — ready to transcode below.' })
      fileRef.current.value = ''
      setFileInfo(null)
      await refreshLists()
    } catch (err) {
      setUploadStatus({ type: 'error', message: err.message })
    } finally {
      setUploading(false)
    }
  }

  const handleTranscode = async (video) => {
    if (!ftLibrary) return
    setEncodingId(video.id)
    setUploadStatus({ type: 'info', message: `Encoding ${video.name}…` })

    try {
      const nameBase = video.name.replace(/\.[^.]+$/, '')
      const encodeRes = await fetch('/api/flashtalking/video-encode', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          library_id: ftLibrary.id,
          video_source: video.videoSource,
          name: nameBase,
          width: el.width,
          height: el.height,
        }),
      })
      const encodeData = await encodeRes.json()
      if (!encodeRes.ok) throw new Error(encodeData.error || 'Encode failed')

      setUploadStatus({ type: 'info', message: 'Encoding in progress…' })
      const encodeResult = await pollJob(encodeData.jobId)

      const sizeMsg = encodeResult.sizeMb ? ` (${encodeResult.sizeMb} MB)` : ''
      const oversizeWarn = encodeResult.oversized ? ' ⚠ Exceeds 2.5 MB — consider trimming source.' : ''
      setUploadStatus({ type: encodeResult.oversized ? 'warn' : 'success', message: `Transcoded${sizeMsg}${oversizeWarn}` })
      await refreshLists()
    } catch (err) {
      setUploadStatus({ type: 'error', message: err.message })
    } finally {
      setEncodingId(null)
    }
  }

  const handleSelectTranscoded = (video) => {
    save({ videoName: video.name, videoUrl: String(video.id) })
    setUploadStatus({ type: 'success', message: `Selected "${video.name}" for this element.` })
  }

  const statusColor = {
    success: 'text-green-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    info: 'text-gray-400',
  }

  return (
    <div className="space-y-2 pb-2 border-b border-gray-700">
      <Field label="Video URL">
        <TextInput value={el.videoUrl || ''} placeholder="220952/video" onChange={(v) => save({ videoUrl: v })} />
      </Field>
      <Field label="Video Name/ID">
        <TextInput value={el.videoName || ''} placeholder="video1" onChange={(v) => save({ videoName: v })} />
      </Field>
      <Field label="Start Playing When">
        <SelectInput value={el.playTrigger || 'autoplay'} onChange={(v) => save({ playTrigger: v })}>
          <option value="autoplay">Autoplay</option>
          <option value="mouseover">Mouse Over</option>
          <option value="click">Click/Tap</option>
        </SelectInput>
      </Field>
      <div className="flex gap-4">
        <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
          <input type="checkbox" checked={!!el.muted} onChange={(e) => save({ muted: e.target.checked })} className="w-4 h-4" />
          Muted
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
          <input type="checkbox" checked={!!el.controls} onChange={(e) => save({ controls: e.target.checked })} className="w-4 h-4" />
          Controls
        </label>
      </div>

      {/* Flashtalking video upload */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
          <i className="fa-solid fa-cloud-arrow-up text-purple-400" style={{ fontSize: 10 }} />
          Flashtalking Videos
        </p>
        {!ftLibrary ? (
          <p className="text-xs text-gray-500 italic">Select a Creative Library in the toolbar first.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 truncate">
              Library: <span className="text-gray-300">{ftLibrary.name}</span>
            </p>

            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleFileChange}
                className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600 cursor-pointer"
              />
              {fileInfo && (
                <p className="text-xs text-gray-500">{fileInfo.name} · {fileInfo.sizeMb} MB</p>
              )}
              <button
                onClick={handleUpload}
                disabled={uploading || !fileInfo || (fileInfo && parseFloat(fileInfo.sizeMb) > MAX_FILE_MB)}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded py-1.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 11 }} />
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>

            {uploadStatus && (
              <p className={`text-xs ${statusColor[uploadStatus.type] || 'text-gray-400'}`}>
                {uploadStatus.type === 'info' && <i className="fa-solid fa-spinner fa-spin mr-1" style={{ fontSize: 10 }} />}
                {uploadStatus.message}
              </p>
            )}

            <button
              onClick={() => setShowLibrary(true)}
              className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 rounded py-1.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <i className="fa-solid fa-film" style={{ fontSize: 11 }} />
              Video Library ({uploaded.length + transcoded.length})
            </button>
          </div>
        )}
      </div>

      {showLibrary && (
        <VideoLibraryModal
          onClose={() => setShowLibrary(false)}
          libraryName={ftLibrary?.name}
          uploaded={uploaded}
          transcoded={transcoded}
          loading={listLoading}
          onRefresh={refreshLists}
          onTranscode={handleTranscode}
          encodingId={encodingId}
          onSelectTranscoded={handleSelectTranscoded}
          selectedVideoId={el.videoUrl}
        />
      )}
    </div>
  )
}
