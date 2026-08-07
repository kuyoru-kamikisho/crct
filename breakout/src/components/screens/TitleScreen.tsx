import { motion } from 'framer-motion'
import { Button } from '../ui/Button'
import { ScreenShell } from '../ui/ScreenShell'
import { sfx } from '../../audio/sfx'

type Props = {
  muted: boolean
  onToggleMute: () => void
  onStart: () => void
}

export function TitleScreen({ muted, onToggleMute, onStart }: Props) {
  return (
    <ScreenShell className="title-screen">
      <div className="title-atmosphere" aria-hidden>
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
        <div className="tide-line" />
      </div>

      <header className="title-top">
        <button
          type="button"
          className="icon-chip"
          onClick={() => {
            sfx.ui()
            onToggleMute()
          }}
          aria-label={muted ? '开启声音' : '关闭声音'}
        >
          {muted ? '静音' : '音效'}
        </button>
      </header>

      <div className="title-hero">
        <motion.p
          className="brand-kicker"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          ARKANOID REIMAGINED
        </motion.p>
        <motion.h1
          className="brand"
          initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.18, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Lumen
          <span>Break</span>
        </motion.h1>
        <motion.p
          className="brand-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          流光打砖块 — 在潮汐与棱镜之间，击碎整片夜色。
        </motion.p>

        <motion.div
          className="title-cta"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <Button
            onClick={() => {
              sfx.unlock()
              sfx.ui()
              onStart()
            }}
          >
            进入光潮
          </Button>
        </motion.div>
      </div>

      <footer className="title-foot">
        <span>鼠标 / 触控移动挡板</span>
        <span>空格发射 · Esc 暂停</span>
        <span>激光道具时按 F 开火</span>
      </footer>
    </ScreenShell>
  )
}
