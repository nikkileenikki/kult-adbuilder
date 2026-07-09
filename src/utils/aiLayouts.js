// AI banner design — layout catalog.
//
// Layouts are defined once in fractional units (0..1 of canvas width/height) and scaled
// to whichever banner size is active, so a single catalog covers every supported size
// without hand-placing pixel coordinates per size. Each layout declares a handful of
// "roles" (headline, subhead, cta, ...) that the AI endpoint fills with copy — the
// geometry itself is fixed/human-designed, only the copy is generated.
//
// IMPORTANT: functions/api/ai-design.js keeps its own compact mirror of `id`/`label`/
// role names (Cloudflare Pages Functions can't reliably bundle cross-imports from src/).
// If you add/remove/rename a layout or its roles here, update that file too.

export const SUPPORTED_SIZES = ['300x250', '300x600', '320x480', '800x600', '970x250']

const PALETTES = {
  dark: { bg: '#111827', text: '#ffffff', subtext: '#cbd5e1', accent: '#7c3aed', accentText: '#ffffff' },
  light: { bg: '#ffffff', text: '#111827', subtext: '#4b5563', accent: '#111827', accentText: '#ffffff' },
  brand: { bg: '#0ea5e9', text: '#ffffff', subtext: '#e0f2fe', accent: '#ffffff', accentText: '#0ea5e9' },
}

// x/y/width/height are fractions of canvas width/height. fontSize is a fraction of
// canvas height. type: 'text' | 'button' (expands to a shape + text label pair).
export const NORMALIZED_LAYOUTS = [
  {
    id: 'stack-center',
    label: 'Centered stack',
    palette: 'dark',
    roles: [
      { role: 'headline', type: 'text', x: 0.08, y: 0.10, width: 0.84, height: 0.30, fontSize: 0.115, textAlign: 'center', bold: true },
      { role: 'subhead', type: 'text', x: 0.08, y: 0.42, width: 0.84, height: 0.16, fontSize: 0.055, textAlign: 'center' },
      { role: 'cta', type: 'button', x: 0.28, y: 0.76, width: 0.44, height: 0.14, fontSize: 0.06 },
    ],
  },
  {
    id: 'left-align-stack',
    label: 'Left-aligned stack',
    palette: 'light',
    roles: [
      { role: 'headline', type: 'text', x: 0.06, y: 0.10, width: 0.88, height: 0.28, fontSize: 0.10, textAlign: 'left', bold: true },
      { role: 'subhead', type: 'text', x: 0.06, y: 0.40, width: 0.88, height: 0.18, fontSize: 0.05, textAlign: 'left' },
      { role: 'cta', type: 'button', x: 0.06, y: 0.76, width: 0.40, height: 0.14, fontSize: 0.055 },
    ],
  },
  {
    id: 'headline-only-bold',
    label: 'Bold headline, no subhead',
    palette: 'brand',
    roles: [
      { role: 'headline', type: 'text', x: 0.08, y: 0.22, width: 0.84, height: 0.40, fontSize: 0.15, textAlign: 'center', bold: true },
      { role: 'cta', type: 'button', x: 0.30, y: 0.72, width: 0.40, height: 0.16, fontSize: 0.065 },
    ],
  },
  {
    id: 'top-headline-bottom-cta',
    label: 'Top headline, full-width CTA bar',
    palette: 'dark',
    roles: [
      { role: 'headline', type: 'text', x: 0.06, y: 0.08, width: 0.88, height: 0.34, fontSize: 0.11, textAlign: 'center', bold: true },
      { role: 'subhead', type: 'text', x: 0.06, y: 0.44, width: 0.88, height: 0.22, fontSize: 0.05, textAlign: 'center' },
      { role: 'cta', type: 'button', x: 0.0, y: 0.84, width: 1.0, height: 0.16, fontSize: 0.06 },
    ],
  },
  {
    id: 'split-text-cta-right',
    label: 'Headline left, CTA pinned right',
    palette: 'light',
    roles: [
      { role: 'headline', type: 'text', x: 0.05, y: 0.15, width: 0.55, height: 0.5, fontSize: 0.095, textAlign: 'left', bold: true },
      { role: 'cta', type: 'button', x: 0.66, y: 0.32, width: 0.30, height: 0.36, fontSize: 0.05 },
    ],
  },
  {
    id: 'body-copy-block',
    label: 'Headline + short body copy',
    palette: 'brand',
    roles: [
      { role: 'headline', type: 'text', x: 0.07, y: 0.08, width: 0.86, height: 0.22, fontSize: 0.09, textAlign: 'center', bold: true },
      { role: 'body', type: 'text', x: 0.07, y: 0.32, width: 0.86, height: 0.34, fontSize: 0.045, textAlign: 'center' },
      { role: 'cta', type: 'button', x: 0.30, y: 0.76, width: 0.40, height: 0.14, fontSize: 0.055 },
    ],
  },
]

export const BACKGROUND_STYLES = [
  { value: 'solid', label: 'Solid' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'abstract', label: 'Abstract blobs' },
  { value: 'watercolor', label: 'Watercolor' },
]

export function getPaletteFor(layout) {
  return PALETTES[layout.palette] || PALETTES.dark
}

// Deterministic pseudo-random in [0,1) seeded by a string, so the same layout+size
// always produces the same background instead of reshuffling on every re-render.
function seededRandom(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return (n) => {
    h = (h * 1103515245 + 12345 + n) | 0
    return ((h >>> 0) % 10000) / 10000
  }
}

// Builds a CSS `background` value for the given style, using only gradients — no
// images/filters — so it renders identically on the canvas and in the exported HTML.
export function buildBackgroundCss(style, palette, seed = 'bg') {
  const { bg, accent, subtext } = palette
  if (style === 'gradient') {
    return `linear-gradient(135deg, ${bg} 0%, ${accent} 100%)`
  }
  if (style === 'abstract' || style === 'watercolor') {
    const rand = seededRandom(seed + style)
    const colors = [accent, subtext, bg]
    const softness = style === 'watercolor' ? 70 : 45 // larger, softer blobs for watercolor
    const blobs = Array.from({ length: 5 }, (_, i) => {
      const x = Math.round(rand(i * 2) * 100)
      const y = Math.round(rand(i * 2 + 1) * 100)
      const color = colors[i % colors.length]
      const alpha = style === 'watercolor' ? 0.35 : 0.5
      return `radial-gradient(circle at ${x}% ${y}%, ${hexToRgba(color, alpha)} 0%, transparent ${softness}%)`
    })
    return `${blobs.join(', ')}, ${bg}`
  }
  return bg
}

function hexToRgba(hex, alpha) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return hex
  const [, r, g, b] = m
  return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${alpha})`
}

export function findLayout(layoutId) {
  return NORMALIZED_LAYOUTS.find((l) => l.id === layoutId) || null
}

export function sizeKeyFor(canvasWidth, canvasHeight) {
  return `${canvasWidth}x${canvasHeight}`
}

// Compact catalog (id/label/roles only) suitable for sending to an LLM as context —
// no geometry, since the AI only needs to pick a layout and write copy for its roles.
export function layoutCatalogSummary() {
  return NORMALIZED_LAYOUTS.map((l) => ({
    id: l.id,
    label: l.label,
    roles: l.roles.map((r) => r.role),
  }))
}

// Expands a normalized layout + AI-generated copy into real canvasStore element
// partials (no `id` — addElement()/direct insertion assigns those) for the given
// canvas size. `paletteOverride` (e.g. from a brand guide) replaces the layout's
// built-in colors when provided. `backgroundStyle` picks how the background shape
// is filled — 'solid' (default), 'gradient', 'abstract', or 'watercolor'.
export function buildElementsFromLayout(layoutId, canvasWidth, canvasHeight, copy = {}, backgroundStyle = 'solid', paletteOverride = null) {
  const layout = findLayout(layoutId)
  if (!layout) return []
  const palette = { ...getPaletteFor(layout), ...(paletteOverride || {}) }
  const elements = []
  let z = 10

  const bgCss = buildBackgroundCss(backgroundStyle, palette, `${layoutId}-${canvasWidth}x${canvasHeight}`)
  elements.push({
    type: 'shape',
    x: 0, y: 0, width: canvasWidth, height: canvasHeight,
    fillColor: palette.bg, cssBackground: backgroundStyle === 'solid' ? undefined : bgCss, borderRadius: 0, zIndex: z++,
  })

  layout.roles.forEach((r) => {
    const x = Math.round(r.x * canvasWidth)
    const y = Math.round(r.y * canvasHeight)
    const width = Math.round(r.width * canvasWidth)
    const height = Math.round(r.height * canvasHeight)
    const fontSize = Math.max(10, Math.round(r.fontSize * canvasHeight))
    const text = copy[r.role] || ''

    if (r.type === 'button') {
      elements.push({
        type: 'shape',
        x, y, width, height,
        fillColor: palette.accent, borderRadius: Math.round(height / 2), zIndex: z++,
      })
      elements.push({
        type: 'text',
        x, y, width, height,
        text: text || 'Learn More',
        fontSize, textAlign: 'center', color: palette.accentText, bold: true, zIndex: z++,
      })
    } else {
      elements.push({
        type: 'text',
        x, y, width, height,
        text,
        fontSize, textAlign: r.textAlign || 'left', color: r.role === 'subhead' || r.role === 'body' ? palette.subtext : palette.text,
        bold: !!r.bold, zIndex: z++,
      })
    }
  })

  // Full-canvas click layer on top, so the whole banner is clickable regardless of
  // which visual element the pointer lands on.
  elements.push({
    type: 'clickthrough',
    x: 0, y: 0, width: canvasWidth, height: canvasHeight,
    clickIndex: 1, zIndex: z++,
  })

  return elements
}
