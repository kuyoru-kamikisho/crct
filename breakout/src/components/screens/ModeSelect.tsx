import { motion } from 'framer-motion'
import { DIFFICULTY_LIST } from '../../data/difficulties'
import type { DifficultyId } from '../../types/game'
import { sfx } from '../../audio/sfx'
import { Button } from '../ui/Button'
import { ScreenShell } from '../ui/ScreenShell'

type Props = {
  selected: DifficultyId
  onSelect: (id: DifficultyId) => void
  onBack: () => void
  onNext: () => void
}

export function ModeSelect({ selected, onSelect, onBack, onNext }: Props) {
  return (
    <ScreenShell className="mode-screen">
      <div className="panel-head">
        <Button variant="ghost" onClick={onBack}>
          返回
        </Button>
        <div>
          <h2>选择难度</h2>
          <p>每种模式会改写球速、挡板与道具密度</p>
        </div>
      </div>

      <div className="mode-grid">
        {DIFFICULTY_LIST.map((d, i) => {
          const active = d.id === selected
          return (
            <motion.button
              key={d.id}
              type="button"
              className={`mode-card ${active ? 'active' : ''}`}
              style={{ ['--mode-accent' as string]: d.accent }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i }}
              whileHover={{ y: -4 }}
              onClick={() => {
                sfx.ui()
                onSelect(d.id)
              }}
            >
              <span className="mode-name">{d.name}</span>
              <span className="mode-tag">{d.tagline}</span>
              <div className="mode-meta">
                <span>生命 {d.lives}</span>
                <span>倍率 ×{d.scoreMult}</span>
              </div>
            </motion.button>
          )
        })}
      </div>

      <div className="panel-actions">
        <Button
          glow={DIFFICULTY_LIST.find((d) => d.id === selected)?.accent}
          onClick={() => {
            sfx.ui()
            onNext()
          }}
        >
          选择关卡
        </Button>
      </div>
    </ScreenShell>
  )
}
