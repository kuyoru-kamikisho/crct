import type { Direction } from '../types'

export class Input {
  private keys = new Set<string>()
  private justPressed = new Set<string>()

  constructor() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const key = e.code
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(key)) {
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
    if (this.isDown('ArrowUp')) return 'up'
    if (this.isDown('ArrowDown')) return 'down'
    if (this.isDown('ArrowLeft')) return 'left'
    if (this.isDown('ArrowRight')) return 'right'
    return null
  }

  isFire(): boolean {
    return this.isDown('Space')
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }
}
