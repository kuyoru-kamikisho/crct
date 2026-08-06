import type { Direction } from '../types'

export class Input {
  private keys = new Set<string>()
  private justPressed = new Set<string>()

  constructor() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  private static readonly PREVENT = new Set([
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD',
    'Space',
    'KeyJ',
  ])

  private onKeyDown = (e: KeyboardEvent) => {
    const key = e.code
    if (Input.PREVENT.has(key)) {
      e.preventDefault()
    }
    if (!this.keys.has(key)) {
      this.justPressed.add(key)
    }
    this.keys.add(key)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code)
  }

  isDown(code: string): boolean {
    return this.keys.has(code)
  }

  wasPressed(code: string): boolean {
    return this.justPressed.has(code)
  }

  /** 每帧末尾清空瞬时按键 */
  endFrame(): void {
    this.justPressed.clear()
  }

  getMoveDirection(): Direction | null {
    if (this.isDown('ArrowUp') || this.isDown('KeyW')) return 'up'
    if (this.isDown('ArrowDown') || this.isDown('KeyS')) return 'down'
    if (this.isDown('ArrowLeft') || this.isDown('KeyA')) return 'left'
    if (this.isDown('ArrowRight') || this.isDown('KeyD')) return 'right'
    return null
  }

  isFire(): boolean {
    return this.isDown('Space') || this.isDown('KeyJ')
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }
}
