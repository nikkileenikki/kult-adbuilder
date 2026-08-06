import React, { useRef, useState, useCallback, useEffect } from 'react'
import gsap from 'gsap'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { layerLabel } from '../../utils/layerLabel.js'

const BASE_PX_PER_SEC = 80

export default function Timeline() {
  const {
    elements, groups, selectedId, setSelected, deleteElement, duplicateElement, toggleVisibility,
    reorderElements, updateElement, createGroup: createGroupInStore, deleteGroup: deleteGroupInStore,
    toggleGroupCollapsed, animDuration: duration, animLoop: loop, setAnimDuration: setDuration, setAnimLoop: setLoop,
    animStopPoint: stopPoint, setAnimStopPoint: setStopPoint,
  } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const { openModal } = useUiStore()
  const [playing, setPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(0)
  const [timeZoom, setTimeZoom] = useState(1)          // 0.5x … 4x
  const [collapsed, setCollapsed] = useState(false)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const tlRef = useRef(null)
  const rafRef = useRef(null)
  const scrubTlRef = useRef(null)
  const playheadRef = useRef(0)
  const completedRef = useRef(false)
  const rowDragIdx = useRef(null)
  const trackScrollRef = useRef(null)
  const rulerScrollRef = useRef(null)
  const rulerAreaRef = useRef(null)

  const PX_PER_SEC = BASE_PX_PER_SEC * timeZoom
  const totalWidth = duration * PX_PER_SEC + 120

  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex)

  const rulerStep = timeZoom >= 2 ? 0.25 : timeZoom >= 1 ? 0.5 : 1
  const rulerMarks = Array.from({ length: Math.floor(duration / rulerStep) + 1 }, (_, i) => i * rulerStep)

  // Sync ruler scroll with track scroll
  const onTrackScroll = (e) => {
    if (rulerScrollRef.current) rulerScrollRef.current.scrollLeft = e.target.scrollLeft
  }

  // Playhead RAF
  const tickPlayhead = useCallback(() => {
    if (!tlRef.current) return
    const t = tlRef.current.time()
    playheadRef.current = t
    setPlayhead(t)
    rafRef.current = requestAnimationFrame(tickPlayhead)
  }, [])

  // ── Clear only GSAP-managed properties (never touches React inline styles) ───
  const clearGsapProps = useCallback(() => {
    elements.forEach((el) => {
      const dom = document.getElementById(el.id)
      if (dom) {
        gsap.killTweensOf(dom)
        gsap.set(dom, { clearProps: 'x,y,scale,rotation,opacity,visibility,transformOrigin' })
      }
    })
  }, [elements])

  // ── Build GSAP timeline from element animations ───────────────────────────
  const buildTl = useCallback((opts = {}) => {
    const tl = gsap.timeline({ defaults: { overwrite: 'auto' }, ...opts })
    elements.forEach((el) => {
      const dom = document.getElementById(el.id)
      if (!dom) return
      ;(el.animations || []).forEach((anim) => {
        const start = anim.startTime || 0
        const dur = Math.max(0.01, anim.duration || 1)
        const ease = anim.ease || 'power1.out'
        const legOff = anim.offset ?? 400
        const ox = anim.offsetX ?? legOff
        const oy = anim.offsetY ?? legOff
        const sp = anim.scaleParam ?? 0
        switch (anim.type) {
          case 'fadeIn':       tl.fromTo(dom, { autoAlpha: 0 }, { autoAlpha: el.opacity ?? 1, duration: dur, ease }, start); break
          case 'fadeOut':      tl.to(dom, { autoAlpha: 0, duration: dur, ease }, start); break
          case 'slideLeft':    tl.fromTo(dom, { x: -ox }, { x: 0, duration: dur, ease, immediateRender: false }, start); break
          case 'slideRight':   tl.fromTo(dom, { x: ox }, { x: 0, duration: dur, ease, immediateRender: false }, start); break
          case 'slideUp':      tl.fromTo(dom, { y: -oy }, { y: 0, duration: dur, ease, immediateRender: false }, start); break
          case 'slideDown':    tl.fromTo(dom, { y: oy }, { y: 0, duration: dur, ease, immediateRender: false }, start); break
          case 'slideToLeft':  tl.to(dom, { x: -ox, duration: dur, ease }, start); break
          case 'slideToRight': tl.to(dom, { x: ox, duration: dur, ease }, start); break
          case 'slideToUp':    tl.to(dom, { y: -oy, duration: dur, ease }, start); break
          case 'slideToDown':  tl.to(dom, { y: oy, duration: dur, ease }, start); break
          // new scale types
          case 'scaleFrom': {
            const origin = anim.transformOrigin || 'center center'
            tl.set(dom, { transformOrigin: origin }, start)
            tl.fromTo(dom, { scale: sp }, { scale: 1, duration: dur, ease, immediateRender: false }, start)
            break
          }
          case 'scaleTo': {
            const origin = anim.transformOrigin || 'center center'
            tl.set(dom, { transformOrigin: origin }, start)
            tl.to(dom, { scale: sp, duration: dur, ease }, start)
            break
          }
          // legacy
          case 'scaleIn':      tl.fromTo(dom, { scale: 0 }, { scale: 1, duration: dur, ease, immediateRender: false }, start); break
          case 'scaleOut':     tl.to(dom, { scale: 0, duration: dur, ease }, start); break
          case 'rotate90':     tl.to(dom, { rotation: 90,  duration: dur, ease }, start); break
          case 'rotate180':    tl.to(dom, { rotation: 180, duration: dur, ease }, start); break
          case 'rotate270':    tl.to(dom, { rotation: 270, duration: dur, ease }, start); break
          case 'rotate360':    tl.to(dom, { rotation: 360, duration: dur, ease }, start); break
          default: break
        }
      })
    })
    // Mirrors the exported banner's tl.addPause(animStopPoint) (see buildAnimationJS
    // in exportBanner.js) so pressing Play in the editor previews the same auto-pause
    // behavior, instead of only showing up once the banner is exported.
    if (stopPoint != null && stopPoint > 0 && stopPoint < duration) tl.addPause(stopPoint)
    return tl
  }, [elements, stopPoint, duration])

  // ── Play / Stop ─────────────────────────────────────────────────────────────
  const play = useCallback(() => {
    if (tlRef.current) { tlRef.current.kill(); tlRef.current = null }
    if (scrubTlRef.current) { scrubTlRef.current.kill(); scrubTlRef.current = null }
    cancelAnimationFrame(rafRef.current)
    clearGsapProps()

    // After natural completion, always restart from 0; otherwise resume from scrub position
    const startAt = completedRef.current ? 0 : playheadRef.current
    completedRef.current = false

    const tl = buildTl({
      repeat: loop - 1,
      onComplete: () => {
        cancelAnimationFrame(rafRef.current)
        // Pause at end so GSAP keeps owning DOM properties (prevents React re-render from reverting)
        if (tlRef.current) tlRef.current.pause(tlRef.current.totalDuration())
        completedRef.current = true
        setPlaying(false)
      },
    })

    if (startAt > 0) tl.seek(startAt, false)

    tlRef.current = tl
    setPlaying(true)
    rafRef.current = requestAnimationFrame(tickPlayhead)
  }, [elements, loop, tickPlayhead, buildTl, clearGsapProps])

  const stop = useCallback(() => {
    if (tlRef.current) { tlRef.current.kill(); tlRef.current = null }
    if (scrubTlRef.current) { scrubTlRef.current.kill(); scrubTlRef.current = null }
    cancelAnimationFrame(rafRef.current)
    clearGsapProps()
    setPlaying(false)
    completedRef.current = false
    playheadRef.current = 0
    setPlayhead(0)
  }, [clearGsapProps])

  // ── Ruler scrub ──────────────────────────────────────────────────────────────
  const onRulerMouseDown = useCallback((e) => {
    e.preventDefault()
    const el = rulerAreaRef.current
    if (!el) return
    const getTime = (clientX) => {
      const rect = el.getBoundingClientRect()
      const scrollLeft = rulerScrollRef.current?.scrollLeft || 0
      const x = clientX - rect.left + scrollLeft
      return Math.max(0, Math.min(duration, x / PX_PER_SEC))
    }
    const seekTo = (clientX) => {
      const t = getTime(clientX)
      playheadRef.current = t
      setPlayhead(t)
      if (tlRef.current) {
        tlRef.current.seek(t)
      } else {
        // Build a paused scrub timeline if not already playing
        if (!scrubTlRef.current) {
          scrubTlRef.current = buildTl({ paused: true })
        }
        scrubTlRef.current.seek(t)
      }
    }
    seekTo(e.clientX)
    const onMove = (mv) => seekTo(mv.clientX)
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [duration, PX_PER_SEC, elements, buildTl])

  // ── Stopping-point pin drag ──────────────────────────────────────────────────
  const onStopPinMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation() // don't also trigger onRulerMouseDown's playhead scrub
    const el = rulerAreaRef.current
    if (!el) return
    const dragTo = (clientX) => {
      const rect = el.getBoundingClientRect()
      const scrollLeft = rulerScrollRef.current?.scrollLeft || 0
      const x = clientX - rect.left + scrollLeft
      const t = Math.max(0, Math.min(duration, x / PX_PER_SEC))
      setStopPoint(Math.round(t * 10) / 10)
    }
    dragTo(e.clientX)
    const onMove = (mv) => dragTo(mv.clientX)
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [duration, PX_PER_SEC, setStopPoint])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // ── Spacebar play/stop ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.code !== 'Space') return
      const active = document.activeElement
      // Excludes contentEditable too — the canvas text editor is a contentEditable
      // <div> (tagName "DIV"), which the tag-name-only check let straight through,
      // so pressing Space while editing text toggled timeline play/stop and
      // swallowed the keystroke instead of typing a space.
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(active?.tagName) || active?.isContentEditable) return
      e.preventDefault()
      if (playing) stop(); else play()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [playing, play, stop])

  // ── Groups ──────────────────────────────────────────────────────────────────
  // Persisted in canvasStore (group list + each element's own folderId) rather than
  // component state, so groups survive a refresh and can be targeted from elsewhere
  // (e.g. the hover-effect / video time-cue "target group" pickers).
  const createGroup = () => { saveState(); createGroupInStore() }
  const deleteGroup = (id) => { saveState(); deleteGroupInStore(id) }
  const toggleGroup = (id) => toggleGroupCollapsed(id)

  // ── Row drag ────────────────────────────────────────────────────────────────
  // rowDragIdx holds either an element id, or a group marker ('group:<id>') when
  // dragging a group header to reorder groups relative to each other.
  const onRowDragStart = (e, elId) => { rowDragIdx.current = elId; e.dataTransfer.effectAllowed = 'move' }
  const onGroupDragStart = (e, groupId) => { rowDragIdx.current = `group:${groupId}`; e.dataTransfer.effectAllowed = 'move' }
  const onRowDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }

  // Drop an element onto another element row: reorders (via zIndex, matching the
  // displayed order); if a plain element was dragged, it also adopts the drop target's
  // group membership, so dropping next to an ungrouped element pulls it out of its
  // group and dropping next to a grouped element joins that group — arranging order
  // and grouping in one motion. If a whole group was dragged, it moves as one block to
  // that position, interleaving with individual layers, and its members keep their
  // group membership unchanged.
  const onRowDrop = (e, toElId) => {
    e.preventDefault()
    const from = rowDragIdx.current
    rowDragIdx.current = null
    if (!from || from === toElId) return
    const toEl = elements.find((el) => el.id === toElId)
    if (!toEl) return
    saveState()
    reorderElements(from, toElId)
    if (!from.startsWith('group:')) updateElement(from, { folderId: toEl.folderId ?? null })
  }

  // Drop on a group header: a dragged element joins that group (appended, no specific
  // position within it); a dragged group moves as a block to that position instead.
  const onGroupDrop = (e, groupId) => {
    e.preventDefault()
    const from = rowDragIdx.current
    rowDragIdx.current = null
    if (!from) return
    saveState()
    if (from.startsWith('group:')) {
      if (from !== `group:${groupId}`) reorderElements(from, `group:${groupId}`)
    } else {
      updateElement(from, { folderId: groupId })
    }
  }

  const onDelete = (id) => { saveState(); deleteElement(id) }
  const onDuplicate = (id) => { saveState(); duplicateElement(id) }

  const startRename = (el) => { setRenamingId(el.id); setRenameValue(el.name || layerLabel(el)) }
  const commitRename = () => {
    if (renamingId) {
      const trimmed = renameValue.trim()
      saveState()
      updateElement(renamingId, { name: trimmed || null })
    }
    setRenamingId(null)
  }

  const playheadLeft = playhead * PX_PER_SEC

  // Build rows in actual stacking order: a group is one block (positioned by its own
  // zIndex — independent of its members' so an *empty* group still sorts/drags
  // correctly) interleaved with individual ungrouped elements, so a group can sit
  // anywhere in the stack, not pinned above or below everything else — matching how
  // reorderElements treats them (see canvasStore.js's buildBlocks).
  const rows = []
  const groupedIds = new Set(elements.filter((el) => el.folderId && groups.some((g) => g.id === el.folderId)).map((el) => el.id))
  const blockItems = [
    ...sorted.filter((el) => !groupedIds.has(el.id)).map((el) => ({ kind: 'element', el, sortZ: el.zIndex || 0 })),
    ...groups.map((grp) => ({ kind: 'group', grp, members: sorted.filter((el) => el.folderId === grp.id), sortZ: grp.zIndex ?? 0 })),
  ].sort((a, b) => b.sortZ - a.sortZ)

  blockItems.forEach((item) => {
    if (item.kind === 'element') {
      rows.push({ type: 'element', el: item.el, idx: sorted.indexOf(item.el), inGroup: false })
      return
    }
    rows.push({ type: 'group', grp: item.grp })
    if (!item.grp.collapsed) {
      item.members.forEach((el) => {
        rows.push({ type: 'element', el, idx: sorted.indexOf(el), inGroup: true })
      })
    }
  })

  return (
    <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700">
      {/* ── Collapsed mini-bar ─────────────────────────────────────────────── */}
      {collapsed ? (
        <div className="flex items-center gap-3 px-3 py-2">
          <button onClick={() => setCollapsed(false)} title="Expand timeline"
            className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-xs font-semibold">
            <i className="fa-solid fa-film" style={{ fontSize: 13 }} />
            <span>Animation Timeline</span>
            <i className="fa-solid fa-chevron-up" style={{ fontSize: 10 }} />
          </button>
          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden mx-2 cursor-col-resize relative" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const t = Math.max(0, Math.min(duration, ((e.clientX - rect.left) / rect.width) * duration))
            playheadRef.current = t; setPlayhead(t)
            if (scrubTlRef.current) { scrubTlRef.current.seek(t) }
            else { scrubTlRef.current = buildTl({ paused: true }); scrubTlRef.current.seek(t) }
          }}>
            <div className="h-full bg-purple-500/40 rounded-full" style={{ width: `${(playhead / duration) * 100}%` }} />
            <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400" style={{ left: `${(playhead / duration) * 100}%` }} />
          </div>
          <span className="text-xs text-gray-500 tabular-nums w-10 text-right">{playhead.toFixed(1)}s</span>
          <button
            onClick={playing ? stop : play}
            className={`flex items-center gap-1 text-white px-3 py-1 rounded text-xs ${playing ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {playing
              ? <><i className="fa-solid fa-stop" style={{ fontSize: 10 }} /> Stop</>
              : <><i className="fa-solid fa-play" style={{ fontSize: 10 }} /> Play</>}
          </button>
        </div>
      ) : (
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold flex items-center gap-2 text-white">
              <i className="fa-solid fa-film text-purple-400" style={{ fontSize: 15 }} />
              Animation Timeline
              <button onClick={() => setCollapsed(true)} title="Collapse timeline"
                className="text-gray-400 hover:text-gray-200 ml-1">
                <i className="fa-solid fa-chevron-down" style={{ fontSize: 11 }} />
              </button>
            </h3>
            <div className="flex items-center gap-2">
              {/* Timeline zoom */}
              <div className="flex items-center gap-1 bg-gray-900 rounded px-2 py-1">
                <label className="text-xs text-gray-400">Timeline:</label>
                <button onClick={() => setTimeZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))} className="text-gray-400 hover:text-white px-1" title="Zoom out timeline">
                  <i className="fa-solid fa-magnifying-glass-minus" style={{ fontSize: 12 }} />
                </button>
                <span className="text-xs text-gray-300 w-8 text-center">{Math.round(timeZoom * 100)}%</span>
                <button onClick={() => setTimeZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} className="text-gray-400 hover:text-white px-1" title="Zoom in timeline">
                  <i className="fa-solid fa-magnifying-glass-plus" style={{ fontSize: 12 }} />
                </button>
              </div>
              {/* Stopping point — plays from 0, auto-pauses here (see buildTl's
                  tl.addPause(stopPoint) and the mirrored export in exportBanner.js),
                  and resumes via an invisible layer's "Resume Timeline" action. */}
              <div className="flex items-center gap-1 bg-gray-900 rounded px-2 py-1">
                <label className="text-xs text-gray-400">Stop Point:</label>
                {stopPoint != null ? (
                  <>
                    <span className="text-xs text-gray-300 w-10 text-center tabular-nums">{stopPoint.toFixed(1)}s</span>
                    <button onClick={() => setStopPoint(null)} className="text-gray-400 hover:text-red-400 px-1" title="Remove stopping point">
                      <i className="fa-solid fa-xmark" style={{ fontSize: 12 }} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => setStopPoint(playhead)} className="text-gray-400 hover:text-white px-1" title="Add a stopping point at the current playhead">
                    <i className="fa-solid fa-flag" style={{ fontSize: 12 }} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 bg-gray-900 rounded px-2 py-1">
                <label className="text-xs text-gray-400">Duration:</label>
                <input type="number" value={duration} step={0.5} min={1} max={30}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="bg-gray-700 rounded px-2 py-0.5 text-sm w-14 text-white" />
              </div>
              <div className="flex items-center gap-1 bg-gray-900 rounded px-2 py-1">
                <label className="text-xs text-gray-400">Loop:</label>
                <input type="number" value={loop} min={1} max={999}
                  onChange={(e) => setLoop(Number(e.target.value))}
                  className="bg-gray-700 rounded px-2 py-0.5 text-sm w-14 text-white" />
              </div>
              <button
                onClick={playing ? stop : play}
                className={`flex items-center gap-1 text-white px-3 py-1 rounded text-sm ${playing ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {playing ? <><i className="fa-solid fa-stop" style={{ fontSize: 11 }} /> Stop</> : <><i className="fa-solid fa-play" style={{ fontSize: 11 }} /> Play</>}
              </button>
            </div>
          </div>

          {/* Timeline container */}
          <div className="bg-gray-900 rounded-lg overflow-hidden" style={{ height: 215 }}>
        {/* Ruler row */}
        <div className="flex border-b border-gray-700 bg-gray-900" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <div className="flex items-center justify-between px-2 py-1 bg-gray-800 border-r border-gray-700 shrink-0" style={{ width: 250 }}>
            <span className="text-xs text-gray-400 font-semibold">LAYER</span>
            <button title="Create Group" onClick={createGroup} className="text-gray-600 hover:text-yellow-300 px-1 rounded">
              <i className="fa-solid fa-folder-plus" style={{ fontSize: 13 }} />
            </button>
          </div>
          <div ref={rulerScrollRef} className="flex-1 overflow-hidden relative h-8">
            <div
              ref={rulerAreaRef}
              onMouseDown={onRulerMouseDown}
              className="relative h-full cursor-col-resize select-none"
              style={{ width: totalWidth, minWidth: '100%' }}
            >
              {rulerMarks.map((t) => (
                <div key={t} className="absolute top-0 bottom-0" style={{ left: t * PX_PER_SEC }}>
                  <div className="absolute top-0 bottom-0 w-px bg-gray-700" />
                  <span className="absolute top-0.5 text-gray-400 select-none" style={{ fontSize: 10, left: 3 }}>{t}s</span>
                </div>
              ))}
              {/* Always-visible playhead pin */}
              <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: playheadLeft }}>
                <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400" />
                <div className="absolute" style={{ top: 0, left: -5, width: 11, height: 10, background: '#facc15', clipPath: 'polygon(50% 100%, 0% 0%, 100% 0%)', transform: 'rotate(180deg)' }} />
              </div>
              {/* Stopping-point pin — draggable independently of the playhead scrub
                  (stopPropagation keeps onRulerMouseDown from also firing). */}
              {stopPoint != null && (
                <div
                  className="absolute top-0 bottom-0 z-20 cursor-ew-resize"
                  style={{ left: stopPoint * PX_PER_SEC }}
                  onMouseDown={onStopPinMouseDown}
                  title={`Stopping point: ${stopPoint.toFixed(1)}s (drag to move)`}
                >
                  <div className="absolute top-0 bottom-0 w-0.5 bg-red-500" />
                  <div className="absolute" style={{ top: 0, left: -5, width: 11, height: 10, background: '#ef4444', clipPath: 'polygon(50% 100%, 0% 0%, 100% 0%)', transform: 'rotate(180deg)' }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tracks */}
        <div ref={trackScrollRef} onScroll={onTrackScroll}
          style={{ maxHeight: 178, minHeight: 178, overflowY: 'auto', overflowX: 'auto' }}>
          {rows.length === 0 && (
            <div className="flex items-center justify-center text-gray-500 text-sm" style={{ height: 178 }}>
              Add elements and animations to see timeline
            </div>
          )}
          {rows.map((row, rowIdx) => {
            if (row.type === 'group') {
              const { grp } = row
              return (
                <div key={grp.id}
                  draggable
                  onDragStart={(e) => onGroupDragStart(e, grp.id)}
                  onDragOver={onRowDragOver}
                  onDrop={(e) => onGroupDrop(e, grp.id)}
                  className="flex border-b border-gray-700 bg-yellow-900/20"
                  style={{ minHeight: 32, minWidth: totalWidth + 250, userSelect: 'none' }}>
                  <div className="flex items-center gap-1 px-2 bg-yellow-900/30 border-r border-gray-700 shrink-0 sticky left-0 z-10"
                    style={{ width: 250 }}>
                    <button onClick={() => toggleGroup(grp.id)} className="flex items-center gap-1 flex-1 min-w-0 cursor-pointer">
                      {grp.collapsed ? <i className="fa-solid fa-chevron-right text-yellow-400 shrink-0" style={{ fontSize: 12 }} /> : <i className="fa-solid fa-chevron-down text-yellow-400 shrink-0" style={{ fontSize: 12 }} />}
                      <span className="flex-1 text-xs text-yellow-300 font-semibold truncate text-left">{grp.name}</span>
                    </button>
                    <TrackBtn title="Delete Group" onClick={() => deleteGroup(grp.id)} danger>
                      <i className="fa-solid fa-trash" style={{ fontSize: 13 }} />
                    </TrackBtn>
                  </div>
                  <div className="flex-1 relative" style={{ background: 'rgb(17,24,39)', minWidth: totalWidth }}>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-xs text-yellow-900/60">drop layers here</span>
                    </div>
                  </div>
                </div>
              )
            }

            const { el, idx, inGroup } = row
            const animBatches = getAnimBatches(el.animations)
            const maxBatchRow = animBatches.reduce((m, b) => Math.max(m, b.row), 0)
            const trackH = Math.max(38, (maxBatchRow + 1) * 30 + 8)
            return (
              <div
                key={el.id}
                draggable
                onDragStart={(e) => onRowDragStart(e, el.id)}
                onDragOver={onRowDragOver}
                onDrop={(e) => { e.stopPropagation(); onRowDrop(e, el.id) }}
                className="flex border-b border-gray-700"
                style={{ minHeight: trackH, userSelect: 'none', minWidth: totalWidth + 250 }}
              >
                <div
                  onClick={() => setSelected(el.id)}
                  className={`flex items-center gap-1 px-1 cursor-pointer border-r border-gray-700 transition-colors shrink-0 sticky left-0 z-10 ${
                    selectedId === el.id ? 'bg-blue-500/20 border-r-blue-500' : 'bg-gray-800 hover:bg-blue-500/10'
                  } ${!el.visible ? 'opacity-50' : ''}`}
                  style={{ width: 250, paddingLeft: inGroup ? 20 : 4, minHeight: trackH }}
                >
                  <i className="fa-solid fa-grip-vertical text-gray-500 cursor-grab shrink-0" style={{ fontSize: 12 }} />
                  {renamingId === el.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename()
                        else if (e.key === 'Escape') setRenamingId(null)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-w-0 bg-gray-900 text-gray-100 text-xs rounded px-1 py-0.5 border border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <span
                      className="flex-1 truncate text-gray-200 text-xs"
                      onDoubleClick={(e) => { e.stopPropagation(); startRename(el) }}
                      title="Double-click to rename"
                    >
                      {layerLabel(el)}
                    </span>
                  )}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <TrackBtn title={el.visible ? 'Hide' : 'Show'} onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id) }}>
                      <i className={`fa-solid ${el.visible ? 'fa-eye' : 'fa-eye-slash'}`} style={{ fontSize: 13 }} />
                    </TrackBtn>
                    <TrackBtn title="Add Animation" onClick={(e) => { e.stopPropagation(); setSelected(el.id); openModal('animation') }}>
                      <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 13 }} />
                    </TrackBtn>
                    <TrackBtn title="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(el.id) }}>
                      <i className="fa-solid fa-copy" style={{ fontSize: 13 }} />
                    </TrackBtn>
                    <TrackBtn title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(el.id) }} danger>
                      <i className="fa-solid fa-trash" style={{ fontSize: 13 }} />
                    </TrackBtn>
                  </div>
                </div>

                <div className="relative" style={{ minWidth: totalWidth, flexGrow: 1, background: 'rgb(17,24,39)', minHeight: trackH }}>
                  <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-20 pointer-events-none" style={{ left: playheadLeft }} />
                  {animBatches.map((batch) => (
                    <DraggableAnimBlock
                      key={batch.indices.join('-')}
                      batch={batch}
                      row={batch.row}
                      elementId={el.id}
                      duration={duration}
                      pxPerSec={PX_PER_SEC}
                      onUpdateTiming={({ startTime: st, duration: dur }) => {
                        const anims = [...(el.animations || [])]
                        batch.indices.forEach((i) => { anims[i] = { ...anims[i], startTime: st, duration: dur } })
                        updateElement(el.id, { animations: anims })
                      }}
                      onDelete={() => {
                        const remove = new Set(batch.indices)
                        updateElement(el.id, { animations: (el.animations || []).filter((_, i) => !remove.has(i)) })
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          })}
          </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Group animations by batchId, then assign non-overlapping rows ────────────
function getAnimBatches(animations) {
  const batches = []
  const batchMap = {}
  ;(animations || []).forEach((anim, idx) => {
    if (anim.batchId) {
      if (!batchMap[anim.batchId]) {
        batchMap[anim.batchId] = { batchId: anim.batchId, anims: [], indices: [] }
        batches.push(batchMap[anim.batchId])
      }
      batchMap[anim.batchId].anims.push(anim)
      batchMap[anim.batchId].indices.push(idx)
    } else {
      batches.push({ batchId: null, anims: [anim], indices: [idx] })
    }
  })
  // Greedy row assignment: find lowest row where block doesn't overlap
  const rowEnds = []
  return batches.map((batch) => {
    const start = batch.anims[0].startTime || 0
    const end = start + (batch.anims[0].duration || 1)
    let row = rowEnds.findIndex((rowEnd) => rowEnd <= start)
    if (row === -1) row = rowEnds.length
    rowEnds[row] = end
    return { ...batch, row }
  })
}

// ── Draggable animation block ────────────────────────────────────────────────
function DraggableAnimBlock({ batch, elementId, onUpdateTiming, onDelete, duration: totalDuration, pxPerSec, row = 0 }) {
  const { openModal } = useUiStore()
  const anim = batch.anims[0]
  const isBatch = batch.anims.length > 1
  const label = batch.anims.map((a) => a.type).join(' + ')

  const onDoubleClick = (e) => {
    e.preventDefault(); e.stopPropagation()
    openModal('animation', {
      elementId,
      animIdx: batch.indices[0],
      anim,
      ...(isBatch ? { batchIndices: batch.indices, batchAnims: batch.anims } : {}),
    })
  }

  const onBodyMouseDown = (e) => {
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX
    const origStart = anim.startTime || 0
    const origDur = anim.duration || 1
    const onMove = (mv) => {
      const newStart = Math.max(0, Math.min(totalDuration - origDur, origStart + (mv.clientX - startX) / pxPerSec))
      onUpdateTiming({ startTime: Math.round(newStart * 10) / 10, duration: origDur })
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }

  const onResizeMouseDown = (e) => {
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX
    const origDur = anim.duration || 1
    const origStart = anim.startTime || 0
    const onMove = (mv) => {
      const newDur = Math.max(0.1, Math.min(totalDuration - origStart, origDur + (mv.clientX - startX) / pxPerSec))
      onUpdateTiming({ startTime: origStart, duration: Math.round(newDur * 10) / 10 })
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }

  const left = (anim.startTime || 0) * pxPerSec
  const width = Math.max((anim.duration || 1) * pxPerSec, 30)
  const top = row * 30 + 4

  return (
    <div
      onMouseDown={onBodyMouseDown}
      onDoubleClick={onDoubleClick}
      className="absolute flex items-center rounded select-none group"
      style={{
        left, top, width, height: 26, cursor: 'move',
        background: isBatch
          ? 'linear-gradient(135deg,rgba(20,184,166,0.8),rgba(59,130,246,0.8))'
          : 'linear-gradient(135deg,rgba(139,92,246,0.8),rgba(168,85,247,0.8))',
        border: isBatch ? '1px solid rgba(20,184,166,1)' : '1px solid rgba(139,92,246,1)',
        fontSize: 10, fontWeight: 600, color: 'white', overflow: 'visible', whiteSpace: 'nowrap',
      }}
      title="Double-click to edit"
    >
      <span className="flex-1 truncate pl-2 overflow-hidden">{label}</span>
      {isBatch && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); openModal('animation', { addToBatch: true, batchId: batch.batchId, elementId, anim }) }}
          className="hidden group-hover:flex items-center justify-center rounded-full shrink-0"
          style={{ width: 14, height: 14, background: 'rgba(16,185,129,0.9)', fontSize: 10, marginLeft: 2 }}
          title="Add animation to group"
        >+</button>
      )}
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="hidden group-hover:flex items-center justify-center rounded-full mx-1 shrink-0"
        style={{ width: 14, height: 14, background: 'rgba(239,68,68,0.9)', fontSize: 9 }}
      >✕</button>
      <div
        onMouseDown={onResizeMouseDown}
        className="absolute top-0 bottom-0 flex items-center justify-center"
        style={{ right: -4, width: 8, cursor: 'ew-resize', zIndex: 10 }}
      >
        <div style={{ width: 3, height: 14, borderRadius: 2, background: 'rgba(255,255,255,0.7)' }} />
      </div>
    </div>
  )
}

function TrackBtn({ title, onClick, children, danger }) {
  return (
    <button title={title} onClick={onClick}
      className={`flex items-center justify-center rounded transition-all ${danger ? 'text-gray-500 hover:bg-red-500/20 hover:text-red-400' : 'text-blue-400 hover:bg-blue-500/20 hover:text-white'}`}
      style={{ width: 24, height: 24, background: danger ? 'transparent' : 'rgba(59,130,246,0.15)', border: 'none', flexShrink: 0 }}>
      {children}
    </button>
  )
}

