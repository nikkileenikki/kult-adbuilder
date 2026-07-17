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
  dark: { bg: '#111827', text: '#ffffff', subtext: '#cbd5e1', accent: '#7c3aed' },
  light: { bg: '#ffffff', text: '#111827', subtext: '#4b5563', accent: '#111827' },
  brand: { bg: '#0ea5e9', text: '#ffffff', subtext: '#e0f2fe', accent: '#ffffff' },
}

// x/y/width/height are fractions of canvas width/height. fontSize is a fraction of
// canvas height. type: 'text' | 'button' (expands to a shape + text label pair).
// `logo` is a fixed reserved zone (fraction coordinates), the same on every layout
// variant regardless of copy — it's never a role the AI fills, just empty space kept
// clear of text/CTA so a client logo can be dropped in without overlapping anything.
export const NORMALIZED_LAYOUTS = [
  {
    id: 'stack-center',
    label: 'Centered stack',
    palette: 'dark',
    logo: { x: 0.38, y: 0.02, width: 0.24, height: 0.07 },
    roles: [
      { role: 'headline', type: 'text', x: 0.08, y: 0.12, width: 0.84, height: 0.28, fontSize: 0.115, textAlign: 'center', bold: true },
      { role: 'subhead', type: 'text', x: 0.08, y: 0.42, width: 0.84, height: 0.16, fontSize: 0.055, textAlign: 'center' },
      { role: 'cta', type: 'button', x: 0.28, y: 0.76, width: 0.44, height: 0.14, fontSize: 0.06, align: 'center' },
    ],
  },
  {
    id: 'left-align-stack',
    label: 'Left-aligned stack',
    palette: 'light',
    logo: { x: 0.06, y: 0.02, width: 0.22, height: 0.07 },
    roles: [
      { role: 'headline', type: 'text', x: 0.06, y: 0.12, width: 0.88, height: 0.26, fontSize: 0.10, textAlign: 'left', bold: true },
      { role: 'subhead', type: 'text', x: 0.06, y: 0.40, width: 0.88, height: 0.18, fontSize: 0.05, textAlign: 'left' },
      { role: 'cta', type: 'button', x: 0.06, y: 0.76, width: 0.40, height: 0.14, fontSize: 0.055, align: 'left' },
    ],
  },
  {
    id: 'headline-only-bold',
    label: 'Bold headline, no subhead',
    palette: 'brand',
    logo: { x: 0.06, y: 0.03, width: 0.22, height: 0.09 },
    roles: [
      { role: 'headline', type: 'text', x: 0.08, y: 0.24, width: 0.84, height: 0.38, fontSize: 0.15, textAlign: 'center', bold: true },
      { role: 'cta', type: 'button', x: 0.30, y: 0.72, width: 0.40, height: 0.16, fontSize: 0.065, align: 'center' },
    ],
  },
  {
    id: 'top-headline-bottom-cta',
    label: 'Top headline, full-width CTA bar',
    palette: 'dark',
    logo: { x: 0.72, y: 0.015, width: 0.22, height: 0.055 },
    roles: [
      { role: 'headline', type: 'text', x: 0.06, y: 0.10, width: 0.88, height: 0.32, fontSize: 0.11, textAlign: 'center', bold: true },
      { role: 'subhead', type: 'text', x: 0.06, y: 0.44, width: 0.88, height: 0.22, fontSize: 0.05, textAlign: 'center' },
      { role: 'cta', type: 'button', x: 0.0, y: 0.84, width: 1.0, height: 0.16, fontSize: 0.06, align: 'center' },
    ],
  },
  {
    id: 'split-text-cta-right',
    label: 'Headline left, CTA pinned right',
    palette: 'light',
    logo: { x: 0.05, y: 0.03, width: 0.22, height: 0.09 },
    roles: [
      { role: 'headline', type: 'text', x: 0.05, y: 0.17, width: 0.55, height: 0.48, fontSize: 0.095, textAlign: 'left', bold: true },
      { role: 'cta', type: 'button', x: 0.66, y: 0.32, width: 0.30, height: 0.36, fontSize: 0.05, align: 'center' },
    ],
  },
  {
    id: 'body-copy-block',
    label: 'Headline + short body copy',
    palette: 'brand',
    logo: { x: 0.72, y: 0.015, width: 0.22, height: 0.05 },
    roles: [
      { role: 'headline', type: 'text', x: 0.07, y: 0.10, width: 0.86, height: 0.20, fontSize: 0.09, textAlign: 'center', bold: true },
      { role: 'body', type: 'text', x: 0.07, y: 0.32, width: 0.86, height: 0.34, fontSize: 0.045, textAlign: 'center' },
      { role: 'cta', type: 'button', x: 0.30, y: 0.76, width: 0.40, height: 0.14, fontSize: 0.055, align: 'center' },
    ],
  },
  {
    id: 'side-strip-cta',
    label: 'Full-height CTA strip on the right',
    palette: 'dark',
    logo: { x: 0.05, y: 0.03, width: 0.20, height: 0.08 },
    roles: [
      { role: 'headline', type: 'text', x: 0.05, y: 0.16, width: 0.58, height: 0.34, fontSize: 0.09, textAlign: 'left', bold: true },
      { role: 'subhead', type: 'text', x: 0.05, y: 0.54, width: 0.58, height: 0.20, fontSize: 0.045, textAlign: 'left' },
      { role: 'cta', type: 'button', x: 0.68, y: 0.0, width: 0.32, height: 1.0, fontSize: 0.055, align: 'center' },
    ],
  },
  {
    id: 'corner-badge',
    label: 'Corner badge with headline',
    palette: 'brand',
    logo: { x: 0.68, y: 0.06, width: 0.27, height: 0.12 },
    roles: [
      { role: 'badge', type: 'button', x: 0.05, y: 0.06, width: 0.32, height: 0.14, fontSize: 0.045, align: 'left' },
      { role: 'headline', type: 'text', x: 0.06, y: 0.30, width: 0.88, height: 0.32, fontSize: 0.105, textAlign: 'left', bold: true },
      { role: 'cta', type: 'button', x: 0.06, y: 0.74, width: 0.40, height: 0.16, fontSize: 0.06, align: 'left' },
    ],
  },
  {
    id: 'right-panel-stack',
    label: 'Right-aligned text panel',
    palette: 'dark',
    logo: { x: 0.05, y: 0.05, width: 0.28, height: 0.10 },
    roles: [
      { role: 'headline', type: 'text', x: 0.42, y: 0.16, width: 0.52, height: 0.28, fontSize: 0.09, textAlign: 'right', bold: true },
      { role: 'subhead', type: 'text', x: 0.42, y: 0.46, width: 0.52, height: 0.18, fontSize: 0.045, textAlign: 'right' },
      { role: 'cta', type: 'button', x: 0.54, y: 0.72, width: 0.40, height: 0.16, fontSize: 0.055, align: 'right' },
    ],
  },
  {
    id: 'big-cta-focus',
    label: 'Small headline, oversized CTA',
    palette: 'brand',
    logo: { x: 0.38, y: 0.015, width: 0.24, height: 0.055 },
    roles: [
      { role: 'headline', type: 'text', x: 0.08, y: 0.12, width: 0.84, height: 0.20, fontSize: 0.07, textAlign: 'center', bold: true },
      { role: 'cta', type: 'button', x: 0.14, y: 0.42, width: 0.72, height: 0.34, fontSize: 0.08, align: 'center', minWidthRatio: 0.7 },
    ],
  },
  {
    id: 'price-tag-callout',
    label: 'Price badge, headline left',
    palette: 'brand',
    logo: { x: 0.06, y: 0.04, width: 0.22, height: 0.07 },
    roles: [
      { role: 'price', type: 'button', x: 0.68, y: 0.06, width: 0.27, height: 0.14, fontSize: 0.05, align: 'right' },
      { role: 'headline', type: 'text', x: 0.06, y: 0.30, width: 0.60, height: 0.30, fontSize: 0.09, textAlign: 'left', bold: true },
      { role: 'subhead', type: 'text', x: 0.06, y: 0.60, width: 0.60, height: 0.16, fontSize: 0.045, textAlign: 'left' },
      { role: 'cta', type: 'button', x: 0.06, y: 0.78, width: 0.42, height: 0.14, fontSize: 0.055, align: 'left' },
    ],
  },
  {
    id: 'mirrored-split',
    label: 'CTA left, headline right',
    palette: 'light',
    logo: { x: 0.72, y: 0.03, width: 0.22, height: 0.09 },
    roles: [
      { role: 'cta', type: 'button', x: 0.05, y: 0.32, width: 0.30, height: 0.36, fontSize: 0.05, align: 'left' },
      { role: 'headline', type: 'text', x: 0.40, y: 0.17, width: 0.55, height: 0.48, fontSize: 0.095, textAlign: 'right', bold: true },
    ],
  },
  {
    id: 'quote-callout',
    label: 'Quote-style body with attribution',
    palette: 'dark',
    logo: { x: 0.06, y: 0.03, width: 0.22, height: 0.08 },
    roles: [
      { role: 'body', type: 'text', x: 0.10, y: 0.16, width: 0.80, height: 0.40, fontSize: 0.06, textAlign: 'center', italic: true },
      { role: 'headline', type: 'text', x: 0.10, y: 0.60, width: 0.80, height: 0.14, fontSize: 0.045, textAlign: 'center', bold: true },
      { role: 'cta', type: 'button', x: 0.30, y: 0.78, width: 0.40, height: 0.14, fontSize: 0.055, align: 'center' },
    ],
  },
  {
    id: 'row-banner',
    label: 'Single row: headline, subhead, CTA',
    palette: 'light',
    logo: { x: 0.04, y: 0.06, width: 0.18, height: 0.16 },
    roles: [
      { role: 'headline', type: 'text', x: 0.04, y: 0.30, width: 0.40, height: 0.40, fontSize: 0.11, textAlign: 'left', bold: true },
      { role: 'subhead', type: 'text', x: 0.46, y: 0.34, width: 0.30, height: 0.32, fontSize: 0.05, textAlign: 'left' },
      { role: 'cta', type: 'button', x: 0.80, y: 0.36, width: 0.17, height: 0.28, fontSize: 0.05, align: 'right' },
    ],
  },
  {
    id: 'minimal-teaser',
    label: 'Minimal teaser, generous whitespace',
    palette: 'brand',
    logo: { x: 0.38, y: 0.06, width: 0.24, height: 0.07 },
    roles: [
      { role: 'headline', type: 'text', x: 0.14, y: 0.30, width: 0.72, height: 0.24, fontSize: 0.085, textAlign: 'center', bold: true },
      { role: 'cta', type: 'button', x: 0.32, y: 0.66, width: 0.36, height: 0.14, fontSize: 0.055, align: 'center' },
    ],
  },
  {
    id: 'double-cta-choice',
    label: 'Headline with two CTA choices',
    palette: 'light',
    logo: { x: 0.06, y: 0.02, width: 0.22, height: 0.07 },
    roles: [
      { role: 'headline', type: 'text', x: 0.08, y: 0.16, width: 0.84, height: 0.28, fontSize: 0.10, textAlign: 'center', bold: true },
      { role: 'cta', type: 'button', x: 0.08, y: 0.62, width: 0.38, height: 0.16, fontSize: 0.055, align: 'center' },
      { role: 'secondaryCta', type: 'button', x: 0.54, y: 0.62, width: 0.38, height: 0.16, fontSize: 0.055, align: 'center' },
    ],
  },
  {
    id: 'stat-callout',
    label: 'Big stat/number callout',
    palette: 'brand',
    logo: { x: 0.38, y: 0.02, width: 0.24, height: 0.07 },
    roles: [
      { role: 'stat', type: 'text', x: 0.10, y: 0.14, width: 0.80, height: 0.34, fontSize: 0.18, textAlign: 'center', bold: true },
      { role: 'subhead', type: 'text', x: 0.10, y: 0.52, width: 0.80, height: 0.16, fontSize: 0.05, textAlign: 'center' },
      { role: 'cta', type: 'button', x: 0.30, y: 0.74, width: 0.40, height: 0.14, fontSize: 0.055, align: 'center' },
    ],
  },
  {
    id: 'bottom-corner-cta',
    label: 'Headline top-left, CTA bottom-right corner',
    palette: 'dark',
    logo: { x: 0.06, y: 0.02, width: 0.22, height: 0.07 },
    roles: [
      { role: 'headline', type: 'text', x: 0.06, y: 0.12, width: 0.70, height: 0.30, fontSize: 0.10, textAlign: 'left', bold: true },
      { role: 'subhead', type: 'text', x: 0.06, y: 0.44, width: 0.70, height: 0.18, fontSize: 0.048, textAlign: 'left' },
      { role: 'cta', type: 'button', x: 0.66, y: 0.80, width: 0.28, height: 0.14, fontSize: 0.05, align: 'right' },
    ],
  },
  {
    id: 'logo-forward',
    label: 'Large logo area, compact copy below',
    palette: 'light',
    logo: { x: 0.25, y: 0.06, width: 0.50, height: 0.30 },
    roles: [
      { role: 'headline', type: 'text', x: 0.10, y: 0.46, width: 0.80, height: 0.24, fontSize: 0.08, textAlign: 'center', bold: true },
      { role: 'cta', type: 'button', x: 0.32, y: 0.76, width: 0.36, height: 0.14, fontSize: 0.055, align: 'center' },
    ],
  },
  {
    id: 'two-line-features',
    label: 'Headline with two feature lines',
    palette: 'dark',
    logo: { x: 0.72, y: 0.015, width: 0.22, height: 0.055 },
    roles: [
      { role: 'headline', type: 'text', x: 0.06, y: 0.08, width: 0.88, height: 0.18, fontSize: 0.08, textAlign: 'center', bold: true },
      { role: 'body1', type: 'text', x: 0.06, y: 0.30, width: 0.88, height: 0.14, fontSize: 0.042, textAlign: 'left' },
      { role: 'body2', type: 'text', x: 0.06, y: 0.46, width: 0.88, height: 0.14, fontSize: 0.042, textAlign: 'left' },
      { role: 'cta', type: 'button', x: 0.30, y: 0.76, width: 0.40, height: 0.14, fontSize: 0.055, align: 'center' },
    ],
  },
  {
    id: 'video-full-bg',
    label: 'Full-bleed video, caption overlay',
    palette: 'dark',
    video: { x: 0.0, y: 0.0, width: 1.0, height: 1.0 },
    logo: { x: 0.05, y: 0.03, width: 0.20, height: 0.07 },
    roles: [
      { role: 'headline', type: 'text', x: 0.08, y: 0.58, width: 0.84, height: 0.16, fontSize: 0.085, textAlign: 'center', bold: true },
      { role: 'subhead', type: 'text', x: 0.08, y: 0.76, width: 0.84, height: 0.10, fontSize: 0.04, textAlign: 'center' },
      { role: 'cta', type: 'button', x: 0.30, y: 0.88, width: 0.40, height: 0.10, fontSize: 0.045, align: 'center' },
    ],
  },
  {
    id: 'video-left-text-right',
    label: 'Video left half, copy right half',
    palette: 'light',
    video: { x: 0.0, y: 0.0, width: 0.55, height: 1.0 },
    logo: { x: 0.60, y: 0.03, width: 0.34, height: 0.08 },
    roles: [
      { role: 'headline', type: 'text', x: 0.60, y: 0.16, width: 0.34, height: 0.30, fontSize: 0.075, textAlign: 'left', bold: true },
      { role: 'subhead', type: 'text', x: 0.60, y: 0.48, width: 0.34, height: 0.18, fontSize: 0.04, textAlign: 'left' },
      { role: 'cta', type: 'button', x: 0.60, y: 0.70, width: 0.34, height: 0.14, fontSize: 0.05, align: 'left' },
    ],
  },
  {
    id: 'video-top-text-bottom',
    label: 'Video top, headline + CTA bottom strip',
    palette: 'brand',
    video: { x: 0.0, y: 0.0, width: 1.0, height: 0.62 },
    logo: { x: 0.38, y: 0.64, width: 0.24, height: 0.07 },
    roles: [
      { role: 'headline', type: 'text', x: 0.08, y: 0.72, width: 0.84, height: 0.16, fontSize: 0.07, textAlign: 'center', bold: true },
      { role: 'cta', type: 'button', x: 0.30, y: 0.88, width: 0.40, height: 0.10, fontSize: 0.045, align: 'center' },
    ],
  },
  {
    id: 'video-frame-center',
    label: 'Centered video frame, headline + CTA',
    palette: 'dark',
    video: { x: 0.20, y: 0.30, width: 0.60, height: 0.42 },
    logo: { x: 0.05, y: 0.03, width: 0.20, height: 0.07 },
    roles: [
      { role: 'headline', type: 'text', x: 0.08, y: 0.12, width: 0.84, height: 0.16, fontSize: 0.075, textAlign: 'center', bold: true },
      { role: 'cta', type: 'button', x: 0.30, y: 0.78, width: 0.40, height: 0.14, fontSize: 0.055, align: 'center' },
    ],
  },
  {
    id: 'video-side-strip',
    label: 'Video strip right, copy left',
    palette: 'dark',
    video: { x: 0.66, y: 0.0, width: 0.34, height: 1.0 },
    logo: { x: 0.05, y: 0.03, width: 0.20, height: 0.07 },
    roles: [
      { role: 'headline', type: 'text', x: 0.06, y: 0.20, width: 0.56, height: 0.34, fontSize: 0.09, textAlign: 'left', bold: true },
      { role: 'subhead', type: 'text', x: 0.06, y: 0.56, width: 0.56, height: 0.18, fontSize: 0.042, textAlign: 'left' },
      { role: 'cta', type: 'button', x: 0.06, y: 0.80, width: 0.40, height: 0.14, fontSize: 0.05, align: 'left' },
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

// A layout's `video` zone is the *maximum* space reserved for it, not necessarily a
// 16:9 box itself (banner sizes like 300x600 or 970x250 are nowhere near 16:9) —
// stretching a real video to fill a non-16:9 box would distort it. This fits the
// largest 16:9 rectangle inside the given box and centers it there, so the video
// element itself is always true 16:9 regardless of the reserved zone's own shape.
function fitAspectBox(x, y, width, height, ratio = 16 / 9) {
  let w = width, h = height
  if (width / height > ratio) w = height * ratio
  else h = width / ratio
  return { x: x + (width - w) / 2, y: y + (height - h) / 2, width: w, height: h }
}

// Picks black or white — whichever contrasts better — against a given background hex.
// Used for CTA label text so it never inherits a brand's configured text color that
// happens to be too close to (or the same as) the button's own background color.
function luminance(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
  if (!m) return null
  const [, r, g, b] = m
  return (0.299 * parseInt(r, 16) + 0.587 * parseInt(g, 16) + 0.114 * parseInt(b, 16)) / 255
}

function contrastColor(hex) {
  const lum = luminance(hex)
  return lum === null || lum > 0.6 ? '#111827' : '#ffffff'
}

// Uses `preferred` (e.g. a brand-guide color) as long as it actually reads clearly
// against a background of luminance `bgLum` — a brand guide is a reference, not a
// literal constraint, so if the configured text color is too close to its own
// background, fall back to whichever of black/white contrasts best instead of
// rendering unreadable text (no shadow/glow — a genuinely different, readable color).
function readableColorForLum(preferred, bgLum) {
  const prefLum = luminance(preferred)
  if (bgLum === null || prefLum === null) return preferred || (bgLum === null || bgLum > 0.6 ? '#111827' : '#ffffff')
  return Math.abs(bgLum - prefLum) > 0.35 ? preferred : (bgLum > 0.6 ? '#111827' : '#ffffff')
}

function avgLuminance(hexes) {
  const lums = hexes.map(luminance).filter((l) => l !== null)
  if (!lums.length) return null
  return lums.reduce((a, b) => a + b, 0) / lums.length
}

// The background text actually sits on is rarely a single flat color once you factor
// in gradients/blob backgrounds — checking contrast against palette.bg alone missed
// areas dominated by the accent/subtext colors instead. This estimates the overall
// luminance actually in play for each background style so contrast holds across the
// whole banner, not just wherever palette.bg happens to be.
function effectiveBackgroundLuminance(style, palette) {
  if (style === 'gradient') return avgLuminance([palette.bg, palette.accent])
  if (style === 'abstract' || style === 'watercolor') return avgLuminance([palette.bg, palette.accent, palette.subtext])
  return luminance(palette.bg)
}

const MIN_FONT_SIZE = 10

// Rough (not pixel-perfect) estimate of how many lines `text` wraps to at a given
// fontSize/width, then shrinks fontSize until the estimated wrapped height fits
// `height`. Avoids the AI's copy-length rules ("~40 chars") reliably overflowing a
// role's fixed box at its nominal font size.
//
// The width factor is intentionally generous (wider than a typical Arial-ish
// character) — text can now render in any of the AI-selectable fonts (see
// fontForRole below), including much wider/bolder faces like "Impact" or "Arial
// Black". Estimating against a narrower default font understated real wrapped width,
// so the loop stopped shrinking before the text actually fit, cropping/overflowing
// the box. Also checks the single longest word against the box width directly —
// word-wrap only breaks at spaces (falling back to mid-word only when even one word
// can't fit), so a text-length-only estimate can look fine while one long word alone
// is wider than the box and still overflows/mid-word-breaks in the actual render.
function fitFontSize(text, width, height, startSize, bold) {
  if (!text) return startSize
  const avgCharWidthFactor = bold ? 0.72 : 0.62
  const lineHeightFactor = 1.3
  const longestWord = text.split(/\s+/).reduce((a, w) => (w.length > a.length ? w : a), '')
  let fontSize = startSize
  while (fontSize > MIN_FONT_SIZE) {
    const charsPerLine = Math.max(1, Math.floor(width / (fontSize * avgCharWidthFactor)))
    const lines = Math.max(1, Math.ceil(text.length / charsPerLine))
    const estimatedHeight = lines * fontSize * lineHeightFactor
    const longestWordFits = longestWord.length <= charsPerLine
    if (estimatedHeight <= height && longestWordFits) break
    fontSize -= 1
  }
  return fontSize
}

// A button's role box is only the *maximum* footprint it's allowed to claim without
// colliding with neighboring elements — rendering it at that full fixed size made
// short CTAs ("Buy") look like an oversized empty pill and long ones ("Get 20% Off
// Today") overflow past their own background. This sizes the pill to the actual text
// at a comfortable font size (shrinking the font only if even the max width can't fit
// it), then re-anchors it inside the original box per the role's `align` ('left' |
// 'center' | 'right', default 'center'). Full-width/full-height roles are deliberate
// bars (e.g. a CTA strip spanning the whole banner) and keep their fixed footprint.
function fitButtonBox(r, text, x, y, width, height, baseFontSize) {
  const isBar = r.width >= 0.95 || r.height >= 0.95
  if (isBar) {
    return { x, width, fontSize: fitFontSize(text, width, height, baseFontSize, true) }
  }

  const charWidthFactor = 0.62
  const minWidth = Math.round(Math.max(height * 1.6, width * (r.minWidthRatio || 0.32)))
  let fontSize = baseFontSize
  let natural = Math.round(text.length * fontSize * charWidthFactor) + Math.round(fontSize * 1.5)
  while (natural > width && fontSize > MIN_FONT_SIZE) {
    fontSize -= 1
    natural = Math.round(text.length * fontSize * charWidthFactor) + Math.round(fontSize * 1.5)
  }

  const btnWidth = Math.min(width, Math.max(minWidth, natural))
  const align = r.align || 'center'
  const btnX = align === 'left' ? x : align === 'right' ? x + width - btnWidth : x + Math.round((width - btnWidth) / 2)
  return { x: btnX, width: btnWidth, fontSize }
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

// The AI is allowed to nudge a role's box slightly from the layout's fixed geometry
// (e.g. more room for a long headline) rather than only ever picking from the catalog
// verbatim — but only a *nudge*: capped to a small fraction of canvas size so it can't
// drift into the logo/video-safe zones or off-canvas, which the fixed catalog geometry
// otherwise guarantees. Values are fractions of canvas width (dx/dw) or height (dy/dh).
// Text boxes are vertically centered with overflow hidden (see CanvasElement.jsx) — if
// wrapped copy needs more than one line, the box's fixed height crops it top and
// bottom equally rather than growing to fit. `dh` gets a much bigger allowance than
// dx/dy/dw for exactly that reason — but growing a box only extends its *bottom* edge
// (y stays fixed), so without a limit tied to actual free space it can grow straight
// into whatever role sits below it (e.g. a subhead growing into the CTA button under
// it). `maxDh`, computed per-role from real layout geometry (see maxSafeHeightGrowth
// below), caps growth to the actual gap available instead of a flat percentage.
const ADJUST_LIMIT = 0.06
const HEIGHT_ADJUST_LIMIT = 0.18
function applyAdjustment(r, adj, maxDh = HEIGHT_ADJUST_LIMIT) {
  if (!adj) return r
  const clamp = (v) => Math.max(-ADJUST_LIMIT, Math.min(ADJUST_LIMIT, Number(v) || 0))
  const clampHeight = (v) => Math.max(-HEIGHT_ADJUST_LIMIT, Math.min(maxDh, Number(v) || 0))
  const width = Math.max(0.05, r.width + clamp(adj.dw))
  const height = Math.max(0.05, r.height + clampHeight(adj.dh))
  const x = Math.max(0, Math.min(1 - width, r.x + clamp(adj.dx)))
  const y = Math.max(0, Math.min(1 - height, r.y + clamp(adj.dy)))
  return { ...r, x, y, width, height }
}

// How much a role's box can grow downward (as a fraction of canvas height) before
// its new bottom edge would run into another box that horizontally overlaps it —
// the closest such obstacle below sets the ceiling (with a small safety margin),
// falling back to HEIGHT_ADJUST_LIMIT when nothing is in the way.
function maxSafeHeightGrowth(role, obstacles) {
  const left = role.x, right = role.x + role.width, bottom = role.y + role.height
  const MARGIN = 0.015
  let gap = HEIGHT_ADJUST_LIMIT
  obstacles.forEach((o) => {
    if (o === role) return
    const oLeft = o.x, oRight = o.x + o.width
    const overlapsX = oLeft < right && oRight > left
    if (!overlapsX || o.y < bottom - 1e-6) return
    gap = Math.min(gap, o.y - bottom - MARGIN)
  })
  return Math.max(0, Math.min(HEIGHT_ADJUST_LIMIT, gap))
}

// Expands a normalized layout + AI-generated copy into real canvasStore element
// partials (no `id` — addElement()/direct insertion assigns those) for the given
// canvas size. `paletteOverride` (e.g. from a brand guide) replaces the layout's
// built-in colors when provided. `backgroundStyle` picks how the background shape
// is filled — 'solid' (default), 'gradient', 'abstract', or 'watercolor'. All
// backgrounds are CSS-only (no generated images), so text contrast can always be
// computed from the palette's own colors — no shadow/glow or panel behind the text.
// `adjustments` (optional): { role: { dx, dy, dw, dh } } small per-role nudges from
// the AI, see applyAdjustment above. `cornerStyle` ('sharp' | 'soft' | 'pill', default
// 'pill' — the original always-pill behavior) controls how rounded CTA/badge/price
// buttons and the logo placeholder are, as a fraction of the button's own height, so
// the AI can match a brand's actual corner language instead of every banner defaulting
// to fully-rounded pill buttons regardless of tone. `fonts` (optional) — { headline,
// body, cta }, each one of TextProperties.jsx's web-safe FONTS whitelist — lets the AI
// pick a deliberate font pairing per role category instead of every banner rendering
// in the same default (Arial).
const CORNER_RADIUS_RATIO = { sharp: 0, soft: 0.22, pill: 0.5 }
const STAT_ROLES = new Set(['headline', 'stat'])
const BODY_TEXT_ROLES = new Set(['subhead', 'body', 'body1', 'body2'])
function fontForRole(role, fonts) {
  if (!fonts) return undefined
  if (STAT_ROLES.has(role)) return fonts.headline
  if (BODY_TEXT_ROLES.has(role)) return fonts.body
  return fonts.cta // button-type roles (cta, secondaryCta, badge, price)
}
export function buildElementsFromLayout(layoutId, canvasWidth, canvasHeight, copy = {}, backgroundStyle = 'solid', paletteOverride = null, adjustments = null, cornerStyle = 'pill', fonts = null) {
  const layout = findLayout(layoutId)
  if (!layout) return []
  const palette = { ...getPaletteFor(layout), ...(paletteOverride || {}) }
  const cornerRatio = CORNER_RADIUS_RATIO[cornerStyle] ?? CORNER_RADIUS_RATIO.pill
  const elements = []
  let z = 10

  const bgCss = buildBackgroundCss(backgroundStyle, palette, `${layoutId}-${canvasWidth}x${canvasHeight}`)
  elements.push({
    type: 'shape',
    x: 0, y: 0, width: canvasWidth, height: canvasHeight,
    fillColor: palette.bg, cssBackground: backgroundStyle === 'solid' ? undefined : bgCss, borderRadius: 0, zIndex: z++,
  })

  const bgLum = effectiveBackgroundLuminance(backgroundStyle, palette)

  // A reserved video zone renders as a real (empty) video element rather than a
  // placeholder shape, so the user can immediately assign a Flashtalking library
  // video to it — same idea as the logo zone below, but pushed first so it sits
  // *under* the logo/text for full-bleed layouts where video and logo overlap.
  // The zone itself is only the max reserved space; the video is fit to true 16:9
  // within it (see fitAspectBox) rather than stretched to the zone's own shape.
  let videoBox = null
  if (layout.video) {
    videoBox = fitAspectBox(
      layout.video.x * canvasWidth, layout.video.y * canvasHeight,
      layout.video.width * canvasWidth, layout.video.height * canvasHeight,
    )
    elements.push({
      type: 'video', x: Math.round(videoBox.x), y: Math.round(videoBox.y), width: Math.round(videoBox.width), height: Math.round(videoBox.height),
      videoUrl: null, videoName: 'Your Video', muted: true, playTrigger: 'autoplay', zIndex: z++,
    })
  }

  if (layout.logo) {
    const lx = Math.round(layout.logo.x * canvasWidth)
    const ly = Math.round(layout.logo.y * canvasHeight)
    const lw = Math.round(layout.logo.width * canvasWidth)
    const lh = Math.round(layout.logo.height * canvasHeight)
    const logoColor = readableColorForLum(palette.text, bgLum)
    elements.push({
      type: 'shape', x: lx, y: ly, width: lw, height: lh,
      transparent: true, borderWidth: 1, borderColor: hexToRgba(logoColor, 0.4), borderRadius: 4, zIndex: z++,
    })
    elements.push({
      type: 'text', x: lx, y: ly, width: lw, height: lh,
      text: 'Your Logo', fontSize: Math.max(10, Math.round(lh * 0.45)), textAlign: 'center',
      color: hexToRgba(logoColor, 0.55), zIndex: z++,
    })
  }

  // Obstacles a growing role's box must not run into: every other role's box, plus
  // the reserved logo/video zones (which aren't roles but still occupy real space).
  const growthObstacles = [
    ...layout.roles,
    ...(layout.logo ? [layout.logo] : []),
    ...(layout.video ? [layout.video] : []),
  ]

  layout.roles.forEach((role) => {
    const maxDh = maxSafeHeightGrowth(role, growthObstacles)
    const r = applyAdjustment(role, adjustments?.[role.role], maxDh)
    const x = Math.round(r.x * canvasWidth)
    const y = Math.round(r.y * canvasHeight)
    const width = Math.round(r.width * canvasWidth)
    const height = Math.round(r.height * canvasHeight)
    const baseFontSize = Math.max(10, Math.round(r.fontSize * canvasHeight))
    const text = copy[r.role] || (r.type === 'button' ? 'Learn More' : '')

    if (r.type === 'button') {
      const btn = fitButtonBox(r, text, x, y, width, height, baseFontSize)
      elements.push({
        type: 'shape',
        x: btn.x, y, width: btn.width, height,
        fillColor: palette.accent, borderRadius: Math.round(height * cornerRatio), zIndex: z++,
      })
      elements.push({
        type: 'text',
        x: btn.x, y, width: btn.width, height,
        text,
        // Always computed against the button's own background — never a separate
        // brand field that could collide with it and make the label unreadable.
        fontSize: btn.fontSize, fontFamily: fontForRole(r.role, fonts), textAlign: 'center', color: contrastColor(palette.accent), bold: true, zIndex: z++,
      })
    } else {
      // Shrink the font (never grow it) until the AI-written copy is estimated to fit
      // the role's box at this size — the fixed fractional size above is only a
      // starting point and long copy at a large size was cropping at the bottom.
      const fontSize = fitFontSize(text, width, height, baseFontSize, !!r.bold)
      const preferred = r.role === 'subhead' || r.role === 'body' ? palette.subtext : palette.text
      elements.push({
        type: 'text',
        x, y, width, height,
        text,
        fontFamily: fontForRole(r.role, fonts),
        fontSize, textAlign: r.textAlign || 'left',
        color: readableColorForLum(preferred, bgLum),
        bold: !!r.bold, italic: !!r.italic, zIndex: z++,
      })
    }
  })

  // A full-canvas click layer sits on top so the whole banner is clickable regardless
  // of which visual element the pointer lands on — but a video element renders its own
  // native control bar (play/pause/seek/volume) in its bottom ~40px, and a click layer
  // stacked above it would swallow every click those controls need. When the layout has
  // a video zone, tile the click layer around a 40px-tall gap spanning that video's own
  // bottom edge instead of a single full-canvas rect, so the controls stay usable.
  const VIDEO_CONTROL_GAP = 40
  if (videoBox) {
    const vx = Math.round(videoBox.x)
    const vy = Math.round(videoBox.y)
    const vw = Math.round(videoBox.width)
    const vh = Math.round(videoBox.height)
    const bandTop = Math.max(0, vy + vh - VIDEO_CONTROL_GAP)
    const bandBottom = vy + vh

    if (bandTop > 0) {
      elements.push({ type: 'clickthrough', x: 0, y: 0, width: canvasWidth, height: bandTop, clickIndex: 1, zIndex: z++ })
    }
    if (vx > 0) {
      elements.push({ type: 'clickthrough', x: 0, y: bandTop, width: vx, height: bandBottom - bandTop, clickIndex: 1, zIndex: z++ })
    }
    if (vx + vw < canvasWidth) {
      elements.push({ type: 'clickthrough', x: vx + vw, y: bandTop, width: canvasWidth - (vx + vw), height: bandBottom - bandTop, clickIndex: 1, zIndex: z++ })
    }
    if (bandBottom < canvasHeight) {
      elements.push({ type: 'clickthrough', x: 0, y: bandBottom, width: canvasWidth, height: canvasHeight - bandBottom, clickIndex: 1, zIndex: z++ })
    }
  } else {
    elements.push({
      type: 'clickthrough',
      x: 0, y: 0, width: canvasWidth, height: canvasHeight,
      clickIndex: 1, zIndex: z++,
    })
  }

  return elements
}
