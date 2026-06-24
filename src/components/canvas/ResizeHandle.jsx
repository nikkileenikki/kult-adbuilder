import React, { useCallback } from 'react'

const SZ = 8

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
    width: SZ, height: SZ,
    background: '#7c3aed',
    border: '1px solid #fff',
    borderRadius: 2,
    cursor: handle.cursor,
    zIndex: 9999,
  }
  if (handle.top !== undefined) style.top = handle.top
  if (handle.bottom !== undefined) style.bottom = handle.bottom
  if (handle.left !== undefined) style.left = handle.left
  if (handle.right !== undefined) style.right = handle.right
  if (handle.ml) style.marginLeft = handle.ml
  if (handle.mt) style.marginTop = handle.mt

  return <div style={style} onMouseDown={onMouseDown} />
}
