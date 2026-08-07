import { COLORS, TILE, VIEW_H, VIEW_W } from '../config'
import type { Player } from '../entities/Player'
import type { ParsedLevel, PortalRuntime, SpikeDef } from '../levels/types'

export interface DrawWorld {
  level: ParsedLevel
  player: Player
  ally?: { x: number; y: number; facing: number; anim: string; frame: number; skin: number; w: number; h: number; dead?: boolean }
  collected: Set<number>
  enemiesAlive: boolean[]
  staffActive: boolean[]
  spikeDisabledUntil: number
  saveFlash: number
  time: number
  particles: Particle[]
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
  size: number
}

export class Renderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private bgCache: HTMLCanvasElement | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2d context unavailable')
    this.ctx = ctx
    canvas.width = VIEW_W
    canvas.height = VIEW_H
    ctx.imageSmoothingEnabled = false
  }

  resize(cssW: number, cssH: number) {
    this.canvas.style.width = `${cssW}px`
    this.canvas.style.height = `${cssH}px`
  }

  clear() {
    this.ctx.clearRect(0, 0, VIEW_W, VIEW_H)
  }

  draw(world: DrawWorld) {
    const { ctx } = this
    this.drawBackground(world.time)
    this.drawSolids(world.level)
    this.drawPipes(world.level)
    this.drawSpikes(world.level.spikes, world.time, world.spikeDisabledUntil)
    this.drawPortals(world.level.portals, world.time)
    this.drawSaves(world.level, world.saveFlash, world.time)
    this.drawCollects(world.level, world.collected, world.time)
    this.drawStaffs(world.level, world.staffActive, world.time)
    this.drawEnemies(world.level, world.enemiesAlive, world.time)
    this.drawGoal(world.level, world.time)
    if (world.ally && !world.ally.dead) this.drawChibi(world.ally, world.time)
    this.drawPlayer(world.player, world.time)
    this.drawBullets(world.player)
    this.drawParticles(world.particles)
  }

  private drawBackground(time: number) {
    const { ctx } = this
    if (!this.bgCache) {
      this.bgCache = document.createElement('canvas')
      this.bgCache.width = VIEW_W
      this.bgCache.height = VIEW_H
      const b = this.bgCache.getContext('2d')!
      b.fillStyle = COLORS.bg
      b.fillRect(0, 0, VIEW_W, VIEW_H)
      const step = 48
      b.strokeStyle = COLORS.bgDiamond
      b.lineWidth = 1
      for (let y = -step; y < VIEW_H + step; y += step) {
        for (let x = -step; x < VIEW_W + step; x += step) {
          const ox = (Math.floor(y / step) % 2) * (step / 2)
          b.beginPath()
          b.moveTo(x + ox + step / 2, y)
          b.lineTo(x + ox + step, y + step / 2)
          b.lineTo(x + ox + step / 2, y + step)
          b.lineTo(x + ox, y + step / 2)
          b.closePath()
          b.stroke()
          // faint sigil
          b.fillStyle = COLORS.bgSigil
          b.globalAlpha = 0.25
          b.beginPath()
          b.arc(x + ox + step / 2, y + step / 2, 5, 0, Math.PI * 2)
          b.fill()
          b.globalAlpha = 1
        }
      }
    }
    ctx.drawImage(this.bgCache, 0, 0)
    // subtle shimmer
    ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.sin(time * 0.02) * 0.01})`
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  }

  private drawSolids(level: ParsedLevel) {
    const { ctx } = this
    for (let y = 0; y < level.rows; y++) {
      for (let x = 0; x < level.cols; x++) {
        if (!level.solids[y][x]) continue
        this.drawMetalTile(x * TILE, y * TILE)
      }
    }
  }

  private drawMetalTile(px: number, py: number) {
    const { ctx } = this
    const t = TILE
    // base
    ctx.fillStyle = COLORS.metal
    ctx.fillRect(px, py, t, t)
    // bevel
    ctx.fillStyle = COLORS.metalLight
    ctx.fillRect(px, py, t, 3)
    ctx.fillRect(px, py, 3, t)
    ctx.fillStyle = COLORS.metalDark
    ctx.fillRect(px, py + t - 3, t, 3)
    ctx.fillRect(px + t - 3, py, 3, t)
    // inner plate
    ctx.fillStyle = COLORS.metalLight
    ctx.globalAlpha = 0.35
    ctx.fillRect(px + 5, py + 5, t - 10, t - 10)
    ctx.globalAlpha = 1
    // rivets
    ctx.fillStyle = COLORS.rivet
    const r = 2
    const offs = [
      [5, 5],
      [t - 5, 5],
      [5, t - 5],
      [t - 5, t - 5],
    ]
    for (const [ox, oy] of offs) {
      ctx.beginPath()
      ctx.arc(px + ox, py + oy, r, 0, Math.PI * 2)
      ctx.fill()
    }
    // edge line
    ctx.strokeStyle = COLORS.metalEdge
    ctx.lineWidth = 1
    ctx.strokeRect(px + 0.5, py + 0.5, t - 1, t - 1)
  }

  private drawSpikes(spikes: SpikeDef[], time: number, disabledUntil: number) {
    const disabled = time < disabledUntil
    for (const s of spikes) {
      if (disabled) {
        this.ctx.globalAlpha = 0.25
      }
      this.drawSpike(s.x * TILE, s.y * TILE, s.dir)
      this.ctx.globalAlpha = 1
    }
  }

  private drawSpike(px: number, py: number, dir: SpikeDef['dir']) {
    const { ctx } = this
    const t = TILE
    ctx.save()
    let points: [number, number][]
    switch (dir) {
      case 'up':
        points = [
          [px, py + t],
          [px + t / 2, py + 2],
          [px + t, py + t],
        ]
        break
      case 'down':
        points = [
          [px, py],
          [px + t / 2, py + t - 2],
          [px + t, py],
        ]
        break
      case 'left':
        points = [
          [px + t, py],
          [px + 2, py + t / 2],
          [px + t, py + t],
        ]
        break
      case 'right':
        points = [
          [px, py],
          [px + t - 2, py + t / 2],
          [px, py + t],
        ]
        break
    }
    // shadow side
    const g = ctx.createLinearGradient(px, py, px + t, py + t)
    g.addColorStop(0, COLORS.spike)
    g.addColorStop(0.45, '#f5f8fc')
    g.addColorStop(1, COLORS.spikeShadow)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(points[0][0], points[0][1])
    ctx.lineTo(points[1][0], points[1][1])
    ctx.lineTo(points[2][0], points[2][1])
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = COLORS.spikeEdge
    ctx.lineWidth = 1
    ctx.stroke()
    // highlight edge
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.beginPath()
    ctx.moveTo(points[0][0], points[0][1])
    ctx.lineTo(points[1][0], points[1][1])
    ctx.stroke()
    ctx.restore()
  }

  private drawPortals(portals: PortalRuntime[], time: number) {
    const { ctx } = this
    for (const p of portals) {
      const cx = p.x * TILE + TILE / 2
      const cy = p.y * TILE + TILE / 2
      const pulse = 1 + Math.sin(time * 0.12 + p.x) * 0.06
      const r = (TILE * 0.42) * pulse

      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r + 10)
      grad.addColorStop(0, COLORS.portalCore)
      grad.addColorStop(0.35, COLORS.portalCore)
      grad.addColorStop(0.55, COLORS.portalGlowInner)
      grad.addColorStop(0.85, COLORS.portalGlowOuter)
      grad.addColorStop(1, 'rgba(255,100,30,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, r + 10, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = COLORS.portalCore
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2)
      ctx.fill()

      // swirl rings
      ctx.strokeStyle = `rgba(255,180,40,${0.35 + Math.sin(time * 0.2) * 0.15})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.9, time * 0.08, time * 0.08 + Math.PI * 1.4)
      ctx.stroke()
    }
  }

  private drawSaves(level: ParsedLevel, flash: number, time: number) {
    const { ctx } = this
    for (const s of level.saves) {
      const cx = s.x * TILE + TILE / 2
      const cy = s.y * TILE + TILE / 2
      const glow = flash > 0 ? 0.8 : 0.35 + Math.sin(time * 0.1) * 0.1
      ctx.fillStyle = `rgba(94,207,122,${glow})`
      ctx.beginPath()
      ctx.arc(cx, cy, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = COLORS.save
      ctx.fillRect(cx - 5, cy - 7, 10, 14)
      ctx.fillStyle = '#fff'
      ctx.fillRect(cx - 2, cy - 3, 4, 4)
      // floppy-ish detail
      ctx.fillStyle = COLORS.saveGlow
      ctx.fillRect(cx - 5, cy + 4, 10, 3)
    }
  }

  private drawCollects(level: ParsedLevel, collected: Set<number>, time: number) {
    const { ctx } = this
    level.collects.forEach((c, i) => {
      if (collected.has(i)) return
      const cx = c.x * TILE + TILE / 2
      const cy = c.y * TILE + TILE / 2 + Math.sin(time * 0.1 + i) * 3
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(time * 0.05)
      ctx.fillStyle = COLORS.collect
      ctx.beginPath()
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2
        const x = Math.cos(a) * 8
        const y = Math.sin(a) * 8
        if (k === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#fff6c8'
      ctx.fillRect(-2, -2, 4, 4)
      ctx.restore()
    })
  }

  private drawStaffs(level: ParsedLevel, active: boolean[], time: number) {
    const { ctx } = this
    level.staffs.forEach((s, i) => {
      const x = s.x * TILE + TILE / 2
      const y = s.y * TILE + TILE
      const on = active[i]
      // shaft
      ctx.strokeStyle = on ? '#6ec8ff' : '#7a8aaa'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(x, y - 4)
      ctx.lineTo(x, y - 36)
      ctx.stroke()
      // winged top
      ctx.fillStyle = on ? '#c8ecff' : '#d0d8e8'
      ctx.beginPath()
      ctx.moveTo(x, y - 40)
      ctx.lineTo(x - 10, y - 28)
      ctx.lineTo(x - 2, y - 30)
      ctx.lineTo(x, y - 22)
      ctx.lineTo(x + 2, y - 30)
      ctx.lineTo(x + 10, y - 28)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = on ? '#4aa0ff' : '#8890a0'
      ctx.beginPath()
      ctx.arc(x, y - 38, 4, 0, Math.PI * 2)
      ctx.fill()
      if (on) {
        ctx.strokeStyle = `rgba(100,180,255,${0.4 + Math.sin(time * 0.2) * 0.2})`
        ctx.beginPath()
        ctx.arc(x, y - 30, 14 + Math.sin(time * 0.15) * 2, 0, Math.PI * 2)
        ctx.stroke()
      }
    })
  }

  private drawEnemies(level: ParsedLevel, alive: boolean[], time: number) {
    const { ctx } = this
    level.enemies.forEach((e, i) => {
      if (!alive[i]) return
      const x = e.x * TILE + 6
      const y = e.y * TILE + 8
      const bob = Math.sin(time * 0.12 + i) * 1.5
      // body
      ctx.fillStyle = '#5a4060'
      ctx.fillRect(x, y + bob, 20, 18)
      ctx.fillStyle = '#c05070'
      ctx.fillRect(x + 2, y + 4 + bob, 16, 10)
      // eyes
      ctx.fillStyle = '#fff'
      ctx.fillRect(x + 4, y + 6 + bob, 4, 4)
      ctx.fillRect(x + 12, y + 6 + bob, 4, 4)
      ctx.fillStyle = '#201018'
      ctx.fillRect(x + 5, y + 7 + bob, 2, 2)
      ctx.fillRect(x + 13, y + 7 + bob, 2, 2)
      // spikes on head
      ctx.fillStyle = '#e8eef5'
      ctx.beginPath()
      ctx.moveTo(x + 4, y + bob)
      ctx.lineTo(x + 7, y - 6 + bob)
      ctx.lineTo(x + 10, y + bob)
      ctx.fill()
    })
  }

  private drawGoal(level: ParsedLevel, time: number) {
    if (!level.goal) return
    const { ctx } = this
    const x = level.goal.x * TILE
    const y = level.goal.y * TILE
    const pulse = 0.5 + Math.sin(time * 0.1) * 0.2
    ctx.fillStyle = `rgba(110,200,255,${pulse})`
    ctx.fillRect(x + 4, y + 2, TILE - 8, TILE - 4)
    ctx.strokeStyle = COLORS.goal
    ctx.lineWidth = 2
    ctx.strokeRect(x + 6, y + 4, TILE - 12, TILE - 8)
    ctx.fillStyle = '#fff'
    ctx.font = '10px "Press Start 2P", monospace'
    ctx.fillText('G', x + 11, y + 20)
  }

  private drawPipes(level: ParsedLevel) {
    const { ctx } = this
    for (const p of level.pipes) {
      const x = p.x * TILE
      const y = p.y * TILE
      ctx.fillStyle = '#3a9a4a'
      ctx.fillRect(x + 4, y - 8, TILE - 8, TILE + 8)
      ctx.fillStyle = '#4cbf5c'
      ctx.fillRect(x, y - 12, TILE, 10)
      ctx.fillStyle = '#2d7a38'
      ctx.fillRect(x + 4, y - 8, 4, TILE + 8)
    }
  }

  private drawPlayer(p: Player, time: number) {
    this.drawChibi({
      x: p.x,
      y: p.y,
      facing: p.facing,
      anim: p.anim,
      frame: p.frame,
      skin: p.skin,
      w: p.w,
      h: p.h,
      dead: p.dead,
    }, time)
  }

  /** Q-version anime pixel chibi */
  drawChibi(
    p: {
      x: number
      y: number
      facing: number
      anim: string
      frame: number
      skin: number
      w: number
      h: number
      dead?: boolean
    },
    _time: number,
  ) {
    const { ctx } = this
    ctx.save()
    const cx = p.x + p.w / 2
    const cy = p.y + p.h / 2
    ctx.translate(cx, cy)
    if (p.facing < 0) ctx.scale(-1, 1)
    if (p.dead) {
      ctx.rotate(Math.PI / 2)
      ctx.globalAlpha = 0.85
    }

    const hair = p.skin === 0 ? '#f0d060' : '#f080b0'
    const hairDark = p.skin === 0 ? '#d0a030' : '#d05088'
    const outfit = p.skin === 0 ? '#4a90d9' : '#e870a0'
    const outfitLight = p.skin === 0 ? '#c8e0f8' : '#ffd0e0'

    const bob =
      p.anim === 'run' ? Math.sin(p.frame * 1.5) * 1 : p.anim === 'jump' ? -1 : p.anim === 'fall' ? 1 : 0
    const legSpread = p.anim === 'run' ? (p.frame % 2 === 0 ? 3 : -3) : 0

    // shadow
    if (!p.dead) {
      ctx.fillStyle = 'rgba(40,50,60,0.2)'
      ctx.beginPath()
      ctx.ellipse(0, p.h / 2 - 1, 7, 2, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // legs
    ctx.fillStyle = '#3a4555'
    ctx.fillRect(-4, 6 + bob, 3, 6 + (legSpread > 0 ? 1 : 0))
    ctx.fillRect(1, 6 + bob, 3, 6 + (legSpread < 0 ? 1 : 0))
    // shoes
    ctx.fillStyle = '#2a3038'
    ctx.fillRect(-5, 11 + bob, 4, 2)
    ctx.fillRect(1, 11 + bob, 4, 2)

    // body
    ctx.fillStyle = outfit
    ctx.fillRect(-5, -1 + bob, 10, 9)
    ctx.fillStyle = outfitLight
    ctx.fillRect(-4, 0 + bob, 8, 3)

    // head
    ctx.fillStyle = '#ffe0c8'
    ctx.beginPath()
    ctx.arc(0, -8 + bob, 7, 0, Math.PI * 2)
    ctx.fill()

    // hair
    ctx.fillStyle = hair
    ctx.beginPath()
    ctx.arc(0, -10 + bob, 7.5, Math.PI, 0)
    ctx.fill()
    ctx.fillRect(-8, -10 + bob, 16, 4)
    // bangs
    ctx.fillStyle = hairDark
    ctx.fillRect(-6, -9 + bob, 3, 4)
    ctx.fillRect(-1, -10 + bob, 3, 5)
    ctx.fillRect(3, -9 + bob, 3, 4)

    // tiny hat (skin 0)
    if (p.skin === 0) {
      ctx.fillStyle = '#3a4555'
      ctx.fillRect(-5, -16 + bob, 10, 3)
      ctx.fillStyle = outfit
      ctx.fillRect(-3, -19 + bob, 6, 4)
    } else {
      // pink ear tufts
      ctx.fillStyle = hair
      ctx.beginPath()
      ctx.moveTo(-7, -12 + bob)
      ctx.lineTo(-10, -18 + bob)
      ctx.lineTo(-3, -14 + bob)
      ctx.fill()
    }

    // eyes
    if (p.dead) {
      ctx.strokeStyle = '#402028'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(-4, -9 + bob)
      ctx.lineTo(-1, -6 + bob)
      ctx.moveTo(-1, -9 + bob)
      ctx.lineTo(-4, -6 + bob)
      ctx.moveTo(1, -9 + bob)
      ctx.lineTo(4, -6 + bob)
      ctx.moveTo(4, -9 + bob)
      ctx.lineTo(1, -6 + bob)
      ctx.stroke()
    } else {
      ctx.fillStyle = '#2a2030'
      const eyeY = p.anim === 'jump' ? -10 : -8
      ctx.fillRect(-4, eyeY + bob, 2, 3)
      ctx.fillRect(2, eyeY + bob, 2, 3)
      ctx.fillStyle = '#fff'
      ctx.fillRect(-4, eyeY + bob, 1, 1)
      ctx.fillRect(2, eyeY + bob, 1, 1)
    }

    // blush
    if (!p.dead) {
      ctx.fillStyle = 'rgba(255,120,140,0.35)'
      ctx.fillRect(-6, -5 + bob, 2, 1)
      ctx.fillRect(4, -5 + bob, 2, 1)
    }

    // arm pose
    ctx.fillStyle = '#ffe0c8'
    if (p.anim === 'jump' || p.anim === 'fall') {
      ctx.fillRect(-8, -2 + bob, 3, 5)
      ctx.fillRect(5, -2 + bob, 3, 5)
    } else if (p.anim === 'run') {
      ctx.fillRect(-7, 1 + bob + legSpread * 0.3, 3, 5)
      ctx.fillRect(4, 1 + bob - legSpread * 0.3, 3, 5)
    } else {
      ctx.fillRect(-7, 2 + bob, 3, 5)
      ctx.fillRect(4, 2 + bob, 3, 5)
    }

    // warp flash
    if (p.anim === 'warp') {
      ctx.strokeStyle = `rgba(255,160,40,0.7)`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, 14 + (p.frame % 4) * 2, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.restore()
  }

  private drawBullets(p: Player) {
    const { ctx } = this
    for (const b of p.bullets) {
      ctx.fillStyle = '#ffe080'
      ctx.fillRect(b.x, b.y, b.w, b.h)
      ctx.fillStyle = '#fff'
      ctx.fillRect(b.x + 1, b.y + 1, 2, 2)
    }
  }

  private drawParticles(particles: Particle[]) {
    const { ctx } = this
    for (const pt of particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max)
      ctx.fillStyle = pt.color
      ctx.fillRect(pt.x, pt.y, pt.size, pt.size)
    }
    ctx.globalAlpha = 1
  }
}
