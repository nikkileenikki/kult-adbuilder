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
    styles.push(`display:flex`)
    styles.push(`flex-direction:column`)
    styles.push(`justify-content:center`)
    styles.push(`align-items:${el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start'}`)
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
    styles.push(`text-wrap:balance`)
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
    styles.push(`background:${el.transparent ? 'transparent' : (el.cssBackground || el.fillColor || '#888')}`)
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
      return `<img id="${id}" src="${el.src || ''}" alt="${escapeHtml(el.filename || '')}" style="${css};display:block;object-fit:${el.objectFit || 'fill'};" />`
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

// Wraps each group's member elements in their own <div id="group_<id>"> — grouped
// elements still get their usual absolute positioning inline (unchanged), and the
// wrapper itself carries no layout/stacking-context-creating CSS (no position/opacity/
// transform), so it's invisible to both layout and z-index comparisons; it exists
// purely so a group is addressable/stylable as one DOM node (e.g. by custom JS/CSS)
// rather than being just an authoring-time grouping concept. Each group contributes
// exactly one wrapper, placed at its topmost (highest zIndex) member's position in the
// stack, containing all its members in their relative z-order — this doesn't assume
// group members are contiguous in `sorted`, since a plain "assign to group" drag drop
// doesn't renumber zIndex to make that true until the next explicit reorder.
function buildElementsHTML(sorted, groups) {
  const groupIds = new Set((groups || []).map((g) => g.id))
  const seen = new Set()
  const parts = []
  sorted.forEach((el) => {
    if (el.folderId && groupIds.has(el.folderId)) {
      if (seen.has(el.folderId)) return
      seen.add(el.folderId)
      const groupEls = sorted.filter((e) => e.folderId === el.folderId)
      const inner = groupEls.map(buildElementHTML).filter(Boolean).join('\n      ')
      if (inner) parts.push(`<div id="group_${el.folderId}">\n      ${inner}\n    </div>`)
      return
    }
    const html = buildElementHTML(el)
    if (html) parts.push(html)
  })
  return parts.join('\n    ')
}

function buildAnimationJS(elements, stopPoints) {
  // Assigns the shared `tl` var (declared at the top of the exported script, see
  // _buildHTML) instead of a locally-scoped `var tl` — invisible-layer actions like
  // "jump to X seconds" and "resume timeline" (buildActionJS below) need to reach the
  // same timeline instance from a separate event-listener function, not a fresh one.
  const lines = ['tl = gsap.timeline({ repeat: 0 });']
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
  // Stopping points auto-pause playback the moment it naturally reaches one — set on
  // the whole timeline (Timeline.jsx, next to the zoom control), distinct from a
  // single invisible layer's own "jump to X seconds" action.
  //
  // This used to be GSAP's built-in tl.addPause(time), but it doesn't coexist with
  // manual tl.seek() calls the way it looks like it should: seeking forward past an
  // unconsumed addPause doesn't reliably arm/disarm it, so playback could snap back
  // to an old pause point on the very next tick, or a jump could land somewhere that
  // never actually renders because the timeline keeps getting yanked back before it
  // gets there — "jump to 2.1s" working once, then a restart leaving 2.1s dead, then
  // "jump to 4.1s" never actually animating anything past it, were all the same root
  // cause. Implemented by hand instead: ktStopFired tracks, per point, whether it's
  // already been reached in the current forward pass, and only two things are allowed
  // to touch it — the ticker itself (real forward playback reaching a point marks it
  // fired and pauses there) and ktMarkStopsUpTo (called by jump/restart actions, see
  // buildActionJS, *before* they seek) which marks every point up to the jump target
  // as already-fired and everything past it as not-yet-fired, so a manual jump can
  // never be mistaken for "just reached" a point behind or ahead of it.
  // ktStops/ktStopFired/ktMarkStopsUpTo are declared once at the shared top-level
  // script scope (see _buildHTML, right beside `var tl`) — NOT here, even though this
  // is where their values are known. This code runs inside animate(), but
  // ktMarkStopsUpTo is *called* from the click/hover/swipe handlers built by
  // buildTrackingJS, which live inside the sibling addEvent() function. Declaring
  // them here made them invisible to that sibling scope: calling ktMarkStopsUpTo from
  // a jump/restart action threw a ReferenceError, which silently killed that whole
  // click handler (and any tracker call or other action before it in the same
  // handler) — the exact "button trigger not working" this now avoids by only
  // assigning into the shared vars here, the same pattern `tl = gsap.timeline(...)`
  // already uses.
  // Watching via the raw gsap.ticker isn't tied to this timeline's own render
  // lifecycle at all — it's a second, independently-scheduled per-frame callback,
  // racing tl's own internal engine tick with no guaranteed ordering between them.
  // After enough jumps that race could observe a stale tl.time() or fire against a
  // timeline mid-seek, leaving it stuck paused with nothing left to un-stick it.
  // tl.eventCallback('onUpdate', ...) instead fires exactly when *this* timeline
  // renders a new frame of its own playback — never during a suppressed manual seek
  // (the default for tl.seek()), so it can't fight with jump/restart the way the
  // ticker could.
  const validStops = (stopPoints || []).filter((sp) => sp != null && sp > 0).sort((a, b) => a - b)
  lines.push(`ktStops = ${JSON.stringify(validStops)};`)
  if (validStops.length) {
    lines.push(`tl.eventCallback('onUpdate', function() {
    var t = tl.time();
    for (var i = 0; i < ktStops.length; i++) {
      var sp = ktStops[i];
      if (t >= sp && !ktStopFired[sp]) { ktStopFired[sp] = true; tl.pause(sp); break; }
    }
  });`)
  }
  return lines.join('\n')
}

// Video elements can carry `timeCues` — animations triggered by the video's own
// playback position rather than the banner's fixed GSAP timeline (e.g. "fade in
// Text A at 3s into this video"). Reuses the exact same tween vocabulary as
// buildAnimationJS, but fires each tween immediately via gsap.to/fromTo instead of
// scheduling it on the shared timeline. `fired` is tracked per cue and recomputed from
// currentTime on every timeupdate (not a one-way latch), so seeking backward or a
// looping video naturally re-arms and replays cues on the way forward again.
function buildVideoCueJS(elements) {
  const videos = elements.filter((el) => el.visible && el.type === 'video' && (el.timeCues || []).length)
  if (!videos.length) return ''

  const lines = []
  videos.forEach((video) => {
    const cues = video.timeCues.filter((c) => c.targetId && resolveTargetElements(c.targetId, elements).length)
    if (!cues.length) return

    const v = `document.getElementById('${video.id}')`
    lines.push(`  (function() {`)
    lines.push(`    var v = ${v};`)
    lines.push(`    if (!v) return;`)
    lines.push(`    var fired = {};`)
    lines.push(`    v.addEventListener('timeupdate', function() {`)
    cues.forEach((cue) => {
      const targetEls = resolveTargetElements(cue.targetId, elements)
      const dur = cue.duration || 1
      const ease = 'power1.out'
      const off = 400
      const tweens = targetEls.map((targetEl) => {
        const t = `document.getElementById('${targetEl.id}')`
        const op = targetEl.opacity ?? 1
        switch (cue.type) {
          case 'fadeIn':       return `gsap.fromTo(${t},{autoAlpha:0},{autoAlpha:${op},duration:${dur},ease:'${ease}'})`
          case 'fadeOut':      return `gsap.to(${t},{autoAlpha:0,duration:${dur},ease:'${ease}'})`
          case 'slideLeft':    return `gsap.fromTo(${t},{x:-${off}},{x:0,duration:${dur},ease:'${ease}'})`
          case 'slideRight':   return `gsap.fromTo(${t},{x:${off}},{x:0,duration:${dur},ease:'${ease}'})`
          case 'slideUp':      return `gsap.fromTo(${t},{y:-${off}},{y:0,duration:${dur},ease:'${ease}'})`
          case 'slideDown':    return `gsap.fromTo(${t},{y:${off}},{y:0,duration:${dur},ease:'${ease}'})`
          case 'slideToLeft':  return `gsap.to(${t},{x:-${off},duration:${dur},ease:'${ease}'})`
          case 'slideToRight': return `gsap.to(${t},{x:${off},duration:${dur},ease:'${ease}'})`
          case 'slideToUp':    return `gsap.to(${t},{y:-${off},duration:${dur},ease:'${ease}'})`
          case 'slideToDown':  return `gsap.to(${t},{y:${off},duration:${dur},ease:'${ease}'})`
          case 'scaleIn':      return `gsap.fromTo(${t},{scale:0},{scale:1,duration:${dur},ease:'${ease}'})`
          case 'scaleOut':     return `gsap.to(${t},{scale:0,duration:${dur},ease:'${ease}'})`
          default: return null
        }
      }).filter(Boolean)
      if (!tweens.length) return
      lines.push(`      var passed_${cue.id} = v.currentTime >= ${cue.time};`)
      lines.push(`      if (passed_${cue.id} && !fired['${cue.id}']) { fired['${cue.id}'] = true; ${tweens.join('; ')}; }`)
      lines.push(`      else if (!passed_${cue.id} && fired['${cue.id}']) { fired['${cue.id}'] = false; }`)
    })
    lines.push(`    });`)
    lines.push(`  })();`)
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

// One invisible-layer action → one line of JS run inside the same fire handler as the
// tracking pixel. "jumpToTime"/"restart"/"resume" drive the shared `tl` GSAP timeline
// (see the hoisted `var tl` + buildAnimationJS above); "toggleElement" resolves its
// target (a concrete element id or "group:<id>", same convention as
// buildHoverEffectJS) and flips it with gsap's autoAlpha, consistent with how
// show/hide already works everywhere else in the exported banner (fades, hover
// effects).
//
// "jumpToTime" just seeks — it does NOT stop the timeline, so normal playback keeps
// running from wherever the seek landed. The actual stopping points for the whole
// timeline are a separate, timeline-wide set of pins (Timeline.jsx, next to zoom; see
// ktStops/ktMarkStopsUpTo in buildAnimationJS) rather than a per-action pause;
// "resume" (tl.play()) is how an invisible layer's interaction continues playback
// after the timeline auto-paused at one.
function buildActionJS(action, elements) {
  switch (action.type) {
    case 'jumpToTime': {
      // ktMarkStopsUpTo runs *before* the seek so every stop point behind the jump
      // target is marked already-fired (won't falsely re-trigger once play resumes)
      // and every point ahead of it is marked not-yet-fired (still armed, so forward
      // playback will naturally pause there again) — see buildAnimationJS for why a
      // plain tl.seek() alone isn't safe here.
      //
      // tl.seek() also doesn't just move the playhead when the timeline is currently
      // paused — it resumes it too, so a jump fired while holding at a stop point
      // played straight through instead of landing on the new frame and staying
      // there. Capturing/reapplying the pre-jump paused state makes the seek truly
      // position-only: still playing stays playing, paused stays paused at the new
      // position.
      const t = Number(action.time) || 0
      return `if (tl) { ktMarkStopsUpTo(${t}); var _wasPaused = tl.paused(); tl.seek(${t}); if (_wasPaused) tl.pause(); }`
    }
    case 'restart':
      // Un-arms every stop point (marks all "not yet fired", since none of them are
      // <= 0) so the replay hits and pauses at each one again, same as the first run.
      return `if (tl) { ktMarkStopsUpTo(0); tl.seek(0); tl.play(); }`
    case 'resume':
      return `if (tl) tl.play();`
    case 'toggleElement': {
      const targets = resolveTargetElements(action.targetId, elements)
      if (!targets.length) return ''
      return targets.map((t) => {
        const ref = `document.getElementById('${t.id}')`
        if (action.visibility === 'hide') return `gsap.set(${ref}, {autoAlpha: 0});`
        if (action.visibility === 'toggle') return `gsap.set(${ref}, {autoAlpha: gsap.getProperty(${ref}, 'autoAlpha') > 0 ? 0 : 1});`
        return `gsap.set(${ref}, {autoAlpha: 1});`
      }).join(' ')
    }
    default:
      return ''
  }
}

function buildTrackingJS(elements) {
  const tracked = elements.filter((el) => el.visible && el.type === 'invisible' && (el.trackingName || (el.actions || []).length))
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
    const body = [
      el.trackingName ? `myFT.tracker('${el.trackingName}');` : '',
      ...(el.actions || []).map((a) => buildActionJS(a, elements)),
    ].filter(Boolean).join(' ')
    if (!body) return
    const fire = `function() { ${body} }`
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

// A target id is either a concrete element id, or "group:<id>" to mean "every element
// currently in that timeline group" (group membership = element.folderId) — resolved
// here into concrete elements so callers never need to know which form they got.
function resolveTargetElements(targetId, elements) {
  if (!targetId) return []
  if (targetId.startsWith('group:')) {
    const groupId = targetId.slice('group:'.length)
    return elements.filter((e) => e.folderId === groupId)
  }
  const el = elements.find((e) => e.id === targetId)
  return el ? [el] : []
}

// An invisible layer with Event Type "none" is a pure hover interaction, not a tracking
// pixel: on mouse in, its configured background color / text color / scale apply to
// whichever target elements (or group of elements) were picked; on mouse out, each
// reverts to its own known original value — the original background/text color and
// rotation come from the elements array (baked into the generated JS as literals)
// rather than read back from the DOM, so revert is exact regardless of which effects
// are enabled, and regardless of how many elements a group target expands to.
function buildHoverEffectJS(elements) {
  const hoverLayers = elements.filter((el) =>
    el.visible && el.type === 'invisible' && el.trackingType === 'none' &&
    ((el.hoverBgId && el.hoverBgColor) || (el.hoverTextId && el.hoverTextColor) || (el.hoverScaleId && el.hoverScaleFactor))
  )
  if (!hoverLayers.length) return ''

  const lines = [`  function ktHoverColor(id, prop, entering, hoverVal, origVal) {
    var node = document.getElementById(id);
    if (!node) return;
    node.style[prop] = entering ? hoverVal : origVal;
  }
  function ktHoverScale(id, entering, factor, rotation) {
    var node = document.getElementById(id);
    if (!node) return;
    node.style.transformOrigin = 'center center';
    node.style.transition = 'transform 0.15s ease';
    node.style.transform = 'rotate(' + rotation + 'deg) scale(' + (entering ? factor : 1) + ')';
  }`]
  hoverLayers.forEach((el) => {
    const target = `document.getElementById('${el.id}')`

    if (el.hoverBgId && el.hoverBgColor) {
      resolveTargetElements(el.hoverBgId, elements).forEach((bgEl) => {
        const origBg = bgEl.transparent ? 'transparent' : (bgEl.cssBackground || bgEl.fillColor || '#888')
        const args = `'${bgEl.id}', 'background', %ENTERING%, '${el.hoverBgColor}', '${origBg}'`
        lines.push(`  ${target}.addEventListener('mouseenter', function() { ktHoverColor(${args.replace('%ENTERING%', 'true')}); });`)
        lines.push(`  ${target}.addEventListener('mouseleave', function() { ktHoverColor(${args.replace('%ENTERING%', 'false')}); });`)
      })
    }
    if (el.hoverTextId && el.hoverTextColor) {
      resolveTargetElements(el.hoverTextId, elements).forEach((txtEl) => {
        const origText = txtEl.color || '#000'
        const args = `'${txtEl.id}', 'color', %ENTERING%, '${el.hoverTextColor}', '${origText}'`
        lines.push(`  ${target}.addEventListener('mouseenter', function() { ktHoverColor(${args.replace('%ENTERING%', 'true')}); });`)
        lines.push(`  ${target}.addEventListener('mouseleave', function() { ktHoverColor(${args.replace('%ENTERING%', 'false')}); });`)
      })
    }
    if (el.hoverScaleId && el.hoverScaleFactor) {
      resolveTargetElements(el.hoverScaleId, elements).forEach((scaleEl) => {
        const rotation = scaleEl.rotation || 0
        const args = `'${scaleEl.id}', %ENTERING%, ${el.hoverScaleFactor}, ${rotation}`
        lines.push(`  ${target}.addEventListener('mouseenter', function() { ktHoverScale(${args.replace('%ENTERING%', 'true')}); });`)
        lines.push(`  ${target}.addEventListener('mouseleave', function() { ktHoverScale(${args.replace('%ENTERING%', 'false')}); });`)
      })
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

export async function buildBannerZipBlob({ elements, groups, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate, animStopPoints }) {
  return _buildZip({ elements, groups, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate, animStopPoints })
}

export async function exportBannerZip({ elements, groups, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate, animStopPoints }) {
  const blob = await _buildZip({ elements, groups, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate, animStopPoints })
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
async function _buildHTML({ elements, groups, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate, customHtml, customJs, customCss, imageFiles, inlineTemplateCss, animStopPoints }) {
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)
  const elementsHTML = buildElementsHTML(sorted, groups)
  const animJS = buildAnimationJS(sorted, animStopPoints)
  const clickTagJS = buildClickTagJS(sorted)
  const trackingJS = buildTrackingJS(sorted)
  const hoverEffectJS = buildHoverEffectJS(sorted)
  const videoCueJS = buildVideoCueJS(sorted)

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
  ${isAdvanced ? customJs : `${politeLoadFn}var tl;
  var ktStops = [];
  var ktStopFired = {};
  function ktMarkStopsUpTo(t) { ktStops.forEach(function(sp) { ktStopFired[sp] = sp <= t; }); }
  function init() {
    addEvent();
  }

  function addEvent() {
${clickTagJS}
${trackingJS}
${hoverEffectJS}
${videoCueJS}
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

async function _buildZip({ elements, groups, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate, animStopPoints }) {
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
    elements, groups, canvasWidth, canvasHeight, bannerName, politeLoad, activeTemplate,
    customHtml, customJs, customCss, imageFiles, inlineTemplateCss: false, animStopPoints,
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
export async function buildPreviewHtml({ elements, groups, canvasWidth, canvasHeight, bannerName, activeTemplate, animStopPoints }) {
  const { customHtml, customJs, customCss } = substituteTemplateTokens(activeTemplate)
  const { html } = await _buildHTML({
    elements, groups, canvasWidth, canvasHeight, bannerName: bannerName || 'preview', politeLoad: false,
    activeTemplate, customHtml, customJs, customCss, imageFiles: [], inlineTemplateCss: true, animStopPoints,
  })
  return html
}

export function saveBannerJSON({ elements, groups, canvasWidth, canvasHeight, bannerName, animDuration, animLoop, animStopPoints, activeTemplate }) {
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
  const data = JSON.stringify({ version: 1, bannerName, canvasWidth, canvasHeight, animDuration, animLoop, animStopPoints, elements, groups, template }, null, 2)
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
