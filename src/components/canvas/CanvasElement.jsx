import React, { useRef, useCallback, useState } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import ResizeHandle from './ResizeHandle.jsx'

export default function CanvasElement({ element, canvasWidth, canvasHeight }) {
  const { selectedId, setSelected, updateElement } = useCanvasStore()
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
      updateElement(element.id, { x: Math.round(dragState.current.origX + dx), y: Math.round(dragState.current.origY + dy) })
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [element, editingText, setSelected, updateElement, saveState])

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
    <div style={style} onMouseDown={onMouseDown} onDoubleClick={onDoubleClick}>
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
    case 'video':
      return (
        <div style={{
          width: '100%', height: '100%', background: '#111',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#aaa',
        }}>
          ▶ {element.videoName || 'Video'}
        </div>
      )
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
