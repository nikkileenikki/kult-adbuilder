import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Field, TextInput, SelectInput } from '../left/PropertiesSection.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useAuthStore } from '../../store/authStore.js'
import VideoLibraryModal from '../modals/VideoLibraryModal.jsx'

const MAX_FILE_MB = 100
const SIZE_WARNING_MB = 10

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
      // Never overwrite an existing encode — name it "base-quality-N", incrementing N
      // past whatever's already in the Transcoded list for this base+quality.
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

      // Encoding can take a while on FT's side — don't block on it here.
      // Refresh the library periodically; the video will show up under Transcoded once ready.
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

  const handleSelectTranscoded = (video) => {
    const nameBase = video.name.replace(/\.[^.]+$/, '')
    const update = {
      videoName: nameBase,
      videoUrl: `${ftLibrary.id}/${nameBase}`,
    }
    // Fit the element to the video's own aspect ratio (keep current width, adjust height)
    // and lock it so future manual resizes don't distort the video.
    if (video.width && video.height && el.width) {
      update.height = Math.round(el.width * (video.height / video.width))
      update.lockAspectRatio = true
    }
    save(update)
    setUploadStatus({ type: 'success', message: `Selected "${video.name}" for this element.` })
  }

  return (
    <div className="space-y-2 pb-2 border-b border-gray-700">
      {!ftLibrary ? (
        <p className="text-xs text-gray-500 italic">Select a Creative Library in the toolbar first.</p>
      ) : (
        <button
          onClick={() => setShowLibrary(true)}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 mb-1"
        >
          <i className="fa-solid fa-film" style={{ fontSize: 13 }} />
          Video Library ({uploaded.length + transcoded.length})
        </button>
      )}

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
          selectedVideoUrl={el.videoUrl}
          libraryId={ftLibrary?.id}
          fileRef={fileRef}
          fileInfo={fileInfo}
          uploading={uploading}
          uploadStatus={uploadStatus}
          onFileChange={handleFileChange}
          onUpload={handleUpload}
        />
      )}
    </div>
  )
}
