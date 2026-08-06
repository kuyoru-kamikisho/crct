/**
 * 核心游戏逻辑与主循环
 */
class Game {
  constructor() {
    this.lawnEl = document.getElementById("lawn");
    this.entitiesEl = document.getElementById("entities");
    this.stageEl = document.getElementById("stage");
    this.stageWrap = document.getElementById("stage-wrap");
    this.seedBar = document.getElementById("seed-bar");
    this.sunCountEl = document.getElementById("sun-count");
    this.hudLevel = document.getElementById("hud-level");
    this.hudWave = document.getElementById("hud-wave");
    this.hudDiff = document.getElementById("hud-diff");

    this.running = false;
    this.paused = false;
    this.ended = false;
    this.sun = 0;
    this.plants = [];
    this.zombies = [];
    this.projectiles = [];
    this.suns = [];
    this.grid = [];
    this.cooldowns = {};
    this.selectedPlant = null;
    this.level = null;
    this.diff = DIFFICULTIES.normal;
    this.waveIndex = 0;
    this.waveSpawned = 0;
    this.waveTimer = 0;
    /** waiting | spawning | clearing */
    this.wavePhase = "waiting";
    this.sunFallTimer = 0;
    this.lastTs = 0;
    this.raf = null;
    this.stats = { kills: 0, suns: 0, plants: 0 };
    this.onEnd = null;

    this._buildLawn();
    this._bindPlanting();
    window.addEventListener("resize", () => this.fitStage());
  }

  _buildLawn() {
    this.lawnEl.innerHTML = "";
    this.grid = Array.from({ length: CONFIG.ROWS }, () => Array(CONFIG.COLS).fill(null));
    for (let r = 0; r < CONFIG.ROWS; r++) {
      for (let c = 0; c < CONFIG.COLS; c++) {
        const cell = Utils.el("div", "cell");
        cell.dataset.col = c;
        cell.dataset.row = r;
        this.lawnEl.appendChild(cell);
      }
    }
  }

  start(level, diff) {
    this.stopLoop();
    this.level = level;
    this.diff = diff;
    this.running = true;
    this.paused = false;
    this.ended = false;
    this.waveIndex = 0;
    this.waveSpawned = 0;
    this.wavePhase = "waiting";
    this.waveTimer = level.waves[0].delay;
    this.sunFallTimer = CONFIG.SUN_FALL_INTERVAL * 0.4;
    this.selectedPlant = null;
    this.stats = { kills: 0, suns: 0, plants: 0 };

    this.plants = [];
    this.zombies = [];
    this.projectiles = [];
    this.suns = [];
    this.cooldowns = {};
    this.entitiesEl.innerHTML = "";
    this._buildLawn();

    const startSun = Math.max(
      0,
      (level.startSun ?? CONFIG.START_SUN) + diff.startSunBonus
    );
    this.sun = startSun;
    this._updateSunUI();
    this._buildSeedBar();
    this._updateHud();
    this.fitStage();

    this.lastTs = performance.now();
    this.raf = requestAnimationFrame((t) => this._loop(t));
    this._toast(`第 ${level.id} 关 · ${diff.name}`);
  }

  stopLoop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.running = false;
  }

  pause() {
    if (!this.running || this.ended) return;
    this.paused = true;
  }

  resume() {
    if (!this.running || this.ended) return;
    this.paused = false;
    this.lastTs = performance.now();
  }

  _loop(ts) {
    if (!this.running) return;
    const dt = Math.min(ts - this.lastTs, 50);
    this.lastTs = ts;

    if (!this.paused && !this.ended) {
      this._update(dt);
    }

    this.raf = requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    this._updateWaves(dt);
    this._updateSunFall(dt);
    this._tickCooldowns(dt);

    for (const p of [...this.plants]) p.update(dt);
    for (const z of [...this.zombies]) z.update(dt);
    for (const pr of [...this.projectiles]) {
      pr.update(dt);
      if (!pr.alive) this.projectiles = this.projectiles.filter((x) => x.alive);
    }
    for (const s of [...this.suns]) {
      s.update(dt);
      if (!s.alive) this.suns = this.suns.filter((x) => x.alive);
    }

    this._checkWin();
  }

  _updateWaves(dt) {
    const waves = this.level.waves;
    if (this.waveIndex >= waves.length) return;

    const wave = waves[this.waveIndex];
    const spawnGap = () =>
      Math.max(800, wave.interval * (this.diff.spawnMult || 1) * Utils.rand(0.85, 1.15));

    if (this.wavePhase === "waiting") {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.wavePhase = "spawning";
        this.waveSpawned = 0;
        this._toast(this.waveIndex === waves.length - 1 ? "最后一波！" : `第 ${this.waveIndex + 1} 波来袭`);
        this._updateHud();
        // 提示出现的同一帧立刻刷出第一只，避免“来袭了却什么都没有”
        this._spawnZombie(Utils.pick(wave.types));
        this.waveSpawned = 1;
        this.waveTimer = spawnGap();
        if (this.waveSpawned >= wave.count) this.wavePhase = "clearing";
      }
      return;
    }

    if (this.wavePhase === "spawning") {
      if (this.waveSpawned < wave.count) {
        this.waveTimer -= dt;
        if (this.waveTimer <= 0) {
          this._spawnZombie(Utils.pick(wave.types));
          this.waveSpawned += 1;
          this.waveTimer = spawnGap();
        }
      }
      if (this.waveSpawned >= wave.count) this.wavePhase = "clearing";
      return;
    }

    if (this.wavePhase === "clearing") {
      this.zombies = this.zombies.filter((z) => z.alive || z.el?.isConnected);
      if (!this.zombies.some((z) => z.alive)) {
        this.waveIndex += 1;
        if (this.waveIndex < waves.length) {
          this.wavePhase = "waiting";
          this.waveTimer = waves[this.waveIndex].delay;
          this._updateHud();
        }
      }
    }
  }

  _updateSunFall(dt) {
    this.sunFallTimer -= dt;
    if (this.sunFallTimer <= 0) {
      const x = Utils.rand(40, CONFIG.COLS * CONFIG.CELL_W - 40);
      const y = Utils.rand(60, CONFIG.ROWS * CONFIG.CELL_H - 40);
      this.spawnSun(x, y, false);
      this.sunFallTimer = CONFIG.SUN_FALL_INTERVAL * Utils.rand(0.85, 1.2) / this.diff.sunMult;
    }
  }

  _tickCooldowns(dt) {
    let dirty = false;
    for (const id of Object.keys(this.cooldowns)) {
      if (this.cooldowns[id] > 0) {
        this.cooldowns[id] -= dt;
        if (this.cooldowns[id] <= 0) {
          this.cooldowns[id] = 0;
          dirty = true;
        }
      }
    }
    if (dirty) this._refreshSeedStates();
  }

  _spawnZombie(typeId) {
    const def = ZOMBIES[typeId] || ZOMBIES.normal;
    if (!def) return;
    const row = Utils.randInt(0, CONFIG.ROWS - 1);
    const z = new Zombie(def, row, this, {
      hp: this.diff.zombieHpMult || 1,
      speed: this.diff.zombieSpeedMult || 1,
    });
    this.zombies.push(z);
  }

  spawnProjectile(opts) {
    const p = new Projectile(opts, this);
    this.projectiles.push(p);
  }

  spawnSun(x, y, fromPlant) {
    const s = new Sun(x, y, this, fromPlant);
    this.suns.push(s);
  }

  spawnExplosion(x, y) {
    const el = Utils.el("div", "explosion");
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.entitiesEl.appendChild(el);
    setTimeout(() => el.remove(), 500);
  }

  addSun(amount) {
    this.sun += amount;
    this._updateSunUI();
    this._refreshSeedStates();
  }

  spendSun(amount) {
    if (this.sun < amount) return false;
    this.sun -= amount;
    this._updateSunUI();
    this._refreshSeedStates();
    return true;
  }

  getPlantAt(col, row) {
    return this.grid[row]?.[col] || null;
  }

  getPlantAtPixel(x, row) {
    const col = Math.floor(x / CONFIG.CELL_W);
    if (col < 0 || col >= CONFIG.COLS) return null;
    return this.getPlantAt(col, row);
  }

  plantAt(plantId, col, row) {
    const def = PLANTS[plantId];
    if (!def) return false;
    if (this.getPlantAt(col, row)) return false;
    if (this.cooldowns[plantId] > 0) return false;
    if (!this.spendSun(def.cost)) return false;

    const plant = new Plant(def, col, row, this);
    this.plants.push(plant);
    this.grid[row][col] = plant;
    this.cooldowns[plantId] = def.cooldown;
    this.stats.plants += 1;
    this._refreshSeedStates();
    return true;
  }

  onPlantRemoved(plant) {
    this.plants = this.plants.filter((p) => p !== plant);
    if (this.grid[plant.row]?.[plant.col] === plant) {
      this.grid[plant.row][plant.col] = null;
    }
  }

  onZombieReachedHouse(zombie) {
    if (this.ended) return;
    zombie.alive = false;
    zombie.el.remove();
    this._end(false);
  }

  _checkWin() {
    if (this.ended) return;
    if (this.waveIndex < this.level.waves.length) return;
    const alive = this.zombies.some((z) => z.alive);
    if (!alive) this._end(true);
  }

  _end(won) {
    this.ended = true;
    this.paused = true;
    if (typeof this.onEnd === "function") {
      this.onEnd({
        won,
        stats: { ...this.stats },
        levelId: this.level.id,
        hasNext: won && this.level.id < LEVELS.length,
      });
    }
  }

  _buildSeedBar() {
    this.seedBar.innerHTML = "";
    for (const id of this.level.plants) {
      const def = PLANTS[id];
      const card = Utils.el("div", "seed-card");
      card.dataset.plant = id;
      card.innerHTML = `
        <div class="seed-sprite ${def.icon}"></div>
        <span class="seed-cost">${def.cost}</span>
        <span class="seed-name">${def.name}</span>`;
      card.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this._selectPlant(id, card, e);
      });
      this.seedBar.appendChild(card);
    }
    this._refreshSeedStates();
  }

  _selectPlant(id, card, e) {
    if (this.paused || this.ended) return;
    const def = PLANTS[id];
    if (this.sun < def.cost || this.cooldowns[id] > 0) return;

    if (this.selectedPlant === id) {
      this.selectedPlant = null;
      this._clearSelection();
      this._endDrag();
      return;
    }

    this.selectedPlant = id;
    this._clearSelection();
    card.classList.add("selected");
    this._startDrag(id, e);
  }

  _clearSelection() {
    this.seedBar.querySelectorAll(".seed-card").forEach((c) => c.classList.remove("selected"));
    this.lawnEl.querySelectorAll(".cell").forEach((c) => c.classList.remove("highlight", "invalid"));
  }

  _refreshSeedStates() {
    this.seedBar.querySelectorAll(".seed-card").forEach((card) => {
      const id = card.dataset.plant;
      const def = PLANTS[id];
      const cooling = (this.cooldowns[id] || 0) > 0;
      const poor = this.sun < def.cost;
      card.classList.toggle("cooling", cooling);
      card.classList.toggle("disabled", poor || cooling);
    });
  }

  _updateSunUI() {
    this.sunCountEl.textContent = Math.floor(this.sun);
  }

  _updateHud() {
    this.hudLevel.textContent = `第 ${this.level.id} 关`;
    this.hudWave.textContent = `波次 ${Math.min(this.waveIndex + 1, this.level.waves.length)}/${this.level.waves.length}`;
    this.hudDiff.textContent = this.diff.name;
  }

  _toast(text) {
    const old = this.stageEl.querySelector(".wave-toast");
    if (old) old.remove();
    const t = Utils.el("div", "wave-toast", text);
    this.stageEl.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  fitStage() {
    const wrap = this.stageWrap;
    if (!wrap || !this.stageEl) return;
    const pad = 16;
    const sw = wrap.clientWidth - pad;
    const sh = wrap.clientHeight - pad;
    const bw = CONFIG.COLS * CONFIG.CELL_W + 90;
    const bh = CONFIG.ROWS * CONFIG.CELL_H;
    const scale = Math.min(sw / bw, sh / bh, 1.15);
    this.stageEl.style.transform = `scale(${scale})`;
    document.documentElement.style.setProperty("--cell-w", `${CONFIG.CELL_W}px`);
    document.documentElement.style.setProperty("--cell-h", `${CONFIG.CELL_H}px`);
  }

  /* ===== 拖拽种植 ===== */
  _bindPlanting() {
    this._drag = {
      active: false,
      plantId: null,
      ghost: document.getElementById("drag-ghost"),
    };

    const onMove = (e) => this._onDragMove(e);
    const onUp = (e) => this._onDragUp(e);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    this.lawnEl.addEventListener("pointerdown", (e) => {
      if (!this.selectedPlant || this.paused || this.ended) return;
      const cell = e.target.closest(".cell");
      if (!cell) return;
      const col = +cell.dataset.col;
      const row = +cell.dataset.row;
      if (this.plantAt(this.selectedPlant, col, row)) {
        this.selectedPlant = null;
        this._clearSelection();
        this._endDrag();
      }
    });
  }

  _startDrag(plantId, e) {
    const d = this._drag;
    d.active = true;
    d.plantId = plantId;
    d.ghost.hidden = false;
    d.ghost.className = `drag-ghost plant plant-${plantId}`;
    d.ghost.innerHTML = `<div class="plant-body">${PlantSprites[plantId] || ""}</div>`;
    this._onDragMove(e);
  }

  _endDrag() {
    const d = this._drag;
    d.active = false;
    d.plantId = null;
    d.ghost.hidden = true;
    this.lawnEl.querySelectorAll(".cell").forEach((c) => c.classList.remove("highlight", "invalid"));
  }

  _onDragMove(e) {
    const d = this._drag;
    if (!d.active || !this.selectedPlant) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX;
    const y = e.clientY ?? e.touches?.[0]?.clientY;
    if (x == null) return;
    d.ghost.style.left = `${x}px`;
    d.ghost.style.top = `${y}px`;

    const cell = this._hitCell(x, y);
    this.lawnEl.querySelectorAll(".cell").forEach((c) => c.classList.remove("highlight", "invalid"));
    if (cell) {
      const occupied = !!this.getPlantAt(+cell.dataset.col, +cell.dataset.row);
      cell.classList.add(occupied ? "invalid" : "highlight");
    }
  }

  _onDragUp(e) {
    const d = this._drag;
    if (!d.active || !this.selectedPlant) return;
    const x = e.clientX ?? 0;
    const y = e.clientY ?? 0;
    const cell = this._hitCell(x, y);
    if (cell) {
      const col = +cell.dataset.col;
      const row = +cell.dataset.row;
      this.plantAt(this.selectedPlant, col, row);
      this.selectedPlant = null;
      this._clearSelection();
      this._endDrag();
      return;
    }
    // 未放到格子上：结束拖拽幽灵，但保留选中，便于再点草坪种植
    d.active = false;
    d.ghost.hidden = true;
    this.lawnEl.querySelectorAll(".cell").forEach((c) => c.classList.remove("highlight", "invalid"));
  }

  _hitCell(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    return el?.closest?.(".cell") || null;
  }
}
