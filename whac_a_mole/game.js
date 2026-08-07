(() => {
  "use strict";

  const DIFFS = {
    easy: {
      label: "新手牧场",
      cols: 3,
      rows: 3,
      duration: 60,
      lives: 6,
      minInterval: 950,
      maxInterval: 1450,
      upMin: 950,
      upMax: 1450,
      maxActive: 1,
      goldChance: 0.1,
      bombChance: 0,
      scoreNormal: 100,
      scoreGold: 300,
    },
    medium: {
      label: "草甸挑战",
      cols: 3,
      rows: 3,
      duration: 60,
      lives: 5,
      minInterval: 680,
      maxInterval: 1100,
      upMin: 720,
      upMax: 1150,
      maxActive: 1,
      goldChance: 0.12,
      bombChance: 0.06,
      scoreNormal: 100,
      scoreGold: 350,
    },
    hard: {
      label: "疾风土丘",
      cols: 3,
      rows: 4,
      duration: 45,
      lives: 4,
      minInterval: 450,
      maxInterval: 760,
      upMin: 500,
      upMax: 820,
      maxActive: 2,
      goldChance: 0.15,
      bombChance: 0.1,
      scoreNormal: 120,
      scoreGold: 400,
    },
    crazy: {
      label: "地鼠风暴",
      cols: 4,
      rows: 4,
      duration: 45,
      lives: 5,
      minInterval: 320,
      maxInterval: 560,
      upMin: 400,
      upMax: 650,
      maxActive: 3,
      goldChance: 0.18,
      bombChance: 0.12,
      scoreNormal: 150,
      scoreGold: 500,
    },
  };

  const STORAGE_KEY = "meadow-smash-records-v1";

  const els = {
    screenStart: document.getElementById("screen-start"),
    screenPlay: document.getElementById("screen-play"),
    btnStart: document.getElementById("btn-start"),
    btnHowto: document.getElementById("btn-howto"),
    btnPause: document.getElementById("btn-pause"),
    btnSound: document.getElementById("btn-sound"),
    field: document.getElementById("field"),
    score: document.getElementById("score"),
    combo: document.getElementById("combo"),
    timer: document.getElementById("timer"),
    diffLabel: document.getElementById("diff-label"),
    lives: document.getElementById("lives"),
    recordsBar: document.getElementById("records-bar"),
    overlay: document.getElementById("overlay"),
    overlayEyebrow: document.getElementById("overlay-eyebrow"),
    overlayTitle: document.getElementById("overlay-title"),
    overlayDesc: document.getElementById("overlay-desc"),
    overlayStats: document.getElementById("overlay-stats"),
    overlayActions: document.getElementById("overlay-actions"),
    fxLayer: document.getElementById("fx-layer"),
    hammer: document.getElementById("hammer"),
  };

  const state = {
    diff: "medium",
    running: false,
    paused: false,
    soundOn: true,
    score: 0,
    combo: 0,
    maxCombo: 0,
    hits: 0,
    misses: 0,
    lives: 4,
    timeLeft: 60,
    holes: [],
    spawnTimer: null,
    tickTimer: null,
    lastHitAt: 0,
  };

  let audioCtx = null;

  /* ---------- Utils ---------- */
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));

  function loadRecords() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveRecord(diff, score) {
    const records = loadRecords();
    if (!records[diff] || score > records[diff]) {
      records[diff] = score;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    }
    return false;
  }

  function renderRecords() {
    const records = loadRecords();
    const parts = Object.keys(DIFFS).map((key) => {
      const v = records[key];
      return `<span>${DIFFS[key].label}<strong>${v != null ? v : "—"}</strong></span>`;
    });
    els.recordsBar.innerHTML = parts.join("");
  }

  /* ---------- Audio ---------- */
  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, dur = 0.08, type = "sine", gain = 0.05, slide = 0) {
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
    } catch {
      /* ignore */
    }
  }

  function playHit() {
    tone(520, 0.06, "square", 0.04);
    tone(780, 0.08, "triangle", 0.035, 120);
  }

  function playGold() {
    tone(660, 0.07, "sine", 0.05);
    setTimeout(() => tone(880, 0.1, "sine", 0.045), 50);
    setTimeout(() => tone(1100, 0.12, "triangle", 0.04), 100);
  }

  function playBomb() {
    tone(90, 0.28, "sawtooth", 0.07, -50);
    setTimeout(() => tone(60, 0.22, "triangle", 0.05), 40);
  }

  function playMiss() {
    tone(180, 0.12, "triangle", 0.035, -60);
  }

  function playPop() {
    tone(240, 0.05, "sine", 0.02, 80);
  }

  function playTick() {
    tone(880, 0.04, "square", 0.02);
  }

  function playEnd(winLike) {
    if (winLike) {
      [523, 659, 784, 1046].forEach((f, i) => {
        setTimeout(() => tone(f, 0.14, "triangle", 0.05), i * 90);
      });
    } else {
      tone(220, 0.25, "sawtooth", 0.05, -80);
      setTimeout(() => tone(160, 0.3, "triangle", 0.04), 80);
    }
  }

  /* ---------- FX ---------- */
  function floatScore(x, y, text, kind = "") {
    const el = document.createElement("div");
    el.className = `float-score ${kind}`.trim();
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    els.fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  function burst(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.background = color;
      const angle = (Math.PI * 2 * i) / 8 + rand(-0.2, 0.2);
      const dist = rand(28, 56);
      p.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
      p.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
      els.fxLayer.appendChild(p);
      setTimeout(() => p.remove(), 560);
    }
  }

  function showComboBanner(n) {
    if (n < 5 || n % 5 !== 0) return;
    const el = document.createElement("div");
    el.className = "combo-banner";
    el.textContent = `${n} 连击！`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 720);
  }

  /* ---------- Hammer ---------- */
  function setupHammer() {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) {
      document.body.classList.add("touch-device");
      return;
    }

    let swinging = false;
    window.addEventListener("pointermove", (e) => {
      els.hammer.classList.add("visible");
      els.hammer.style.left = `${e.clientX}px`;
      els.hammer.style.top = `${e.clientY}px`;
    });

    window.addEventListener("pointerdown", () => {
      if (swinging) return;
      swinging = true;
      els.hammer.classList.add("swing");
      setTimeout(() => {
        els.hammer.classList.remove("swing");
        swinging = false;
      }, 120);
    });

    document.addEventListener("pointerleave", () => {
      els.hammer.classList.remove("visible");
    });
  }

  /* ---------- UI helpers ---------- */
  function setDiff(diff) {
    state.diff = diff;
    document.querySelectorAll(".diff-card").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.diff === diff);
    });
  }

  function updateHud() {
    els.score.textContent = String(state.score);
    els.combo.textContent = String(state.combo);
    els.timer.textContent = String(Math.max(0, Math.ceil(state.timeLeft)));
    els.timer.classList.toggle("urgent", state.timeLeft <= 10 && state.running);
    els.diffLabel.textContent = DIFFS[state.diff].label;
  }

  function renderLives() {
    const cfg = DIFFS[state.diff];
    els.lives.innerHTML = "";
    for (let i = 0; i < cfg.lives; i++) {
      const heart = document.createElement("div");
      heart.className = `life${i >= state.lives ? " lost" : ""}`;
      heart.title = "生命";
      els.lives.appendChild(heart);
    }
  }

  function showOverlay({ eyebrow, title, desc, statsHtml, actions }) {
    els.overlayEyebrow.textContent = eyebrow;
    els.overlayTitle.textContent = title;
    els.overlayDesc.textContent = desc;
    els.overlayStats.innerHTML = statsHtml || "";
    els.overlayStats.hidden = !statsHtml;
    els.overlayActions.innerHTML = "";
    actions.forEach(({ label, primary, onClick }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = primary ? "primary-btn" : "ghost-btn";
      btn.textContent = label;
      btn.addEventListener("click", onClick);
      els.overlayActions.appendChild(btn);
    });
    els.overlay.hidden = false;
  }

  function hideOverlay() {
    els.overlay.hidden = true;
  }

  /* ---------- Board ---------- */
  function buildField() {
    const cfg = DIFFS[state.diff];
    els.field.innerHTML = "";
    els.field.className = `field cols-${cfg.cols}`;
    state.holes = [];

    const total = cfg.cols * cfg.rows;
    for (let i = 0; i < total; i++) {
      const hole = document.createElement("div");
      hole.className = "hole";
      hole.dataset.index = String(i);
      hole.innerHTML = `
        <div class="mole-clip">
          <div class="mole" data-kind="normal">
            <div class="mole-body"></div>
            <div class="mole-eye left"></div>
            <div class="mole-eye right"></div>
            <div class="mole-snout"></div>
            <div class="mole-nose"></div>
            <div class="mole-fuse"></div>
          </div>
        </div>
        <div class="hole-dark"></div>
        <div class="hole-rim"></div>
      `;

      const mole = hole.querySelector(".mole");
      const entry = {
        el: hole,
        mole,
        up: false,
        kind: "normal",
        hideTimer: null,
        locked: false,
      };

      hole.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        onHoleHit(entry, e);
      });

      state.holes.push(entry);
      els.field.appendChild(hole);
    }
  }

  function pickKind(cfg) {
    const r = Math.random();
    if (r < cfg.bombChance) return "bomb";
    if (r < cfg.bombChance + cfg.goldChance) return "gold";
    return "normal";
  }

  function activeCount() {
    return state.holes.filter((h) => h.up).length;
  }

  function showMole(hole) {
    if (!state.running || state.paused || hole.up) return;
    const cfg = DIFFS[state.diff];
    if (activeCount() >= cfg.maxActive) return;

    const kind = pickKind(cfg);
    hole.kind = kind;
    hole.up = true;
    hole.locked = false;
    hole.mole.className = `mole ${kind === "normal" ? "" : kind}`.trim();
    hole.mole.querySelectorAll(".mole-eye").forEach((eye) => {
      eye.classList.remove("dizzy");
    });

    requestAnimationFrame(() => {
      hole.mole.classList.add("up");
    });
    playPop();

    const upTime = rand(cfg.upMin, cfg.upMax);
    clearTimeout(hole.hideTimer);
    hole.hideTimer = setTimeout(() => hideMole(hole, true), upTime);
  }

  function hideMole(hole, countMiss) {
    if (!hole.up) return;
    clearTimeout(hole.hideTimer);
    hole.hideTimer = null;
    hole.mole.classList.remove("up", "hit");
    hole.up = false;

    if (countMiss && state.running && !state.paused && hole.kind !== "bomb") {
      state.combo = 0;
      state.misses += 1;
      loseLife();
      updateHud();
    }

    setTimeout(() => {
      hole.mole.className = "mole";
    }, 180);
  }

  function loseLife() {
    state.lives -= 1;
    renderLives();
    playMiss();
    if (state.lives <= 0) {
      endGame(false);
    }
  }

  function onHoleHit(hole, e) {
    if (!state.running || state.paused) return;

    const rect = hole.el.getBoundingClientRect();
    const x = e.clientX || rect.left + rect.width / 2;
    const y = e.clientY || rect.top + rect.height / 2;

    if (!hole.up || hole.locked) {
      hole.el.classList.remove("shake");
      void hole.el.offsetWidth;
      hole.el.classList.add("shake");
      state.combo = 0;
      updateHud();
      playMiss();
      return;
    }

    hole.locked = true;
    clearTimeout(hole.hideTimer);
    hole.mole.classList.add("hit");
    hole.mole.querySelectorAll(".mole-eye").forEach((eye) => eye.classList.add("dizzy"));

    const cfg = DIFFS[state.diff];
    const now = performance.now();
    const comboWindow = 1600;

    if (hole.kind === "bomb") {
      state.combo = 0;
      state.score = Math.max(0, state.score - 200);
      floatScore(x, y, "-200", "penalty");
      burst(x, y, "#d94a3d");
      playBomb();
      loseLife();
    } else {
      const base = hole.kind === "gold" ? cfg.scoreGold : cfg.scoreNormal;
      if (now - state.lastHitAt < comboWindow) {
        state.combo += 1;
      } else {
        state.combo = 1;
      }
      state.lastHitAt = now;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.hits += 1;

      const comboBonus = Math.min(state.combo - 1, 8) * 20;
      const points = base + comboBonus;
      state.score += points;

      const label = comboBonus > 0 ? `+${points}` : `+${base}`;
      floatScore(x, y, label, hole.kind === "gold" ? "bonus" : "");
      if (state.combo >= 3) {
        floatScore(x, y - 28, `${state.combo}连`, "combo");
      }
      showComboBanner(state.combo);
      burst(x, y, hole.kind === "gold" ? "#f0b429" : "#8b5a2b");
      if (hole.kind === "gold") playGold();
      else playHit();
    }

    updateHud();

    setTimeout(() => {
      hole.up = false;
      hole.mole.classList.remove("up", "hit");
      setTimeout(() => {
        hole.mole.className = "mole";
        hole.locked = false;
      }, 160);
    }, 160);
  }

  /* ---------- Game loop ---------- */
  function scheduleSpawn() {
    clearTimeout(state.spawnTimer);
    if (!state.running || state.paused) return;
    const cfg = DIFFS[state.diff];
    const delay = rand(cfg.minInterval, cfg.maxInterval);
    state.spawnTimer = setTimeout(() => {
      if (!state.running || state.paused) return;
      const idle = state.holes.filter((h) => !h.up);
      if (idle.length) {
        const hole = idle[randInt(0, idle.length - 1)];
        showMole(hole);
      }
      scheduleSpawn();
    }, delay);
  }

  function startTicker() {
    clearInterval(state.tickTimer);
    let last = performance.now();
    state.tickTimer = setInterval(() => {
      if (!state.running || state.paused) {
        last = performance.now();
        return;
      }
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      state.timeLeft -= dt;
      if (state.timeLeft <= 10 && state.timeLeft > 0) {
        const prev = Math.ceil(state.timeLeft + dt);
        const curr = Math.ceil(state.timeLeft);
        if (curr !== prev) playTick();
      }
      updateHud();
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        updateHud();
        endGame(true);
      }
    }, 100);
  }

  function clearAllMoles() {
    state.holes.forEach((h) => {
      clearTimeout(h.hideTimer);
      h.hideTimer = null;
      h.up = false;
      h.locked = false;
      h.mole.classList.remove("up", "hit");
      h.mole.className = "mole";
    });
  }

  function startGame() {
    const cfg = DIFFS[state.diff];
    hideOverlay();
    els.screenStart.hidden = true;
    els.screenPlay.hidden = false;

    state.running = true;
    state.paused = false;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.hits = 0;
    state.misses = 0;
    state.lives = cfg.lives;
    state.timeLeft = cfg.duration;
    state.lastHitAt = 0;
    els.btnPause.textContent = "Ⅱ";
    els.btnPause.title = "暂停";

    ensureAudio();
    buildField();
    renderLives();
    updateHud();
    scheduleSpawn();
    startTicker();
  }

  function pauseGame() {
    if (!state.running || state.paused) return;
    state.paused = true;
    els.btnPause.textContent = "▶";
    els.btnPause.title = "继续";
    showOverlay({
      eyebrow: "PAUSED",
      title: "暂停中",
      desc: "喘口气，地鼠们也先歇一歇。",
      statsHtml: "",
      actions: [
        {
          label: "继续游戏",
          primary: true,
          onClick: () => resumeGame(),
        },
        {
          label: "返回首页",
          primary: false,
          onClick: () => quitToStart(),
        },
      ],
    });
  }

  function resumeGame() {
    if (!state.running || !state.paused) return;
    state.paused = false;
    els.btnPause.textContent = "Ⅱ";
    els.btnPause.title = "暂停";
    hideOverlay();
    scheduleSpawn();
  }

  function quitToStart() {
    state.running = false;
    state.paused = false;
    clearTimeout(state.spawnTimer);
    clearInterval(state.tickTimer);
    clearAllMoles();
    hideOverlay();
    els.screenPlay.hidden = true;
    els.screenStart.hidden = false;
    renderRecords();
  }

  function endGame(timeUp) {
    if (!state.running) return;
    state.running = false;
    state.paused = false;
    clearTimeout(state.spawnTimer);
    clearInterval(state.tickTimer);
    clearAllMoles();

    const cfg = DIFFS[state.diff];
    const isNew = saveRecord(state.diff, state.score);
    const good = state.score >= cfg.scoreNormal * 8;
    playEnd(good || timeUp);

    showOverlay({
      eyebrow: timeUp ? "TIME UP" : "OUT OF LIVES",
      title: timeUp ? "时间到！" : "生命耗尽",
      desc: isNew
        ? `新纪录！在「${cfg.label}」写下 ${state.score} 分`
        : `本局得分 ${state.score} · ${cfg.label}`,
      statsHtml: `
        <div><span>得分</span><strong>${state.score}</strong></div>
        <div><span>命中</span><strong>${state.hits}</strong></div>
        <div><span>最高连击</span><strong>${state.maxCombo}</strong></div>
      `,
      actions: [
        {
          label: "再来一局",
          primary: true,
          onClick: () => startGame(),
        },
        {
          label: "换难度",
          primary: false,
          onClick: () => quitToStart(),
        },
      ],
    });
  }

  function showHowto() {
    showOverlay({
      eyebrow: "HOW TO PLAY",
      title: "怎么玩",
      desc: "地鼠冒头就敲！金色加分，炸弹扣分掉血。连续命中叠连击，漏掉普通地鼠也会掉血。生命耗尽或时间结束即结算。",
      statsHtml: "",
      actions: [
        {
          label: "知道了",
          primary: true,
          onClick: () => hideOverlay(),
        },
      ],
    });
  }

  /* ---------- Bindings ---------- */
  function bind() {
    document.querySelectorAll(".diff-card").forEach((btn) => {
      btn.addEventListener("click", () => setDiff(btn.dataset.diff));
    });

    els.btnStart.addEventListener("click", () => startGame());
    els.btnHowto.addEventListener("click", () => showHowto());

    els.btnPause.addEventListener("click", () => {
      if (!state.running) return;
      if (state.paused) resumeGame();
      else pauseGame();
    });

    els.btnSound.addEventListener("click", () => {
      state.soundOn = !state.soundOn;
      els.btnSound.setAttribute("aria-pressed", String(state.soundOn));
      els.btnSound.textContent = state.soundOn ? "♪" : "✖";
      if (state.soundOn) {
        ensureAudio();
        tone(520, 0.06, "sine", 0.04);
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && state.running) {
        e.preventDefault();
        if (state.paused) resumeGame();
        else pauseGame();
      }
      if (e.key === "Escape" && state.paused) {
        resumeGame();
      }
    });

    // prevent context menu on long press field
    els.field.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /* ---------- Init ---------- */
  setupHammer();
  setDiff("medium");
  renderRecords();
  bind();
})();
