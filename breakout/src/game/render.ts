import { POWER_META } from '../data/levels'
import { CANVAS_H, CANVAS_W, GameEngine } from './engine'

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

export function renderGame(ctx: CanvasRenderingContext2D, engine: GameEngine, now: number) {
  const { level } = engine
  const shakeX = engine.shake ? (Math.random() - 0.5) * engine.shake : 0
  const shakeY = engine.shake ? (Math.random() - 0.5) * engine.shake : 0

  ctx.save()
  ctx.translate(shakeX, shakeY)

  // backdrop
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  g.addColorStop(0, level.theme.sky[0])
  g.addColorStop(1, level.theme.sky[1])
  ctx.fillStyle = g
  ctx.fillRect(-20, -20, CANVAS_W + 40, CANVAS_H + 40)

  // soft aurora ribbons
  for (let i = 0; i < 3; i++) {
    const yg = ctx.createLinearGradient(0, 80 + i * 90, CANVAS_W, 160 + i * 110)
    yg.addColorStop(0, 'transparent')
    yg.addColorStop(0.35, `rgba(45, 212, 191, ${0.04 + i * 0.015})`)
    yg.addColorStop(0.65, `rgba(251, 191, 36, ${0.03 + i * 0.01})`)
    yg.addColorStop(1, 'transparent')
    ctx.fillStyle = yg
    ctx.fillRect(0, 40 + i * 70, CANVAS_W, 100)
  }

  // vignette grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'
  ctx.lineWidth = 1
  for (let x = 40; x < CANVAS_W; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, CANVAS_H)
    ctx.stroke()
  }

  // bricks
  for (const b of engine.bricks) {
    if (!b.alive) continue
    const pulse =
      b.kind === 'crystal'
        ? 0.15 + Math.sin(b.phase) * 0.1
        : b.kind === 'portal'
          ? 0.12 + Math.sin(b.phase) * 0.08
          : 0

    ctx.save()
    if (b.kind === 'ghost') {
      ctx.globalAlpha = 0.35 + Math.sin(b.phase) * 0.2
    }

    roundRect(ctx, b.x, b.y, b.w, b.h, 5)
    const bg = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h)
    bg.addColorStop(0, b.color)
    bg.addColorStop(1, 'rgba(0,0,0,0.25)')
    ctx.fillStyle = bg
    ctx.fill()

    if (b.kind === 'armored') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.font = '700 11px Outfit, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(b.hp), b.x + b.w / 2, b.y + b.h / 2 + 0.5)
    }

    if (b.kind === 'explosive') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.beginPath()
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 3.5, 0, Math.PI * 2)
      ctx.fill()
    }

    if (b.kind === 'crystal' || b.kind === 'portal') {
      ctx.shadowColor = b.color
      ctx.shadowBlur = 12 + pulse * 40
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + pulse})`
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    if (b.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${b.flash * 0.55})`
      roundRect(ctx, b.x, b.y, b.w, b.h, 5)
      ctx.fill()
    }
    ctx.restore()
  }

  // shield
  if (engine.shield > 0) {
    const a = Math.min(1, engine.shield / 3) * 0.55
    ctx.strokeStyle = `rgba(253, 230, 138, ${a})`
    ctx.lineWidth = 3
    ctx.shadowColor = '#FDE68A'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.moveTo(24, CANVAS_H - 16)
    ctx.lineTo(CANVAS_W - 24, CANVAS_H - 16)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // powers
  for (const p of engine.powers) {
    const meta = POWER_META[p.kind]
    const bob = Math.sin((now + p.born) / 180) * 2
    ctx.save()
    ctx.translate(p.x, p.y + bob)
    ctx.shadowColor = meta.color
    ctx.shadowBlur = 14
    ctx.fillStyle = meta.color
    ctx.beginPath()
    ctx.arc(0, 0, p.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#0B1C1F'
    ctx.font = '800 9px Outfit, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(meta.label.slice(0, 1), 0, 0.5)
    ctx.restore()
  }

  // lasers
  for (const laser of engine.lasers) {
    const lg = ctx.createLinearGradient(laser.x, laser.y, laser.x, laser.y - 40)
    lg.addColorStop(0, 'rgba(251,113,133,0.9)')
    lg.addColorStop(1, 'rgba(251,113,133,0)')
    ctx.strokeStyle = lg
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(laser.x, laser.y)
    ctx.lineTo(laser.x, laser.y - 36)
    ctx.stroke()
  }

  // paddle
  const pad = engine.paddle
  roundRect(ctx, pad.x, pad.y, pad.w, pad.h, 8)
  const pg = ctx.createLinearGradient(pad.x, pad.y, pad.x, pad.y + pad.h)
  pg.addColorStop(0, '#F8FAFC')
  pg.addColorStop(1, '#CBD5E1')
  ctx.fillStyle = pg
  ctx.fill()
  if (pad.laser) {
    ctx.shadowColor = '#FB7185'
    ctx.shadowBlur = 10
    ctx.fillStyle = '#FB7185'
    ctx.fillRect(pad.x + 6, pad.y + 3, 4, pad.h - 6)
    ctx.fillRect(pad.x + pad.w - 10, pad.y + 3, 4, pad.h - 6)
    ctx.shadowBlur = 0
  }
  if (pad.sticky) {
    ctx.strokeStyle = '#A3E635'
    ctx.lineWidth = 2
    roundRect(ctx, pad.x, pad.y, pad.w, pad.h, 8)
    ctx.stroke()
  }

  // balls
  for (const ball of engine.balls) {
    for (let i = 0; i < ball.trail.length; i++) {
      const tr = ball.trail[i]!
      const a = (i + 1) / ball.trail.length
      ctx.fillStyle = `rgba(253, 230, 138, ${a * 0.35})`
      ctx.beginPath()
      ctx.arc(tr.x, tr.y, ball.r * a, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.save()
    ctx.shadowColor = '#FDE68A'
    ctx.shadowBlur = 16
    const bg = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.r)
    bg.addColorStop(0, '#FFFBEB')
    bg.addColorStop(1, '#FBBF24')
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // particles
  for (const p of engine.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // launch hint
  if (!engine.launched && !engine.over) {
    ctx.fillStyle = 'rgba(248,250,252,0.72)'
    ctx.font = '600 15px Outfit, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('点击或按空格发射光球', CANVAS_W / 2, CANVAS_H - 72)
  }

  ctx.restore()
}
