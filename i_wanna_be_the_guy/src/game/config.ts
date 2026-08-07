/** IWBTG-style physics & world constants */
export const TILE = 32
export const VIEW_W = 800
export const VIEW_H = 608 // 19 tiles
export const COLS = VIEW_W / TILE // 25
export const ROWS = VIEW_H / TILE // 19

/** Classic IWBTG-ish feel at ~60fps */
export const PHYS = {
  gravity: 0.42,
  jumpForce: -8.4,
  doubleJumpForce: -7.6,
  maxFall: 9.0,
  moveSpeed: 3.0,
  airAccel: 0.55,
  groundAccel: 0.9,
  friction: 0.65,
  bulletSpeed: 8,
  bulletLife: 45,
} as const

export const COLORS = {
  bg: '#d8dde6',
  bgDiamond: '#c9d0dc',
  bgSigil: '#b8c0ce',
  metal: '#8a919c',
  metalLight: '#aeb5c0',
  metalDark: '#6a717c',
  metalEdge: '#5a616c',
  rivet: '#3a4048',
  spike: '#e8eef5',
  spikeShadow: '#9aa3b0',
  spikeEdge: '#6a7380',
  portalCore: '#0a0a0c',
  portalGlowInner: '#ffaa22',
  portalGlowOuter: '#ff6622',
  save: '#5ecf7a',
  saveGlow: '#a8f0b8',
  goal: '#6ec8ff',
  collect: '#ffd34e',
  blood: '#e8455a',
  ui: '#4a90d9',
  text: '#2a3340',
  textSoft: '#5a6575',
} as const

export type GameState =
  | 'title'
  | 'playing'
  | 'paused'
  | 'dead'
  | 'cleared'
  | 'hint'
