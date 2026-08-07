(() => {
  "use strict";

  const COLS = 10;
  const ROWS = 20;
  const BLOCK = 30;
  const PREVIEW = 3;

  const COLORS = {
    I: { fill: "#3ec6c0", edge: "#1a9e98", glow: "rgba(62,198,192,0.45)" },
    O: { fill: "#e8b84a", edge: "#c99420", glow: "rgba(232,184,74,0.45)" },
    T: { fill: "#6a9fd8", edge: "#3d74b0", glow: "rgba(106,159,216,0.45)" },
    S: { fill: "#5ecf7a", edge: "#2fa852", glow: "rgba(94,207,122,0.45)" },
    Z: { fill: "#e86a4a", edge: "#c44a2e", glow: "rgba(232,106,74,0.45)" },
    J: { fill: "#5b7cfa", edge: "#3a56d4", glow: "rgba(91,124,250,0.4)" },
    L: { fill: "#e8924a", edge: "#c46e28", glow: "rgba(232,146,74,0.45)" },
  };

  // SRS shapes: [rotation][cells as [x,y]]
  const SHAPES = {
    I: [
      [[0, 1], [1, 1], [2, 1], [3, 1]],
      [[2, 0], [2, 1], [2, 2], [2, 3]],
      [[0, 2], [1, 2], [2, 2], [3, 2]],
      [[1, 0], [1, 1], [1, 2], [1, 3]],
    ],
    O: [
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
    ],
    T: [
      [[1, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [1, 2]],
      [[1, 0], [0, 1], [1, 1], [1, 2]],
    ],
    S: [
      [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[1, 0], [1, 1], [2, 1], [2, 2]],
      [[1, 1], [2, 1], [0, 2], [1, 2]],
      [[0, 0], [0, 1], [1, 1], [1, 2]],
    ],
    Z: [
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[2, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [1, 2], [2, 2]],
      [[1, 0], [0, 1], [1, 1], [0, 2]],
    ],
    J: [
      [[0, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [2, 2]],
      [[1, 0], [1, 1], [0, 2], [1, 2]],
    ],
    L: [
      [[2, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [1, 1], [2, 1], [0, 2]],
      [[0, 0], [1, 0], [1, 1], [1, 2]],
    ],
  };

  const KICKS = {
    JLSTZ: {
      "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
      "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
      "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
      "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
      "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
      "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
      "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
      "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    },
    I: {
      "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
      "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
      "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
      "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
      "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
      "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
      "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
      "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    },
  };

  const SCORE_TABLE = [0, 100, 300, 500, 800];
  const TYPES = Object.keys(SHAPES);

  const boardCanvas = document.getElementById("board");
  const holdCanvas = document.getElementById("hold");
  const nextCanvas = document.getElementById("next");
  const boardCtx = boardCanvas.getContext("2d");
  const holdCtx = holdCanvas.getContext("2d");
  const nextCtx = nextCanvas.getContext("2d");

  const elScore = document.getElementById("score");
  const elLevel = document.getElementById("level");
  const elLines = document.getElementById("lines");
  const overlay = document.getElementById("overlay");
  const overlayEyebrow = document.getElementById("overlay-eyebrow");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const btnStart = document.getElementById("btn-start");
  const btnPause = document.getElementById("btn-pause");
  const btnMute = document.getElementById("btn-mute");
  const boardWrap = document.querySelector(".board-wrap");

  const state = {
    grid: createGrid(),
    bag: [],
    queue: [],
    current: null,
    hold: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    status: "ready", // ready | playing | paused | over
    dropMs: 1000,
    dropAcc: 0,
    lockDelay: 0,
    locking: false,
    lastTs: 0,
    particles: [],
    flashRows: [],
    flashTimer: 0,
    clearing: false,
    muted: false,
    softDropping: false,
    dasDir: 0,
    dasTimer: 0,
    arrTimer: 0,
  };

  let audioCtx = null;

  function createGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function refillBag() {
    const bag = [...TYPES];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    state.bag.push(...bag);
  }

  function nextType() {
    if (state.bag.length < 7) refillBag();
    return state.bag.shift();
  }

  function spawnPiece(type = nextType()) {
    const piece = {
      type,
      rot: 0,
      x: 3,
      y: -1,
      lastKick: 0,
    };
    if (collides(piece, piece.x, piece.y, piece.rot)) {
      piece.y = -2;
      if (collides(piece, piece.x, piece.y, piece.rot)) {
        endGame();
        return null;
      }
    }
    state.canHold = true;
    state.locking = false;
    state.lockDelay = 0;
    return piece;
  }

  function cells(type, rot, ox, oy) {
    return SHAPES[type][rot].map(([x, y]) => [x + ox, y + oy]);
  }

  function collides(piece, x, y, rot) {
    return cells(piece.type, rot, x, y).some(([cx, cy]) => {
      if (cx < 0 || cx >= COLS || cy >= ROWS) return true;
      if (cy < 0) return false;
      return state.grid[cy][cx] !== null;
    });
  }

  function ghostY(piece) {
    let y = piece.y;
    while (!collides(piece, piece.x, y + 1, piece.rot)) y++;
    return y;
  }

  function tryMove(dx, dy) {
    const p = state.current;
    if (!p) return false;
    if (!collides(p, p.x + dx, p.y + dy, p.rot)) {
      p.x += dx;
      p.y += dy;
      if (dy) state.lockDelay = 0;
      else resetLock();
      if (dx) beep(220, 0.03, "triangle", 0.03);
      return true;
    }
    return false;
  }

  function resetLock() {
    if (state.locking) {
      state.lockDelay = 0;
    }
  }

  function tryRotate(dir) {
    const p = state.current;
    if (!p || p.type === "O") {
      if (p && p.type === "O") beep(330, 0.04, "sine", 0.04);
      return;
    }
    const from = p.rot;
    const to = (from + dir + 4) % 4;
    const table = p.type === "I" ? KICKS.I : KICKS.JLSTZ;
    const key = `${from}>${to}`;
    const tests = table[key] || [[0, 0]];
    for (const [kx, ky] of tests) {
      // kick y is inverted in SRS docs (up positive); our grid y grows down
      const nx = p.x + kx;
      const ny = p.y - ky;
      if (!collides(p, nx, ny, to)) {
        p.x = nx;
        p.y = ny;
        p.rot = to;
        resetLock();
        beep(380, 0.04, "sine", 0.05);
        return;
      }
    }
  }

  function hardDrop() {
    const p = state.current;
    if (!p) return;
    const start = p.y;
    const gy = ghostY(p);
    const dist = gy - start;
    p.y = gy;
    state.score += dist * 2;
    updateStats();
    lockPiece(true);
    beep(120, 0.08, "square", 0.06);
  }

  function holdPiece() {
    if (!state.current || !state.canHold) return;
    const type = state.current.type;
    if (state.hold) {
      state.current = spawnPiece(state.hold);
      state.hold = type;
    } else {
      state.hold = type;
      state.current = spawnPiece();
      fillQueue();
    }
    state.canHold = false;
    drawSide();
    beep(260, 0.05, "triangle", 0.05);
  }

  function lockPiece(fromHard = false) {
    const p = state.current;
    if (!p) return;
    const locked = cells(p.type, p.rot, p.x, p.y);
    for (const [x, y] of locked) {
      if (y < 0) {
        endGame();
        return;
      }
      state.grid[y][x] = p.type;
    }

    state.current = null;
    if (!fromHard) beep(160, 0.05, "triangle", 0.04);

    const full = findFullRows();
    if (full.length) {
      beginClear(full);
    } else {
      advancePiece();
    }
  }

  function findFullRows() {
    const full = [];
    for (let y = 0; y < ROWS; y++) {
      if (state.grid[y].every((c) => c !== null)) full.push(y);
    }
    return full;
  }

  function beginClear(rows) {
    state.clearing = true;
    state.flashRows = rows;
    state.flashTimer = 0.28;

    for (const y of rows) {
      for (let x = 0; x < COLS; x++) {
        spawnParticles(x, y, state.grid[y][x]);
      }
    }

    boardWrap.classList.remove("flash");
    void boardWrap.offsetWidth;
    boardWrap.classList.add("flash");
    playClear(rows.length);
  }

  function finishClear() {
    const rows = state.flashRows;
    const set = new Set(rows);
    const next = state.grid.filter((_, y) => !set.has(y));
    while (next.length < ROWS) next.unshift(Array(COLS).fill(null));
    state.grid = next;

    const n = rows.length;
    state.score += SCORE_TABLE[n] * state.level;
    state.lines += n;
    const newLevel = Math.floor(state.lines / 10) + 1;
    if (newLevel !== state.level) {
      state.level = newLevel;
      state.dropMs = Math.max(80, 1000 - (state.level - 1) * 75);
      beep(520, 0.12, "sine", 0.08);
    }
    state.flashRows = [];
    state.clearing = false;
    updateStats(true);
    advancePiece();
  }

  function advancePiece() {
    state.current = spawnPiece();
    fillQueue();
    drawSide();
  }

  function spawnParticles(gx, gy, type) {
    const color = COLORS[type]?.fill || "#fff";
    const cx = gx * BLOCK + BLOCK / 2;
    const cy = gy * BLOCK + BLOCK / 2;
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      state.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.45 + Math.random() * 0.3,
        max: 0.75,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  function fillQueue() {
    while (state.queue.length < PREVIEW) {
      state.queue.push(nextType());
    }
  }

  function updateStats(pop = false) {
    elScore.textContent = state.score.toLocaleString("zh-CN");
    elLevel.textContent = String(state.level);
    elLines.textContent = String(state.lines);
    if (pop) {
      [elScore, elLines].forEach((el) => {
        el.classList.remove("pop");
        void el.offsetWidth;
        el.classList.add("pop");
      });
    }
  }

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx?.state === "suspended") audioCtx.resume();
  }

  function beep(freq, dur, type = "sine", gain = 0.05) {
    if (state.muted || !audioCtx) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function playClear(n) {
    const base = 300 + n * 80;
    beep(base, 0.1, "square", 0.05);
    setTimeout(() => beep(base + 120, 0.12, "square", 0.04), 60);
  }

  function startGame() {
    ensureAudio();
    state.grid = createGrid();
    state.bag = [];
    state.queue = [];
    state.hold = null;
    state.score = 0;
    state.lines = 0;
    state.level = 1;
    state.dropMs = 1000;
    state.dropAcc = 0;
    state.particles = [];
    state.flashRows = [];
    state.flashTimer = 0;
    state.clearing = false;
    state.status = "playing";
    refillBag();
    fillQueue();
    state.current = spawnPiece();
    fillQueue();
    updateStats();
    hideOverlay();
    drawSide();
    beep(440, 0.08, "sine", 0.06);
  }

  function pauseGame() {
    if (state.status !== "playing" || state.clearing) return;
    state.status = "paused";
    showOverlay("已暂停", "继续游戏", "按 P 或点击按钮继续", "继续");
  }

  function resumeGame() {
    if (state.status !== "paused") return;
    ensureAudio();
    state.status = "playing";
    state.lastTs = performance.now();
    hideOverlay();
  }

  function endGame() {
    state.status = "over";
    state.current = null;
    showOverlay(
      "本局结束",
      "游戏结束",
      `得分 ${state.score.toLocaleString("zh-CN")} · 消行 ${state.lines}`,
      "再来一局"
    );
    beep(90, 0.25, "sawtooth", 0.05);
  }

  function showOverlay(eyebrow, title, text, btnLabel) {
    overlayEyebrow.textContent = eyebrow;
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    btnStart.textContent = btnLabel;
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function drawCell(ctx, x, y, type, opts = {}) {
    const { ghost = false, alpha = 1, size = BLOCK } = opts;
    const c = COLORS[type];
    if (!c) return;
    const px = x * size;
    const py = y * size;
    const pad = ghost ? 2 : 1.5;
    const r = ghost ? 4 : 5;

    ctx.save();
    ctx.globalAlpha = alpha;
    if (ghost) {
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, px + pad, py + pad, size - pad * 2, size - pad * 2, r);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const grd = ctx.createLinearGradient(px, py, px + size, py + size);
    grd.addColorStop(0, lighten(c.fill, 18));
    grd.addColorStop(0.45, c.fill);
    grd.addColorStop(1, c.edge);
    ctx.fillStyle = grd;
    roundRect(ctx, px + pad, py + pad, size - pad * 2, size - pad * 2, r);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundRect(ctx, px + pad + 2, py + pad + 2, size * 0.38, size * 0.22, 3);
    ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 1;
    roundRect(ctx, px + pad, py + pad, size - pad * 2, size - pad * 2, r);
    ctx.stroke();
    ctx.restore();
  }

  function lighten(hex, amt) {
    const n = hex.replace("#", "");
    const num = parseInt(n, 16);
    let r = (num >> 16) + amt;
    let g = ((num >> 8) & 0xff) + amt;
    let b = (num & 0xff) + amt;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawBoard(dt) {
    const ctx = boardCtx;
    ctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);

    // subtle grid
    ctx.fillStyle = "#121a24";
    ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * BLOCK + 0.5, 0);
      ctx.lineTo(x * BLOCK + 0.5, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * BLOCK + 0.5);
      ctx.lineTo(COLS * BLOCK, y * BLOCK + 0.5);
      ctx.stroke();
    }

    // placed
    const flashSet = new Set(state.flashRows);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = state.grid[y][x];
        if (!t) continue;
        const flashing = flashSet.has(y) && state.flashTimer > 0;
        drawCell(ctx, x, y, t, {
          alpha: flashing ? 0.35 + Math.sin(state.flashTimer * 40) * 0.35 : 1,
        });
      }
    }

    // ghost + current
    const p = state.current;
    if (p && state.status === "playing") {
      const gy = ghostY(p);
      if (gy !== p.y) {
        for (const [x, y] of cells(p.type, p.rot, p.x, gy)) {
          if (y >= 0) drawCell(ctx, x, y, p.type, { ghost: true });
        }
      }
      for (const [x, y] of cells(p.type, p.rot, p.x, p.y)) {
        if (y >= 0) drawCell(ctx, x, y, p.type);
      }
    }

    // particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 280 * dt;
      if (pt.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = pt.life / pt.max;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (state.flashTimer > 0 && !state.clearing) {
      state.flashTimer -= dt;
      if (state.flashTimer <= 0) state.flashRows = [];
    }
  }

  function drawMini(ctx, canvas, type, cellSize, offsetY = 0) {
    if (!type) return;
    const shape = SHAPES[type][0];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of shape) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    const w = (maxX - minX + 1) * cellSize;
    const h = (maxY - minY + 1) * cellSize;
    const ox = (canvas.width - w) / 2 - minX * cellSize;
    const oy = offsetY + (cellSize * 3 - h) / 2 - minY * cellSize;
    for (const [x, y] of shape) {
      drawCellAt(ctx, ox + x * cellSize, oy + y * cellSize, type, cellSize);
    }
  }

  function drawCellAt(ctx, px, py, type, size) {
    const c = COLORS[type];
    const pad = 1.2;
    const r = 4;
    const grd = ctx.createLinearGradient(px, py, px + size, py + size);
    grd.addColorStop(0, lighten(c.fill, 18));
    grd.addColorStop(0.5, c.fill);
    grd.addColorStop(1, c.edge);
    ctx.fillStyle = grd;
    roundRect(ctx, px + pad, py + pad, size - pad * 2, size - pad * 2, r);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    roundRect(ctx, px + pad + 1.5, py + pad + 1.5, size * 0.35, size * 0.2, 2);
    ctx.fill();
  }

  function drawSide() {
    holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    holdCtx.fillStyle = "#121a24";
    holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (state.hold) {
      holdCtx.globalAlpha = state.canHold ? 1 : 0.4;
      drawMini(holdCtx, holdCanvas, state.hold, 20);
      holdCtx.globalAlpha = 1;
    }

    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextCtx.fillStyle = "#121a24";
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    state.queue.slice(0, PREVIEW).forEach((type, i) => {
      drawMini(nextCtx, nextCanvas, type, 18, i * 92 + 8);
    });
  }

  function tick(ts) {
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(0.05, (ts - state.lastTs) / 1000);
    state.lastTs = ts;

    if (state.status === "playing") {
      if (state.clearing) {
        state.flashTimer -= dt;
        if (state.flashTimer <= 0) {
          finishClear();
        }
      } else {
        // DAS / ARR
        if (state.dasDir !== 0) {
          state.dasTimer += dt;
          if (state.dasTimer >= 0.15) {
            state.arrTimer += dt;
            if (state.arrTimer >= 0.033) {
              tryMove(state.dasDir, 0);
              state.arrTimer = 0;
            }
          }
        }

        const gravity = state.softDropping ? Math.min(state.dropMs, 50) : state.dropMs;
        state.dropAcc += dt * 1000;
        while (state.dropAcc >= gravity) {
          state.dropAcc -= gravity;
          if (!tryMove(0, 1)) {
            state.locking = true;
            break;
          } else if (state.softDropping) {
            state.score += 1;
            updateStats();
          }
        }

        if (state.locking && state.current) {
          if (collides(state.current, state.current.x, state.current.y + 1, state.current.rot)) {
            state.lockDelay += dt;
            if (state.lockDelay >= 0.45) {
              lockPiece(false);
            }
          } else {
            state.locking = false;
            state.lockDelay = 0;
          }
        }
      }
    }

    drawBoard(dt);
    requestAnimationFrame(tick);
  }

  // Input
  const pressed = new Set();

  function onKeyDown(e) {
    const key = e.code;
    if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space"].includes(key)) {
      e.preventDefault();
    }
    if (pressed.has(key) && key !== "ArrowDown") return;
    pressed.add(key);

    if (key === "KeyP" || key === "Escape") {
      if (state.status === "playing") pauseGame();
      else if (state.status === "paused") resumeGame();
      return;
    }

    if (state.status === "ready" || state.status === "over") {
      if (key === "Enter" || key === "Space") startGame();
      return;
    }
    if (state.status === "paused") {
      if (key === "Enter" || key === "Space") resumeGame();
      return;
    }
    if (state.status !== "playing" || state.clearing) return;

    switch (key) {
      case "ArrowLeft":
        tryMove(-1, 0);
        state.dasDir = -1;
        state.dasTimer = 0;
        state.arrTimer = 0;
        break;
      case "ArrowRight":
        tryMove(1, 0);
        state.dasDir = 1;
        state.dasTimer = 0;
        state.arrTimer = 0;
        break;
      case "ArrowDown":
        state.softDropping = true;
        if (tryMove(0, 1)) {
          state.score += 1;
          updateStats();
        }
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate(1);
        break;
      case "KeyZ":
      case "ControlLeft":
      case "ControlRight":
        tryRotate(-1);
        break;
      case "Space":
        hardDrop();
        break;
      case "KeyC":
      case "ShiftLeft":
      case "ShiftRight":
        holdPiece();
        break;
    }
  }

  function onKeyUp(e) {
    pressed.delete(e.code);
    if (e.code === "ArrowLeft" && state.dasDir === -1) state.dasDir = 0;
    if (e.code === "ArrowRight" && state.dasDir === 1) state.dasDir = 0;
    if (e.code === "ArrowDown") state.softDropping = false;
  }

  function doAction(action) {
    if (state.status === "ready" || state.status === "over") {
      startGame();
      return;
    }
    if (state.status === "paused") {
      resumeGame();
      return;
    }
    if (state.status !== "playing" || state.clearing) return;
    ensureAudio();
    switch (action) {
      case "left": tryMove(-1, 0); break;
      case "right": tryMove(1, 0); break;
      case "rotate": tryRotate(1); break;
      case "drop": hardDrop(); break;
      case "hold": holdPiece(); break;
      case "soft":
        tryMove(0, 1);
        state.score += 1;
        updateStats();
        break;
    }
  }

  btnStart.addEventListener("click", () => {
    if (state.status === "paused") resumeGame();
    else startGame();
  });

  btnPause.addEventListener("click", () => {
    if (state.status === "playing") pauseGame();
    else if (state.status === "paused") resumeGame();
  });

  btnMute.addEventListener("click", () => {
    state.muted = !state.muted;
    btnMute.textContent = state.muted ? "音效关" : "音效开";
    btnMute.setAttribute("aria-pressed", String(state.muted));
    if (!state.muted) ensureAudio();
  });

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  document.querySelectorAll(".touch-btn").forEach((btn) => {
    const action = btn.dataset.action;
    let repeatId = null;

    const start = (e) => {
      e.preventDefault();
      doAction(action);
      if (action === "left" || action === "right") {
        const dir = action === "left" ? -1 : 1;
        clearTimeout(repeatId);
        repeatId = setTimeout(function loop() {
          if (state.status === "playing") tryMove(dir, 0);
          repeatId = setTimeout(loop, 50);
        }, 180);
      }
    };
    const end = () => {
      clearTimeout(repeatId);
      repeatId = null;
    };

    btn.addEventListener("pointerdown", start);
    btn.addEventListener("pointerup", end);
    btn.addEventListener("pointerleave", end);
    btn.addEventListener("pointercancel", end);
  });

  // Initial paint
  drawSide();
  drawBoard(0);
  requestAnimationFrame(tick);
})();
