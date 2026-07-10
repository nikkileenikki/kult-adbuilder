// Shared across the timeline, invisible-layer hover effect pickers, and video time-cue
// target pickers so an element reads the same name everywhere it's identified —
// including any custom name the user set via double-click rename in the timeline.
export function layerLabel(el) {
  if (el.name) return el.name
  if (el.type === 'text') return el.text?.slice(0, 20) || 'Text'
  if (el.type === 'image') return el.filename || 'Image'
  if (el.type === 'video') return el.videoName || 'Video'
  if (el.type === 'clickthrough') return `Clickthrough ${el.clickIndex || 1}`
  if (el.type === 'shape') return el.shapeType === 'circle' ? 'Circle' : 'Rectangle'
  return el.type.charAt(0).toUpperCase() + el.type.slice(1)
}
