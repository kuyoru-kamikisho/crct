import type { Direction, Rect } from './types'
import { DIR_DELTA } from './constants'

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function pickRandom<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)]
}

export function moveRect(rect: Rect, direction: Direction, distance: number): Rect {
  const { dx, dy } = DIR_DELTA[direction]
  return {
    x: rect.x + dx * distance,
    y: rect.y + dy * distance,
    w: rect.w,
    h: rect.h,
  }
}

export function now(): number {
  return performance.now()
}
