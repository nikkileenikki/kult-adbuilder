import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useUiStore } from '../../store/uiStore.js'
import { useAuthStore } from '../../store/authStore.js'
import VideoLibraryModal from './VideoLibraryModal.jsx'

const MAX_FILE_MB = 100
const SIZE_WARNING_MB = 10

// Standalone video upload/transcode manager, opened from the header — lets an admin
// stock the Creative Library with transcoded videos without first dropping a video
// element onto the canvas (VideoProperties.jsx has the element-bound equivalent).
export default function VideoAssetsModal({ onClose }) {
  const { ftLibrary } = useUiStore()
  const { token } = useAuthStore()
  const fileRef = useRef(null)

  const [uploadStatus, setUploadStatus] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [fileInfo, setFileInfo] = useState(null)
  const [uploaded, setUploaded] = useState([])
  const [transcoded, setTranscoded] = useState([])
  const [listLoading, setListLoading] = useState(false)
  const [encodingId, setEncodingId] = useState(null)

  const authHeader = { Authorization: `Bearer ${token}` }

  const refreshLists = useCallback(async () => {
    if (!ftLibrary) return
    setListLoading(true)
    try {
      const res = await fetch(`/api/flashtalking/videos?library_id=${ftLibrary.id}`, { headers: authHeader })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load videos')
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

  const handleTranscode = async (video, targetHeight, qualityLabel, targetWidth) => {
    if (!ftLibrary) return
    setEncodingId(video.id)
    setUploadStatus({ type: 'info', message: `Encoding ${video.name}…` })

    // A caller-supplied width (custom W×H) is used as-is; otherwise derive width from
    // the source's own aspect ratio so preset quality levels don't distort the video.
    let width = video.width
    let height = video.height
    if (targetWidth && targetHeight) {
      width = Math.round(targetWidth / 2) * 2
      height = Math.round(targetHeight / 2) * 2
    } else if (targetHeight && video.width && video.height) {
      height = targetHeight
      width = Math.round((video.width / video.height) * targetHeight / 2) * 2
    }

    try {
      const rawBase = video.name.replace(/\.[^.]+$/, '')
      const prefix = qualityLabel ? `${rawBase}-${qualityLabel}-` : `${rawBase}-`
      let maxIndex = 0
      transcoded.forEach((t) => {
        if (t.name.startsWith(prefix)) {
          const suffix = t.name.slice(prefix.length)
          const n = parseInt(suffix, 10)
          if (!isNaN(n) && n > maxIndex) maxIndex = n
        }
      })
      const nameBase = `${prefix}${maxIndex + 1}`

      const encodeRes = await fetch('/api/flashtalking/video-encode', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          library_id: ftLibrary.id,
          video_source: video.videoSource,
          name: nameBase,
          width,
          height,
        }),
      })
      const encodeData = await encodeRes.json()
      if (!encodeRes.ok) throw new Error(encodeData.error || 'Encode failed')

      setUploadStatus({ type: 'success', message: 'Transcoding started — it will appear under Transcoded once FT finishes.' })
      setTimeout(refreshLists, 15000)
      setTimeout(refreshLists, 45000)
      setTimeout(refreshLists, 90000)
    } catch (err) {
      setUploadStatus({ type: 'error', message: err.message })
    } finally {
      setEncodingId(null)
    }
  }

  // No canvas element to bind to here — clicking a transcoded video just copies its
  // FT video reference so it can be pasted into an element's Video URL field.
  const handleCopyReference = (video) => {
    const nameBase = video.name.replace(/\.[^.]+$/, '')
    const ref = `${ftLibrary.id}/${nameBase}`
    navigator.clipboard?.writeText(ref).catch(() => {})
    setUploadStatus({ type: 'success', message: `Copied reference "${ref}" to clipboard.` })
  }

  if (!ftLibrary) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-2xl text-center">
          <p className="text-sm text-gray-300 mb-4">Select a Creative Library in the toolbar first.</p>
          <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded text-sm">Close</button>
        </div>
      </div>
    )
  }

  return (
    <VideoLibraryModal
      onClose={onClose}
      libraryName={ftLibrary?.name}
      uploaded={uploaded}
      transcoded={transcoded}
      loading={listLoading}
      onRefresh={refreshLists}
      onTranscode={handleTranscode}
      encodingId={encodingId}
      onSelectTranscoded={handleCopyReference}
      selectedVideoUrl={null}
      libraryId={ftLibrary?.id}
      fileRef={fileRef}
      fileInfo={fileInfo}
      uploading={uploading}
      uploadStatus={uploadStatus}
      onFileChange={handleFileChange}
      onUpload={handleUpload}
    />
  )
}
