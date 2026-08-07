import { motion } from 'framer-motion'
import { LEVELS } from '../../data/levels'
import { sfx } from '../../audio/sfx'
import { Button } from '../ui/Button'
import { ScreenShell } from '../ui/ScreenShell'

type Props = {
  cleared: number[]
  selected: number
  onSelect: (id: number) => void
  onBack: () => void
  onPlay: () => void
}

export function LevelSelect({
  cleared,
  selected,
  onSelect,
  onBack,
  onPlay,
}: Props) {
  return (
    <ScreenShell className="level-screen">
      <div className="panel-head">
        <Button variant="ghost" onClick={onBack}>
          返回
        </Button>
        <div>
          <h2>关卡图谱</h2>
          <p>八片光域，各有砖型与气质</p>
        </div>
      </div>

      <div className="level-grid">
        {LEVELS.map((lv, i) => {
          const isLocked = lv.id > 1 && !cleared.includes(lv.id - 1)
          const done = cleared.includes(lv.id)
          const active = selected === lv.id
          return (
            <motion.button
              key={lv.id}
              type="button"
              disabled={isLocked}
              className={`level-card ${active ? 'active' : ''} ${done ? 'done' : ''} ${isLocked ? 'locked' : ''}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i }}
              whileHover={isLocked ? undefined : { y: -3 }}
              onClick={() => {
                if (isLocked) return
                sfx.ui()
                onSelect(lv.id)
              }}
            >
              <div
                className="level-swatch"
                style={{
                  background: `linear-gradient(145deg, ${lv.theme.sky[0]}, ${lv.theme.brickPalette[0]})`,
                }}
              />
              <div className="level-info">
                <span className="level-id">0{lv.id}</span>
                <strong>{lv.name}</strong>
                <span>{isLocked ? '先通关上一关' : lv.subtitle}</span>
              </div>
              {done && <span className="level-badge">已通关</span>}
            </motion.button>
          )
        })}
      </div>

      <div className="panel-actions">
        <Button
          onClick={() => {
            sfx.ui()
            onPlay()
          }}
        >
          开始 · {LEVELS.find((l) => l.id === selected)?.name}
        </Button>
      </div>
    </ScreenShell>
  )
}
