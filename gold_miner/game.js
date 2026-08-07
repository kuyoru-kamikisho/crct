(() => {
  "use strict";

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const canvas = $("game-canvas");
  const ctx = canvas.getContext("2d");

  const screens = {
    start: $("screen-start"),
    howto: $("screen-howto"),
    level: $("screen-level"),
    game: $("screen-game"),
    pause: $("screen-pause"),
    shop: $("screen-shop"),
    end: $("screen-end"),
  };

  // ---------- Constants ----------
  const W = 900;
  const H = 640;
  const GROUND_Y = 118;
  const HOOK_ORIGIN = { x: W / 2, y: GROUND_Y + 8 };
  const SWING_SPEED = 1.55;
  const SWING_MAX = Math.PI * 0.78;
  const EXTEND_SPEED = 420;
  const BASE_RETRACT = 280;

  const LEVELS = [
    { name: "浅层矿脉", target: 650, time: 60, density: 0.9 },
    { name: "黄金巷道", target: 1200, time: 58, density: 1.0 },
    { name: "深层裂隙", target: 2000, time: 55, density: 1.1 },
    { name: "钻石洞窟", target: 3200, time: 52, density: 1.15 },
    { name: "熔岩边缘", target: 4800, time: 50, density: 1.2 },
    { name: "传说矿井", target: 7000, time: 48, density: 1.25 },
    { name: "地心宝藏", target: 10000, time: 45, density: 1.3 },
    { name: "无尽金脉", target: 15000, time: 42, density: 1.35 },
  ];

  const ITEM_DEFS = {
    goldS: { kind: "gold", value: 50, radius: 14, weight: 1.0, label: "小金块" },
    goldM: { kind: "gold", value: 100, radius: 22, weight: 1.6, label: "中金块" },
    goldL: { kind: "gold", value: 250, radius: 32, weight: 2.4, label: "大金块" },
    goldXL: { kind: "gold", value: 500, radius: 42, weight: 3.2, label: "巨型金块" },
    rockS: { kind: "rock", value: 11, radius: 16, weight: 2.2, label: "小石头" },
    rockL: { kind: "rock", value: 20, radius: 28, weight: 3.5, label: "大石头" },
    diamond: { kind: "diamond", value: 600, radius: 12, weight: 0.55, label: "钻石" },
    bag: { kind: "bag", value: 0, radius: 18, weight: 1.2, label: "神秘袋" },
    bone: { kind: "bone", value: 2, radius: 15, weight: 0.9, label: "骨头" },
    pig: { kind: "pig", value: 2, radius: 20, weight: 1.8, label: "鼹鼠" },
    tnt: { kind: "tnt", value: 1, radius: 16, weight: 1.0, label: "炸药箱" },
  };

  const SHOP_CATALOG = [
    {
      id: "strength",
      name: "力量药水",
      desc: "拉回重物更快（本局永久生效）",
      price: 200,
      once: true,
    },
    {
      id: "dynamite",
      name: "炸药 ×1",
      desc: "拉回时按 D 炸掉钩上物品及附近矿石",
      price: 150,
      once: false,
    },
    {
      id: "lucky",
      name: "幸运草",
      desc: "神秘袋更容易开出高价值",
      price: 280,
      once: true,
    },
    {
      id: "rockBoost",
      name: "拾荒执照",
      desc: "石头卖价 ×5",
      price: 120,
      once: true,
    },
    {
      id: "clock",
      name: "矿工怀表",
      desc: "下一关额外 +15 秒",
      price: 180,
      once: false,
    },
    {
      id: "magnet",
      name: "磁铁钩",
      desc: "钩爪附近的贵重品微微被吸引",
      price: 350,
      once: true,
    },
  ];

  // ---------- State ----------
  const state = {
    screen: "start",
    level: 0,
    money: 0,
    levelScore: 0,
    timeLeft: 60,
    paused: false,
    running: false,
    items: [],
    particles: [],
    floatTexts: [],
    hook: {
      angle: 0,
      dir: 1,
      length: 40,
      minLength: 40,
      maxLength: 560,
      mode: "swing", // swing | extend | retract
      caught: null,
    },
    upgrades: {
      strength: false,
      dynamite: 0,
      lucky: false,
      rockBoost: false,
      magnet: false,
      bonusTime: 0,
    },
    shopBought: new Set(),
    lastTs: 0,
    shake: 0,
    minerFrame: 0,
    catchFlash: 0,
    goalMet: false,
  };

  // ---------- Audio (Web Audio, no assets) ----------
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  function beep({ freq = 440, dur = 0.08, type = "square", gain = 0.05, slide = 0 }) {
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const SFX = {
    shoot: () => beep({ freq: 220, dur: 0.12, type: "sawtooth", gain: 0.04, slide: 180 }),
    grab: () => beep({ freq: 520, dur: 0.07, type: "triangle", gain: 0.06 }),
    cash: () => {
      beep({ freq: 660, dur: 0.08, type: "square", gain: 0.045 });
      setTimeout(() => beep({ freq: 880, dur: 0.1, type: "square", gain: 0.04 }), 70);
    },
    boom: () => beep({ freq: 90, dur: 0.25, type: "sawtooth", gain: 0.08, slide: -60 }),
    tick: () => beep({ freq: 900, dur: 0.04, type: "square", gain: 0.025 }),
    fail: () => beep({ freq: 180, dur: 0.3, type: "triangle", gain: 0.05, slide: -100 }),
    buy: () => beep({ freq: 740, dur: 0.09, type: "sine", gain: 0.05 }),
    win: () => {
      [523, 659, 784, 1046].forEach((f, i) =>
        setTimeout(() => beep({ freq: f, dur: 0.12, type: "square", gain: 0.04 }), i * 90)
      );
    },
  };

  // ---------- Screen helpers ----------
  function showScreen(name) {
    state.screen = name;
    Object.entries(screens).forEach(([key, el]) => {
      el.classList.toggle("active", key === name || (name === "pause" && key === "game"));
    });
    if (name === "pause") screens.pause.classList.add("active");
  }

  function showToast(text) {
    const el = $("toast");
    el.textContent = text;
    el.hidden = false;
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      el.hidden = true;
    }, 900);
  }

  function addFloatText(x, y, text, color = "#ffd76a") {
    state.floatTexts.push({ x, y, text, color, life: 0.9, vy: -40 });
  }

  function updateHUD() {
    $("hud-level").textContent = String(state.level + 1);
    $("hud-money").textContent = `$${state.money}`;
    $("hud-target").textContent = `$${LEVELS[state.level].target}`;
    $("hud-timer").textContent = String(Math.ceil(state.timeLeft));
    $("hud-timer").parentElement.classList.toggle("urgent", state.timeLeft <= 10);
    $("pu-strength-n").textContent = state.upgrades.strength ? "✓" : "0";
    $("pu-dynamite-n").textContent = String(state.upgrades.dynamite);
    $("pu-lucky-n").textContent = state.upgrades.lucky ? "✓" : "0";
  }

  // ---------- Level generation ----------
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function pickWeighted(pairs) {
    const total = pairs.reduce((s, p) => s + p[1], 0);
    let r = Math.random() * total;
    for (const [key, w] of pairs) {
      r -= w;
      if (r <= 0) return key;
    }
    return pairs[pairs.length - 1][0];
  }

  function overlaps(a, b, pad = 8) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy) < a.radius + b.radius + pad;
  }

  function spawnItems(levelIdx) {
    const lv = LEVELS[levelIdx];
    const count = Math.round(14 + levelIdx * 2.2 * lv.density);
    const items = [];
    const weights = [
      ["goldS", 22],
      ["goldM", 16],
      ["goldL", 8 + levelIdx],
      ["goldXL", Math.max(0, levelIdx - 2)],
      ["rockS", 14],
      ["rockL", 10],
      ["diamond", 3 + levelIdx * 0.8],
      ["bag", 6],
      ["bone", 5],
      ["pig", 3],
      ["tnt", 2 + (levelIdx > 2 ? 2 : 0)],
    ];

    const minY = GROUND_Y + 70;
    const maxY = H - 36;
    let attempts = 0;

    while (items.length < count && attempts < 800) {
      attempts++;
      const key = pickWeighted(weights);
      const def = ITEM_DEFS[key];
      const x = rand(40 + def.radius, W - 40 - def.radius);
      const y = rand(minY + def.radius, maxY - def.radius);
      // Prefer deeper for larger/more valuable
      const biasY =
        def.kind === "gold" && def.radius > 25
          ? rand(minY + 120, maxY)
          : def.kind === "diamond"
            ? rand(minY + 80, maxY)
            : y;
      const item = {
        id: `${key}_${items.length}_${Math.random().toString(36).slice(2, 7)}`,
        type: key,
        ...def,
        x,
        y: biasY,
        alive: true,
        wobble: Math.random() * Math.PI * 2,
      };
      if (items.some((o) => overlaps(item, o))) continue;
      items.push(item);
    }
    return items;
  }

  function resolveBagValue() {
    const lucky = state.upgrades.lucky;
    const roll = Math.random();
    if (lucky) {
      if (roll < 0.25) return 800;
      if (roll < 0.5) return 400;
      if (roll < 0.75) return 200;
      if (roll < 0.9) return 100;
      return 1;
    }
    if (roll < 0.1) return 600;
    if (roll < 0.25) return 300;
    if (roll < 0.5) return 120;
    if (roll < 0.75) return 50;
    return 2;
  }

  function itemPayout(item) {
    if (item.kind === "bag") return resolveBagValue();
    if (item.kind === "rock" && state.upgrades.rockBoost) return item.value * 5;
    if (item.kind === "tnt") return 2;
    return item.value;
  }

  // ---------- Hook helpers ----------
  function hookTip() {
    const { angle, length } = state.hook;
    return {
      x: HOOK_ORIGIN.x + Math.sin(angle) * length,
      y: HOOK_ORIGIN.y + Math.cos(angle) * length,
    };
  }

  function resetHook() {
    state.hook.mode = "swing";
    state.hook.length = state.hook.minLength;
    state.hook.caught = null;
  }

  function shootHook() {
    if (!state.running || state.paused) return;
    if (state.hook.mode !== "swing") return;
    state.hook.mode = "extend";
    SFX.shoot();
  }

  function tryCatch() {
    const tip = hookTip();
    let best = null;
    let bestDist = Infinity;
    for (const item of state.items) {
      if (!item.alive) continue;
      const d = Math.hypot(item.x - tip.x, item.y - tip.y);
      const hitR = item.radius + 10;
      if (d < hitR && d < bestDist) {
        best = item;
        bestDist = d;
      }
    }
    if (best) {
      best.alive = false;
      state.hook.caught = best;
      state.hook.mode = "retract";
      state.catchFlash = 0.25;
      SFX.grab();
      spawnSparks(tip.x, tip.y, "#ffd76a", 8);
    }
  }

  function retractSpeed() {
    let speed = BASE_RETRACT;
    const c = state.hook.caught;
    if (c) {
      speed /= c.weight;
      if (state.upgrades.strength) speed *= 1.65;
    } else {
      speed *= 1.35;
    }
    return speed;
  }

  function collectCaught() {
    const item = state.hook.caught;
    if (!item) {
      resetHook();
      return;
    }

    if (item.kind === "tnt") {
      // Catching TNT crate gives a free dynamite charge + small boom around origin
      state.upgrades.dynamite += 1;
      explodeAt(HOOK_ORIGIN.x, HOOK_ORIGIN.y + 40, 70, false);
      showToast("+1 炸药");
      SFX.boom();
    } else {
      const pay = itemPayout(item);
      state.money += pay;
      state.levelScore += pay;
      addFloatText(HOOK_ORIGIN.x, HOOK_ORIGIN.y - 10, `+$${pay}`);
      showToast(`${item.label} +$${pay}`);
      SFX.cash();
      spawnSparks(HOOK_ORIGIN.x, HOOK_ORIGIN.y + 20, "#ffd76a", 14);
    }
    state.hook.caught = null;
    resetHook();
    updateHUD();
    checkGoalFlash();
  }

  function checkGoalFlash() {
    const target = LEVELS[state.level].target;
    if (!state.goalMet && state.money >= target) {
      state.goalMet = true;
      showToast("目标达成！");
      SFX.win();
    }
  }

  // ---------- Dynamite ----------
  function useDynamite() {
    if (!state.running || state.paused) return;
    if (state.upgrades.dynamite <= 0) return;
    if (state.hook.mode === "swing") return;

    state.upgrades.dynamite -= 1;
    const tip = hookTip();
    explodeAt(tip.x, tip.y, 95, true);
    state.hook.caught = null;
    state.hook.mode = "retract";
    state.shake = 10;
    SFX.boom();
    updateHUD();
    showToast("轰！");
  }

  function explodeAt(x, y, radius, destroyCaught) {
    for (const item of state.items) {
      if (!item.alive) continue;
      if (Math.hypot(item.x - x, item.y - y) <= radius + item.radius) {
        item.alive = false;
        spawnSparks(item.x, item.y, item.kind === "gold" ? "#e8b84a" : "#a89078", 10);
        // Partial salvage for destroyed valuables
        if (item.kind === "gold" || item.kind === "diamond") {
          const salvage = Math.floor(item.value * 0.35);
          if (salvage > 0) {
            state.money += salvage;
            state.levelScore += salvage;
            addFloatText(item.x, item.y, `+$${salvage}`, "#c4783a");
          }
        }
      }
    }
    if (destroyCaught && state.hook.caught) {
      state.hook.caught = null;
    }
    spawnSparks(x, y, "#f0a040", 22);
    spawnSparks(x, y, "#e07060", 12);
    updateHUD();
  }

  function spawnSparks(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(40, 180);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.3, 0.7),
        max: 0.7,
        color,
        size: rand(2, 5),
      });
    }
  }

  // ---------- Game flow ----------
  function newGame() {
    state.level = 0;
    state.money = 0;
    state.upgrades = {
      strength: false,
      dynamite: 0,
      lucky: false,
      rockBoost: false,
      magnet: false,
      bonusTime: 0,
    };
    state.shopBought = new Set();
    beginLevelIntro();
  }

  function beginLevelIntro() {
    state.running = false;
    state.paused = false;
    const lv = LEVELS[state.level];
    $("level-eyebrow").textContent = `第 ${state.level + 1} 关`;
    $("level-title").textContent = lv.name;
    $("level-target").textContent = String(lv.target);
    $("level-time").textContent = String(lv.time + state.upgrades.bonusTime);
    showScreen("level");
  }

  function startLevel() {
    const lv = LEVELS[state.level];
    state.levelScore = 0;
    state.timeLeft = lv.time + state.upgrades.bonusTime;
    state.upgrades.bonusTime = 0;
    state.goalMet = state.money >= lv.target;
    state.items = spawnItems(state.level);
    state.particles = [];
    state.floatTexts = [];
    state.shake = 0;
    resetHook();
    state.hook.angle = 0;
    state.hook.dir = 1;
    state.running = true;
    state.paused = false;
    state.lastTs = performance.now();
    updateHUD();
    showScreen("game");
    requestAnimationFrame(loop);
  }

  function endLevel() {
    state.running = false;
    const target = LEVELS[state.level].target;
    if (state.money < target) {
      failGame();
      return;
    }
    if (state.level >= LEVELS.length - 1) {
      winGame();
      return;
    }
    openShop();
  }

  function failGame() {
    SFX.fail();
    $("end-eyebrow").textContent = "挖掘失败";
    $("end-title").textContent = "目标未能达成";
    $("end-money").textContent = `$${state.money}`;
    $("end-msg").textContent = `还差 $${LEVELS[state.level].target - state.money} 就能过关了。`;
    showScreen("end");
  }

  function winGame() {
    SFX.win();
    $("end-eyebrow").textContent = "传奇矿工";
    $("end-title").textContent = "挖穿了地心！";
    $("end-money").textContent = `$${state.money}`;
    $("end-msg").textContent = "你征服了所有矿脉，金光满载而归。";
    showScreen("end");
  }

  function openShop() {
    state.shopBought = new Set(
      [...state.shopBought].filter((id) => {
        const item = SHOP_CATALOG.find((s) => s.id === id);
        return item && item.once;
      })
    );
    // Mark once-owned upgrades
    if (state.upgrades.strength) state.shopBought.add("strength");
    if (state.upgrades.lucky) state.shopBought.add("lucky");
    if (state.upgrades.rockBoost) state.shopBought.add("rockBoost");
    if (state.upgrades.magnet) state.shopBought.add("magnet");

    $("shop-money").textContent = `$${state.money}`;
    const surplus = state.money - LEVELS[state.level].target;
    $("shop-result").textContent =
      surplus >= 500
        ? `本关超额 $${surplus}！老板给你看了点好货。`
        : surplus >= 0
          ? `刚好达标，买点装备稳一点。`
          : `过关了，准备下一层吧。`;

    renderShop();
    showScreen("shop");
  }

  function renderShop() {
    const grid = $("shop-grid");
    grid.innerHTML = "";
    for (const item of SHOP_CATALOG) {
      const owned = item.once && state.shopBought.has(item.id);
      const cant = state.money < item.price;
      const el = document.createElement("button");
      el.type = "button";
      el.className = `shop-item${owned ? " sold" : cant ? " cant" : ""}`;
      el.innerHTML = `
        <div class="shop-item-top">
          <span class="shop-item-name">${item.name}</span>
          <span class="shop-item-price">${owned ? "已拥有" : "$" + item.price}</span>
        </div>
        <p class="shop-item-desc">${item.desc}</p>
      `;
      el.addEventListener("click", () => buyShopItem(item));
      grid.appendChild(el);
    }
  }

  function buyShopItem(item) {
    if (item.once && state.shopBought.has(item.id)) return;
    if (state.money < item.price) {
      showToast("钱不够");
      return;
    }
    state.money -= item.price;
    SFX.buy();

    switch (item.id) {
      case "strength":
        state.upgrades.strength = true;
        state.shopBought.add("strength");
        break;
      case "dynamite":
        state.upgrades.dynamite += 1;
        break;
      case "lucky":
        state.upgrades.lucky = true;
        state.shopBought.add("lucky");
        break;
      case "rockBoost":
        state.upgrades.rockBoost = true;
        state.shopBought.add("rockBoost");
        break;
      case "clock":
        state.upgrades.bonusTime += 15;
        break;
      case "magnet":
        state.upgrades.magnet = true;
        state.shopBought.add("magnet");
        break;
    }
    $("shop-money").textContent = `$${state.money}`;
    updateHUD();
    renderShop();
  }

  function nextLevel() {
    state.level += 1;
    beginLevelIntro();
  }

  // ---------- Update ----------
  function update(dt) {
    if (!state.running || state.paused) return;

    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      updateHUD();
      endLevel();
      return;
    }
    if (state.timeLeft <= 10 && Math.floor(state.timeLeft * 2) !== Math.floor((state.timeLeft + dt) * 2)) {
      SFX.tick();
    }

    state.minerFrame += dt;
    if (state.catchFlash > 0) state.catchFlash -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 28);

    const hook = state.hook;

    if (hook.mode === "swing") {
      hook.angle += hook.dir * SWING_SPEED * dt;
      if (hook.angle > SWING_MAX) {
        hook.angle = SWING_MAX;
        hook.dir = -1;
      } else if (hook.angle < -SWING_MAX) {
        hook.angle = -SWING_MAX;
        hook.dir = 1;
      }
    } else if (hook.mode === "extend") {
      hook.length += EXTEND_SPEED * dt;
      tryCatch();
      const tip = hookTip();
      if (
        hook.length >= hook.maxLength ||
        tip.x < 8 ||
        tip.x > W - 8 ||
        tip.y > H - 8
      ) {
        hook.mode = "retract";
      }
    } else if (hook.mode === "retract") {
      hook.length -= retractSpeed() * dt;
      if (hook.caught) {
        const tip = hookTip();
        hook.caught.x = tip.x;
        hook.caught.y = tip.y + hook.caught.radius * 0.35;
      }
      if (hook.length <= hook.minLength) {
        hook.length = hook.minLength;
        collectCaught();
      }
    }

    // Magnet attraction while extending
    if (state.upgrades.magnet && hook.mode === "extend") {
      const tip = hookTip();
      for (const item of state.items) {
        if (!item.alive) continue;
        if (item.kind !== "gold" && item.kind !== "diamond" && item.kind !== "bag") continue;
        const d = Math.hypot(item.x - tip.x, item.y - tip.y);
        if (d < 90 && d > 1) {
          const pull = (90 - d) * 0.55 * dt;
          item.x += ((tip.x - item.x) / d) * pull;
          item.y += ((tip.y - item.y) / d) * pull;
        }
      }
    }

    // Particles
    for (const p of state.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);

    for (const f of state.floatTexts) {
      f.life -= dt;
      f.y += f.vy * dt;
    }
    state.floatTexts = state.floatTexts.filter((f) => f.life > 0);

    // Idle wobble
    for (const item of state.items) {
      if (!item.alive) continue;
      item.wobble += dt;
    }

    // Early finish when mine is cleared
    const remaining = state.items.some((i) => i.alive);
    if (!remaining && !state.hook.caught && state.hook.mode === "swing") {
      state.timeLeft = Math.min(state.timeLeft, 0.35);
    }

    updateHUD();
  }

  // ---------- Draw ----------
  function draw() {
    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }

    drawBackground();
    drawMiner();
    for (const item of state.items) {
      if (item.alive) drawItem(item);
    }
    if (state.hook.caught) drawItem(state.hook.caught, true);
    drawHook();
    drawParticles();
    drawFloatTexts();

    ctx.restore();
  }

  function drawBackground() {
    // Earth gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#3d2e22");
    g.addColorStop(0.18, "#2a1e16");
    g.addColorStop(1, "#120e0b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Surface soil strip
    const sg = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sg.addColorStop(0, "#5a7a3a");
    sg.addColorStop(0.55, "#3d5a28");
    sg.addColorStop(1, "#2c3d1c");
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, GROUND_Y);

    // Grass tufts
    ctx.fillStyle = "#6b8f44";
    for (let x = 0; x < W; x += 18) {
      const h = 6 + ((x * 13) % 10);
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x + 5, GROUND_Y - h);
      ctx.lineTo(x + 10, GROUND_Y);
      ctx.fill();
    }

    // Dirt edge
    ctx.fillStyle = "#4a3424";
    ctx.fillRect(0, GROUND_Y - 4, W, 10);

    // Underground texture dots
    ctx.fillStyle = "rgba(232, 184, 74, 0.04)";
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + 40) % W;
      const y = GROUND_Y + 40 + ((i * 53) % (H - GROUND_Y - 60));
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft vignette
    const vg = ctx.createRadialGradient(W / 2, H * 0.45, 80, W / 2, H * 0.5, W * 0.7);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    // Lantern glow near miner
    const lg = ctx.createRadialGradient(HOOK_ORIGIN.x, GROUND_Y - 20, 10, HOOK_ORIGIN.x, GROUND_Y, 120);
    lg.addColorStop(0, "rgba(255, 200, 80, 0.18)");
    lg.addColorStop(1, "rgba(255, 200, 80, 0)");
    ctx.fillStyle = lg;
    ctx.fillRect(HOOK_ORIGIN.x - 120, 0, 240, GROUND_Y + 40);
  }

  function drawMiner() {
    const x = HOOK_ORIGIN.x;
    const y = GROUND_Y - 2;
    const bob = Math.sin(state.minerFrame * 3) * 1.5;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 28, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = "#3a2a1c";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 18 + bob);
    ctx.lineTo(x - 12, y + 2);
    ctx.moveTo(x + 8, y - 18 + bob);
    ctx.lineTo(x + 12, y + 2);
    ctx.stroke();

    // Body
    ctx.fillStyle = "#c4783a";
    roundRect(x - 16, y - 48 + bob, 32, 32, 6);
    ctx.fill();

    // Overalls strap
    ctx.fillStyle = "#2a4a6a";
    ctx.fillRect(x - 14, y - 40 + bob, 28, 8);

    // Head
    ctx.fillStyle = "#e8c4a0";
    ctx.beginPath();
    ctx.arc(x, y - 58 + bob, 12, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = "#e8b84a";
    ctx.beginPath();
    ctx.arc(x, y - 62 + bob, 13, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - 14, y - 64 + bob, 28, 6);
    // Lamp
    ctx.fillStyle = "#fff3c0";
    ctx.beginPath();
    ctx.arc(x, y - 70 + bob, 4, 0, Math.PI * 2);
    ctx.fill();

    // Arms holding winch
    ctx.strokeStyle = "#e8c4a0";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 36 + bob);
    ctx.lineTo(x - 6, y - 22 + bob);
    ctx.moveTo(x + 14, y - 36 + bob);
    ctx.lineTo(x + 6, y - 22 + bob);
    ctx.stroke();

    // Winch base
    ctx.fillStyle = "#5a4030";
    roundRect(x - 10, y - 26 + bob, 20, 12, 3);
    ctx.fill();
    ctx.strokeStyle = "#8a6a40";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 20 + bob, 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawHook() {
    const tip = hookTip();
    const ox = HOOK_ORIGIN.x;
    const oy = HOOK_ORIGIN.y;

    // Rope
    ctx.strokeStyle = "#d4b896";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();

    // Hook claw
    ctx.save();
    ctx.translate(tip.x, tip.y);
    ctx.rotate(-state.hook.angle);
    ctx.strokeStyle = state.catchFlash > 0 ? "#ffd76a" : "#c0c8d0";
    ctx.fillStyle = state.catchFlash > 0 ? "#ffd76a" : "#a8b0b8";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 6, 10, -0.2, Math.PI + 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, 6);
    ctx.lineTo(-4, -2);
    ctx.lineTo(4, -2);
    ctx.lineTo(10, 6);
    ctx.stroke();
    // Tip spike
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(0, 4);
    ctx.stroke();
    ctx.restore();
  }

  function drawItem(item, caught = false) {
    const wob = caught ? 0 : Math.sin(item.wobble * 2) * 1.2;
    const x = item.x;
    const y = item.y + wob;
    const r = item.radius;

    ctx.save();
    ctx.translate(x, y);

    if (item.kind === "gold") {
      drawGold(r, item.value);
    } else if (item.kind === "rock") {
      drawRock(r);
    } else if (item.kind === "diamond") {
      drawDiamond(r);
    } else if (item.kind === "bag") {
      drawBag(r);
    } else if (item.kind === "bone") {
      drawBone(r);
    } else if (item.kind === "pig") {
      drawPig(r);
    } else if (item.kind === "tnt") {
      drawTnt(r);
    }

    ctx.restore();
  }

  function drawGold(r, value) {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    g.addColorStop(0, "#ffe08a");
    g.addColorStop(0.5, "#e8b84a");
    g.addColorStop(1, "#9a6a18");
    ctx.fillStyle = g;
    ctx.beginPath();
    // Nugget-ish polygon
    const n = value >= 400 ? 7 : value >= 200 ? 6 : 5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const rr = r * (0.75 + ((i * 37) % 5) * 0.05);
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 230, 140, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawRock(r) {
    const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 2, 0, 0, r);
    g.addColorStop(0, "#8a8078");
    g.addColorStop(1, "#4a443c");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.2);
    ctx.lineTo(-r * 0.5, -r * 0.85);
    ctx.lineTo(r * 0.3, -r * 0.95);
    ctx.lineTo(r * 0.95, -r * 0.1);
    ctx.lineTo(r * 0.6, r * 0.85);
    ctx.lineTo(-r * 0.4, r * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawDiamond(r) {
    const s = r * 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.7, -s * 0.15);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.7, -s * 0.15);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -s, 0, s);
    g.addColorStop(0, "#e8ffff");
    g.addColorStop(0.4, "#7ad4ff");
    g.addColorStop(1, "#2a8acc");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Facet
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, -s * 0.15);
    ctx.lineTo(0, -s);
    ctx.lineTo(s * 0.35, -s * 0.15);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.stroke();
  }

  function drawBag(r) {
    ctx.fillStyle = "#8b5a2b";
    roundRect(-r * 0.85, -r * 0.7, r * 1.7, r * 1.4, 4);
    ctx.fill();
    ctx.fillStyle = "#c4783a";
    ctx.fillRect(-r * 0.2, -r * 0.7, r * 0.4, r * 1.4);
    ctx.strokeStyle = "#5a3a18";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -r * 0.7, r * 0.35, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = "#e8b84a";
    ctx.font = `bold ${Math.max(10, r * 0.7)}px Outfit, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 0, 2);
  }

  function drawBone(r) {
    ctx.strokeStyle = "#e8dcc8";
    ctx.fillStyle = "#ddd0b8";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.3);
    ctx.lineTo(r * 0.7, r * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-r * 0.75, -r * 0.45, r * 0.28, 0, Math.PI * 2);
    ctx.arc(-r * 0.55, -r * 0.15, r * 0.28, 0, Math.PI * 2);
    ctx.arc(r * 0.55, r * 0.15, r * 0.28, 0, Math.PI * 2);
    ctx.arc(r * 0.75, r * 0.45, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPig(r) {
    // Mole-ish critter
    ctx.fillStyle = "#6a5040";
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a6a50";
    ctx.beginPath();
    ctx.arc(r * 0.55, -r * 0.1, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1008";
    ctx.beginPath();
    ctx.arc(r * 0.7, -r * 0.2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c4783a";
    ctx.beginPath();
    ctx.ellipse(r * 0.95, -r * 0.05, r * 0.18, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTnt(r) {
    ctx.fillStyle = "#c04030";
    roundRect(-r * 0.85, -r * 0.7, r * 1.7, r * 1.4, 3);
    ctx.fill();
    ctx.fillStyle = "#f0e8d0";
    ctx.fillRect(-r * 0.85, -r * 0.15, r * 1.7, r * 0.35);
    ctx.fillStyle = "#c04030";
    ctx.font = `bold ${Math.max(9, r * 0.55)}px Outfit, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("TNT", 0, 2);
    ctx.strokeStyle = "#2a2010";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.7);
    ctx.quadraticCurveTo(r * 0.4, -r * 1.1, r * 0.15, -r * 1.35);
    ctx.stroke();
    ctx.fillStyle = "#f0a040";
    ctx.beginPath();
    ctx.arc(r * 0.15, -r * 1.35, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParticles() {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloatTexts() {
    for (const f of state.floatTexts) {
      ctx.globalAlpha = Math.max(0, f.life / 0.9);
      ctx.fillStyle = f.color;
      ctx.font = "700 18px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------- Loop ----------
  function loop(ts) {
    if (!state.running) return;
    const dt = Math.min(0.033, (ts - state.lastTs) / 1000 || 0.016);
    state.lastTs = ts;
    if (!state.paused) {
      update(dt);
      draw();
    }
    if (state.running) requestAnimationFrame(loop);
  }

  // ---------- Events ----------
  function bindUI() {
    $("btn-start").addEventListener("click", () => {
      ensureAudio();
      newGame();
    });
    $("btn-howto").addEventListener("click", () => showScreen("howto"));
    $("btn-howto-back").addEventListener("click", () => showScreen("start"));
    $("btn-level-go").addEventListener("click", () => {
      ensureAudio();
      startLevel();
    });
    $("btn-pause").addEventListener("click", () => {
      if (!state.running) return;
      state.paused = true;
      showScreen("pause");
    });
    $("btn-resume").addEventListener("click", () => {
      state.paused = false;
      state.lastTs = performance.now();
      showScreen("game");
    });
    $("btn-restart").addEventListener("click", () => {
      ensureAudio();
      newGame();
    });
    $("btn-quit").addEventListener("click", () => {
      state.running = false;
      state.paused = false;
      showScreen("start");
    });
    $("btn-next-level").addEventListener("click", nextLevel);
    $("btn-again").addEventListener("click", () => {
      ensureAudio();
      newGame();
    });
    $("btn-end-home").addEventListener("click", () => showScreen("start"));

    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      ensureAudio();
      shootHook();
    });

    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        ensureAudio();
        if (state.screen === "level") startLevel();
        else if (state.screen === "game" && !state.paused) shootHook();
        else if (state.screen === "start") newGame();
      }
      if (e.code === "KeyD" || e.code === "KeyX") {
        useDynamite();
      }
      if (e.code === "Escape" || e.code === "KeyP") {
        if (state.screen === "game" && state.running && !state.paused) {
          state.paused = true;
          showScreen("pause");
        } else if (state.screen === "pause") {
          state.paused = false;
          state.lastTs = performance.now();
          showScreen("game");
        }
      }
    });

    // Dynamite button click
    $("pu-dynamite").addEventListener("click", () => {
      ensureAudio();
      useDynamite();
    });

    // Resize canvas CSS only; internal res stays 900x640
    window.addEventListener("resize", () => {});
  }

  // Preview idle draw on load for canvas letterboxing feel
  function drawIdlePreview() {
    state.items = spawnItems(0).slice(0, 8);
    resetHook();
    drawBackground();
    drawMiner();
    for (const item of state.items) drawItem(item);
    drawHook();
  }

  bindUI();
  drawIdlePreview();
})();
