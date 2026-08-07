import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Game, type GameHudSnapshot } from './game/Game'
import { VIEW_H, VIEW_W } from './game/config'
import './App.css'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<Game | null>(null)
  const [hud, setHud] = useState<GameHudSnapshot | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const game = new Game(canvas)
    gameRef.current = game
    const unsub = game.subscribe(setHud)
    game.start()
    return () => {
      unsub()
      game.stop()
    }
  }, [])

  const onStart = useCallback(() => {
    gameRef.current?.beginGame(0)
    setStarted(true)
  }, [])

  const onPauseBtn = useCallback(() => {
    gameRef.current?.togglePause()
  }, [])

  const onResume = useCallback(() => {
    gameRef.current?.resume()
  }, [])

  const onRetry = useCallback(() => {
    gameRef.current?.resetToSave()
  }, [])

  const onRestart = useCallback(() => {
    gameRef.current?.beginGame(0)
    setStarted(true)
  }, [])

  const scale = Math.min(
    typeof window !== 'undefined' ? (window.innerWidth - 48) / VIEW_W : 1,
    typeof window !== 'undefined' ? (window.innerHeight - 80) / VIEW_H : 1,
    1.15,
  )

  return (
    <div className="app-shell">
      <div
        className="stage"
        style={{ width: VIEW_W * scale, height: VIEW_H * scale }}
      >
        <canvas ref={canvasRef} className="game-canvas" width={VIEW_W} height={VIEW_H} />

        {/* Danmaku / tips */}
        <div className="danmaku-layer">
          <AnimatePresence mode="popLayout">
            {hud?.danmaku && (
              <motion.div
                key={hud.danmakuKey}
                className="danmaku"
                initial={{ opacity: 0, y: -12, x: 40 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              >
                {hud.danmaku}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pause button */}
        {started && hud?.state !== 'title' && hud?.state !== 'cleared' && (
          <motion.button
            className="pause-btn"
            onClick={onPauseBtn}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            aria-label="暂停"
          >
            <span className="pause-icon" />
          </motion.button>
        )}

        {/* HUD strip */}
        {started && hud && hud.state !== 'title' && (
          <div className="hud-strip">
            <span>Lv.{hud.levelId} {hud.levelName}</span>
            <span>死亡 {hud.deaths}</span>
            <span>★ {hud.collects}/{hud.collectTotal}</span>
          </div>
        )}

        {/* Title */}
        <AnimatePresence>
          {(!started || hud?.state === 'title') && (
            <motion.div
              className="overlay title-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.35 }}
            >
              <motion.div
                className="title-card"
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.1 }}
              >
                <p className="eyebrow">HARDCORE PIXEL PLATFORMER</p>
                <h1>I Wanna · 菲比啾比</h1>
                <p className="subtitle">对标 IWBTG 手感 · 精致像素闯关</p>
                <ul className="controls">
                  <li><kbd>A</kbd>/<kbd>D</kbd> 移动</li>
                  <li><kbd>Space</kbd> 跳跃 / 二段跳</li>
                  <li><kbd>X</kbd> 射击 · <kbd>R</kbd> 重置 · <kbd>Esc</kbd> 暂停</li>
                </ul>
                <motion.button
                  className="primary-btn"
                  onClick={onStart}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                >
                  开始闯关
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pause menu */}
        <AnimatePresence>
          {hud?.state === 'paused' && (
            <motion.div
              className="overlay dim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="panel"
                initial={{ scale: 0.88, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              >
                <h2>暂停</h2>
                <p className="hint">{hud.hint}</p>
                <motion.button className="primary-btn" onClick={onResume} whileTap={{ scale: 0.96 }}>
                  继续游戏
                </motion.button>
                <motion.button className="ghost-btn" onClick={onRetry} whileTap={{ scale: 0.96 }}>
                  重置到存档点
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cleared */}
        <AnimatePresence>
          {hud?.state === 'cleared' && (
            <motion.div
              className="overlay dim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="panel clear-panel"
                initial={{ scale: 0.8, rotate: -2, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 18 }}
              >
                <h2>通关！</h2>
                <p>你就是 The Guy</p>
                <p className="stats">累计死亡 {hud.deaths} 次</p>
                <motion.button className="primary-btn" onClick={onRestart} whileTap={{ scale: 0.96 }}>
                  再玩一次
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Death flash vignette */}
        <AnimatePresence>
          {hud?.state === 'dead' && (
            <motion.div
              className="death-flash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
      </div>

      <footer className="footer-hint">
        二段跳无法通过头顶蹭墙触发 · 触刺即死 · 传送门跨层瞬移
      </footer>
    </div>
  )
}
