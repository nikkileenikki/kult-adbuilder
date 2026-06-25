import JSZip from 'jszip'

function buildElementCSS(el) {
  const styles = [
    `position:absolute`,
    `left:${el.x}px`,
    `top:${el.y}px`,
    `width:${el.width}px`,
    `height:${el.height}px`,
    `transform:rotate(${el.rotation || 0}deg)`,
    `opacity:${el.opacity ?? 1}`,
    `z-index:${el.zIndex || 0}`,
  ]
  if (el.type === 'text') {
    styles.push(`font-size:${el.fontSize || 16}px`)
    styles.push(`font-family:${el.fontFamily || 'Arial'},sans-serif`)
    styles.push(`color:${el.color || '#000'}`)
    styles.push(`font-weight:${el.bold ? 'bold' : 'normal'}`)
    styles.push(`font-style:${el.italic ? 'italic' : 'normal'}`)
    styles.push(`text-decoration:${el.underline ? 'underline' : 'none'}`)
    styles.push(`text-align:${el.textAlign || 'left'}`)
    styles.push(`white-space:pre-wrap`)
    styles.push(`word-break:break-word`)
    styles.push(`overflow:hidden`)
    if (el.textShadowBlur || el.textShadowX || el.textShadowY || el.textGlowBlur) {
      const parts = []
      if (el.textShadowBlur || el.textShadowX || el.textShadowY)
        parts.push(`${el.textShadowX||0}px ${el.textShadowY||0}px ${el.textShadowBlur||0}px ${el.textShadowColor||'#000'}`)
      if (el.textGlowBlur || el.textGlowX || el.textGlowY)
        parts.push(`${el.textGlowX||0}px ${el.textGlowY||0}px ${el.textGlowBlur||0}px ${el.textGlowSpread||0}px ${el.textGlowColor||'#fff'}`)
      if (parts.length) styles.push(`text-shadow:${parts.join(', ')}`)
    }
  }
  if (el.type === 'shape') {
    const isCircle = el.shapeType === 'circle'
    styles.push(`background:${el.transparent ? 'transparent' : (el.fillColor || '#888')}`)
    styles.push(`border-radius:${isCircle ? '50%' : `${el.borderRadius || 0}px`}`)
    if (el.borderWidth) styles.push(`border:${el.borderWidth}px solid ${el.borderColor || '#000'}`)
    if (el.shadowBlur || el.shadowX || el.shadowY || el.glowBlur) {
      const parts = []
      if (el.shadowBlur || el.shadowX || el.shadowY)
        parts.push(`${el.shadowX||0}px ${el.shadowY||0}px ${el.shadowBlur||0}px ${el.shadowSpread||0}px ${el.shadowColor||'#000'}`)
      if (el.glowBlur || el.glowX || el.glowY)
        parts.push(`${el.glowX||0}px ${el.glowY||0}px ${el.glowBlur||0}px ${el.glowSpread||0}px ${el.glowColor||'#fff'}`)
      if (parts.length) styles.push(`box-shadow:${parts.join(', ')}`)
    }
  }
  if (el.type === 'image') {
    styles.push(`border-radius:${el.borderRadius || 0}px`)
  }
  return styles.join(';')
}

function buildElementHTML(el) {
  if (!el.visible) return ''
  const css = buildElementCSS(el)
  const id = el.id
  switch (el.type) {
    case 'text':
      return `<div id="${id}" style="${css}">${escapeHtml(el.text || 'Text')}</div>`
    case 'image':
      return `<img id="${id}" src="${el.src || ''}" alt="${escapeHtml(el.filename || '')}" style="${css};display:block;object-fit:fill;" />`
    case 'shape':
      return `<div id="${id}" style="${css}"></div>`
    case 'clickthrough':
      return `<a id="${id}" href="${escapeHtml(el.url || '#')}" target="${escapeHtml(el.target || '_blank')}" style="${css};display:flex;align-items:center;justify-content:center;text-decoration:none;"></a>`
    case 'invisible':
      return `<div id="${id}" style="${css}"></div>`
    default:
      return ''
  }
}

function buildAnimationJS(elements) {
  const lines = ['var tl = gsap.timeline({ repeat: 0 });']
  elements.forEach((el) => {
    if (!el.visible) return
    ;(el.animations || []).forEach((anim) => {
      const t = `document.getElementById('${el.id}')`
      const start = anim.startTime || 0
      const dur = anim.duration || 1
      const ease = anim.ease || 'power1.out'
      const op = el.opacity ?? 1
      const legOff = anim.offset ?? 400
      const ox = anim.offsetX ?? legOff
      const oy = anim.offsetY ?? legOff
      const sp = anim.scaleParam ?? 0
      switch (anim.type) {
        case 'fadeIn':       lines.push(`tl.fromTo(${t},{autoAlpha:0},{autoAlpha:${op},duration:${dur},ease:'${ease}'},${start});`); break
        case 'fadeOut':      lines.push(`tl.to(${t},{autoAlpha:0,duration:${dur},ease:'${ease}'},${start});`); break
        case 'slideLeft':    lines.push(`tl.fromTo(${t},{x:-${ox}},{x:0,duration:${dur},ease:'${ease}'},${start});`); break
        case 'slideRight':   lines.push(`tl.fromTo(${t},{x:${ox}},{x:0,duration:${dur},ease:'${ease}'},${start});`); break
        case 'slideUp':      lines.push(`tl.fromTo(${t},{y:-${oy}},{y:0,duration:${dur},ease:'${ease}'},${start});`); break
        case 'slideDown':    lines.push(`tl.fromTo(${t},{y:${oy}},{y:0,duration:${dur},ease:'${ease}'},${start});`); break
        case 'slideToLeft':  lines.push(`tl.to(${t},{x:-${ox},duration:${dur},ease:'${ease}'},${start});`); break
        case 'slideToRight': lines.push(`tl.to(${t},{x:${ox},duration:${dur},ease:'${ease}'},${start});`); break
        case 'slideToUp':    lines.push(`tl.to(${t},{y:-${oy},duration:${dur},ease:'${ease}'},${start});`); break
        case 'slideToDown':  lines.push(`tl.to(${t},{y:${oy},duration:${dur},ease:'${ease}'},${start});`); break
        case 'scaleFrom':    lines.push(`tl.fromTo(${t},{scale:${sp}},{scale:1,duration:${dur},ease:'${ease}'},${start});`); break
        case 'scaleTo':      lines.push(`tl.to(${t},{scale:${sp},duration:${dur},ease:'${ease}'},${start});`); break
        case 'scaleIn':      lines.push(`tl.fromTo(${t},{scale:0},{scale:1,duration:${dur},ease:'${ease}'},${start});`); break
        case 'scaleOut':     lines.push(`tl.to(${t},{scale:0,duration:${dur},ease:'${ease}'},${start});`); break
        case 'rotate90':     lines.push(`tl.to(${t},{rotation:90,duration:${dur},ease:'${ease}'},${start});`); break
        case 'rotate180':    lines.push(`tl.to(${t},{rotation:180,duration:${dur},ease:'${ease}'},${start});`); break
        case 'rotate270':    lines.push(`tl.to(${t},{rotation:270,duration:${dur},ease:'${ease}'},${start});`); break
        case 'rotate360':    lines.push(`tl.to(${t},{rotation:360,duration:${dur},ease:'${ease}'},${start});`); break
        default: break
      }
    })
  })
  return lines.join('\n')
}

function buildManifestJS({ bannerName, canvasWidth, canvasHeight }) {
  return `var FT_manifest = {
  "version": "3.0",
  "name": ${JSON.stringify(bannerName)},
  "width": ${canvasWidth},
  "height": ${canvasHeight},
  "clickTags": [
    { "id": "clickTag1", "name": "Default Click" }
  ]
};`
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function exportBannerZip({ elements, canvasWidth, canvasHeight, bannerName, politeLoad }) {
  const zip = new JSZip()

  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)
  const elementsHTML = sorted.map(buildElementHTML).filter(Boolean).join('\n    ')
  const animJS = buildAnimationJS(sorted)
  const manifestJS = buildManifestJS({ bannerName, canvasWidth, canvasHeight })

  // Extract base64 images into root folder
  const imageFiles = []
  elements.filter((el) => el.type === 'image' && el.src?.startsWith('data:')).forEach((el, i) => {
    const match = el.src.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return
    const ext = match[1].split('/')[1] || 'png'
    const filename = el.filename || `img_${i}.${ext}`
    zip.file(filename, match[2], { base64: true })
    imageFiles.push({ src: el.src, filename })
  })

  // Attempt to fetch GSAP source to bundle locally — no longer needed, always use CDN
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="ad.size" content="width=${canvasWidth},height=${canvasHeight}" />
  <title>${escapeHtml(bannerName)}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:${canvasWidth}px;height:${canvasHeight}px;overflow:hidden;background:#fff;border:1px solid #000;box-sizing:border-box}
    #ad-container{position:relative;width:100%;height:100%;overflow:hidden}
  </style>
</head>
<body>
  <script src="https://cdn.flashtalking.com/frameworks/js/api/2/10/html5API.js"><\/script>
  <div id="ad-container">
    ${elementsHTML}
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"><\/script>
  <script>
    ${politeLoad ? 'window.addEventListener("load", function() {' : '(function() {'}
    ${animJS}
    ${politeLoad ? '});' : '})();'}
  <\/script>
</body>
</html>`

  // Swap base64 srcs for file references
  imageFiles.forEach(({ src, filename }) => {
    html = html.replace(src, filename)
  })

  zip.file('index.html', html)
  zip.file('manifest.js', manifestJS)

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${bannerName || 'banner'}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

export function saveBannerJSON({ elements, canvasWidth, canvasHeight, bannerName }) {
  const data = JSON.stringify({ version: 1, bannerName, canvasWidth, canvasHeight, elements }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${bannerName || 'banner'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function loadBannerJSON(file, callback) {
  const reader = new FileReader()
  reader.onload = (e) => {
    try { callback(null, JSON.parse(e.target.result)) }
    catch (err) { callback(err) }
  }
  reader.readAsText(file)
}
