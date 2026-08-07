(() => {
  "use strict";

  const DIFFS = {
    easy: { cols: 9, rows: 9, mines: 10, label: "初级", hints: 3 },
    medium: { cols: 16, rows: 16, mines: 40, label: "中级", hints: 3 },
    hard: { cols: 30, rows: 16, mines: 99, label: "高级", hints: 4 },
    custom: { cols: 16, rows: 16, mines: 40, label: "自定义", hints: 3 },
  };

  const STORAGE_KEY = "abyss-mines-records-v1";

  const els = {
    board: document.getElementById("board"),
    mineCount: document.getElementById("mine-count"),
    timer: document.getElementById("timer"),
    faceBtn: document.getElementById("face-btn"),
    face: document.getElementById("face"),
    overlay: document.getElementById("overlay"),
    overlayEyebrow: document.getElementById("overlay-eyebrow"),
    overlayTitle: document.getElementById("overlay-title"),
    overlayDesc: document.getElementById("overlay-desc"),
    statTime: document.getElementById("stat-time"),
    statClicks: document.getElementById("stat-clicks"),
    statEff: document.getElementById("stat-eff"),
    playAgain: document.getElementById("play-again"),
    flagModeBtn: document.getElementById("flag-mode-btn"),
    hintBtn: document.getElementById("hint-btn"),
    hintLeft: document.getElementById("hint-left"),
    soundBtn: document.getElementById("sound-btn"),
    soundIcon: document.getElementById("sound-icon"),
    customPanel: document.getElementById("custom-panel"),
    customW: document.getElementById("custom-w"),
    customH: document.getElementById("custom-h"),
    customM: document.getElementById("custom-m"),
    combo: document.getElementById("combo"),
    score: document.getElementById("score"),
    opened: document.getElementById("opened"),
    recordsList: document.getElementById("records-list"),
    fxLayer: document.getElementById("fx-layer"),
    boardFrame: document.querySelector(".board-frame"),
  };

  const state = {
    diff: "easy",
    cols: 9,
    rows: 9,
    mines: 10,
    grid: [],
    started: false,
    ended: false,
    won: false,
    flags: 0,
    opened: 0,
    clicks: 0,
    seconds: 0,
    timerId: null,
    flagMode: false,
    soundOn: true,
    hintsLeft: 3,
    combo: 0,
    maxCombo: 0,
    score: 0,
    lastRevealAt: 0,
    pressing: false,
  };

  let audioCtx = null;

  /* ---------- Audio ---------- */
  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, dur = 0.08, type = "sine", gain = 0.04, slide = 0) {
    if (!state.soundOn) return;
    try {
      const ctx = ensureAudio();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slide) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(40, freq + slide),
          ctx.currentTime + dur
        );
      }
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch (_) {
      /* ignore */
    }
  }

  function playReveal(n) {
    tone(420 + n * 40, 0.06, "triangle", 0.03);
  }

  function playFlag() {
    tone(660, 0.07, "square", 0.025);
  }

  function playUnflag() {
    tone(320, 0.06, "square", 0.02);
  }

  function playBoom() {
    tone(120, 0.35, "sawtooth", 0.07, -80);
    setTimeout(() => tone(60, 0.4, "triangle", 0.05, -30), 40);
  }

  function playWin() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => tone(f, 0.15, "sine", 0.05), i * 90);
    });
  }

  function playHint() {
    tone(880, 0.12, "sine", 0.04, 200);
  }

  function playCombo(level) {
    tone(500 + level * 60, 0.1, "triangle", 0.035);
  }

  /* ---------- Utilities ---------- */
  function pad3(n) {
    return String(Math.max(0, Math.min(999, n))).padStart(3, "0");
  }

  function idx(r, c) {
    return r * state.cols + c;
  }

  function inBounds(r, c) {
    return r >= 0 && c >= 0 && r < state.rows && c < state.cols;
  }

  function neighbors(r, c) {
    const list = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc)) list.push(state.grid[idx(nr, nc)]);
      }
    }
    return list;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function loadRecords() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveRecord(diff, seconds, score) {
    if (diff === "custom") return;
    const records = loadRecords();
    const prev = records[diff];
    if (!prev || seconds < prev.time || (seconds === prev.time && score > prev.score)) {
      records[diff] = { time: seconds, score, at: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
    renderRecords();
  }

  function renderRecords() {
    const records = loadRecords();
    const labels = [
      ["easy", "初级"],
      ["medium", "中级"],
      ["hard", "高级"],
    ];
    els.recordsList.innerHTML = labels
      .map(([key, label]) => {
        const r = records[key];
        const val = r ? `${r.time}s · ${r.score}分` : "—";
        return `<li><span>${label}</span><strong>${val}</strong></li>`;
      })
      .join("");
  }

  function setFace(emoji) {
    els.face.textContent = emoji;
    els.faceBtn.classList.remove("pulse");
    void els.faceBtn.offsetWidth;
    els.faceBtn.classList.add("pulse");
  }

  function updateHud() {
    els.mineCount.textContent = pad3(state.mines - state.flags);
    els.timer.textContent = pad3(state.seconds);
    els.combo.textContent = String(state.combo);
    els.score.textContent = String(state.score);
    els.opened.textContent = String(state.opened);
    els.hintLeft.textContent = String(state.hintsLeft);
  }

  function fitCellSize() {
    const maxW = Math.min(window.innerWidth - 48, 680);
    const size = Math.floor((maxW - (state.cols - 1) * 3) / state.cols);
    const clamped = Math.max(18, Math.min(36, size));
    document.documentElement.style.setProperty("--cell", `${clamped}px`);
  }

  /* ---------- FX ---------- */
  function spawnParticles(x, y, color, count = 18) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "particle";
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 40 + Math.random() * 90;
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.background = color;
      p.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
      p.style.setProperty("--ty", `${Math.sin(angle) * dist}px`);
      p.style.setProperty("--dur", `${0.5 + Math.random() * 0.5}s`);
      els.fxLayer.appendChild(p);
      setTimeout(() => p.remove(), 1000);
    }
  }

  function spawnConfetti() {
    const colors = ["#3ecf8e", "#4ecdc4", "#e8a23a", "#4aa3ff", "#e85a5a"];
    for (let i = 0; i < 48; i++) {
      const c = document.createElement("span");
      c.className = "confetti";
      c.style.left = `${Math.random() * 100}%`;
      c.style.background = colors[i % colors.length];
      c.style.setProperty("--dur", `${1.6 + Math.random() * 1.4}s`);
      c.style.animationDelay = `${Math.random() * 0.6}s`;
      els.fxLayer.appendChild(c);
      setTimeout(() => c.remove(), 3200);
    }
  }

  function showComboToast(n) {
    const t = document.createElement("div");
    t.className = "combo-toast";
    t.textContent = `连击 ×${n}`;
    els.boardFrame.appendChild(t);
    setTimeout(() => t.remove(), 900);
  }

  /* ---------- Board ---------- */
  function createEmptyGrid() {
    state.grid = [];
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        state.grid.push({
          r,
          c,
          mine: false,
          open: false,
          flagged: false,
          adj: 0,
          el: null,
        });
      }
    }
  }

  function placeMines(safeR, safeC) {
    const forbidden = new Set();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = safeR + dr;
        const nc = safeC + dc;
        if (inBounds(nr, nc)) forbidden.add(idx(nr, nc));
      }
    }

    const pool = [];
    for (let i = 0; i < state.grid.length; i++) {
      if (!forbidden.has(i)) pool.push(i);
    }
    shuffle(pool);

    const count = Math.min(state.mines, pool.length);
    for (let i = 0; i < count; i++) {
      state.grid[pool[i]].mine = true;
    }

    for (const cell of state.grid) {
      if (cell.mine) {
        cell.adj = 0;
        continue;
      }
      cell.adj = neighbors(cell.r, cell.c).filter((n) => n.mine).length;
    }
  }

  function renderBoard() {
    fitCellSize();
    els.board.style.gridTemplateColumns = `repeat(${state.cols}, var(--cell))`;
    els.board.innerHTML = "";

    const frag = document.createDocumentFragment();
    for (const cell of state.grid) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cell";
      btn.dataset.r = String(cell.r);
      btn.dataset.c = String(cell.c);
      btn.setAttribute("role", "gridcell");
      btn.setAttribute("aria-label", `格子 ${cell.r + 1},${cell.c + 1}`);
      cell.el = btn;
      frag.appendChild(btn);
    }
    els.board.appendChild(frag);
  }

  function paintCell(cell, animate = false) {
    const el = cell.el;
    if (!el) return;
    el.className = "cell";
    el.disabled = false;
    el.textContent = "";

    if (cell.flagged && !cell.open) {
      el.classList.add("flagged");
      return;
    }

    if (!cell.open) return;

    el.classList.add("open");
    el.disabled = true;

    if (cell.mine) {
      el.classList.add("mine", "mine-reveal");
      return;
    }

    if (cell.adj > 0) {
      el.textContent = String(cell.adj);
      el.classList.add(`n${cell.adj}`);
    }

    if (animate) el.classList.add("reveal-anim");
  }

  /* ---------- Game flow ---------- */
  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    state.timerId = setInterval(() => {
      state.seconds += 1;
      els.timer.textContent = pad3(state.seconds);
      if (state.seconds >= 999) stopTimer();
    }, 1000);
  }

  function getConfig() {
    if (state.diff === "custom") {
      let cols = Number(els.customW.value) || 16;
      let rows = Number(els.customH.value) || 16;
      let mines = Number(els.customM.value) || 40;
      cols = Math.max(5, Math.min(30, cols));
      rows = Math.max(5, Math.min(24, rows));
      const maxMines = cols * rows - 9;
      mines = Math.max(1, Math.min(maxMines, mines));
      els.customW.value = cols;
      els.customH.value = rows;
      els.customM.value = mines;
      return { cols, rows, mines, hints: 3, label: "自定义" };
    }
    return { ...DIFFS[state.diff] };
  }

  function newGame() {
    const cfg = getConfig();
    stopTimer();
    state.cols = cfg.cols;
    state.rows = cfg.rows;
    state.mines = cfg.mines;
    state.started = false;
    state.ended = false;
    state.won = false;
    state.flags = 0;
    state.opened = 0;
    state.clicks = 0;
    state.seconds = 0;
    state.hintsLeft = cfg.hints;
    state.combo = 0;
    state.maxCombo = 0;
    state.score = 0;
    state.lastRevealAt = 0;
    state.pressing = false;

    els.overlay.hidden = true;
    setFace("◎");
    createEmptyGrid();
    renderBoard();
    updateHud();
  }

  function revealFlood(startCell) {
    const queue = [startCell];
    const revealed = [];
    const seen = new Set([idx(startCell.r, startCell.c)]);

    while (queue.length) {
      const cell = queue.shift();
      if (cell.open || cell.flagged || cell.mine) continue;
      cell.open = true;
      state.opened += 1;
      revealed.push(cell);

      if (cell.adj === 0) {
        for (const n of neighbors(cell.r, cell.c)) {
          const key = idx(n.r, n.c);
          if (!seen.has(key) && !n.open && !n.flagged) {
            seen.add(key);
            queue.push(n);
          }
        }
      }
    }

    revealed.forEach((cell, i) => {
      setTimeout(() => {
        paintCell(cell, true);
        if (i % 4 === 0) playReveal(cell.adj);
      }, Math.min(i * 8, 240));
    });

    return revealed.length;
  }

  function registerCombo(openedCount) {
    const now = performance.now();
    if (now - state.lastRevealAt < 900 && openedCount > 0) {
      state.combo += 1;
    } else {
      state.combo = openedCount > 1 ? 2 : 1;
    }
    state.lastRevealAt = now;
    state.maxCombo = Math.max(state.maxCombo, state.combo);

    const base = openedCount * 10;
    const bonus = Math.max(0, state.combo - 1) * 5 + (openedCount > 5 ? openedCount * 2 : 0);
    state.score += base + bonus;
    updateHud();

    if (state.combo >= 3) {
      showComboToast(state.combo);
      playCombo(state.combo);
    }
  }

  function checkWin() {
    const safe = state.cols * state.rows - state.mines;
    if (state.opened >= safe) {
      endGame(true);
    }
  }

  function endGame(won) {
    if (state.ended) return;
    state.ended = true;
    state.won = won;
    stopTimer();

    if (won) {
      setFace("✦");
      playWin();
      spawnConfetti();
      for (const cell of state.grid) {
        if (cell.mine && !cell.flagged) {
          cell.flagged = true;
          state.flags += 1;
          paintCell(cell);
        }
      }
      const timeBonus = Math.max(0, 500 - state.seconds * 2);
      state.score += timeBonus + state.maxCombo * 20;
      updateHud();
      saveRecord(state.diff, state.seconds, state.score);

      els.overlayEyebrow.textContent = "MISSION COMPLETE";
      els.overlayTitle.textContent = "深渊已肃清";
      els.overlayDesc.textContent = `难度「${DIFFS[state.diff]?.label || "自定义"}」通关 · 最高连击 ×${state.maxCombo}`;
    } else {
      setFace("✖");
      playBoom();
      els.boardFrame.classList.remove("shake");
      void els.boardFrame.offsetWidth;
      els.boardFrame.classList.add("shake");

      state.grid.forEach((cell, i) => {
        if (cell.mine && !cell.flagged) {
          setTimeout(() => {
            cell.open = true;
            paintCell(cell);
            cell.el.classList.add("mine-reveal");
          }, 20 + i * 3);
        } else if (cell.flagged && !cell.mine) {
          cell.el.classList.add("wrong-flag");
        }
      });

      els.overlayEyebrow.textContent = "BREACH DETECTED";
      els.overlayTitle.textContent = "触雷失败";
      els.overlayDesc.textContent = "雷区反噬 — 调整策略，再次潜入";
    }

    const safe = state.cols * state.rows - state.mines;
    const eff = safe > 0 ? Math.round((state.opened / Math.max(1, state.clicks)) * 100) : 0;
    els.statTime.textContent = `${state.seconds}s`;
    els.statClicks.textContent = String(state.clicks);
    els.statEff.textContent = `${eff}%`;

    setTimeout(() => {
      els.overlay.hidden = false;
    }, won ? 400 : 700);
  }

  function openCell(cell) {
    if (state.ended || cell.open || cell.flagged) return;

    if (!state.started) {
      state.started = true;
      placeMines(cell.r, cell.c);
      startTimer();
      setFace("◉");
    }

    state.clicks += 1;

    if (cell.mine) {
      cell.open = true;
      cell.el.classList.add("exploded", "open", "mine");
      const rect = cell.el.getBoundingClientRect();
      spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, "#e85a5a", 28);
      spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, "#e8a23a", 12);
      endGame(false);
      return;
    }

    const count = revealFlood(cell);
    registerCombo(count);
    checkWin();
  }

  function toggleFlag(cell) {
    if (state.ended || cell.open) return;
    cell.flagged = !cell.flagged;
    state.flags += cell.flagged ? 1 : -1;
    paintCell(cell);
    updateHud();
    if (cell.flagged) playFlag();
    else playUnflag();
    setFace(cell.flagged ? "⚑" : "◎");
    setTimeout(() => {
      if (!state.ended) setFace(state.started ? "◉" : "◎");
    }, 280);
  }

  function chord(cell) {
    if (!cell.open || cell.adj === 0 || state.ended) return;
    const neigh = neighbors(cell.r, cell.c);
    const flagCount = neigh.filter((n) => n.flagged).length;
    if (flagCount !== cell.adj) return;

    state.clicks += 1;
    let hitMine = false;
    let opened = 0;

    for (const n of neigh) {
      if (!n.open && !n.flagged) {
        if (n.mine) {
          n.open = true;
          n.el.classList.add("exploded", "open", "mine");
          hitMine = true;
          const rect = n.el.getBoundingClientRect();
          spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, "#e85a5a", 24);
        } else {
          opened += revealFlood(n);
        }
      }
    }

    if (hitMine) {
      endGame(false);
      return;
    }
    if (opened > 0) registerCombo(opened);
    checkWin();
  }

  function useHint() {
    if (state.ended || state.hintsLeft <= 0) return;

    if (!state.started) {
      // open a random safe-ish center-ish cell to start
      const r = (state.rows / 2) | 0;
      const c = (state.cols / 2) | 0;
      openCell(state.grid[idx(r, c)]);
    }

    const candidates = state.grid.filter((c) => !c.open && !c.flagged && !c.mine);
    if (!candidates.length) return;

    // Prefer cells that help: adjacent to opened numbered cells
    candidates.sort((a, b) => {
      const score = (cell) =>
        neighbors(cell.r, cell.c).filter((n) => n.open && n.adj > 0).length;
      return score(b) - score(a);
    });

    const pick = candidates[0];
    state.hintsLeft -= 1;
    updateHud();
    playHint();

    pick.el.classList.add("hint");
    setTimeout(() => {
      pick.el.classList.remove("hint");
      openCell(pick);
    }, 350);
  }

  /* ---------- Events ---------- */
  function cellFromEvent(e) {
    const btn = e.target.closest(".cell");
    if (!btn || !els.board.contains(btn)) return null;
    return state.grid[idx(Number(btn.dataset.r), Number(btn.dataset.c))];
  }

  els.board.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      state.pressing = true;
      if (!state.ended) setFace("◐");
    }
  });

  window.addEventListener("mouseup", () => {
    state.pressing = false;
    if (!state.ended) setFace(state.started ? "◉" : "◎");
  });

  els.board.addEventListener("click", (e) => {
    const cell = cellFromEvent(e);
    if (!cell) return;
    ensureAudio();

    if (state.flagMode) {
      toggleFlag(cell);
      return;
    }
    openCell(cell);
  });

  els.board.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const cell = cellFromEvent(e);
    if (!cell) return;
    ensureAudio();
    toggleFlag(cell);
  });

  els.board.addEventListener("dblclick", (e) => {
    const cell = cellFromEvent(e);
    if (!cell) return;
    ensureAudio();
    chord(cell);
  });

  // Middle click chord
  els.board.addEventListener("auxclick", (e) => {
    if (e.button !== 1) return;
    e.preventDefault();
    const cell = cellFromEvent(e);
    if (!cell) return;
    ensureAudio();
    chord(cell);
  });

  // Long-press flag for touch
  let longPressTimer = null;
  let longPressCell = null;

  els.board.addEventListener(
    "touchstart",
    (e) => {
      const cell = cellFromEvent(e);
      if (!cell) return;
      longPressCell = cell;
      longPressTimer = setTimeout(() => {
        ensureAudio();
        toggleFlag(cell);
        longPressCell = null;
        longPressTimer = null;
      }, 480);
    },
    { passive: true }
  );

  els.board.addEventListener(
    "touchend",
    () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      longPressCell = null;
    },
    { passive: true }
  );

  els.board.addEventListener(
    "touchmove",
    () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    },
    { passive: true }
  );

  document.querySelectorAll(".diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".diff-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.diff = btn.dataset.diff;
      els.customPanel.hidden = state.diff !== "custom";
      newGame();
    });
  });

  const onCustomChange = () => {
    if (state.diff === "custom") newGame();
  };
  els.customW.addEventListener("change", onCustomChange);
  els.customH.addEventListener("change", onCustomChange);
  els.customM.addEventListener("change", onCustomChange);

  els.faceBtn.addEventListener("click", () => {
    ensureAudio();
    tone(520, 0.08, "sine", 0.03);
    newGame();
  });

  els.playAgain.addEventListener("click", () => {
    ensureAudio();
    newGame();
  });

  els.flagModeBtn.addEventListener("click", () => {
    state.flagMode = !state.flagMode;
    els.flagModeBtn.setAttribute("aria-pressed", String(state.flagMode));
  });

  els.hintBtn.addEventListener("click", () => {
    ensureAudio();
    useHint();
  });

  els.soundBtn.addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    els.soundBtn.setAttribute("aria-pressed", String(state.soundOn));
    els.soundIcon.textContent = state.soundOn ? "♪" : "✕";
    if (state.soundOn) {
      ensureAudio();
      tone(600, 0.08, "sine", 0.03);
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "r" || e.key === "R") newGame();
    if (e.key === "f" || e.key === "F") {
      state.flagMode = !state.flagMode;
      els.flagModeBtn.setAttribute("aria-pressed", String(state.flagMode));
    }
    if (e.key === "h" || e.key === "H") useHint();
  });

  window.addEventListener("resize", () => {
    fitCellSize();
  });

  renderRecords();
  newGame();
})();
