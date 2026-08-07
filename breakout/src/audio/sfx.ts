/** Lightweight synthesized SFX via Web Audio — no asset files needed. */

type Tone = {
  freq: number
  dur: number
  type?: OscillatorType
  gain?: number
  slide?: number
}

let ctx: AudioContext | null = null
let muted = false

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function playTone({ freq, dur, type = 'sine', gain = 0.08, slide }: Tone) {
  if (muted) return
  const audio = ac()
  const osc = audio.createOscillator()
  const g = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, audio.currentTime)
  if (slide) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, freq * slide),
      audio.currentTime + dur,
    )
  }
  g.gain.setValueAtTime(gain, audio.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur)
  osc.connect(g)
  g.connect(audio.destination)
  osc.start()
  osc.stop(audio.currentTime + dur + 0.02)
}

export const sfx = {
  setMuted(v: boolean) {
    muted = v
  },
  isMuted() {
    return muted
  },
  unlock() {
    void ac().resume()
  },
  bounce() {
    playTone({ freq: 320, dur: 0.06, type: 'triangle', gain: 0.05 })
  },
  brick() {
    playTone({ freq: 520, dur: 0.08, type: 'square', gain: 0.045, slide: 0.6 })
  },
  crystal() {
    playTone({ freq: 880, dur: 0.14, type: 'sine', gain: 0.06, slide: 1.6 })
    playTone({ freq: 1320, dur: 0.1, type: 'sine', gain: 0.03 })
  },
  explode() {
    playTone({ freq: 120, dur: 0.22, type: 'sawtooth', gain: 0.07, slide: 0.35 })
  },
  power() {
    playTone({ freq: 440, dur: 0.1, type: 'sine', gain: 0.05 })
    playTone({ freq: 660, dur: 0.12, type: 'sine', gain: 0.04 })
  },
  laser() {
    playTone({ freq: 700, dur: 0.05, type: 'sawtooth', gain: 0.035, slide: 2 })
  },
  loseLife() {
    playTone({ freq: 220, dur: 0.28, type: 'triangle', gain: 0.07, slide: 0.4 })
  },
  win() {
    ;[523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => playTone({ freq: f, dur: 0.18, type: 'sine', gain: 0.06 }), i * 90)
    })
  },
  lose() {
    playTone({ freq: 180, dur: 0.4, type: 'sawtooth', gain: 0.06, slide: 0.3 })
  },
  ui() {
    playTone({ freq: 640, dur: 0.05, type: 'sine', gain: 0.035 })
  },
}
