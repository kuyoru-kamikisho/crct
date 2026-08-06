import './styles/main.scss'
import { Input } from './game/Input.coffee'
import { Sfx } from './game/Sfx.coffee'
import { Game } from './game/Game.coffee'
import { UI } from './game/UI.coffee'

# Polyfill roundRect for older browsers
unless CanvasRenderingContext2D::roundRect
  CanvasRenderingContext2D::roundRect = (x, y, w, h, r) ->
    r = Math.min r, w / 2, h / 2
    @moveTo x + r, y
    @arcTo x + w, y, x + w, y + h, r
    @arcTo x + w, y + h, x, y + h, r
    @arcTo x, y + h, x, y, r
    @arcTo x, y, x + w, y, r
    @closePath()

canvas = document.getElementById 'game-canvas'
input = new Input()
input.bind()
sfx = new Sfx()

ui = null
game = new Game canvas, input, sfx, (type, data) -> ui?.onGameEvent type, data
ui = new UI game, sfx

# 首次交互解锁音频
unlock = ->
  sfx.resume()
  window.removeEventListener 'pointerdown', unlock
  window.removeEventListener 'keydown', unlock
window.addEventListener 'pointerdown', unlock
window.addEventListener 'keydown', unlock

console.log '%c滑雪大冒险 Ski Safari', 'color:#7fd4ff;font-size:14px;font-weight:bold'
