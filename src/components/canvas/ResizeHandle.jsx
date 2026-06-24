import React, { useCallback } from 'react'

export default function ResizeHandle({ handle, element, onResize }) {
  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const start = { x: e.clientX, y: e.clientY }
    const orig = { x: element.x, y: element.y, w: element.width, h: element.height }

    const onMove = (mv) => {
      const dx = mv.clientX - start.x
      const dy = mv.clientY - start.y
      let { x, y, w, h } = orig

      if (handle.id.includes('e')) w = Math.max(10, orig.w + dx)
      if (handle.id.includes('s')) h = Math.max(10, orig.h + dy)
      if (handle.id.includes('w')) { w = Math.max(10, orig.w - dx); x = orig.x + orig.w - w }
      if (handle.id.includes('n')) { h = Math.max(10, orig.h - dy); y = orig.y + orig.h - h }

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
