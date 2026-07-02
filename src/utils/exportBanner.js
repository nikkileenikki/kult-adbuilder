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
      return `<div id="${id}" class="click clickTag" style="${css};display:block;cursor:pointer;"></div>`
    case 'invisible':
      return `<div id="${id}" style="${css}"></div>`
    case 'video': {
      const attrs = []
      if (el.playTrigger === 'autoplay') attrs.push('autoplay')
      if (el.muted !== false) attrs.push('muted')
      if (el.controls) attrs.push('controls')
      const attrStr = attrs.length ? ` ${attrs.join(' ')}` : ''
      return `<ft-video id="${id}" name="${escapeHtml(el.videoName || id)}" style="${css}"${attrStr}></ft-video>`
    }
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
        case 'scaleFrom': { const origin = anim.transformOrigin || 'center center'; lines.push(`tl.set(${t},{transformOrigin:'${origin}'},${start});`); lines.push(`tl.fromTo(${t},{scale:${sp}},{scale:1,duration:${dur},ease:'${ease}'},${start});`); break }
        case 'scaleTo':   { const origin = anim.transformOrigin || 'center center'; lines.push(`tl.set(${t},{transformOrigin:'${origin}'},${start});`); lines.push(`tl.to(${t},{scale:${sp},duration:${dur},ease:'${ease}'},${start});`); break }
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

function buildClickTagJS(elements) {
  const clicks = elements.filter((el) => el.visible && el.type === 'clickthrough')
  if (!clicks.length) return ''
  const lines = clicks.map((el) => {
    const idx = el.clickIndex || 1
    const url = el.url || ''
    return `  document.getElementById('${el.id}').addEventListener('click', function() { myFT.clickTag(${idx}${url ? `, '${url}'` : ''}); });`
  })
  return lines.join('\n')
}

function buildManifestJS({ canvasWidth, canvasHeight, elements, customManifest }) {
  const videos = (elements || [])
    .filter((el) => el.visible && el.type === 'video' && el.videoName && el.videoUrl)
    .map((el) => ({ name: el.videoName, ref: el.videoUrl }))

  const trackingNames = new Set()
  const trackingEvents = (elements || [])
    .filter((el) => el.visible && el.type === 'invisible' && el.trackingName && !trackingNames.has(el.trackingName) && trackingNames.add(el.trackingName))
    .map((el) => ({ name: el.trackingName, type: el.trackingType || 'standard' }))

  const manifest = {
    filename: 'index.html',
    width: canvasWidth,
    height: canvasHeight,
    clickTagCount: 1,
    hideBrowsers: ['ie8'],
  }
  if (videos.length) manifest.videos = videos
  if (trackingEvents.length) manifest.trackingEvents = trackingEvents

  // Custom manifest fields (admin-authored on the template) override auto-generated ones.
  if (customManifest?.trim()) {
    try {
      Object.assign(manifest, JSON.parse(customManifest))
    } catch (_) { /* invalid JSON — ignore, keep auto-generated manifest */ }
  }

  return `FT.manifest(${JSON.stringify(manifest, null, 2)});`
}

function buildTrackingJS(elements) {
  const tracked = elements.filter((el) => el.visible && el.type === 'invisible' && el.trackingName)
  if (!tracked.length) return ''

  const lines = []
  const needsSwipe = tracked.some((el) => el.triggerOn === 'swipeLeft' || el.triggerOn === 'swipeRight')
  if (needsSwipe) {
    lines.push(`  function ktSwipe(el, dir, cb) {
    var sx = 0, sy = 0;
    el.addEventListener('touchstart', function(e) { sx = e.changedTouches[0].screenX; sy = e.changedTouches[0].screenY; }, { passive: true });
    el.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].screenX - sx;
      var dy = e.changedTouches[0].screenY - sy;
      if (Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(dy)) return;
      if ((dir === 'left' && dx < 0) || (dir === 'right' && dx > 0)) cb();
    }, { passive: true });
  }`)
  }

  tracked.forEach((el) => {
    const target = `document.getElementById('${el.id}')`
    const fire = `function() { myFT.tracker('${el.trackingName}'); }`
    switch (el.triggerOn) {
      case 'hover':
        lines.push(`  ${target}.addEventListener('mouseenter', ${fire});`)
        break
      case 'swipeLeft':
        lines.push(`  ktSwipe(${target}, 'left', ${fire});`)
        break
      case 'swipeRight':
        lines.push(`  ktSwipe(${target}, 'right', ${fire});`)
        break
      case 'click':
      default:
        lines.push(`  ${target}.addEventListener('click', ${fire});`)
        break
    }
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

export async function buildBannerZipBlob({ elements, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate }) {
  return _buildZip({ elements, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate })
}

export async function exportBannerZip({ elements, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate }) {
  const blob = await _buildZip({ elements, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${bannerName || 'banner'}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

// Substitutes {{token}} placeholders in a template's custom code with the values the
// ad builder collected in the left panel. Shared by the zip export and the live preview
// so both stay in sync on what "advanced mode" custom HTML/JS/CSS/manifest actually is.
function substituteTemplateTokens(activeTemplate) {
  const values = activeTemplate?.tokenValues || {}
  const sub = (str) => (str || '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => values[key] ?? '')
  return {
    customHtml: sub(activeTemplate?.customHtml?.trim() || ''),
    customJs: sub(activeTemplate?.customJs?.trim() || ''),
    customCss: sub(activeTemplate?.customCss?.trim() || ''),
    customManifest: sub(activeTemplate?.customManifest?.trim() || ''),
  }
}

// Builds the exported index.html as a string. Used for both the real ZIP export and the
// live canvas preview (which skips the base64->file swap since there's no zip to reference).
async function _buildHTML({ elements, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate, customHtml, customJs, customCss, imageFiles, inlineTemplateCss }) {
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)
  const elementsHTML = sorted.map(buildElementHTML).filter(Boolean).join('\n    ')
  const animJS = buildAnimationJS(sorted)
  const clickTagJS = buildClickTagJS(sorted)
  const trackingJS = buildTrackingJS(sorted)

  // customHtml present -> "advanced mode": bespoke markup replaces the element-based
  // container entirely, and customJs runs standalone (own window.onload, no wrapper).
  // Advanced templates are meant to be self-contained bespoke banners, so they skip the
  // FT html5API.js script and the preset loader markup — only jQuery + GSAP are provided.
  const isAdvanced = !!customHtml
  const customCssTag = customCss ? `\n  <style>\n${customCss}\n  </style>` : ''
  const customJsBlock = (!isAdvanced && customJs) ? `\n\n  function customTemplateInit() {\n${customJs}\n  }` : ''
  const customJsCall = (!isAdvanced && customJs) ? '\n    customTemplateInit();' : ''
  const bodyHTML = isAdvanced ? customHtml : elementsHTML
  const jqueryTag = isAdvanced ? '\n  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"><\/script>' : ''
  const containerOpacity = isAdvanced ? 1 : 0

  // Fetch template CSS if a template is active — inlined for preview, or returned for the zip writer to save as a file
  let templateCssTag = ''
  let templateCss = null
  if (activeTemplate) {
    const sizeKey = `${canvasWidth}x${canvasHeight}`
    const size = activeTemplate.sizes?.[sizeKey] || Object.values(activeTemplate.sizes || {})[0]
    if (size?.css) {
      const cssUrl = `/js/template-library/${activeTemplate.id}/${size.css}`
      try {
        const res = await fetch(cssUrl)
        if (res.ok) {
          let css = await res.text()
          // Substitute {{layout.*}} variables
          const layout = size.layout || { width: canvasWidth, height: canvasHeight }
          css = css.replace(/\{\{layout\.(\w+)\}\}/g, (_, key) => layout[key] ?? '')
          // Substitute image filename references
          imageFiles.forEach(({ src, filename }) => { css = css.replaceAll(src, filename) })
          templateCss = css
          templateCssTag = inlineTemplateCss ? `\n  <style>\n${css}\n  </style>` : '\n  <link rel="stylesheet" href="template.css" />'
        }
      } catch (_) { /* skip if fetch fails */ }
    }
  }

  const politeLoadFn = politeLoad ? `function politeLoad(callback) {
    if (document.readyState === "complete") { callback(); }
    else { window.addEventListener("load", callback); }
  }

  ` : ''
  const windowOnload = politeLoad
    ? `window.onload = function() { politeLoad(init); };`
    : `window.onload = function() { init(); };`

  const presetCss = isAdvanced ? '' : `
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:${canvasWidth}px;height:${canvasHeight}px;overflow:hidden;background:#fff;border:1px solid #000;box-sizing:border-box;position:relative}
    #container{position:relative;width:100%;height:100%;overflow:hidden;opacity:${containerOpacity}}
    .loader{position:absolute;width:15px;height:15px;border-radius:50%;left:calc(50% - 7px);top:calc(50% - 7px);animation:l5 1s infinite linear alternate;z-index:9999}
    @keyframes l5{
      0%  {box-shadow:20px 0 #333,-20px 0 rgba(0,0,0,0.1);background:#333}
      33% {box-shadow:20px 0 #333,-20px 0 rgba(0,0,0,0.1);background:rgba(0,0,0,0.1)}
      66% {box-shadow:20px 0 rgba(0,0,0,0.1),-20px 0 #333;background:rgba(0,0,0,0.1)}
      100%{box-shadow:20px 0 rgba(0,0,0,0.1),-20px 0 #333;background:#333}
    }`

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="ad.size" content="width=${canvasWidth},height=${canvasHeight}" />
  <title>${escapeHtml(bannerName)}</title>
  <style>${presetCss}
  </style>${templateCssTag}${customCssTag}
</head>
<body>${isAdvanced ? '' : '\n  <script src="https://cdn.flashtalking.com/frameworks/js/api/2/10/html5API.js"><\/script>\n  <div class="loader"></div>'}
  <div id="container">
    ${bodyHTML}
  </div>${jqueryTag}
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"><\/script>
  <script>
  ${isAdvanced ? customJs : `${politeLoadFn}function init() {
    addEvent();
  }

  function addEvent() {
${clickTagJS}
${trackingJS}
    animate();${customJsCall}
  }

  function animate() {
    var loader = document.querySelector('.loader');
    if (loader) loader.style.display = 'none';
    gsap.set('#container', { opacity: 1 });
    ${animJS}
  }${customJsBlock}

  ${windowOnload}`}
  <\/script>
</body>
</html>`

  // Swap base64 srcs for file references
  imageFiles.forEach(({ src, filename }) => {
    html = html.replaceAll(src, filename)
  })

  return { html, templateCss }
}

async function _buildZip({ elements, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate }) {
  const zip = new JSZip()

  // Extract base64 images into root folder
  const imageFiles = []
  let imgCounter = 0
  elements.filter((el) => el.type === 'image' && el.src?.startsWith('data:')).forEach((el) => {
    const match = el.src.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return
    const ext = match[1].split('/')[1] || 'png'
    const filename = el.filename || `img_${imgCounter++}.${ext}`
    zip.file(filename, match[2], { base64: true })
    imageFiles.push({ src: el.src, filename })
  })

  // Custom templates (advanced mode) can have images embedded directly as base64 data
  // URIs in their HTML/CSS rather than as canvas image elements — extract those too so
  // the zip ships real image files instead of inlined base64.
  const { customHtml, customJs, customCss, customManifest } = substituteTemplateTokens(activeTemplate)
  const dataUriRe = /data:([^;,"')]+);base64,([A-Za-z0-9+/=]+)/g
  ;[customHtml, customCss].forEach((str) => {
    let match
    dataUriRe.lastIndex = 0
    while ((match = dataUriRe.exec(str))) {
      const fullSrc = match[0]
      if (imageFiles.some((f) => f.src === fullSrc)) continue
      const ext = match[1].split('/')[1] || 'png'
      const filename = `tpl_img_${imgCounter++}.${ext}`
      zip.file(filename, match[2], { base64: true })
      imageFiles.push({ src: fullSrc, filename })
    }
  })

  const { html, templateCss } = await _buildHTML({
    elements, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate,
    customHtml, customJs, customCss, imageFiles, inlineTemplateCss: false,
  })
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)
  const manifestJS = buildManifestJS({ canvasWidth, canvasHeight, elements: sorted, customManifest })

  if (templateCss) zip.file('template.css', templateCss)
  zip.file('index.html', html)
  zip.file('manifest.js', manifestJS)

  return zip.generateAsync({ type: 'blob' })
}

// Live preview HTML for the canvas — same rendering path as export, base64 images kept inline
// (no zip to reference files from) and template CSS inlined as a <style> tag.
export async function buildPreviewHtml({ elements, canvasWidth, canvasHeight, bannerName, activeTemplate }) {
  const { customHtml, customJs, customCss } = substituteTemplateTokens(activeTemplate)
  const { html } = await _buildHTML({
    elements, canvasWidth, canvasHeight, bannerName: bannerName || 'preview', politeLoad: false,
    activeTemplate, customHtml, customJs, customCss, imageFiles: [], inlineTemplateCss: true,
  })
  return html
}

export function saveBannerJSON({ elements, canvasWidth, canvasHeight, bannerName, animDuration, animLoop, activeTemplate }) {
  const template = activeTemplate ? {
    id: activeTemplate.id,
    name: activeTemplate.name,
    customHtml: activeTemplate.customHtml || '',
    customJs: activeTemplate.customJs || '',
    customCss: activeTemplate.customCss || '',
    customManifest: activeTemplate.customManifest || '',
    variables: activeTemplate.variables || [],
    tokenVariables: activeTemplate.tokenVariables || [],
    tokenValues: activeTemplate.tokenValues || {},
    sizes: activeTemplate.sizes || {},
  } : null
  const data = JSON.stringify({ version: 1, bannerName, canvasWidth, canvasHeight, animDuration, animLoop, elements, template }, null, 2)
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
