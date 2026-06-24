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
  }
  if (el.type === 'shape') {
    const isCircle = el.shapeType === 'circle'
    styles.push(`background:${el.transparent ? 'transparent' : (el.fillColor || '#888')}`)
    styles.push(`border-radius:${isCircle ? '50%' : `${el.borderRadius || 0}px`}`)
    if (el.borderWidth) styles.push(`border:${el.borderWidth}px solid ${el.borderColor || '#000'}`)
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
  const lines = []
  lines.push('var tl = gsap.timeline({ repeat: 0 });')
  elements.forEach((el) => {
    if (!el.visible) return
    ;(el.animations || []).forEach((anim) => {
      const id = el.id
      const start = anim.startTime || 0
      const dur = anim.duration || 1
      const ease = anim.ease || 'power1.out'
      const target = `document.getElementById('${id}')`
      switch (anim.type) {
        case 'fadeIn':    lines.push(`tl.fromTo(${target},{autoAlpha:0},{autoAlpha:${el.opacity ?? 1},duration:${dur},ease:'${ease}'},${start});`); break
        case 'fadeOut':   lines.push(`tl.to(${target},{autoAlpha:0,duration:${dur},ease:'${ease}'},${start});`); break
        case 'slideLeft': lines.push(`tl.fromTo(${target},{x:-400},{x:0,duration:${dur},ease:'${ease}'},${start});`); break
        case 'slideRight':lines.push(`tl.fromTo(${target},{x:400},{x:0,duration:${dur},ease:'${ease}'},${start});`); break
        case 'slideUp':   lines.push(`tl.fromTo(${target},{y:-400},{y:0,duration:${dur},ease:'${ease}'},${start});`); break
        case 'slideDown': lines.push(`tl.fromTo(${target},{y:400},{y:0,duration:${dur},ease:'${ease}'},${start});`); break
        case 'slideToLeft':  lines.push(`tl.to(${target},{x:-400,duration:${dur},ease:'${ease}'},${start});`); break
        case 'slideToRight': lines.push(`tl.to(${target},{x:400,duration:${dur},ease:'${ease}'},${start});`); break
        case 'slideToUp':    lines.push(`tl.to(${target},{y:-400,duration:${dur},ease:'${ease}'},${start});`); break
        case 'slideToDown':  lines.push(`tl.to(${target},{y:400,duration:${dur},ease:'${ease}'},${start});`); break
        case 'scaleIn':  lines.push(`tl.fromTo(${target},{scale:0},{scale:1,duration:${dur},ease:'${ease}'},${start});`); break
        case 'scaleOut': lines.push(`tl.to(${target},{scale:0,duration:${dur},ease:'${ease}'},${start});`); break
        case 'rotate90':  lines.push(`tl.to(${target},{rotation:90,duration:${dur},ease:'${ease}'},${start});`); break
        case 'rotate180': lines.push(`tl.to(${target},{rotation:180,duration:${dur},ease:'${ease}'},${start});`); break
        case 'rotate270': lines.push(`tl.to(${target},{rotation:270,duration:${dur},ease:'${ease}'},${start});`); break
        case 'rotate360': lines.push(`tl.to(${target},{rotation:360,duration:${dur},ease:'${ease}'},${start});`); break
        default: break
      }
    })
  })
  return lines.join('\n')
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

  // Collect embedded images (base64 src)
  const images = elements.filter((el) => el.type === 'image' && el.src?.startsWith('data:'))
  const imageFiles = images.map((el, i) => {
    const match = el.src.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    const ext = match[1].split('/')[1] || 'png'
    const filename = `assets/img_${i}.${ext}`
    zip.file(filename, match[2], { base64: true })
    return { id: el.id, filename }
  }).filter(Boolean)

  // Replace base64 src in HTML with file references
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="ad.size" content="width=${canvasWidth},height=${canvasHeight}" />
  <title>${escapeHtml(bannerName)}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:${canvasWidth}px;height:${canvasHeight}px;overflow:hidden;background:#fff}
    #ad-container{position:relative;width:${canvasWidth}px;height:${canvasHeight}px;overflow:hidden}
  </style>
</head>
<body>
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

  // Swap base64 image srcs to file paths
  imageFiles.forEach(({ id, filename }) => {
    const el = elements.find((e) => e.id === id)
    if (el) {
      html = html.replace(el.src, filename)
    }
  })

  zip.file('index.html', html)

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
    try {
      const data = JSON.parse(e.target.result)
      callback(null, data)
    } catch (err) {
      callback(err)
    }
  }
  reader.readAsText(file)
}
