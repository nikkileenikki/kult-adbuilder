import React, { useCallback, useRef } from 'react'
import { useUiStore } from '../../store/uiStore.js'

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
  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const start = { x: e.clientX, y: e.clientY }
    const orig = { x: element.x, y: element.y, w: element.width, h: element.height }

    const ratio = element.lockAspectRatio && orig.h ? orig.w / orig.h : null

    const onMove = (mv) => {
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
        // Determine dominant axis from handle and apply ratio to the other
        const changedW = handle.id.includes('e') || handle.id.includes('w')
        const changedH = handle.id.includes('n') || handle.id.includes('s')
        if (changedW && !changedH) {
          h = Math.round(w / ratio)
        } else {
          w = Math.round(h * ratio)
          if (handle.id.includes('w')) x = orig.x + orig.w - w
        }
      }

      onResize(element.id, { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [handle, element, onResize])

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
