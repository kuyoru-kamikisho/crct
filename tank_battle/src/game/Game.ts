import type { Direction, GameStatus } from './types'
import {
  BULLET_SPEED,
  ENEMY_SPAWN_INTERVAL,
  ENEMY_SPAWN_POINTS,
  ENEMY_SPEED,
  INVINCIBLE_MS,
  MAX_ENEMIES_ON_FIELD,
  PLAYER_FIRE_COOLDOWN,
  PLAYER_LIVES,
  PLAYER_SPAWN,
  PLAYER_SPEED,
  SCORE_PER_KILL,
  TANK_SIZE,
  TILE_SIZE,
} from './constants'
import { Bullet, Tank } from './entities/Tank'
import { GameMap } from './map/Map'
import { enemiesPerLevel, levels } from './map/levels'
import { Input } from './systems/Input'
import { Renderer } from './systems/Renderer'
import { updateEnemyAI } from './systems/AI'
import { rectsOverlap } from './utils'

export class Game {
  private map: GameMap
  private player: Tank | null = null
  private enemies: Tank[] = []
  private bullets: Bullet[] = []
  private input: Input
  private renderer: Renderer

  private status: GameStatus = 'ready'
  private score = 0
  private lives = PLAYER_LIVES
  private levelIndex = 0
  private enemiesRemaining = 0
  private enemiesToSpawn = 0
  private lastSpawnAt = 0
  private spawnIndex = 0

  private raf = 0
  private lastFrame = 0

  private els = {
    score: document.getElementById('score')!,
    lives: document.getElementById('lives')!,
    enemies: document.getElementById('enemies')!,
    level: document.getElementById('level')!,
    overlay: document.getElementById('overlay')!,
    overlayTitle: document.getElementById('overlay-title')!,
    overlayMessage: document.getElementById('overlay-message')!,
  }

  constructor(canvas: HTMLCanvasElement) {
    this.map = new GameMap(0)
    this.input = new Input()
    this.renderer = new Renderer(canvas)
    this.showOverlay('坦克大战', '按 Enter 开始游戏')
    this.loop(0)
  }

  startLevel(levelIndex: number): void {
    this.levelIndex = levelIndex % levels.length
    this.map = new GameMap(this.levelIndex)
    this.bullets = []
    this.enemies = []
    this.enemiesToSpawn = enemiesPerLevel[this.levelIndex]
    this.enemiesRemaining = this.enemiesToSpawn
    this.spawnIndex = 0
    this.lastSpawnAt = 0
    this.spawnPlayer(true)
    this.status = 'playing'
    this.hideOverlay()
    this.syncHud()
  }

  private spawnPlayer(initial: boolean): void {
    this.player = new Tank({
      x: PLAYER_SPAWN.x,
      y: PLAYER_SPAWN.y,
      direction: 'up',
      speed: PLAYER_SPEED,
      isPlayer: true,
      color: '#3dba6f',
    })
    this.player.grantInvincible(INVINCIBLE_MS)
    if (!initial) {
      // 重生时短暂无敌已授予
    }
  }

  private trySpawnEnemy(t: number): void {
    if (this.enemiesToSpawn <= 0) return
    if (this.enemies.filter((e) => e.alive).length >= MAX_ENEMIES_ON_FIELD) return
    if (t - this.lastSpawnAt < ENEMY_SPAWN_INTERVAL && this.lastSpawnAt !== 0) return

    const point = ENEMY_SPAWN_POINTS[this.spawnIndex % ENEMY_SPAWN_POINTS.length]
    this.spawnIndex++

    const ghost = {
      x: point.x,
      y: point.y,
      w: TANK_SIZE,
      h: TANK_SIZE,
    }

    // 出生点被占则跳过本帧
    const blocked =
      (this.player?.alive && rectsOverlap(ghost, this.player.rect)) ||
      this.enemies.some((e) => e.alive && rectsOverlap(ghost, e.rect)) ||
      this.map.collidesSolid(ghost)

    if (blocked) return

    const colors = ['#c0392b', '#e67e22', '#8e44ad', '#d35400']
    const enemy = new Tank({
      x: point.x,
      y: point.y,
      direction: 'down',
      speed: ENEMY_SPEED + this.levelIndex * 0.15,
      isPlayer: false,
      color: colors[this.spawnIndex % colors.length],
    })
    enemy.nextThinkAt = t + 300
    this.enemies.push(enemy)
    this.enemiesToSpawn--
    this.lastSpawnAt = t
    this.syncHud()
  }

  /**
   * 将垂直于移动方向的轴吸附到瓦片网格。
   * 浮点速度会偏离格子，2 格宽走廊只有对齐后才能通过（经典红白机做法）。
   */
  private snapToGrid(tank: Tank, direction: Direction): void {
    const candidates = (v: number) => {
      const rounded = Math.round(v / TILE_SIZE) * TILE_SIZE
      const floored = Math.floor(v / TILE_SIZE) * TILE_SIZE
      const ceiled = Math.ceil(v / TILE_SIZE) * TILE_SIZE
      return [...new Set([rounded, floored, ceiled])]
    }

    const horizontal = direction === 'left' || direction === 'right'
    const values = candidates(horizontal ? tank.y : tank.x)

    for (const v of values) {
      const probe = {
        x: horizontal ? tank.x : v,
        y: horizontal ? v : tank.y,
        w: TANK_SIZE,
        h: TANK_SIZE,
      }
      if (!this.map.outOfBounds(probe) && !this.map.collidesSolid(probe)) {
        if (horizontal) tank.y = v
        else tank.x = v
        return
      }
    }

    // 无安全候选时仍取最近格，避免持续漂离
    const nearest = Math.round((horizontal ? tank.y : tank.x) / TILE_SIZE) * TILE_SIZE
    if (horizontal) tank.y = nearest
    else tank.x = nearest
  }

  private isBlockedByTanks(rect: { x: number; y: number; w: number; h: number }, self: Tank): boolean {
    const others = [
      ...(this.player && this.player !== self && this.player.alive ? [this.player] : []),
      ...this.enemies.filter((e) => e.alive && e !== self),
    ]
    return others.some((other) => rectsOverlap(rect, other.rect))
  }

  private tryMoveTank(tank: Tank, direction: Direction): boolean {
    tank.direction = direction
    this.snapToGrid(tank, direction)

    const apply = (dist: number) => {
      const next = { x: tank.x, y: tank.y, w: TANK_SIZE, h: TANK_SIZE }
      if (direction === 'up') next.y -= dist
      if (direction === 'down') next.y += dist
      if (direction === 'left') next.x -= dist
      if (direction === 'right') next.x += dist
      return next
    }

    // 全速移动；撞墙则逐步缩短距离贴齐障碍，避免“差一点点过不去”
    let dist = tank.speed
    while (dist > 0.01) {
      const next = apply(dist)
      if (
        !this.map.outOfBounds(next) &&
        !this.map.collidesSolid(next) &&
        !this.isBlockedByTanks(next, tank)
      ) {
        tank.x = next.x
        tank.y = next.y
        return dist >= tank.speed - 0.01
      }
      dist = dist <= 1 ? dist / 2 : Math.floor(dist - 0.5)
    }
    return false
  }

  private tryFire(tank: Tank): Bullet | null {
    const cooldown = tank.isPlayer ? PLAYER_FIRE_COOLDOWN : 900
    if (!tank.canFire(cooldown)) return null

    // 每辆坦克同时最多 1 发子弹
    const owned = this.bullets.filter((b) => b.alive && b.ownerId === tank.id)
    if (owned.length >= 1) return null

    tank.markFired()
    const m = tank.muzzle()
    const bullet = new Bullet(
      m.x,
      m.y,
      tank.direction,
      BULLET_SPEED,
      tank.isPlayer,
      tank.id,
    )
    this.bullets.push(bullet)
    return bullet
  }

  private updatePlayer(): void {
    if (!this.player?.alive) return

    const dir = this.input.getMoveDirection()
    if (dir) {
      this.tryMoveTank(this.player, dir)
    }
    if (this.input.isFire()) {
      this.tryFire(this.player)
    }
  }

  private updateEnemies(): void {
    const allTanks = [
      ...(this.player ? [this.player] : []),
      ...this.enemies,
    ]
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      updateEnemyAI(
        enemy,
        allTanks,
        (t, d) => this.tryMoveTank(t, d),
        (t) => this.tryFire(t),
      )
    }
  }

  private updateBullets(): void {
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue
      bullet.update()

      if (this.map.outOfBounds(bullet.rect)) {
        bullet.alive = false
        continue
      }

      if (this.map.hitByBullet(bullet.rect)) {
        bullet.alive = false
        if (!this.map.baseAlive) {
          this.lose('基地被摧毁！')
          return
        }
        continue
      }

      // 子弹打坦克
      if (bullet.ownerIsPlayer) {
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue
          if (rectsOverlap(bullet.rect, enemy.rect)) {
            bullet.alive = false
            enemy.alive = false
            this.score += SCORE_PER_KILL
            this.enemiesRemaining--
            this.syncHud()
            if (this.enemiesRemaining <= 0) {
              this.win()
            }
            break
          }
        }
      } else if (this.player?.alive && rectsOverlap(bullet.rect, this.player.rect)) {
        bullet.alive = false
        if (!this.player.isInvincible()) {
          this.playerHit()
        }
      }
    }

    // 子弹互消（敌我子弹对撞）
    for (let i = 0; i < this.bullets.length; i++) {
      const a = this.bullets[i]
      if (!a.alive) continue
      for (let j = i + 1; j < this.bullets.length; j++) {
        const b = this.bullets[j]
        if (!b.alive) continue
        if (a.ownerIsPlayer !== b.ownerIsPlayer && rectsOverlap(a.rect, b.rect)) {
          a.alive = false
          b.alive = false
        }
      }
    }

    this.bullets = this.bullets.filter((b) => b.alive)
  }

  private playerHit(): void {
    if (!this.player) return
    this.player.alive = false
    this.lives--
    this.syncHud()
    if (this.lives <= 0) {
      this.lose('生命耗尽！')
      return
    }
    // 短暂延迟重生
    setTimeout(() => {
      if (this.status === 'playing') {
        this.spawnPlayer(false)
      }
    }, 800)
  }

  private win(): void {
    if (this.status !== 'playing') return
    this.status = 'won'
    if (this.levelIndex < levels.length - 1) {
      this.showOverlay(
        `第 ${this.levelIndex + 1} 关通过！`,
        '按 Enter 进入下一关',
      )
    } else {
      this.showOverlay('全部通关！', `最终得分 ${this.score} · 按 Enter 重新开始`)
    }
  }

  private lose(reason: string): void {
    if (this.status !== 'playing') return
    this.status = 'lost'
    this.showOverlay('游戏失败', `${reason} · 按 Enter 重新开始`)
  }

  private handleGlobalKeys(): void {
    if (this.input.wasPressed('Enter')) {
      if (this.status === 'ready' || this.status === 'lost') {
        this.lives = PLAYER_LIVES
        this.score = 0
        this.startLevel(0)
      } else if (this.status === 'won') {
        if (this.levelIndex < levels.length - 1) {
          this.lives = Math.min(this.lives + 1, PLAYER_LIVES + 1)
          this.startLevel(this.levelIndex + 1)
        } else {
          this.lives = PLAYER_LIVES
          this.score = 0
          this.startLevel(0)
        }
      } else if (this.status === 'paused') {
        this.status = 'playing'
        this.hideOverlay()
      }
    }

    if (this.input.wasPressed('KeyP') && (this.status === 'playing' || this.status === 'paused')) {
      if (this.status === 'playing') {
        this.status = 'paused'
        this.showOverlay('暂停', '按 P 或 Enter 继续')
      } else {
        this.status = 'playing'
        this.hideOverlay()
      }
    }
  }

  private syncHud(): void {
    this.els.score.textContent = String(this.score)
    this.els.lives.textContent = String(this.lives)
    this.els.enemies.textContent = String(Math.max(0, this.enemiesRemaining))
    this.els.level.textContent = String(this.levelIndex + 1)
  }

  private showOverlay(title: string, message: string): void {
    this.els.overlayTitle.textContent = title
    this.els.overlayMessage.textContent = message
    this.els.overlay.classList.add('visible')
  }

  private hideOverlay(): void {
    this.els.overlay.classList.remove('visible')
  }

  private render(): void {
    this.renderer.clear()
    this.renderer.drawMap(this.map)
    if (this.player) this.renderer.drawTank(this.player)
    for (const e of this.enemies) this.renderer.drawTank(e)
    for (const b of this.bullets) this.renderer.drawBullet(b)
    this.renderer.drawBorder()
  }

  private loop = (t: number): void => {
    // 输入每帧只处理一次，避免固定步进重复触发
    this.handleGlobalKeys()

    if (!this.lastFrame) this.lastFrame = t
    const dt = t - this.lastFrame
    const step = 1000 / 60
    let acc = Math.min(dt, 50)
    while (acc >= step) {
      if (this.status === 'playing') {
        const nowT = performance.now()
        this.trySpawnEnemy(nowT)
        this.updatePlayer()
        this.updateEnemies()
        this.updateBullets()
      }
      acc -= step
    }
    this.lastFrame = t - acc

    this.render()
    this.input.endFrame()
    this.raf = requestAnimationFrame(this.loop)
  }

  destroy(): void {
    cancelAnimationFrame(this.raf)
    this.input.destroy()
  }
}
