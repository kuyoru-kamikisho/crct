import type { Game } from './game';
import type { Difficulty, GameMode } from './types';

const SHELL_HTML = `
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <div>
          <h1 class="brand-title">SERPENT</h1>
          <p class="brand-sub">午夜果园 · 贪吃蛇</p>
        </div>
      </div>
        <div class="hud-stats" id="hud-stats">
          <div class="stat"><span class="stat-label">得分</span><span class="stat-value" id="stat-score">0</span></div>
          <div class="stat"><span class="stat-label">最高</span><span class="stat-value" id="stat-high">0</span></div>
          <div class="stat"><span class="stat-label">长度</span><span class="stat-value" id="stat-len">3</span></div>
          <div class="stat"><span class="stat-label">连击</span><span class="stat-value" id="stat-combo">—</span></div>
          <div class="stat"><span class="stat-label">时间</span><span class="stat-value" id="stat-time">0:00</span></div>
          <div class="stat effect-stat hidden" id="stat-effect-wrap"><span class="stat-label">状态</span><span class="stat-value" id="stat-effect">—</span></div>
        </div>
      <button type="button" class="icon-btn" id="btn-sound" title="音效" aria-label="切换音效">♪</button>
    </header>

    <main class="stage">
      <div class="canvas-wrap" id="canvas-wrap">
        <canvas id="game-canvas" width="672" height="504"></canvas>
        <div class="overlay" id="overlay"></div>
      </div>

      <aside class="side">
        <section class="panel">
          <h2 class="panel-title">模式</h2>
          <div class="seg" id="mode-seg" role="group" aria-label="游戏模式">
            <button type="button" data-mode="classic">经典</button>
            <button type="button" data-mode="wrap">穿墙</button>
            <button type="button" data-mode="maze">迷宫</button>
          </div>
        </section>
        <section class="panel">
          <h2 class="panel-title">难度</h2>
          <div class="seg seg-4" id="diff-seg" role="group" aria-label="难度">
            <button type="button" data-diff="easy">简单</button>
            <button type="button" data-diff="normal">普通</button>
            <button type="button" data-diff="hard">困难</button>
            <button type="button" data-diff="insane">疯狂</button>
          </div>
        </section>
        <section class="panel tips">
          <h2 class="panel-title">道具</h2>
          <ul class="legend">
            <li><span class="dot apple"></span>苹果 · 基础得分</li>
            <li><span class="dot golden"></span>金苹果 · 高分（限时）</li>
            <li><span class="dot berry"></span>浆果 · 短暂减速</li>
            <li><span class="dot chili"></span>辣椒 · 短暂加速</li>
          </ul>
        </section>
        <section class="panel tips">
          <h2 class="panel-title">操作</h2>
          <p class="hint">方向键 / WASD 移动</p>
          <p class="hint">空格 / Esc 暂停 · Enter 开始 · R 重开</p>
          <p class="hint">触屏可滑动转向</p>
        </section>
      </aside>
    </main>

    <div class="touch-pad" id="touch-pad" aria-label="方向键">
      <button type="button" data-dir="up" class="pad-btn pad-up">▲</button>
      <button type="button" data-dir="left" class="pad-btn pad-left">◀</button>
      <button type="button" data-dir="down" class="pad-btn pad-down">▼</button>
      <button type="button" data-dir="right" class="pad-btn pad-right">▶</button>
      <button type="button" class="pad-btn pad-pause" id="pad-pause">❚❚</button>
    </div>
  </div>
`;

export function mountShell(root: HTMLElement): HTMLCanvasElement {
  root.innerHTML = SHELL_HTML;
  return root.querySelector('#game-canvas')!;
}

export function bindUI(root: HTMLElement, game: Game): void {
  const overlay = root.querySelector<HTMLElement>('#overlay')!;
  const modeSeg = root.querySelector('#mode-seg')!;
  const diffSeg = root.querySelector('#diff-seg')!;
  const soundBtn = root.querySelector<HTMLButtonElement>('#btn-sound')!;
  const touchPad = root.querySelector('#touch-pad')!;
  let lastOverlayState = '';

  modeSeg.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-mode]');
    if (!btn || game.state === 'playing') return;
    game.setMode(btn.dataset.mode as GameMode);
  });

  diffSeg.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-diff]');
    if (!btn || game.state === 'playing') return;
    game.setDifficulty(btn.dataset.diff as Difficulty);
  });

  soundBtn.addEventListener('click', () => game.toggleSound());

  touchPad.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn) return;
    if (btn.id === 'pad-pause') {
      game.handleAction('pause');
      return;
    }
    const dir = btn.dataset.dir as 'up' | 'down' | 'left' | 'right' | undefined;
    if (dir) {
      if (game.state === 'menu' || game.state === 'gameover') game.start();
      game.pushDir(dir);
    }
  });

  touchPad.addEventListener(
    'touchstart',
    (e) => {
      if ((e.target as HTMLElement).closest('button')) e.preventDefault();
    },
    { passive: false },
  );

  const paint = (g: Game) => renderHud(root, overlay, soundBtn, g, lastOverlayState, (s) => {
    lastOverlayState = s;
  });
  game.onUpdate(paint);
  paint(game);
}

function renderHud(
  root: HTMLElement,
  overlay: HTMLElement,
  soundBtn: HTMLButtonElement,
  game: Game,
  lastOverlayState: string,
  setOverlayState: (s: string) => void,
): void {
  const set = (id: string, v: string | number) => {
    const el = root.querySelector(`#${id}`);
    if (el) el.textContent = String(v);
  };
  set('stat-score', game.stats.score);
  set('stat-high', game.stats.highScore);
  set('stat-len', game.stats.length);
  set('stat-combo', game.stats.combo > 1 ? game.stats.combo : '—');
  set('stat-time', game.formatTime());

  const effectWrap = root.querySelector('#stat-effect-wrap');
  if (effectWrap) {
    if (game.effect) {
      effectWrap.classList.remove('hidden');
      effectWrap.classList.toggle('is-slow', game.effect.kind === 'slow');
      effectWrap.classList.toggle('is-fast', game.effect.kind === 'fast');
      set('stat-effect', game.effect.kind === 'slow' ? '减速' : '加速');
    } else {
      effectWrap.classList.add('hidden');
    }
  }

  soundBtn.classList.toggle('muted', !game.settings.sound);
  soundBtn.textContent = game.settings.sound ? '♪' : '✕';
  soundBtn.title = game.settings.sound ? '关闭音效' : '开启音效';

  root.querySelectorAll<HTMLButtonElement>('#mode-seg button').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === game.settings.mode);
    b.disabled = game.state === 'playing';
  });
  root.querySelectorAll<HTMLButtonElement>('#diff-seg button').forEach((b) => {
    b.classList.toggle('active', b.dataset.diff === game.settings.difficulty);
    b.disabled = game.state === 'playing';
  });

  const overlayKey = `${game.state}|${game.settings.mode}|${game.settings.difficulty}|${game.stats.score}|${game.stats.highScore}|${game.stats.length}|${game.stats.maxCombo}|${game.stats.foodsEaten}|${game.formatTime()}`;
  if (game.state === 'playing') {
    if (lastOverlayState !== 'playing') {
      overlay.className = 'overlay';
      overlay.innerHTML = '';
      setOverlayState('playing');
    }
    return;
  }
  if (overlayKey === lastOverlayState) return;
  setOverlayState(overlayKey);

  overlay.className = 'overlay visible';
  if (game.state === 'menu') {
    overlay.innerHTML = `
      <div class="card enter">
        <p class="eyebrow">准备就绪</p>
        <h2>开启一场追逐</h2>
        <p class="lead">当前：${game.modeLabel()} · ${game.diffLabel()}</p>
        <button type="button" class="cta" data-action="start">开始游戏</button>
        <p class="fine">按 Enter 或点击开始</p>
      </div>`;
  } else if (game.state === 'paused') {
    overlay.innerHTML = `
      <div class="card enter">
        <p class="eyebrow">已暂停</p>
        <h2>稍作休息</h2>
        <p class="lead">得分 ${game.stats.score} · 长度 ${game.stats.length}</p>
        <div class="cta-row">
          <button type="button" class="cta" data-action="resume">继续</button>
          <button type="button" class="cta ghost" data-action="restart">重开</button>
        </div>
      </div>`;
  } else if (game.state === 'gameover') {
    const isNew = game.stats.score >= game.stats.highScore && game.stats.score > 0;
    overlay.innerHTML = `
      <div class="card enter">
        <p class="eyebrow">${isNew ? '新纪录' : '游戏结束'}</p>
        <h2>${isNew ? '漂亮的一局' : '再来一次？'}</h2>
        <div class="result-grid">
          <div><span>得分</span><strong>${game.stats.score}</strong></div>
          <div><span>最高</span><strong>${game.stats.highScore}</strong></div>
          <div><span>长度</span><strong>${game.stats.length}</strong></div>
          <div><span>最大连击</span><strong>${game.stats.maxCombo}</strong></div>
          <div><span>食物</span><strong>${game.stats.foodsEaten}</strong></div>
          <div><span>用时</span><strong>${game.formatTime()}</strong></div>
        </div>
        <button type="button" class="cta" data-action="start">再玩一局</button>
      </div>`;
  }

  overlay.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.action;
      if (a === 'start' || a === 'restart') game.start();
      if (a === 'resume') game.resume();
    });
  });
}
