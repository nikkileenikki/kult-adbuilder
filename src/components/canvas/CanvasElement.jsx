import React, { useRef, useCallback, useState } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import ResizeHandle from './ResizeHandle.jsx'

const SNAP_THRESHOLD = 6

function computeSnap(val, candidates) {
  for (const c of candidates) {
    if (Math.abs(val - c) <= SNAP_THRESHOLD) return { snapped: c, line: c }
  }
  return { snapped: val, line: null }
}

export default function CanvasElement({ element, canvasWidth, canvasHeight }) {
  const { selectedId, setSelected, updateElement, elements, setSnapLines, clearSnapLines } = useCanvasStore()
  const { saveState } = useHistoryStore()
  const isSelected = selectedId === element.id
  const dragState = useRef(null)
  const [editingText, setEditingText] = useState(false)
  const textRef = useRef(null)

  const onMouseDown = useCallback((e) => {
    if (element.locked) return
    if (editingText) return
    e.stopPropagation()
    setSelected(element.id)
    saveState()
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: element.x, origY: element.y }

    const onMove = (mv) => {
      const dx = mv.clientX - dragState.current.startX
      const dy = mv.clientY - dragState.current.startY
      let rawX = dragState.current.origX + dx
      let rawY = dragState.current.origY + dy
      const w = element.width, h = element.height

      // Snap candidates: canvas edges + center
      const snapX = [0, canvasWidth / 2 - w / 2, canvasWidth - w,  // left/center/right align
                     canvasWidth / 2, 0 + w / 2, canvasWidth - w / 2] // midpoint of el at edge/center
      const snapY = [0, canvasHeight / 2 - h / 2, canvasHeight - h,
                     canvasHeight / 2, 0 + h / 2, canvasHeight - h / 2]

      // Also snap to other elements' edges and centers
      elements.forEach((other) => {
        if (other.id === element.id) return
        snapX.push(other.x, other.x + other.width, other.x + other.width / 2 - w / 2,
                   other.x - w, other.x + other.width - w)
        snapY.push(other.y, other.y + other.height, other.y + other.height / 2 - h / 2,
                   other.y - h, other.y + other.height - h)
      })

      const sx = computeSnap(rawX, snapX)
      const sy = computeSnap(rawY, snapY)

      // Build snap lines to show
      const xLines = [], yLines = []
      if (sx.line !== null) xLines.push(sx.snapped + w / 2) // vertical guide at element center-x
      if (sy.line !== null) yLines.push(sy.snapped + h / 2)
      // Show canvas-edge guides more precisely
      if (sx.line !== null) {
        if (Math.abs(sx.snapped) <= SNAP_THRESHOLD) xLines[xLines.length - 1] = 0
        else if (Math.abs(sx.snapped + w - canvasWidth) <= SNAP_THRESHOLD) xLines[xLines.length - 1] = canvasWidth
        else if (Math.abs(sx.snapped + w / 2 - canvasWidth / 2) <= SNAP_THRESHOLD) xLines[xLines.length - 1] = canvasWidth / 2
      }
      if (sy.line !== null) {
        if (Math.abs(sy.snapped) <= SNAP_THRESHOLD) yLines[yLines.length - 1] = 0
        else if (Math.abs(sy.snapped + h - canvasHeight) <= SNAP_THRESHOLD) yLines[yLines.length - 1] = canvasHeight
        else if (Math.abs(sy.snapped + h / 2 - canvasHeight / 2) <= SNAP_THRESHOLD) yLines[yLines.length - 1] = canvasHeight / 2
      }
      setSnapLines({ x: xLines, y: yLines })

      updateElement(element.id, { x: Math.round(sx.snapped), y: Math.round(sy.snapped) })
    }

    const onUp = () => {
      clearSnapLines()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [element, editingText, setSelected, updateElement, saveState, elements, canvasWidth, canvasHeight, setSnapLines, clearSnapLines])

  const onDoubleClick = useCallback((e) => {
    if (element.type !== 'text') return
    e.stopPropagation()
    setEditingText(true)
    setTimeout(() => textRef.current?.focus(), 0)
  }, [element.type])

  const onTextBlur = useCallback((e) => {
    updateElement(element.id, { text: e.target.innerText })
    setEditingText(false)
  }, [element.id, updateElement])

  if (!element.visible) return null

  // Selection border style matches original (blue solid for most, dashed for text)
  let selectionStyle = {}
  if (isSelected) {
    selectionStyle = element.type === 'text'
      ? { border: '2px dashed rgb(59,130,246)' }
      : { border: '2px solid rgb(59,130,246)' }
  }

  const style = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: `rotate(${element.rotation}deg)`,
    opacity: element.opacity,
    zIndex: element.zIndex,
    cursor: element.locked ? 'not-allowed' : 'move',
    ...selectionStyle,
  }

  return (
    <div id={element.id} style={style} onMouseDown={onMouseDown} onDoubleClick={onDoubleClick}>
      <ElementContent element={element} editingText={editingText} textRef={textRef} onTextBlur={onTextBlur} />
      {isSelected && !element.locked && (
        <ResizeHandles element={element} />
      )}
    </div>
  )
}

function ElementContent({ element, editingText, textRef, onTextBlur }) {
  switch (element.type) {
    case 'text': {
      const textShadow = buildTextShadow(element)
      return (
        <div
          ref={textRef}
          contentEditable={editingText}
          suppressContentEditableWarning
          onBlur={onTextBlur}
          style={{
            width: '100%', height: '100%',
            fontSize: element.fontSize || 16,
            fontFamily: element.fontFamily || 'Arial',
            color: element.color || '#000',
            fontWeight: element.bold ? 'bold' : 'normal',
            fontStyle: element.italic ? 'italic' : 'normal',
            textDecoration: element.underline ? 'underline' : 'none',
            textAlign: element.textAlign || 'left',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflow: 'hidden',
            userSelect: editingText ? 'text' : 'none',
            cursor: editingText ? 'text' : 'move',
            textShadow,
          }}
        >
          {element.text || 'Text'}
        </div>
      )
    }
    case 'image':
      return (
        <img
          src={element.src} alt={element.filename || ''}
          style={{
            width: '100%', height: '100%', objectFit: 'fill',
            borderRadius: element.borderRadius || 0,
            display: 'block', pointerEvents: 'none', userSelect: 'none',
          }}
          draggable={false}
        />
      )
    case 'shape': {
      const isCircle = element.shapeType === 'circle'
      const boxShadow = buildBoxShadow(element)
      return (
        <div style={{
          width: '100%', height: '100%',
          background: element.transparent ? 'transparent' : (element.fillColor || '#888'),
          borderRadius: isCircle ? '50%' : (element.borderRadius || 0),
          border: element.borderWidth ? `${element.borderWidth}px solid ${element.borderColor || '#000'}` : 'none',
          boxShadow,
        }} />
      )
    }
    case 'clickthrough':
      return (
        <div style={{
          width: '100%', height: '100%',
          background: 'rgba(168,85,247,0.1)',
          border: '2px dashed rgba(168,85,247,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: 'rgba(168,85,247,0.8)', pointerEvents: 'none',
        }}>
          Clickthrough {element.clickIndex}
        </div>
      )
    case 'invisible':
      return (
        <div style={{
          width: '100%', height: '100%',
          background: 'rgba(100,100,100,0.05)',
          border: '1px dashed #555',
          pointerEvents: 'none',
        }} />
      )
    case 'video': {
      const hasUrl = !!element.videoUrl
      return hasUrl ? (
        <video
          src={element.videoUrl}
          style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', pointerEvents: 'none' }}
          muted={element.muted !== false}
          controls={!!element.controls}
          autoPlay={element.playTrigger === 'autoplay'}
          loop
          playsInline
        />
      ) : (
        <div style={{
          width: '100%', height: '100%', background: '#111',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#aaa', gap: 4,
        }}>
          <span style={{ fontSize: 22 }}>▶</span>
          <span>{element.videoName || 'Video'}</span>
          <span style={{ fontSize: 9, color: '#666' }}>No URL set</span>
        </div>
      )
    }
    default:
      return null
  }
}

function ResizeHandles({ element }) {
  const { updateElement } = useCanvasStore()
  const handles = [
    { id: 'nw', style: { top: -5, left: -5 }, cursor: 'nw-resize' },
    { id: 'ne', style: { top: -5, right: -5 }, cursor: 'ne-resize' },
    { id: 'sw', style: { bottom: -5, left: -5 }, cursor: 'sw-resize' },
    { id: 'se', style: { bottom: -5, right: -5 }, cursor: 'se-resize' },
  ]
  return (
    <>
      {handles.map((h) => (
        <ResizeHandle key={h.id} handle={h} element={element} onResize={updateElement} />
      ))}
    </>
  )
}

function buildTextShadow(el) {
  const parts = []
  if (el.textShadowBlur || el.textShadowX || el.textShadowY) {
    parts.push(`${el.textShadowX || 0}px ${el.textShadowY || 0}px ${el.textShadowBlur || 0}px ${el.textShadowColor || '#000'}`)
  }
  if (el.textGlowBlur || el.textGlowX || el.textGlowY || el.textGlowSpread) {
    parts.push(`${el.textGlowX || 0}px ${el.textGlowY || 0}px ${el.textGlowBlur || 0}px ${el.textGlowSpread || 0}px ${el.textGlowColor || '#fff'}`)
  }
  return parts.join(', ')
}

function buildBoxShadow(el) {
  const parts = []
  if (el.shadowBlur || el.shadowX || el.shadowY) {
    parts.push(`${el.shadowX || 0}px ${el.shadowY || 0}px ${el.shadowBlur || 0}px ${el.shadowSpread || 0}px ${el.shadowColor || '#000'}`)
  }
  if (el.glowBlur || el.glowX || el.glowY || el.glowSpread) {
    parts.push(`${el.glowX || 0}px ${el.glowY || 0}px ${el.glowBlur || 0}px ${el.glowSpread || 0}px ${el.glowColor || '#fff'}`)
  }
  return parts.join(', ')
}
