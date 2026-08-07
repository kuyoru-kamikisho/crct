import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { POWER_META } from '../../data/levels'
import { DIFFICULTIES } from '../../data/difficulties'
import { CANVAS_H, CANVAS_W, GameEngine } from '../../game/engine'
import { renderGame } from '../../game/render'
import type { DifficultyId, GameSnapshot, Screen } from '../../types/game'
import { sfx } from '../../audio/sfx'
import { Button } from '../ui/Button'

type Props = {
  levelId: number
  difficultyId: DifficultyId
  onExit: () => void
  onCleared: (levelId: number, score: number) => void
  onScreen: (s: Extract<Screen, 'playing' | 'paused' | 'won' | 'lost'>) => void
}

export function GameScreen({
  levelId,
  difficultyId,
  onExit,
  onCleared,
  onScreen,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [snap, setSnap] = useState<GameSnapshot | null>(null)
  const [phase, setPhase] = useState<'playing' | 'paused' | 'won' | 'lost'>('playing')
  const reported = useRef(false)

  useEffect(() => {
    const engine = new GameEngine(levelId, difficultyId)
    engineRef.current = engine
    reported.current = false
    engine.setListener((s) => setSnap(s))
    engine.start()
    setPhase('playing')
    onScreen('playing')

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      engine.update(dt)
      renderGame(ctx, engine, now)
      if (engine.over && !reported.current) {
        reported.current = true
        setPhase(engine.over)
        onScreen(engine.over)
        if (engine.over === 'won') onCleared(levelId, engine.score)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * CANVAS_W
      engine.setPointer(x)
    }
    const onDown = () => {
      sfx.unlock()
      engine.launch()
      if (engine.paddle.laser) engine.fireLaser()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') engine.keys.left = e.type === 'keydown'
      if (e.code === 'ArrowRight' || e.code === 'KeyD') engine.keys.right = e.type === 'keydown'
      if (e.type === 'keydown') {
        if (e.code === 'Space') {
          e.preventDefault()
          engine.launch()
        }
        if (e.code === 'KeyF') engine.fireLaser()
        if (e.code === 'Escape') {
          if (engine.over) return
          if (engine.running) {
            engine.pause()
            setPhase('paused')
            onScreen('paused')
          } else if (phase !== 'won' && phase !== 'lost') {
            engine.resume()
            setPhase('playing')
            onScreen('playing')
          }
        }
      }
    }

    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId, difficultyId])

  const diff = DIFFICULTIES[difficultyId]

  return (
    <div className="game-screen">
      <div className="game-hud">
        <div className="hud-left">
          <Button
            variant="ghost"
            onClick={() => {
              engineRef.current?.pause()
              setPhase('paused')
              onScreen('paused')
            }}
          >
            暂停
          </Button>
          <div className="hud-title">
            <strong>{snap?.levelName ?? '—'}</strong>
            <span style={{ color: diff.accent }}>{diff.name}</span>
          </div>
        </div>
        <div className="hud-stats">
          <div className="stat">
            <span>分数</span>
            <strong>{snap?.score ?? 0}</strong>
          </div>
          <div className="stat">
            <span>连击</span>
            <strong className={snap && snap.combo > 2 ? 'hot' : ''}>
              ×{snap?.combo ?? 0}
            </strong>
          </div>
          <div className="stat">
            <span>生命</span>
            <strong>{'●'.repeat(snap?.lives ?? 0)}{'○'.repeat(Math.max(0, diff.lives - (snap?.lives ?? 0)))}</strong>
          </div>
          <div className="stat">
            <span>剩余</span>
            <strong>{snap?.bricksLeft ?? 0}</strong>
          </div>
        </div>
      </div>

      <div className="canvas-frame">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="game-canvas"
        />
        {snap && snap.activePowers.length > 0 && (
          <div className="power-bar">
            {snap.activePowers.map((k) => (
              <span key={k} style={{ background: POWER_META[k].color }}>
                {POWER_META[k].label}
              </span>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {phase === 'paused' && (
          <Overlay
            title="潮汐暂歇"
            desc="呼吸一下，光球还在等你。"
            primary="继续"
            secondary="离开关卡"
            onPrimary={() => {
              engineRef.current?.resume()
              setPhase('playing')
              onScreen('playing')
            }}
            onSecondary={onExit}
          />
        )}
        {phase === 'won' && (
          <Overlay
            title="光域已碎"
            desc={`得分 ${snap?.score ?? 0} · 最高连击 ×${snap?.maxCombo ?? 0}`}
            primary="返回选关"
            onPrimary={onExit}
            celebrate
          />
        )}
        {phase === 'lost' && (
          <Overlay
            title="沉入暗潮"
            desc={`本局得分 ${snap?.score ?? 0}，再试一次吧。`}
            primary="返回选关"
            onPrimary={onExit}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Overlay({
  title,
  desc,
  primary,
  secondary,
  onPrimary,
  onSecondary,
  celebrate,
}: {
  title: string
  desc: string
  primary: string
  secondary?: string
  onPrimary: () => void
  onSecondary?: () => void
  celebrate?: boolean
}) {
  return (
    <motion.div
      className={`overlay ${celebrate ? 'celebrate' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="overlay-card"
        initial={{ y: 24, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      >
        <h3>{title}</h3>
        <p>{desc}</p>
        <div className="overlay-actions">
          <Button onClick={onPrimary}>{primary}</Button>
          {secondary && onSecondary && (
            <Button variant="ghost" onClick={onSecondary}>
              {secondary}
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
