import React, { useRef, useCallback, useState } from 'react'
import { useCanvasStore } from '../../store/canvasStore.js'
import { useHistoryStore } from '../../store/historyStore.js'
import ResizeHandle from './ResizeHandle.jsx'

const HANDLE_SIZE = 8

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
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: element.x,
      origY: element.y,
    }
    const onMove = (mv) => {
      const dx = mv.clientX - dragState.current.startX
      const dy = mv.clientY - dragState.current.startY
      updateElement(element.id, {
        x: Math.round(dragState.current.origX + dx),
        y: Math.round(dragState.current.origY + dy),
      })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
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
    outline: isSelected ? '2px solid #7c3aed' : 'none',
    outlineOffset: '1px',
  }

  return (
    <div style={style} onMouseDown={onMouseDown} onDoubleClick={onDoubleClick}>
      <ElementContent
        element={element}
        editingText={editingText}
        textRef={textRef}
        onTextBlur={onTextBlur}
      />
      {isSelected && !element.locked && (
        <ResizeHandles element={element} canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
      )}
    </div>
  )
}

function ElementContent({ element, editingText, textRef, onTextBlur }) {
  switch (element.type) {
    case 'text':
      return (
        <div
          ref={textRef}
          contentEditable={editingText}
          suppressContentEditableWarning
          onBlur={onTextBlur}
          style={{
            width: '100%', height: '100%',
            fontSize: element.fontSize || 16,
            fontFamily: element.fontFamily || 'sans-serif',
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
          }}
        >
          {element.text || 'Text'}
        </div>
      )
    case 'image':
      return (
        <img
          src={element.src}
          alt={element.filename || ''}
          style={{
            width: '100%', height: '100%',
            objectFit: 'fill',
            borderRadius: element.borderRadius || 0,
            display: 'block',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
          draggable={false}
        />
      )
    case 'shape': {
      const radius = element.borderRadius || 0
      return (
        <div style={{
          width: '100%', height: '100%',
          background: element.fillColor || '#888',
          borderRadius: element.shapeType === 'circle' ? '50%' : radius,
          border: element.borderWidth ? `${element.borderWidth}px solid ${element.borderColor || '#000'}` : 'none',
          boxShadow: element.shadow ? `2px 4px 8px rgba(0,0,0,0.4)` : 'none',
        }} />
      )
    }
    case 'clickthrough':
      return (
        <div style={{
          width: '100%', height: '100%',
          background: 'rgba(124,58,237,0.15)',
          border: '2px dashed #7c3aed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#7c3aed', pointerEvents: 'none',
        }}>
          Clickthrough {element.clickIndex}
        </div>
      )
    case 'invisible':
      return (
        <div style={{
          width: '100%', height: '100%',
          background: 'rgba(100,100,100,0.1)',
          border: '1px dashed #666',
          pointerEvents: 'none',
        }} />
      )
    case 'video':
      return (
        <div style={{
          width: '100%', height: '100%',
          background: '#111',
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

function ResizeHandles({ element, canvasWidth, canvasHeight }) {
  const { updateElement } = useCanvasStore()

  const positions = [
    { id: 'nw', cursor: 'nw-resize', top: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2 },
    { id: 'n',  cursor: 'n-resize',  top: -HANDLE_SIZE/2, left: '50%', ml: -HANDLE_SIZE/2 },
    { id: 'ne', cursor: 'ne-resize', top: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2 },
    { id: 'e',  cursor: 'e-resize',  top: '50%', right: -HANDLE_SIZE/2, mt: -HANDLE_SIZE/2 },
    { id: 'se', cursor: 'se-resize', bottom: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2 },
    { id: 's',  cursor: 's-resize',  bottom: -HANDLE_SIZE/2, left: '50%', ml: -HANDLE_SIZE/2 },
    { id: 'sw', cursor: 'sw-resize', bottom: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2 },
    { id: 'w',  cursor: 'w-resize',  top: '50%', left: -HANDLE_SIZE/2, mt: -HANDLE_SIZE/2 },
  ]

  return (
    <>
      {positions.map((h) => (
        <ResizeHandle
          key={h.id}
          handle={h}
          element={element}
          onResize={updateElement}
        />
      ))}
    </>
  )
}
