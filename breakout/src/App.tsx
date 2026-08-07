import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { GameScreen } from './components/screens/GameScreen'
import { LevelSelect } from './components/screens/LevelSelect'
import { ModeSelect } from './components/screens/ModeSelect'
import { TitleScreen } from './components/screens/TitleScreen'
import { sfx } from './audio/sfx'
import type { DifficultyId, Screen } from './types/game'

const CLEARED_KEY = 'lumen-break-cleared'
const MUTE_KEY = 'lumen-break-muted'

function loadCleared(): number[] {
  try {
    const raw = localStorage.getItem(CLEARED_KEY)
    return raw ? (JSON.parse(raw) as number[]) : []
  } catch {
    return []
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [difficulty, setDifficulty] = useState<DifficultyId>('classic')
  const [levelId, setLevelId] = useState(1)
  const [cleared, setCleared] = useState<number[]>(loadCleared)
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === '1')
  const [best, setBest] = useState(0)

  useEffect(() => {
    sfx.setMuted(muted)
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  }, [muted])

  const markCleared = (id: number, score: number) => {
    setBest((b) => Math.max(b, score))
    setCleared((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      localStorage.setItem(CLEARED_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <div className="app-root">
      <div className="bg-wash" aria-hidden />
      <AnimatePresence mode="wait">
        {screen === 'title' && (
          <TitleScreen
            key="title"
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            onStart={() => setScreen('mode')}
          />
        )}
        {screen === 'mode' && (
          <ModeSelect
            key="mode"
            selected={difficulty}
            onSelect={setDifficulty}
            onBack={() => setScreen('title')}
            onNext={() => setScreen('levels')}
          />
        )}
        {screen === 'levels' && (
          <LevelSelect
            key="levels"
            cleared={cleared}
            selected={levelId}
            onSelect={setLevelId}
            onBack={() => setScreen('mode')}
            onPlay={() => setScreen('playing')}
          />
        )}
        {(screen === 'playing' ||
          screen === 'paused' ||
          screen === 'won' ||
          screen === 'lost') && (
          <GameScreen
            key={`game-${levelId}-${difficulty}`}
            levelId={levelId}
            difficultyId={difficulty}
            onExit={() => setScreen('levels')}
            onCleared={markCleared}
            onScreen={(s) => setScreen(s)}
          />
        )}
      </AnimatePresence>
      {best > 0 && screen === 'title' && (
        <div className="best-chip">本机最高分 {best}</div>
      )}
    </div>
  )
}
