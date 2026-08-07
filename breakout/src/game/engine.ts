import { DIFFICULTIES } from '../data/difficulties'
import { LEVELS, POWER_META, brickHp, brickScore } from '../data/levels'
import { sfx } from '../audio/sfx'
import type {
  Ball,
  Brick,
  BrickKind,
  DifficultyId,
  GameSnapshot,
  LaserBolt,
  LevelDef,
  Paddle,
  Particle,
  PowerUp,
  PowerUpKind,
} from '../types/game'

export const CANVAS_W = 900
export const CANVAS_H = 640

const POWER_KINDS = Object.keys(POWER_META) as PowerUpKind[]
const BRICK_GAP = 6
const TOP_PAD = 72

let nextId = 1
const uid = () => nextId++

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a)
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function colorFor(kind: BrickKind, palette: string[], col: number, row: number) {
  if (kind === 'crystal') return '#FDE68A'
  if (kind === 'explosive') return '#FB7185'
  if (kind === 'ghost') return 'rgba(165,243,252,0.55)'
  if (kind === 'portal') return '#22D3EE'
  if (kind === 'armored') return '#94A3B8'
  return palette[(col + row) % palette.length]!
}

export class GameEngine {
  level: LevelDef
  difficultyId: DifficultyId
  bricks: Brick[] = []
  balls: Ball[] = []
  paddle: Paddle
  powers: PowerUp[] = []
  particles: Particle[] = []
  lasers: LaserBolt[] = []
  portalPairs: Brick[] = []

  score = 0
  lives = 3
  combo = 0
  maxCombo = 0
  shield = 0
  shake = 0
  timeScale = 1
  warpTimer = 0
  running = false
  launched = false
  over: 'won' | 'lost' | null = null
  pointerX = CANVAS_W / 2
  keys = { left: false, right: false }
  activePowers = new Set<PowerUpKind>()
  powerTimers = new Map<PowerUpKind, number>()

  private baseSpeed = 5.4
  private scoreMult = 1
  private powerChance = 0.26
  private onChange?: (s: GameSnapshot) => void
  private notifyCooldown = 0

  constructor(levelId: number, difficultyId: DifficultyId) {
    this.level = LEVELS.find((l) => l.id === levelId) ?? LEVELS[0]!
    this.difficultyId = difficultyId
    const d = DIFFICULTIES[difficultyId]
    this.lives = d.lives
    this.baseSpeed = d.ballSpeed
    this.scoreMult = d.scoreMult
    this.powerChance = d.powerChance
    this.paddle = {
      x: CANVAS_W / 2 - d.paddleWidth / 2,
      y: CANVAS_H - 42,
      w: d.paddleWidth,
      h: 14,
      targetW: d.paddleWidth,
      sticky: false,
      laser: false,
      magnet: false,
      laserCooldown: 0,
    }
    this.buildBricks()
    this.spawnBall(true)
  }

  setListener(fn: (s: GameSnapshot) => void) {
    this.onChange = fn
    this.emit()
  }

  snapshot(): GameSnapshot {
    return {
      score: this.score,
      lives: this.lives,
      combo: this.combo,
      maxCombo: this.maxCombo,
      bricksLeft: this.bricks.filter((b) => b.alive && b.kind !== 'portal').length,
      levelId: this.level.id,
      levelName: this.level.name,
      activePowers: [...this.activePowers],
      shield: this.shield,
      shake: this.shake,
    }
  }

  private emit() {
    this.onChange?.(this.snapshot())
  }

  private buildBricks() {
    const { layout, theme, cols } = this.level
    const rows = layout.length
    const usable = CANVAS_W - 48
    const bw = (usable - BRICK_GAP * (cols - 1)) / cols
    const bh = 22
    const ox = (CANVAS_W - usable) / 2

    this.bricks = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const kind = layout[r]?.[c]
        if (!kind) continue
        const hp = brickHp(kind)
        this.bricks.push({
          id: uid(),
          x: ox + c * (bw + BRICK_GAP),
          y: TOP_PAD + r * (bh + BRICK_GAP),
          w: bw,
          h: bh,
          kind,
          hp,
          maxHp: hp,
          alive: true,
          color: colorFor(kind, theme.brickPalette, c, r),
          phase: 0,
          flash: 0,
        })
      }
    }
    this.portalPairs = this.bricks.filter((b) => b.kind === 'portal' && b.alive)
  }

  private spawnBall(stuck: boolean) {
    const ball: Ball = {
      id: uid(),
      x: this.paddle.x + this.paddle.w / 2,
      y: this.paddle.y - 10,
      vx: rand(-0.3, 0.3) * this.baseSpeed,
      vy: -this.baseSpeed,
      r: 7,
      stuck,
      trail: [],
    }
    this.balls.push(ball)
    if (stuck) this.launched = false
  }

  start() {
    this.running = true
    this.emit()
  }

  pause() {
    this.running = false
    this.emit()
  }

  resume() {
    if (!this.over) this.running = true
    this.emit()
  }

  launch() {
    if (this.launched) return
    for (const b of this.balls) {
      if (!b.stuck) continue
      b.stuck = false
      const angle = rand(-0.85, 0.85)
      b.vx = Math.sin(angle) * this.baseSpeed
      b.vy = -Math.cos(angle) * this.baseSpeed
    }
    this.launched = true
    sfx.bounce()
  }

  setPointer(x: number) {
    this.pointerX = x
  }

  fireLaser() {
    if (!this.paddle.laser || this.paddle.laserCooldown > 0) return
    this.paddle.laserCooldown = 0.22
    const left = this.paddle.x + 10
    const right = this.paddle.x + this.paddle.w - 10
    this.lasers.push(
      { id: uid(), x: left, y: this.paddle.y, h: 18 },
      { id: uid(), x: right, y: this.paddle.y, h: 18 },
    )
    sfx.laser()
  }

  update(dt: number) {
    if (!this.running || this.over) return
    const t = dt * this.timeScale
    this.notifyCooldown -= dt

    // paddle
    const speed = 520
    let px = this.pointerX - this.paddle.w / 2
    if (this.keys.left) px = this.paddle.x - speed * t
    if (this.keys.right) px = this.paddle.x + speed * t
    this.paddle.w += (this.paddle.targetW - this.paddle.w) * Math.min(1, t * 8)
    this.paddle.x = clamp(px, 8, CANVAS_W - this.paddle.w - 8)
    if (this.paddle.laserCooldown > 0) this.paddle.laserCooldown -= t

    // timers
    if (this.warpTimer > 0) {
      this.warpTimer -= dt
      this.timeScale = 0.45
      if (this.warpTimer <= 0) {
        this.timeScale = 1
        this.activePowers.delete('warp')
      }
    }
    if (this.shield > 0) this.shield -= t
    for (const [k, left] of [...this.powerTimers]) {
      const n = left - t
      if (n <= 0) {
        this.powerTimers.delete(k)
        this.activePowers.delete(k)
        this.clearPower(k)
      } else {
        this.powerTimers.set(k, n)
      }
    }

    // stuck balls follow paddle
    for (const b of this.balls) {
      if (b.stuck) {
        b.x = this.paddle.x + this.paddle.w / 2
        b.y = this.paddle.y - b.r - 2
      }
    }

    this.updateBalls(t)
    this.updatePowers(t)
    this.updateLasers(t)
    this.updateParticles(t)
    this.updateBrickFx(t)

    if (this.shake > 0) this.shake = Math.max(0, this.shake - t * 18)

    // chaos random flair
    if (this.difficultyId === 'chaos' && Math.random() < 0.002) {
      this.dropPower(CANVAS_W / 2 + rand(-120, 120), 120, pick(POWER_KINDS))
    }

    const breakable = this.bricks.filter((b) => b.alive && b.kind !== 'portal')
    if (breakable.length === 0) {
      this.over = 'won'
      this.running = false
      sfx.win()
      this.emit()
      return
    }

    if (this.notifyCooldown <= 0) {
      this.emit()
      this.notifyCooldown = 0.08
    }
  }

  private updateBalls(t: number) {
    const alive: Ball[] = []
    for (const ball of this.balls) {
      if (ball.stuck) {
        alive.push(ball)
        continue
      }

      // magnet
      if (this.paddle.magnet) {
        const cx = this.paddle.x + this.paddle.w / 2
        ball.vx += (cx - ball.x) * 0.0009
      }

      ball.x += ball.vx * t * 60
      ball.y += ball.vy * t * 60
      ball.trail.push({ x: ball.x, y: ball.y })
      if (ball.trail.length > 10) ball.trail.shift()

      // walls
      if (ball.x - ball.r < 0) {
        ball.x = ball.r
        ball.vx *= -1
        sfx.bounce()
      } else if (ball.x + ball.r > CANVAS_W) {
        ball.x = CANVAS_W - ball.r
        ball.vx *= -1
        sfx.bounce()
      }
      if (ball.y - ball.r < 0) {
        ball.y = ball.r
        ball.vy = Math.abs(ball.vy)
        sfx.bounce()
      }

      // paddle
      if (
        ball.vy > 0 &&
        ball.y + ball.r >= this.paddle.y &&
        ball.y - ball.r <= this.paddle.y + this.paddle.h &&
        ball.x >= this.paddle.x - 2 &&
        ball.x <= this.paddle.x + this.paddle.w + 2
      ) {
        const hit = (ball.x - (this.paddle.x + this.paddle.w / 2)) / (this.paddle.w / 2)
        const angle = hit * 1.05
        const speed = Math.hypot(ball.vx, ball.vy) || this.baseSpeed
        const boosted = Math.min(speed * 1.02, this.baseSpeed * 1.55)
        ball.vx = Math.sin(angle) * boosted
        ball.vy = -Math.cos(angle) * boosted
        ball.y = this.paddle.y - ball.r - 1
        this.combo = 0
        if (this.paddle.sticky && Math.random() < 0.55) {
          ball.stuck = true
          this.launched = false
        }
        sfx.bounce()
      }

      // shield
      if (this.shield > 0 && ball.y + ball.r >= CANVAS_H - 18 && ball.vy > 0) {
        ball.vy = -Math.abs(ball.vy)
        ball.y = CANVAS_H - 18 - ball.r
        this.shield = Math.max(0, this.shield - 1.2)
        this.burst(ball.x, ball.y, '#FDE68A', 10)
        sfx.bounce()
      }

      // fall
      if (ball.y - ball.r > CANVAS_H) {
        continue
      }

      this.collideBricks(ball)
      this.normalizeSpeed(ball)
      alive.push(ball)
    }

    this.balls = alive
    if (this.balls.length === 0) {
      this.loseLife()
    }
  }

  private normalizeSpeed(ball: Ball) {
    const sp = Math.hypot(ball.vx, ball.vy)
    const target = this.baseSpeed * (this.difficultyId === 'chaos' ? rand(0.85, 1.25) : 1)
    if (sp < 0.1) {
      ball.vx = rand(-1, 1)
      ball.vy = -target
      return
    }
    ball.vx = (ball.vx / sp) * target
    ball.vy = (ball.vy / sp) * target
    // avoid too horizontal
    if (Math.abs(ball.vy) < target * 0.35) {
      ball.vy = (ball.vy < 0 ? -1 : 1) * target * 0.4
      const ns = Math.hypot(ball.vx, ball.vy)
      ball.vx = (ball.vx / ns) * target
      ball.vy = (ball.vy / ns) * target
    }
  }

  private collideBricks(ball: Ball) {
    for (const brick of this.bricks) {
      if (!brick.alive) continue
      if (
        ball.x + ball.r < brick.x ||
        ball.x - ball.r > brick.x + brick.w ||
        ball.y + ball.r < brick.y ||
        ball.y - ball.r > brick.y + brick.h
      ) {
        continue
      }

      const prevX = ball.x - ball.vx
      const prevY = ball.y - ball.vy
      const fromLeft = prevX + ball.r <= brick.x
      const fromRight = prevX - ball.r >= brick.x + brick.w
      const fromTop = prevY + ball.r <= brick.y
      const fromBottom = prevY - ball.r >= brick.y + brick.h

      if (fromLeft || fromRight) ball.vx *= -1
      else if (fromTop || fromBottom) ball.vy *= -1
      else {
        // corner — bounce both-ish
        ball.vy *= -1
      }

      if (brick.kind === 'portal') {
        this.teleport(ball, brick)
        brick.flash = 1
        sfx.bounce()
        return
      }

      this.hitBrick(brick, ball.x, ball.y)
      return
    }
  }

  private teleport(ball: Ball, from: Brick) {
    const others = this.bricks.filter(
      (b) => b.alive && b.kind === 'portal' && b.id !== from.id,
    )
    if (!others.length) return
    const to = pick(others)
    ball.x = to.x + to.w / 2
    ball.y = to.y + to.h + ball.r + 2
    ball.vy = Math.abs(ball.vy)
    this.burst(to.x + to.w / 2, to.y + to.h / 2, '#67E8F9', 14)
  }

  private hitBrick(brick: Brick, x: number, y: number, fromLaser = false) {
    brick.hp -= 1
    brick.flash = 1
    if (brick.hp > 0) {
      sfx.brick()
      this.burst(x, y, brick.color, 6)
      return
    }

    brick.alive = false
    this.combo += 1
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    const bonus = 1 + Math.min(this.combo, 12) * 0.08
    this.score += Math.round(brickScore(brick.kind) * this.scoreMult * bonus)

    if (brick.kind === 'crystal') {
      sfx.crystal()
      this.burst(x, y, '#FDE68A', 22)
      this.shake = Math.max(this.shake, 4)
      this.score += Math.round(40 * this.scoreMult)
    } else if (brick.kind === 'explosive') {
      sfx.explode()
      this.burst(x, y, '#FB7185', 28)
      this.shake = Math.max(this.shake, 8)
      this.chainExplode(brick)
    } else {
      sfx.brick()
      this.burst(x, y, brick.color, 12)
    }

    if (!fromLaser && Math.random() < this.powerChance) {
      this.dropPower(brick.x + brick.w / 2, brick.y + brick.h / 2)
    }
  }

  private chainExplode(origin: Brick) {
    const cx = origin.x + origin.w / 2
    const cy = origin.y + origin.h / 2
    for (const b of this.bricks) {
      if (!b.alive || b.id === origin.id) continue
      const dx = b.x + b.w / 2 - cx
      const dy = b.y + b.h / 2 - cy
      if (Math.hypot(dx, dy) < 78) {
        if (b.kind === 'portal') continue
        this.hitBrick(b, b.x + b.w / 2, b.y + b.h / 2, true)
      }
    }
  }

  private dropPower(x: number, y: number, forced?: PowerUpKind) {
    const kind = forced ?? pick(POWER_KINDS)
    this.powers.push({
      id: uid(),
      kind,
      x,
      y,
      vy: 2.2,
      r: 11,
      born: performance.now(),
    })
  }

  private updatePowers(t: number) {
    const kept: PowerUp[] = []
    for (const p of this.powers) {
      p.y += p.vy * t * 60
      if (p.y - p.r > CANVAS_H) continue
      if (
        p.y + p.r >= this.paddle.y &&
        p.y - p.r <= this.paddle.y + this.paddle.h &&
        p.x >= this.paddle.x - 4 &&
        p.x <= this.paddle.x + this.paddle.w + 4
      ) {
        this.applyPower(p.kind)
        continue
      }
      kept.push(p)
    }
    this.powers = kept
  }

  private applyPower(kind: PowerUpKind) {
    sfx.power()
    this.activePowers.add(kind)
    this.burst(this.paddle.x + this.paddle.w / 2, this.paddle.y, POWER_META[kind].color, 16)

    switch (kind) {
      case 'multi': {
        const base = this.balls[0]
        if (base) {
          for (let i = 0; i < 2; i++) {
            this.balls.push({
              id: uid(),
              x: base.x,
              y: base.y,
              vx: rand(-1, 1) * this.baseSpeed,
              vy: -Math.abs(rand(0.6, 1)) * this.baseSpeed,
              r: base.r,
              stuck: false,
              trail: [],
            })
          }
          this.launched = true
        }
        this.powerTimers.set(kind, 0.1)
        break
      }
      case 'laser':
        this.paddle.laser = true
        this.powerTimers.set(kind, 12)
        break
      case 'sticky':
        this.paddle.sticky = true
        this.powerTimers.set(kind, 10)
        break
      case 'expand':
        this.paddle.targetW = clamp(this.paddle.targetW + 36, 70, 200)
        this.powerTimers.set(kind, 14)
        break
      case 'shrink':
        this.paddle.targetW = clamp(this.paddle.targetW - 28, 56, 200)
        this.powerTimers.set(kind, 10)
        break
      case 'warp':
        this.warpTimer = 6
        this.powerTimers.set(kind, 6)
        break
      case 'shield':
        this.shield = 8
        this.powerTimers.set(kind, 8)
        break
      case 'magnet':
        this.paddle.magnet = true
        this.powerTimers.set(kind, 11)
        break
    }
    this.emit()
  }

  private clearPower(kind: PowerUpKind) {
    if (kind === 'laser') this.paddle.laser = false
    if (kind === 'sticky') this.paddle.sticky = false
    if (kind === 'magnet') this.paddle.magnet = false
    if (kind === 'expand' || kind === 'shrink') {
      this.paddle.targetW = DIFFICULTIES[this.difficultyId].paddleWidth
    }
  }

  private updateLasers(t: number) {
    const kept: LaserBolt[] = []
    for (const laser of this.lasers) {
      laser.y -= 520 * t
      laser.h = 22
      let hit = false
      for (const brick of this.bricks) {
        if (!brick.alive) continue
        if (
          laser.x >= brick.x &&
          laser.x <= brick.x + brick.w &&
          laser.y <= brick.y + brick.h &&
          laser.y + 30 >= brick.y
        ) {
          if (brick.kind !== 'portal') {
            this.hitBrick(brick, brick.x + brick.w / 2, brick.y + brick.h / 2, true)
          }
          hit = true
          break
        }
      }
      if (!hit && laser.y + 30 > 0) kept.push(laser)
    }
    this.lasers = kept
  }

  private updateParticles(t: number) {
    const kept: Particle[] = []
    for (const p of this.particles) {
      p.life -= t
      p.x += p.vx * t * 60
      p.y += p.vy * t * 60
      p.vy += 8 * t
      if (p.life > 0) kept.push(p)
    }
    this.particles = kept
  }

  private updateBrickFx(t: number) {
    for (const b of this.bricks) {
      if (b.flash > 0) b.flash = Math.max(0, b.flash - t * 4)
      if (b.kind === 'ghost' && b.alive) b.phase += t * 2.2
      if (b.kind === 'crystal' && b.alive) b.phase += t * 3
      if (b.kind === 'portal' && b.alive) b.phase += t * 2.5
    }
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2)
      const sp = rand(1, 4.5)
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.3, 0.7),
        maxLife: 0.7,
        color,
        size: rand(2, 5),
      })
    }
  }

  private loseLife() {
    this.lives -= 1
    this.combo = 0
    sfx.loseLife()
    this.shake = 10
    if (this.lives <= 0) {
      this.over = 'lost'
      this.running = false
      sfx.lose()
      this.emit()
      return
    }
    this.powers = []
    this.lasers = []
    this.activePowers.clear()
    this.powerTimers.clear()
    this.paddle.laser = false
    this.paddle.sticky = false
    this.paddle.magnet = false
    this.paddle.targetW = DIFFICULTIES[this.difficultyId].paddleWidth
    this.shield = 0
    this.timeScale = 1
    this.warpTimer = 0
    this.spawnBall(true)
    this.emit()
  }
}
