/**
 * 菜单、弹窗与界面控制
 */
const UI = {
  selectedLevelId: 1,
  selectedDiffId: "normal",
  game: null,

  init(game) {
    this.game = game;
    this._els = {
      menu: document.getElementById("screen-menu"),
      game: document.getElementById("screen-game"),
      levelList: document.getElementById("level-list"),
      diffList: document.getElementById("diff-list"),
      btnStart: document.getElementById("btn-start"),
      pause: document.getElementById("overlay-pause"),
      end: document.getElementById("overlay-end"),
      endTitle: document.getElementById("end-title"),
      endDesc: document.getElementById("end-desc"),
      btnNext: document.getElementById("btn-next"),
      orient: document.getElementById("orient-hint"),
    };

    this._renderLevels();
    this._renderDiffs();
    this._bind();

    game.onEnd = (result) => this.showEnd(result);
  },

  _renderLevels() {
    const box = this._els.levelList;
    box.innerHTML = "";
    LEVELS.forEach((lv) => {
      const btn = Utils.el("button", "option-card");
      btn.type = "button";
      btn.dataset.id = lv.id;
      btn.innerHTML = `<span class="opt-title">第 ${lv.id} 关 · ${lv.name}</span>
        <span class="opt-desc">${lv.desc} · ${lv.waves.length} 波</span>`;
      if (lv.id === this.selectedLevelId) btn.classList.add("selected");
      btn.addEventListener("click", () => {
        this.selectedLevelId = lv.id;
        box.querySelectorAll(".option-card").forEach((c) => c.classList.remove("selected"));
        btn.classList.add("selected");
      });
      box.appendChild(btn);
    });
  },

  _renderDiffs() {
    const box = this._els.diffList;
    box.innerHTML = "";
    Object.values(DIFFICULTIES).forEach((d) => {
      const btn = Utils.el("button", "option-card diff");
      btn.type = "button";
      btn.dataset.id = d.id;
      btn.innerHTML = `<span class="opt-title">${d.name}</span>
        <span class="opt-desc">${d.desc}</span>`;
      if (d.id === this.selectedDiffId) btn.classList.add("selected");
      btn.addEventListener("click", () => {
        this.selectedDiffId = d.id;
        box.querySelectorAll(".option-card").forEach((c) => c.classList.remove("selected"));
        btn.classList.add("selected");
      });
      box.appendChild(btn);
    });
  },

  _bind() {
    this._els.btnStart.addEventListener("click", () => this.startGame());

    document.getElementById("btn-pause").addEventListener("click", () => this.showPause());
    document.getElementById("btn-resume").addEventListener("click", () => this.hidePause());
    document.getElementById("btn-restart-pause").addEventListener("click", () => {
      this.hidePause();
      this.startGame();
    });
    document.getElementById("btn-quit-pause").addEventListener("click", () => {
      this.hidePause();
      this.showMenu();
    });

    document.getElementById("btn-menu").addEventListener("click", () => this.showPause());

    document.getElementById("btn-restart").addEventListener("click", () => {
      this.hideEnd();
      this.startGame();
    });
    document.getElementById("btn-quit").addEventListener("click", () => {
      this.hideEnd();
      this.showMenu();
    });
    document.getElementById("btn-next").addEventListener("click", () => {
      this.hideEnd();
      this.selectedLevelId = Math.min(this.selectedLevelId + 1, LEVELS.length);
      this._renderLevels();
      this.startGame();
    });

    document.getElementById("btn-fullscreen")?.addEventListener("click", () => {
      Utils.requestFullscreen(document.getElementById("app"));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._els.game.classList.contains("active")) {
        if (this._els.pause.hidden) this.showPause();
        else this.hidePause();
      }
    });
  },

  startGame() {
    const level = LEVELS.find((l) => l.id === this.selectedLevelId) || LEVELS[0];
    const diff = DIFFICULTIES[this.selectedDiffId] || DIFFICULTIES.normal;

    this.hideEnd();
    this.hidePause();
    this._els.menu.classList.remove("active");
    this._els.menu.hidden = true;
    this._els.game.hidden = false;
    this._els.game.classList.add("active");

    if (Utils.isMobile()) {
      Utils.requestFullscreen(document.getElementById("app"));
    }

    this.game.start(level, diff);
  },

  showMenu() {
    this.game.stopLoop();
    this.hideEnd();
    this.hidePause();
    this._els.game.classList.remove("active");
    this._els.game.hidden = true;
    this._els.menu.hidden = false;
    this._els.menu.classList.add("active");
  },

  showPause() {
    if (!this.game.running || this.game.ended) return;
    this.game.pause();
    this._els.pause.hidden = false;
  },

  hidePause() {
    this._els.pause.hidden = true;
    this.game.resume();
  },

  showEnd({ won, stats, hasNext }) {
    this._els.endTitle.textContent = won ? "胜利！" : "僵尸吃掉了你的脑子…";
    this._els.endTitle.style.color = won ? "#ffd54f" : "#ef5350";
    this._els.endDesc.textContent = won
      ? "你成功守住了家园草坪！"
      : "防线被突破，再调整阵型试试吧。";
    document.getElementById("stat-kills").textContent = stats.kills;
    document.getElementById("stat-suns").textContent = stats.suns;
    document.getElementById("stat-plants").textContent = stats.plants;
    this._els.btnNext.hidden = !hasNext;
    this._els.end.hidden = false;
  },

  hideEnd() {
    this._els.end.hidden = true;
  },

  updateOrientHint() {
    const hint = this._els.orient;
    if (!hint) return;
    const need = Utils.isMobile() && Utils.isPortrait();
    hint.hidden = !need;
  },
};
