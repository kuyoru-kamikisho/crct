import type {
  ActiveEffect,
  Difficulty,
  GameMode,
  GameState,
  GameStats,
  Settings,
} from './types';
import {
  CELL,
  COMBO_WINDOW_TICKS,
  DIFF_LABEL,
  EFFECT_DURATION_TICKS,
  FOOD_SCORE,
  GRID_COLS,
  GRID_ROWS,
  MODE_LABEL,
  SETTINGS_KEY,
  STORAGE_KEY,
  TICK_MS,
} from './constants';
import { AudioEngine } from './audio';
import { ParticleSystem } from './particles';
import { InputController } from './input';
import { Snake } from './snake';
import { FoodManager, generateMaze } from './food';
import { Renderer } from './renderer';
import type { Food, Point } from './types';

interface HighScores {
  classic: number;
  wrap: number;
  maze: number;
}

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: Renderer;
  readonly input: InputController;
  readonly audio = new AudioEngine();
  readonly particles = new ParticleSystem();
  readonly snake = new Snake();
  readonly foods = new FoodManager();

  state: GameState = 'menu';
  settings: Settings = { mode: 'classic', difficulty: 'normal', sound: true };
  walls: Point[] = [];
  effect: ActiveEffect | null = null;
  stats: GameStats = this.emptyStats();
  highScores: HighScores = { classic: 0, wrap: 0, maze: 0 };

  private tickAccum = 0;
  private tickInterval = TICK_MS.normal;
  private lastTs = 0;
  private raf = 0;
  private comboTicksLeft = 0;
  private flash = 0;
  private playTimeAcc = 0;
  private onHud: ((g: Game) => void) | null = null;
  private floatingTexts: Array<{ text: string; x: number; y: number; life: number; color: string }> =
    [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new InputController();
    this.input.bindTouchSurface(canvas);
    this.input.onAction = (action) => this.handleAction(action);
    this.load();
    this.audio.setEnabled(this.settings.sound);
  }

  onUpdate(cb: (g: Game) => void): void {
    this.onHud = cb;
  }

  private emptyStats(): GameStats {
    return {
      score: 0,
      highScore: 0,
      length: 3,
      combo: 0,
      maxCombo: 0,
      foodsEaten: 0,
      elapsedMs: 0,
    };
  }

  private load(): void {
    try {
      const hs = localStorage.getItem(STORAGE_KEY);
      if (hs) this.highScores = { ...this.highScores, ...JSON.parse(hs) };
      const st = localStorage.getItem(SETTINGS_KEY);
      if (st) this.settings = { ...this.settings, ...JSON.parse(st) };
    } catch {
      /* ignore */
    }
    this.stats.highScore = this.highScores[this.settings.mode];
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.highScores));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      /* ignore */
    }
  }

  setMode(mode: GameMode): void {
    this.settings.mode = mode;
    this.stats.highScore = this.highScores[mode];
    this.save();
    this.audio.ui();
    this.emit();
  }

  setDifficulty(d: Difficulty): void {
    this.settings.difficulty = d;
    this.tickInterval = TICK_MS[d];
    this.save();
    this.audio.ui();
    this.emit();
  }

  toggleSound(): void {
    this.settings.sound = !this.settings.sound;
    this.audio.setEnabled(this.settings.sound);
    this.save();
    if (this.settings.sound) this.audio.ui();
    this.emit();
  }

  start(): void {
    this.walls = this.settings.mode === 'maze' ? generateMaze() : [];
    this.snake.reset();
    this.foods.clear();
    this.particles.clear();
    this.floatingTexts = [];
    this.effect = null;
    this.comboTicksLeft = 0;
    this.flash = 0;
    this.playTimeAcc = 0;
    this.tickAccum = 0;
    this.tickInterval = TICK_MS[this.settings.difficulty];
    this.stats = this.emptyStats();
    this.stats.highScore = this.highScores[this.settings.mode];
    this.stats.length = this.snake.length;
    this.input.reset('right');
    this.foods.ensureCount(1, this.blockedCells());
    this.state = 'playing';
    this.audio.start();
    this.emit();
  }

  private blockedCells(): Point[] {
    return [...this.snake.body, ...this.walls];
  }

  private wallSet(): Set<string> {
    return new Set(this.walls.map((w) => `${w.x},${w.y}`));
  }

  handleAction(action: 'pause' | 'restart' | 'confirm'): void {
    if (action === 'confirm') {
      if (this.state === 'menu' || this.state === 'gameover') this.start();
      else if (this.state === 'paused') this.resume();
      return;
    }
    if (action === 'restart') {
      if (this.state === 'playing' || this.state === 'paused' || this.state === 'gameover') {
        this.start();
      }
      return;
    }
    // pause
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.audio.pause();
    this.emit();
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.lastTs = performance.now();
    this.audio.resume();
    this.emit();
  }

  pushDir(dir: 'up' | 'down' | 'left' | 'right'): void {
    if (this.state === 'playing') this.input.pushDirection(dir);
  }

  private effectiveTick(): number {
    let t = this.tickInterval;
    if (this.effect?.kind === 'slow') t *= 1.55;
    if (this.effect?.kind === 'fast') t *= 0.62;
    return t;
  }

  startLoop(): void {
    this.lastTs = performance.now();
    const frame = (ts: number) => {
      this.raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
      this.lastTs = ts;
      this.update(dt, ts);
      this.draw(ts);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stopLoop(): void {
    cancelAnimationFrame(this.raf);
  }

  private update(dt: number, now: number): void {
    this.particles.update(dt);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    for (const ft of this.floatingTexts) ft.life -= dt;
    this.floatingTexts = this.floatingTexts.filter((f) => f.life > 0);

    if (this.state !== 'playing') return;

    this.playTimeAcc += dt * 1000;
    this.stats.elapsedMs = this.playTimeAcc;
    this.foods.updateTimers(now, this.blockedCells());

    this.tickAccum += dt * 1000;
    const interval = this.effectiveTick();
    while (this.tickAccum >= interval) {
      this.tickAccum -= interval;
      this.tick(now);
    }
  }

  private tick(now: number): void {
    if (this.effect) {
      this.effect.remaining -= 1;
      if (this.effect.remaining <= 0) this.effect = null;
    }
    if (this.comboTicksLeft > 0) {
      this.comboTicksLeft -= 1;
      if (this.comboTicksLeft <= 0) this.stats.combo = 0;
    }

    const dir = this.input.consumeDirection();
    const wrap = this.settings.mode === 'wrap';
    let next = this.snake.nextHead(dir);

    if (wrap) {
      next = this.snake.wrapHead(next);
    } else if (next.x < 0 || next.y < 0 || next.x >= GRID_COLS || next.y >= GRID_ROWS) {
      this.die(this.snake.head);
      return;
    }

    if (this.wallSet().has(`${next.x},${next.y}`)) {
      this.die(this.snake.head);
      return;
    }

    // Tail vacates unless growing — ignore last segment when not growing
    if (this.snake.occupies(next, this.snake.growPending === 0)) {
      this.die(this.snake.head);
      return;
    }

    this.snake.step(dir, wrap);

    const food = this.foods.findAt(next);
    if (food) {
      this.eat(food, now);
    }

    this.stats.length = this.snake.length;
    this.emit();
  }

  private eat(food: Food, now: number): void {
    this.foods.remove(food);
    this.snake.grow(food.kind === 'golden' ? 2 : 1);
    this.stats.foodsEaten += 1;

    if (this.comboTicksLeft > 0) {
      this.stats.combo += 1;
    } else {
      this.stats.combo = 1;
    }
    this.comboTicksLeft = COMBO_WINDOW_TICKS;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);

    const comboMul = 1 + Math.min(this.stats.combo - 1, 8) * 0.15;
    const gained = Math.round(FOOD_SCORE[food.kind] * comboMul);
    this.stats.score += gained;
    if (this.stats.score > this.stats.highScore) {
      this.stats.highScore = this.stats.score;
      this.highScores[this.settings.mode] = this.stats.score;
      this.save();
    }

    if (food.kind === 'berry') {
      this.effect = { kind: 'slow', remaining: EFFECT_DURATION_TICKS };
    } else if (food.kind === 'chili') {
      this.effect = { kind: 'fast', remaining: EFFECT_DURATION_TICKS };
    }

    const cx = food.pos.x * CELL + CELL / 2;
    const cy = food.pos.y * CELL + CELL / 2;
    const colors: Record<string, string> = {
      apple: '#e85d4c',
      golden: '#f0b429',
      berry: '#6c8cff',
      chili: '#ff6b35',
    };
    this.particles.burst(cx, cy, colors[food.kind], food.kind === 'golden' ? 22 : 12);
    this.floatingTexts.push({
      text: `+${gained}`,
      x: cx,
      y: cy - 8,
      life: 0.9,
      color: food.kind === 'golden' ? '#f0b429' : '#e8fff4',
    });
    if (this.stats.combo >= 2) {
      this.floatingTexts.push({
        text: `×${this.stats.combo}`,
        x: cx + 16,
        y: cy - 22,
        life: 0.7,
        color: '#ffd580',
      });
      this.audio.combo(this.stats.combo);
    }

    this.audio.eat(food.kind);
    this.foods.ensureCount(1, this.blockedCells(), now);
    // occasional second snack
    if (Math.random() < 0.12 && this.foods.foods.length < 2) {
      this.foods.spawn(this.blockedCells(), undefined, now);
    }
  }

  private die(at: Point): void {
    const cx = at.x * CELL + CELL / 2;
    const cy = at.y * CELL + CELL / 2;
    this.particles.death(cx, cy);
    this.flash = 1;
    this.state = 'gameover';
    this.audio.gameOver();
    this.emit();
  }

  private draw(now: number): void {
    const alpha =
      this.state === 'playing' ? Math.min(1, this.tickAccum / this.effectiveTick()) : 1;
    this.renderer.clear();
    this.renderer.drawWalls(this.walls);
    if (this.state !== 'menu') {
      this.renderer.drawFood(this.foods.foods, now);
      const tint = this.effect?.kind ?? 'none';
      this.renderer.drawSnake(this.snake, alpha, tint);
    } else {
      this.drawMenuPreview(now);
    }
    this.renderer.drawParticles(this.particles);
    this.renderer.drawFlash(this.flash);
    this.drawFloating();
  }

  private drawMenuPreview(now: number): void {
    // decorative idle snake path
    const demo: Point[] = [];
    const baseY = Math.floor(GRID_ROWS / 2);
    const t = Math.floor(now / 180) % (GRID_COLS - 6);
    for (let i = 0; i < 6; i++) {
      demo.push({ x: 4 + ((t - i + GRID_COLS) % (GRID_COLS - 8)), y: baseY });
    }
    const temp = new Snake();
    temp.body = demo;
    temp.prevHead = { ...demo[0] };
    temp.direction = 'right';
    this.renderer.drawSnake(temp, 1, 'none');
    // floating apple
    const ax = 4 + ((t + 3) % (GRID_COLS - 8));
    this.renderer.drawFood(
      [{ pos: { x: ax, y: baseY }, kind: 'apple', bornAt: now, pulse: 0 }],
      now,
    );
  }

  private drawFloating(): void {
    const { ctx } = this.renderer;
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillStyle = ft.color;
      ctx.font = '600 14px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y - (1 - ft.life) * 28);
      ctx.restore();
    }
  }

  private emit(): void {
    this.onHud?.(this);
  }

  formatTime(): string {
    const s = Math.floor(this.stats.elapsedMs / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  }

  modeLabel(): string {
    return MODE_LABEL[this.settings.mode];
  }

  diffLabel(): string {
    return DIFF_LABEL[this.settings.difficulty];
  }
}
