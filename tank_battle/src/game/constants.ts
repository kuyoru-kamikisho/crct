import type { Direction } from './types'

/** 地图：26×26 格（经典 FC 规格） */
export const MAP_COLS = 26
export const MAP_ROWS = 26
export const TILE_SIZE = 24
export const MAP_WIDTH = MAP_COLS * TILE_SIZE
export const MAP_HEIGHT = MAP_ROWS * TILE_SIZE

/** 坦克占 2×2 格 */
export const TANK_SIZE = TILE_SIZE * 2
export const BULLET_SIZE = 6

export const PLAYER_SPEED = 1.6
export const ENEMY_SPEED = 1.1
export const BULLET_SPEED = 4.2

export const PLAYER_LIVES = 3
export const PLAYER_FIRE_COOLDOWN = 320
export const ENEMY_FIRE_COOLDOWN = 900
export const ENEMY_SPAWN_INTERVAL = 2800
export const MAX_ENEMIES_ON_FIELD = 4
export const SCORE_PER_KILL = 100

export const INVINCIBLE_MS = 2500

export const DIR_DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
}

export const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

export const ALL_DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']

/** 敌方出生点（顶部三处） */
export const ENEMY_SPAWN_POINTS = [
  { x: 0, y: 0 },
  { x: (MAP_COLS / 2 - 1) * TILE_SIZE, y: 0 },
  { x: (MAP_COLS - 2) * TILE_SIZE, y: 0 },
]

/** 玩家出生点（基地上方） */
export const PLAYER_SPAWN = {
  x: 8 * TILE_SIZE,
  y: 24 * TILE_SIZE,
}

/** 基地位置（底部中央，2×2） */
export const BASE_TILE = { col: 12, row: 24 }
