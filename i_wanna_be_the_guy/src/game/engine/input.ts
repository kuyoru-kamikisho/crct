type KeyMap = Record<string, boolean>

export class Input {
  private down: KeyMap = {}
  private pressed: KeyMap = {}
  private released: KeyMap = {}
  private bound = false

  private onDown = (e: KeyboardEvent) => {
    const k = this.norm(e.code)
    if (!k) return
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault()
    }
    if (!this.down[k]) this.pressed[k] = true
    this.down[k] = true
  }

  private onUp = (e: KeyboardEvent) => {
    const k = this.norm(e.code)
    if (!k) return
    this.down[k] = false
    this.released[k] = true
  }

  private norm(code: string): string | null {
    switch (code) {
      case 'KeyA':
      case 'ArrowLeft':
        return 'left'
      case 'KeyD':
      case 'ArrowRight':
        return 'right'
      case 'Space':
      case 'KeyW':
      case 'ArrowUp':
      case 'KeyZ':
        return 'jump'
      case 'KeyR':
        return 'reset'
      case 'KeyP':
      case 'Escape':
        return 'pause'
      case 'KeyX':
      case 'KeyJ':
        return 'attack'
      case 'Enter':
        return 'confirm'
      default:
        return null
    }
  }

  bind() {
    if (this.bound) return
    window.addEventListener('keydown', this.onDown)
    window.addEventListener('keyup', this.onUp)
    this.bound = true
  }

  unbind() {
    window.removeEventListener('keydown', this.onDown)
    window.removeEventListener('keyup', this.onUp)
    this.bound = false
  }

  /** Call at end of frame */
  lateUpdate() {
    this.pressed = {}
    this.released = {}
  }

  isDown(k: string) {
    return !!this.down[k]
  }

  justPressed(k: string) {
    return !!this.pressed[k]
  }

  justReleased(k: string) {
    return !!this.released[k]
  }

  clear() {
    this.down = {}
    this.pressed = {}
    this.released = {}
  }
}
