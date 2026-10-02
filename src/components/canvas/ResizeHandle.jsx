import React, { useCallback, useRef } from 'react'
import { useUiStore } from '../../store/uiStore.js'
import { useHistoryStore } from '../../store/historyStore.js'

const SNAP_THRESHOLD = 6

function snapTo(val, candidates) {
  for (const c of candidates) {
    if (Math.abs(val - c) <= SNAP_THRESHOLD) return c
  }
  return val
}

export default function ResizeHandle({ handle, element, onResize, canvasWidth, canvasHeight }) {
  const scaleRef = useRef(1)
  scaleRef.current = useUiStore((s) => s.canvasZoom / 100)
  const { saveState } = useHistoryStore()
  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const start = { x: e.clientX, y: e.clientY }
    const orig = { x: element.x, y: element.y, w: element.width, h: element.height }
    // Resizing had no history integration at all, so Ctrl+Z after a resize undid
    // whatever came *before* it and the resize itself could never be backed out.
    // Saved on the first move (not mousedown) so grabbing a handle without dragging
    // doesn't add an undo step, matching how dragging works in CanvasElement.
    let saved = false

    const ratio = element.lockAspectRatio && orig.h ? orig.w / orig.h : null

    const onMove = (mv) => {
      if (!saved) { saveState(); saved = true }
      const dx = (mv.clientX - start.x) / scaleRef.current
      const dy = (mv.clientY - start.y) / scaleRef.current
      let { x, y, w, h } = orig

      if (handle.id.includes('e')) {
        w = Math.max(10, orig.w + dx)
        if (canvasWidth != null) w = snapTo(x + w, [canvasWidth, canvasWidth / 2]) - x
      }
      if (handle.id.includes('s')) {
        h = Math.max(10, orig.h + dy)
        if (canvasHeight != null) h = snapTo(y + h, [canvasHeight, canvasHeight / 2]) - y
      }
      if (handle.id.includes('w')) {
        w = Math.max(10, orig.w - dx)
        x = orig.x + orig.w - w
        if (canvasWidth != null) { x = snapTo(x, [0, canvasWidth / 2]); w = orig.x + orig.w - x }
      }
      if (handle.id.includes('n')) {
        h = Math.max(10, orig.h - dy)
        y = orig.y + orig.h - h
        if (canvasHeight != null) { y = snapTo(y, [0, canvasHeight / 2]); h = orig.y + orig.h - y }
      }

      if (ratio) {
        // Only corner handles exist (see ResizeHandles in CanvasElement), so every
        // handle changes both axes and the old "is this a horizontal-only handle?"
        // test could never be true — width was always derived from height, which made
        // dragging a corner sideways do nothing at all while the lock was on.
        //
        // Pick the axis the pointer actually moved further along, proportionally, and
        // derive the other from it. That tracks the cursor on whichever direction the
        // user is leading with, in both axes.
        const wChange = Math.abs(w / orig.w - 1)
        const hChange = Math.abs(h / orig.h - 1)
        if (wChange >= hChange) h = Math.max(10, Math.round(w / ratio))
        else w = Math.max(10, Math.round(h * ratio))

        // Re-anchor whichever edges this handle is supposed to leave fixed: a west
        // handle pins the right edge, a north handle pins the bottom. The north case
        // was missing, so nw/ne drags grew downward out of the corner being held.
        if (handle.id.includes('w')) x = orig.x + orig.w - w
        if (handle.id.includes('n')) y = orig.y + orig.h - h
      }

      onResize(element.id, { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [handle, element, onResize, saveState])

  const style = {
    position: 'absolute',
    width: 10, height: 10,
    background: 'rgb(59,130,246)',
    border: '1px solid white',
    borderRadius: '50%',
    cursor: handle.cursor,
    zIndex: 9999,
    ...handle.style,
  }

  return <div style={style} onMouseDown={onMouseDown} />
}
