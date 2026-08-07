export type Screen =
  | 'title'
  | 'mode'
  | 'levels'
  | 'playing'
  | 'paused'
  | 'won'
  | 'lost'

export type DifficultyId = 'casual' | 'classic' | 'hardcore' | 'chaos'

export type BrickKind =
  | 'normal'
  | 'armored'
  | 'explosive'
  | 'ghost'
  | 'crystal'
  | 'portal'

export type PowerUpKind =
  | 'multi'
  | 'laser'
  | 'sticky'
  | 'expand'
  | 'shrink'
  | 'warp'
  | 'shield'
  | 'magnet'

export interface DifficultyConfig {
  id: DifficultyId
  name: string
  tagline: string
  lives: number
  ballSpeed: number
  paddleWidth: number
  powerChance: number
  scoreMult: number
  accent: string
}

export interface LevelTheme {
  sky: [string, string]
  brickPalette: string[]
  ambient: string
}

export interface BrickDef {
  kind: BrickKind
  hp?: number
  color?: string
}

export interface LevelDef {
  id: number
  name: string
  subtitle: string
  rows: number
  cols: number
  layout: (BrickKind | null)[][]
  theme: LevelTheme
  unlockHint?: string
}

export interface Vec2 {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Ball {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  r: number
  stuck: boolean
  trail: Vec2[]
}

export interface Brick {
  id: number
  x: number
  y: number
  w: number
  h: number
  kind: BrickKind
  hp: number
  maxHp: number
  alive: boolean
  color: string
  phase: number
  flash: number
}

export interface Paddle {
  x: number
  y: number
  w: number
  h: number
  targetW: number
  sticky: boolean
  laser: boolean
  magnet: boolean
  laserCooldown: number
}

export interface PowerUp {
  id: number
  kind: PowerUpKind
  x: number
  y: number
  vy: number
  r: number
  born: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface LaserBolt {
  id: number
  x: number
  y: number
  h: number
}

export interface GameSnapshot {
  score: number
  lives: number
  combo: number
  maxCombo: number
  bricksLeft: number
  levelId: number
  levelName: string
  activePowers: PowerUpKind[]
  shield: number
  shake: number
}
