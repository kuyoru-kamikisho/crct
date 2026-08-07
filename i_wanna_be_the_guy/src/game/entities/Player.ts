import { PHYS, TILE } from '../config'
import type { Rect } from '../engine/collision'
import { aabb } from '../engine/collision'
import type { Input } from '../engine/input'
import type { PortalRuntime } from '../levels/types'

export type AnimState = 'idle' | 'run' | 'jump' | 'fall' | 'dead' | 'warp'

export interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  w: number
  h: number
}

export class Player {
  x = 0
  y = 0
  vx = 0
  vy = 0
  w = 11
  h = 21
  facing = 1
  onGround = false
  jumpsLeft = 2
  /** true while head is pressed into ceiling — blocks double-jump exploit */
  headBlocked = false
  dead = false
  deathTimer = 0
  anim: AnimState = 'idle'
  frame = 0
  frameTimer = 0
  invuln = 0
  warpCooldown = 0
  bullets: Bullet[] = []
  shootCooldown = 0
  /** cosmetic variant: 0 blonde, 1 pink */
  skin = 0

  spawn(tileX: number, tileY: number) {
    this.x = tileX * TILE + (TILE - this.w) / 2
    this.y = tileY * TILE + TILE - this.h
    this.vx = 0
    this.vy = 0
    this.dead = false
    this.deathTimer = 0
    this.jumpsLeft = 2
    this.headBlocked = false
    this.anim = 'idle'
    this.bullets = []
    this.warpCooldown = 0
  }

  rect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h }
  }

  kill() {
    if (this.dead) return
    this.dead = true
    this.deathTimer = 0
    this.vx = 0
    this.vy = -3
    this.anim = 'dead'
  }

  update(
    input: Input,
    solids: boolean[][],
    cols: number,
    rows: number,
    canControl: boolean,
  ) {
    if (this.dead) {
      this.deathTimer++
      this.vy += PHYS.gravity * 0.6
      this.y += this.vy
      this.frameTimer++
      if (this.frameTimer > 4) {
        this.frame = (this.frame + 1) % 4
        this.frameTimer = 0
      }
      this.updateBullets()
      return
    }

    if (this.warpCooldown > 0) this.warpCooldown--
    if (this.shootCooldown > 0) this.shootCooldown--
    if (this.invuln > 0) this.invuln--

    // Horizontal
    let move = 0
    if (canControl) {
      if (input.isDown('left')) move -= 1
      if (input.isDown('right')) move += 1
    }
    if (move !== 0) {
      this.facing = move
      const accel = this.onGround ? PHYS.groundAccel : PHYS.airAccel
      this.vx += move * accel
      if (this.vx > PHYS.moveSpeed) this.vx = PHYS.moveSpeed
      if (this.vx < -PHYS.moveSpeed) this.vx = -PHYS.moveSpeed
    } else if (this.onGround) {
      this.vx *= PHYS.friction
      if (Math.abs(this.vx) < 0.08) this.vx = 0
    } else {
      this.vx *= 0.92
    }

    // Jump — first jump on ground, second only if not head-blocked
    if (canControl && input.justPressed('jump')) {
      if (this.onGround) {
        this.vy = PHYS.jumpForce
        this.onGround = false
        this.jumpsLeft = 1
        this.headBlocked = false
      } else if (this.jumpsLeft > 0 && !this.headBlocked) {
        this.vy = PHYS.doubleJumpForce
        this.jumpsLeft = 0
      }
    }

    // Attack
    if (canControl && input.justPressed('attack') && this.shootCooldown <= 0) {
      this.bullets.push({
        x: this.x + (this.facing > 0 ? this.w : -4),
        y: this.y + 8,
        vx: this.facing * PHYS.bulletSpeed,
        vy: 0,
        life: PHYS.bulletLife,
        w: 6,
        h: 4,
      })
      this.shootCooldown = 12
    }

    // Gravity
    this.vy += PHYS.gravity
    if (this.vy > PHYS.maxFall) this.vy = PHYS.maxFall

    this.moveAndCollide(solids, cols, rows)
    this.updateAnim()
    this.updateBullets()
  }

  private updateBullets() {
    this.bullets = this.bullets.filter((b) => {
      b.x += b.vx
      b.y += b.vy
      b.life--
      return b.life > 0
    })
  }

  private solidAt(solids: boolean[][], cols: number, rows: number, px: number, py: number) {
    const tx = Math.floor(px / TILE)
    const ty = Math.floor(py / TILE)
    if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return true
    return solids[ty][tx]
  }

  private moveAndCollide(solids: boolean[][], cols: number, rows: number) {
    // X axis
    this.x += this.vx
    if (this.vx > 0) {
      if (
        this.solidAt(solids, cols, rows, this.x + this.w, this.y + 1) ||
        this.solidAt(solids, cols, rows, this.x + this.w, this.y + this.h - 1)
      ) {
        this.x = Math.floor((this.x + this.w) / TILE) * TILE - this.w - 0.01
        this.vx = 0
      }
    } else if (this.vx < 0) {
      if (
        this.solidAt(solids, cols, rows, this.x, this.y + 1) ||
        this.solidAt(solids, cols, rows, this.x, this.y + this.h - 1)
      ) {
        this.x = Math.floor(this.x / TILE) * TILE + TILE + 0.01
        this.vx = 0
      }
    }

    // Y axis
    this.y += this.vy
    this.onGround = false
    this.headBlocked = false

    if (this.vy > 0) {
      if (
        this.solidAt(solids, cols, rows, this.x + 1, this.y + this.h) ||
        this.solidAt(solids, cols, rows, this.x + this.w - 1, this.y + this.h)
      ) {
        this.y = Math.floor((this.y + this.h) / TILE) * TILE - this.h - 0.01
        this.vy = 0
        this.onGround = true
        this.jumpsLeft = 2
        this.headBlocked = false
      }
    } else if (this.vy < 0) {
      if (
        this.solidAt(solids, cols, rows, this.x + 1, this.y) ||
        this.solidAt(solids, cols, rows, this.x + this.w - 1, this.y)
      ) {
        this.y = Math.floor(this.y / TILE) * TILE + TILE + 0.01
        this.vy = 0
        this.headBlocked = true // ceiling touch — no double-jump exploit
      }
    }

    // Extra head probe while ascending near ceiling (prevents wall-head double jump)
    if (!this.onGround && this.vy <= 0) {
      const headY = this.y - 1
      if (
        this.solidAt(solids, cols, rows, this.x + 2, headY) ||
        this.solidAt(solids, cols, rows, this.x + this.w - 2, headY)
      ) {
        this.headBlocked = true
      }
    }
  }

  private updateAnim() {
    if (this.dead) {
      this.anim = 'dead'
      return
    }
    if (this.warpCooldown > 20) {
      this.anim = 'warp'
    } else if (!this.onGround) {
      this.anim = this.vy < 0 ? 'jump' : 'fall'
    } else if (Math.abs(this.vx) > 0.3) {
      this.anim = 'run'
    } else {
      this.anim = 'idle'
    }
    this.frameTimer++
    const speed = this.anim === 'run' ? 5 : 8
    if (this.frameTimer >= speed) {
      this.frameTimer = 0
      this.frame = (this.frame + 1) % 4
    }
  }

  tryWarp(portals: PortalRuntime[], tile: number): boolean {
    if (this.warpCooldown > 0 || this.dead) return false
    const pr = this.rect()
    for (const p of portals) {
      const portalRect: Rect = {
        x: p.x * tile + 4,
        y: p.y * tile + 4,
        w: tile - 8,
        h: tile - 8,
      }
      if (aabb(pr, portalRect)) {
        this.x = p.destX * tile + (tile - this.w) / 2
        this.y = p.destY * tile + (tile - this.h) / 2
        this.vx = 0
        this.vy = 0
        this.warpCooldown = 40
        this.anim = 'warp'
        return true
      }
    }
    return false
  }
}
