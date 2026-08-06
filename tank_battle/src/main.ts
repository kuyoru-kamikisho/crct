import './styles/main.scss'
import { Game } from './game/Game'

const canvas = document.getElementById('game') as HTMLCanvasElement
if (!canvas) {
  throw new Error('未找到游戏画布 #game')
}

const game = new Game(canvas)

// 便于调试
;(window as unknown as { __tankGame: Game }).__tankGame = game
