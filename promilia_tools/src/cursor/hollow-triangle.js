/**
 * 空心 / 实心交错三角形鼠标指针
 * 参考 hollow-square.js 拖尾思路，改成三角并加入静止渐隐、多键点击反馈
 *
 * API: enable(opts) / disable() / toggle() / setColor(c) / isEnabled() / destroy()
 */
const ID = 'mouse-cursor-hollow-triangle'

let enabled = false
let canvas = null
let ctx = null
let raf = 0
let mx = -9999
let my = -9999
let tx = -9999
let ty = -9999
let trails = []
let spin = 0
let clickPulse = 0
let ripples = []
let globalAlpha = 1
let idleTimer = 0
let lastMove = 0
let visible = true
let opts = {
  color: '#649cf0',
  lag: 0.2,
  idleMs: 2200,
  fadeMs: 500,
  maxTrails: 14,
}

function ensureCanvas() {
  if (canvas) return
  canvas = document.createElement('canvas')
  canvas.id = ID
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '2147483646',
  })
  document.body.appendChild(canvas)
  ctx = canvas.getContext('2d', { alpha: true })
  resize()
}

function resize() {
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = innerWidth * dpr
  canvas.height = innerHeight * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function drawTriangle(x, y, size, rot, alpha, filled) {
  const r = size / 2
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.globalAlpha = alpha * globalAlpha
  ctx.beginPath()
  ctx.moveTo(0, -r)
  ctx.lineTo(r * 0.9, r * 0.75)
  ctx.lineTo(-r * 0.9, r * 0.75)
  ctx.closePath()
  if (filled) {
    ctx.fillStyle = opts.color
    ctx.shadowColor = opts.color
    ctx.shadowBlur = 10
    ctx.fill()
  } else {
    ctx.strokeStyle = opts.color
    ctx.lineWidth = 1.6
    ctx.shadowColor = opts.color
    ctx.shadowBlur = 8
    ctx.stroke()
  }
  ctx.restore()
}

function loop(now) {
  if (!enabled) return

  // 静止渐隐
  const idle = now - lastMove
  if (idle > opts.idleMs) {
    const t = Math.min(1, (idle - opts.idleMs) / opts.fadeMs)
    globalAlpha = 1 - t
    visible = globalAlpha > 0.02
  } else if (globalAlpha < 1) {
    globalAlpha = Math.min(1, globalAlpha + 0.08)
    visible = true
  }

  spin += 0.028
  clickPulse *= 0.88
  tx += (mx - tx) * opts.lag
  ty += (my - ty) * opts.lag

  ctx.clearRect(0, 0, innerWidth, innerHeight)

  if (visible || ripples.length) {
    for (let i = trails.length - 1; i >= 0; i--) {
      const t = trails[i]
      t.life -= 0.03
      t.size += 0.9
      t.rot += 0.05
      if (t.life <= 0) {
        trails.splice(i, 1)
        continue
      }
      drawTriangle(t.x, t.y, t.size, t.rot, t.life * 0.65, t.filled)
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]
      r.life -= 0.04
      r.size += 2.4
      if (r.life <= 0) {
        ripples.splice(i, 1)
        continue
      }
      ctx.save()
      ctx.globalAlpha = r.life * 0.55 * Math.max(globalAlpha, 0.35)
      ctx.strokeStyle = opts.color
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(r.x, r.y, r.size, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    const base = 14 + clickPulse * 12
    // 外层空心 + 中层实心 + 内层空心，形成空实交错
    drawTriangle(tx, ty, base + 20, spin, 0.35, false)
    drawTriangle(tx, ty, base + 10, -spin * 1.15, 0.55, false)
    drawTriangle(mx, my, base, spin * 0.7, 1, false)

    // 顶点星点
    const hs = base * 0.55
    ctx.fillStyle = opts.color
    for (let i = 0; i < 3; i++) {
      const a = spin + (i * Math.PI * 2) / 3
      ctx.globalAlpha = 0.9 * globalAlpha
      ctx.beginPath()
      ctx.arc(mx + Math.cos(a) * (hs + 5), my + Math.sin(a) * (hs + 5), 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  raf = requestAnimationFrame(loop)
}

function onMove(e) {
  lastMove = performance.now()
  if (Math.hypot(e.clientX - mx, e.clientY - my) > 5) {
    trails.push({
      x: mx,
      y: my,
      size: 9,
      rot: spin,
      life: 1,
      filled: false,
    })
    if (trails.length > opts.maxTrails) trails.shift()
  }
  mx = e.clientX
  my = e.clientY
}

function onPointerDown(e) {
  lastMove = performance.now()
  globalAlpha = 1
  clickPulse = 1
  const kind = e.button // 0 左 1 中 2 右 3/4 侧键
  const count = kind === 0 ? 5 : kind === 2 ? 4 : 3
  for (let i = 0; i < count; i++) {
    trails.push({
      x: mx,
      y: my,
      size: 7 + i * 3,
      rot: spin + i * 0.4,
      life: 1,
      filled: false,
    })
  }
  ripples.push({ x: mx, y: my, size: 6, life: 1 })
  if (kind === 1 || kind >= 3) {
    ripples.push({ x: mx, y: my, size: 2, life: 1 })
  }
}

function hideCursor(on) {
  document.documentElement.classList.toggle('mc-hide-cursor', on)
}

function readCssColor() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--cursor-color').trim()
  return v || opts.color
}

const api = {
  enable(options = {}) {
    opts = { ...opts, ...options }
    if (!opts.color || options.followTheme !== false) {
      opts.color = options.color || readCssColor()
    }
    if (enabled) return api
    enabled = true
    lastMove = performance.now()
    globalAlpha = 1
    ensureCanvas()
    hideCursor(true)
    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    raf = requestAnimationFrame(loop)
    return api
  },
  disable() {
    if (!enabled) return api
    enabled = false
    cancelAnimationFrame(raf)
    clearTimeout(idleTimer)
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('pointerdown', onPointerDown)
    trails = []
    ripples = []
    if (canvas) {
      canvas.remove()
      canvas = null
      ctx = null
    }
    hideCursor(false)
    return api
  },
  toggle(o) {
    return enabled ? api.disable() : api.enable(o)
  },
  setColor(color) {
    opts.color = color
    document.documentElement.style.setProperty('--cursor-color', color)
    return api
  },
  syncThemeColor() {
    opts.color = readCssColor()
    return api
  },
  isEnabled() {
    return enabled
  },
  destroy() {
    return api.disable()
  },
}

export default api
