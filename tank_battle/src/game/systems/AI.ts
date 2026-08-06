import type { Direction } from '../types'
import { ALL_DIRECTIONS, ENEMY_FIRE_COOLDOWN, OPPOSITE } from '../constants'
import type { Bullet, Tank } from '../entities/Tank'
import { now, pickRandom, randomInt } from '../utils'

/**
 * 简单敌方 AI：随机游走 + 偶发转向 + 随机开火
 * 撞墙时优先换向
 */
export function updateEnemyAI(
  tank: Tank,
  tanks: Tank[],
  tryMove: (tank: Tank, dir: Direction) => boolean,
  tryFire: (tank: Tank) => Bullet | null,
): Bullet | null {
  const t = now()

  if (t >= tank.nextThinkAt) {
    tank.nextThinkAt = t + randomInt(400, 1400)
    if (Math.random() < 0.7) {
      tank.direction = pickRandom(ALL_DIRECTIONS)
    } else if (Math.random() < 0.3) {
      tank.direction = OPPOSITE[tank.direction]
    }
  }

  const moved = tryMove(tank, tank.direction)
  if (!moved) {
    const alternatives = ALL_DIRECTIONS.filter((d) => d !== tank.direction)
    tank.direction = pickRandom(alternatives)
    tryMove(tank, tank.direction)
  }

  const player = tanks.find((x) => x.isPlayer && x.alive)
  let fireChance = 0.012
  if (player) {
    const aligned =
      (tank.direction === 'up' &&
        Math.abs(tank.x - player.x) < 24 &&
        tank.y > player.y) ||
      (tank.direction === 'down' &&
        Math.abs(tank.x - player.x) < 24 &&
        tank.y < player.y) ||
      (tank.direction === 'left' &&
        Math.abs(tank.y - player.y) < 24 &&
        tank.x > player.x) ||
      (tank.direction === 'right' &&
        Math.abs(tank.y - player.y) < 24 &&
        tank.x < player.x)
    if (aligned) fireChance = 0.08
  }

  if (Math.random() < fireChance && tank.canFire(ENEMY_FIRE_COOLDOWN, t)) {
    return tryFire(tank)
  }
  return null
}
