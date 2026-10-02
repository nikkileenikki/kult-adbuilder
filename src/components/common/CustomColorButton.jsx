import React from 'react'

// Palette swatch that opens the browser's native colour picker.
//
// The obvious implementation — a styled <button> next to an
// `<input type="color" className="hidden">` whose click() the button forwards — is
// subtly broken: `hidden` is `display:none`, which takes the input out of layout, so
// it has no on-screen position for the browser to anchor the picker popup to. The
// popup then lands wherever the engine falls back to, typically pinned to a corner of
// the viewport nowhere near the control the user clicked.
//
// So the input stays in layout and is made transparent instead, stretched over the
// swatch it belongs to. The user clicks the real input (not a proxy), the picker opens
// anchored to it, and no click forwarding is needed at all.
export default function CustomColorButton({ value, onChange, size = 24, title = 'Custom color' }) {
  return (
    <span
      title={title}
      style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}
    >
      <span
        aria-hidden="true"
        style={{
          width: size, height: size, borderRadius: 4, border: '2px solid #444',
          background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <i className="fa-solid fa-palette" style={{ fontSize: Math.round(size * 0.46), color: '#d1d5db' }} />
      </span>
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        aria-label={title}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer', padding: 0, border: 'none', background: 'transparent',
        }}
      />
    </span>
  )
}
