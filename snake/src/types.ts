export type Direction = 'up' | 'down' | 'left' | 'right';

export type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

export type GameMode = 'classic' | 'wrap' | 'maze';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'insane';

export type FoodKind = 'apple' | 'golden' | 'berry' | 'chili';

export interface Point {
  x: number;
  y: number;
}

export interface Food {
  pos: Point;
  kind: FoodKind;
  bornAt: number;
  pulse: number;
}

export interface ActiveEffect {
  kind: 'slow' | 'fast';
  remaining: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

export interface GameStats {
  score: number;
  highScore: number;
  length: number;
  combo: number;
  maxCombo: number;
  foodsEaten: number;
  elapsedMs: number;
}

export interface Settings {
  mode: GameMode;
  difficulty: Difficulty;
  sound: boolean;
}
