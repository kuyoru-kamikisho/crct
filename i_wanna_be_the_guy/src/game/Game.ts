import { TILE, type GameState } from './config'
import { aabb, spikeHitbox, type Rect } from './engine/collision'
import { Input } from './engine/input'
import { Player } from './entities/Player'
import { LEVELS } from './levels'
import { parseLevel } from './levels/parse'
import type { ParsedLevel } from './levels/types'
import { Renderer, type Particle } from './render/Renderer'

export interface GameHudSnapshot {
  state: GameState
  levelId: number
  levelName: string
  deaths: number
  collects: number
  collectTotal: number
  hint: string
  danmaku: string | null
  danmakuKey: number
}

type Listener = (hud: GameHudSnapshot) => void

export class Game {
  private input = new Input()
  private renderer: Renderer
  private level!: ParsedLevel
  private player = new Player()
  private ally: {
    x: number
    y: number
    facing: number
    anim: string
    frame: number
    skin: number
    w: number
    h: number
    dead: boolean
    frameTimer: number
  } | null = null

  private state: GameState = 'title'
  private levelIndex = 0
  private deaths = 0
  private collected = new Set<number>()
  private enemiesAlive: boolean[] = []
  private staffActive: boolean[] = []
  private spikeDisabledUntil = 0
  private savePoint: { x: number; y: number } | null = null
  private saveFlash = 0
  private time = 0
  private particles: Particle[] = []
  private raf = 0
  private running = false
  private listeners = new Set<Listener>()
  private danmaku: string | null = null
  private danmakuKey = 0
  private danmakuTimer = 0
  private danmakuIndex = 0
  private deathDelay = 0
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.renderer = new Renderer(canvas)
    this.player.skin = 0
    // Preview first level behind title screen
    this.loadLevel(0, true)
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    fn(this.snapshot())
    return () => this.listeners.delete(fn)
  }

  private emit() {
    const snap = this.snapshot()
    for (const fn of this.listeners) fn(snap)
  }

  snapshot(): GameHudSnapshot {
    return {
      state: this.state,
      levelId: this.levelIndex + 1,
      levelName: LEVELS[this.levelIndex]?.name ?? '',
      deaths: this.deaths,
      collects: this.collected.size,
      collectTotal: this.level?.collects.length ?? 0,
      hint: LEVELS[this.levelIndex]?.hint ?? '',
      danmaku: this.danmaku,
      danmakuKey: this.danmakuKey,
    }
  }

  start() {
    if (this.running) return
    this.input.bind()
    this.running = true
    const loop = () => {
      this.raf = requestAnimationFrame(loop)
      this.tick()
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.input.unbind()
  }

  beginGame(levelIndex = 0) {
    this.levelIndex = levelIndex
    this.deaths = 0
    this.loadLevel(levelIndex, true)
    this.state = 'playing'
    this.emit()
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused'
      this.emit()
    } else if (this.state === 'paused') {
      this.state = 'playing'
      this.emit()
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'playing'
      this.emit()
    }
  }

  private loadLevel(index: number, fullReset: boolean) {
    this.level = parseLevel(LEVELS[index])
    this.collected = new Set()
    this.enemiesAlive = this.level.enemies.map(() => true)
    this.staffActive = this.level.staffs.map(() => false)
    this.spikeDisabledUntil = 0
    this.particles = []
    this.danmakuIndex = 0
    this.danmakuTimer = 90
    this.pushDanmaku(this.level.def.danmaku[0] ?? this.level.def.hint)

    if (fullReset || !this.savePoint) {
      this.savePoint = {
        x: this.level.player.x,
        y: this.level.player.y,
      }
    }

    const spawn = this.savePoint
    this.player.skin = 0
    this.player.spawn(spawn.x, spawn.y)

    if (this.level.ally) {
      this.ally = {
        x: this.level.ally.x * TILE + 10,
        y: this.level.ally.y * TILE + 11,
        facing: -1,
        anim: 'idle',
        frame: 0,
        skin: 1,
        w: 11,
        h: 21,
        dead: false,
        frameTimer: 0,
      }
    } else {
      this.ally = null
    }
  }

  resetToSave() {
    this.player.spawn(this.savePoint!.x, this.savePoint!.y)
    this.player.dead = false
    this.state = 'playing'
    this.deathDelay = 0
    this.emit()
  }

  private pushDanmaku(text: string) {
    this.danmaku = text
    this.danmakuKey++
    this.danmakuTimer = 180
  }

  private tick() {
    this.time++
    const playing = this.state === 'playing'

    // Global keys
    if (this.input.justPressed('pause') && (this.state === 'playing' || this.state === 'paused')) {
      this.togglePause()
    }
    if (this.input.justPressed('reset') && this.state !== 'title') {
      this.deaths++
      this.resetToSave()
      this.burst(this.player.x + 5, this.player.y + 10, '#a0b0c0', 8)
    }

    if (playing) {
      this.player.update(this.input, this.level.solids, this.level.cols, this.level.rows, true)
      this.checkHazards()
      this.checkPortals()
      this.checkSaves()
      this.checkCollects()
      this.checkStaffs()
      this.checkEnemies()
      this.checkGoal()
      this.updateAlly()
    } else if (this.state === 'dead') {
      this.player.update(this.input, this.level.solids, this.level.cols, this.level.rows, false)
      this.deathDelay++
      if (this.deathDelay > 35 || this.input.justPressed('reset') || this.input.justPressed('jump')) {
        this.resetToSave()
      }
    }

    // Danmaku rotation
    if (this.danmakuTimer > 0) {
      this.danmakuTimer--
      if (this.danmakuTimer === 0) {
        this.danmaku = null
        const list = this.level?.def.danmaku ?? []
        if (list.length && this.time % 400 === 0) {
          this.danmakuIndex = (this.danmakuIndex + 1) % list.length
          this.pushDanmaku(list[this.danmakuIndex])
        }
      }
    } else if (this.level && this.time % 420 === 0) {
      const list = this.level.def.danmaku
      this.danmakuIndex = (this.danmakuIndex + 1) % list.length
      this.pushDanmaku(list[this.danmakuIndex])
    }

    if (this.saveFlash > 0) this.saveFlash--
    this.updateParticles()

    // Draw (title also shows level preview)
    this.renderer.clear()
    if (this.level) {
      this.renderer.draw({
        level: this.level,
        player: this.player,
        ally: this.ally ?? undefined,
        collected: this.collected,
        enemiesAlive: this.enemiesAlive,
        staffActive: this.staffActive,
        spikeDisabledUntil: this.spikeDisabledUntil,
        saveFlash: this.saveFlash,
        time: this.time,
        particles: this.particles,
      })
    }

    this.input.lateUpdate()
  }

  private checkHazards() {
    if (this.player.dead) return
    const pr = this.player.rect()
    const spikesOff = this.time < this.spikeDisabledUntil

    if (!spikesOff) {
      for (const s of this.level.spikes) {
        const box = spikeHitbox(s.x * TILE, s.y * TILE, s.dir, TILE)
        if (aabb(pr, box)) {
          this.die()
          return
        }
      }
    }

    // Enemy contact
    this.level.enemies.forEach((e, i) => {
      if (!this.enemiesAlive[i]) return
      const er: Rect = { x: e.x * TILE + 4, y: e.y * TILE + 6, w: 24, h: 22 }
      if (aabb(pr, er)) this.die()
    })
  }

  private die() {
    if (this.player.dead) return
    this.player.kill()
    this.deaths++
    this.state = 'dead'
    this.deathDelay = 0
    this.burst(this.player.x + 5, this.player.y + 8, '#e8455a', 16)
    this.pushDanmaku('GAME OVER · 空格/R 快速重置')
    this.emit()
  }

  private checkPortals() {
    if (this.player.tryWarp(this.level.portals, TILE)) {
      this.burst(this.player.x + 5, this.player.y + 10, '#ffaa22', 12)
      this.pushDanmaku('嗖——跨层传送！')
      this.emit()
    }
  }

  private checkSaves() {
    const pr = this.player.rect()
    for (const s of this.level.saves) {
      const box: Rect = { x: s.x * TILE + 6, y: s.y * TILE + 4, w: 20, h: 24 }
      if (aabb(pr, box)) {
        if (!this.savePoint || this.savePoint.x !== s.x || this.savePoint.y !== s.y) {
          this.savePoint = { x: s.x, y: s.y }
          this.saveFlash = 40
          this.pushDanmaku('存档点已记录 ✓')
          this.emit()
        }
      }
    }
  }

  private checkCollects() {
    const pr = this.player.rect()
    this.level.collects.forEach((c, i) => {
      if (this.collected.has(i)) return
      const box: Rect = { x: c.x * TILE + 6, y: c.y * TILE + 6, w: 20, h: 20 }
      if (aabb(pr, box)) {
        this.collected.add(i)
        this.burst(c.x * TILE + 16, c.y * TILE + 16, '#ffd34e', 10)
        this.pushDanmaku('拾取星星！')
        this.emit()
      }
    })
  }

  private checkStaffs() {
    const pr = this.player.rect()
    this.level.staffs.forEach((s, i) => {
      const box: Rect = { x: s.x * TILE + 4, y: s.y * TILE - 20, w: 24, h: 52 }
      if (aabb(pr, box) && this.input.justPressed('jump') && !this.staffActive[i]) {
        // Only trigger staff if on ground near it (avoid stealing jump awkwardly — use attack or auto)
      }
      if (aabb(pr, box) && !this.staffActive[i]) {
        // Auto-activate on touch for better UX
        this.staffActive[i] = true
        this.spikeDisabledUntil = this.time + 240
        this.pushDanmaku('法杖启动！尖刺暂时失效')
        this.burst(s.x * TILE + 16, s.y * TILE, '#6ec8ff', 14)
        this.emit()
      }
    })
  }

  private checkEnemies() {
    this.level.enemies.forEach((e, i) => {
      if (!this.enemiesAlive[i]) return
      const er: Rect = { x: e.x * TILE + 4, y: e.y * TILE + 6, w: 24, h: 22 }
      for (const b of this.player.bullets) {
        const br: Rect = { x: b.x, y: b.y, w: b.w, h: b.h }
        if (aabb(br, er)) {
          this.enemiesAlive[i] = false
          b.life = 0
          this.burst(e.x * TILE + 16, e.y * TILE + 16, '#c05070', 12)
          this.pushDanmaku('敌人已清除')
          this.emit()
        }
      }
    })
  }

  private checkGoal() {
    if (!this.level.goal || this.player.dead) return
    const g = this.level.goal
    const box: Rect = { x: g.x * TILE + 4, y: g.y * TILE + 2, w: 24, h: 28 }
    if (aabb(this.player.rect(), box)) {
      // Require killing enemies if any remain
      if (this.enemiesAlive.some(Boolean)) {
        this.pushDanmaku('还有敌人存活，先解决它们！')
        return
      }
      if (this.levelIndex < LEVELS.length - 1) {
        this.levelIndex++
        this.savePoint = null
        this.loadLevel(this.levelIndex, true)
        this.state = 'playing'
        this.pushDanmaku(`进入关卡：${LEVELS[this.levelIndex].name}`)
        this.emit()
      } else {
        this.state = 'cleared'
        this.pushDanmaku('全部通关！你就是 The Guy！')
        this.emit()
      }
    }
  }

  private updateAlly() {
    if (!this.ally || this.ally.dead) return
    this.ally.frameTimer++
    if (this.ally.frameTimer > 10) {
      this.ally.frameTimer = 0
      this.ally.frame = (this.ally.frame + 1) % 4
    }
    // idle bob facing player
    this.ally.facing = this.player.x < this.ally.x ? -1 : 1
    this.ally.anim = 'idle'
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random()
      const sp = 1 + Math.random() * 2.5
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1,
        life: 20 + Math.random() * 15,
        max: 35,
        color,
        size: 2 + Math.random() * 2,
      })
    }
  }

  private updateParticles() {
    this.particles = this.particles.filter((p) => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.12
      p.life--
      return p.life > 0
    })
  }
}
