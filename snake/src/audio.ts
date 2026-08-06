export class AudioEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private master = 0.22;

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 1,
    slideTo?: number,
  ): void {
    const ctx = this.ensure();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(this.master * volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  eat(kind: 'apple' | 'golden' | 'berry' | 'chili'): void {
    if (kind === 'golden') {
      this.tone(523, 0.08, 'triangle', 1.1);
      setTimeout(() => this.tone(784, 0.12, 'triangle', 1), 60);
      setTimeout(() => this.tone(1046, 0.16, 'sine', 0.8), 120);
    } else if (kind === 'berry') {
      this.tone(440, 0.1, 'sine', 0.9, 280);
    } else if (kind === 'chili') {
      this.tone(220, 0.08, 'sawtooth', 0.55, 660);
    } else {
      this.tone(480, 0.07, 'square', 0.55);
      setTimeout(() => this.tone(720, 0.08, 'square', 0.4), 45);
    }
  }

  move(): void {
    this.tone(180, 0.025, 'triangle', 0.18);
  }

  pause(): void {
    this.tone(330, 0.06, 'sine', 0.5);
    setTimeout(() => this.tone(260, 0.08, 'sine', 0.4), 70);
  }

  resume(): void {
    this.tone(260, 0.06, 'sine', 0.5);
    setTimeout(() => this.tone(330, 0.08, 'sine', 0.4), 70);
  }

  gameOver(): void {
    this.tone(400, 0.12, 'sawtooth', 0.5, 120);
    setTimeout(() => this.tone(220, 0.18, 'triangle', 0.45, 80), 100);
    setTimeout(() => this.tone(110, 0.28, 'sine', 0.55), 220);
  }

  start(): void {
    this.tone(392, 0.08, 'triangle', 0.7);
    setTimeout(() => this.tone(523, 0.08, 'triangle', 0.7), 80);
    setTimeout(() => this.tone(659, 0.14, 'triangle', 0.8), 160);
  }

  combo(level: number): void {
    const base = 500 + Math.min(level, 8) * 40;
    this.tone(base, 0.05, 'sine', 0.45);
  }

  ui(): void {
    this.tone(620, 0.04, 'sine', 0.35);
  }
}
