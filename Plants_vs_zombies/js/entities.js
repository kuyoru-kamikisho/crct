/**
 * 游戏实体：植物、僵尸、子弹、阳光
 */

class Plant {
  constructor(def, col, row, game) {
    this.id = Utils.uid();
    this.def = def;
    this.col = col;
    this.row = row;
    this.game = game;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.alive = true;
    this.fireTimer = def.fireInterval ? def.fireInterval * 0.5 : 0;
    this.produceTimer = def.produceInterval ? def.produceInterval * 0.6 : 0;
    this.explodeTimer = def.explodeDelay || 0;
    this.el = this._buildEl();
  }

  _buildEl() {
    const pos = Utils.cellTopLeft(this.col, this.row);
    const root = Utils.el("div", `plant plant-${this.def.id}`);
    root.style.left = `${pos.x}px`;
    root.style.top = `${pos.y}px`;
    root.dataset.id = this.id;

    const hpBar = Utils.el("div", "hp-bar", '<div class="hp-fill" style="width:100%"></div>');
    root.appendChild(hpBar);

    const body = Utils.el("div", "plant-body");
    body.innerHTML = PlantSprites[this.def.id] || "";
    root.appendChild(body);

    this.game.entitiesEl.appendChild(root);
    return root;
  }

  update(dt) {
    if (!this.alive) return;

    if (this.def.type === "shooter") {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0 && this._hasTarget()) {
        this._shoot();
        this.fireTimer = this.def.fireInterval;
      }
    }

    if (this.def.type === "producer") {
      this.produceTimer -= dt;
      if (this.produceTimer <= 0) {
        this._produceSun();
        this.produceTimer = this.def.produceInterval;
      }
    }

    if (this.def.type === "instant") {
      this.explodeTimer -= dt;
      if (this.explodeTimer <= 0) {
        this._explode();
      }
    }
  }

  _hasTarget() {
    return this.game.zombies.some(
      (z) => z.alive && z.row === this.row && z.x > Utils.cellCenter(this.col, this.row).x - 10
    );
  }

  _shoot() {
    const c = Utils.cellCenter(this.col, this.row);
    this.game.spawnProjectile({
      x: c.x + 20,
      y: c.y - 8,
      row: this.row,
      damage: this.def.damage,
      type: this.def.projectile,
      slowFactor: this.def.slowFactor,
      slowDuration: this.def.slowDuration,
    });
  }

  _produceSun() {
    const c = Utils.cellCenter(this.col, this.row);
    this.game.spawnSun(c.x + Utils.rand(-10, 10), c.y - 20, true);
  }

  _explode() {
    const c = Utils.cellCenter(this.col, this.row);
    this.game.spawnExplosion(c.x, c.y);

    const radius = this.def.explodeRadius * CONFIG.CELL_W;
    for (const z of this.game.zombies) {
      if (!z.alive) continue;
      const zx = z.x + 20;
      const zy = z.row * CONFIG.CELL_H + CONFIG.CELL_H / 2;
      if (Utils.dist(c.x, c.y, zx, zy) <= radius + 40) {
        z.takeDamage(this.def.explodeDamage);
      }
    }
    this.die(true);
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.el.classList.add("hit", "show-hp");
    setTimeout(() => this.el.classList.remove("hit"), 100);

    const fill = this.el.querySelector(".hp-fill");
    if (fill) {
      const pct = Utils.clamp((this.hp / this.maxHp) * 100, 0, 100);
      fill.style.width = `${pct}%`;
      fill.classList.toggle("low", pct < 35);
    }

    if (this.def.id === "wallnut") {
      this.el.classList.toggle("damaged", this.hp < this.maxHp * 0.66);
      this.el.classList.toggle("critical", this.hp < this.maxHp * 0.33);
    }

    if (this.hp <= 0) this.die();
  }

  die(silent) {
    if (!this.alive) return;
    this.alive = false;
    this.el.remove();
    this.game.onPlantRemoved(this);
  }
}

const PlantSprites = {
  sunflower: `
    <div class="sf-head"><div class="sf-eye l"></div><div class="sf-eye r"></div></div>
    <div class="sf-stem"></div>
    <div class="sf-leaf l"></div><div class="sf-leaf r"></div>`,
  peashooter: `
    <div class="ps-head"><div class="ps-eye"></div><div class="ps-mouth"></div></div>
    <div class="ps-stem"></div>`,
  snowpea: `
    <div class="ps-head"><div class="ice-crystal"></div><div class="ps-eye"></div><div class="ps-mouth"></div></div>
    <div class="ps-stem"></div>`,
  wallnut: `
    <div class="wn-body">
      <div class="wn-brow l"></div><div class="wn-brow r"></div>
      <div class="wn-eye l"></div><div class="wn-eye r"></div>
    </div>`,
  cherry: `
    <div class="ch-pair">
      <div class="ch-stem l"></div><div class="ch-stem r"></div>
      <div class="ch-leaf"></div>
      <div class="ch-berry l"></div><div class="ch-berry r"></div>
    </div>`,
};

class Zombie {
  constructor(def, row, game, mult) {
    this.id = Utils.uid();
    this.def = def;
    this.row = row;
    this.game = game;
    this.hp = def.hp * (mult.hp || 1);
    this.maxHp = this.hp;
    this.baseSpeed = def.speed * (mult.speed || 1);
    this.speed = this.baseSpeed;
    this.damage = def.damage;
    this.alive = true;
    // 出生在右侧入口条内（草坪右缘外 5~40px），保证在舞台可见区域内
    this.x = CONFIG.COLS * CONFIG.CELL_W + Utils.rand(5, 40);
    this.eating = null;
    this.eatTimer = 0;
    this.slowTimer = 0;
    this.el = this._buildEl();
  }

  _buildEl() {
    const root = Utils.el("div", "zombie");
    root.dataset.id = this.id;
    const hat =
      this.def.hat === "cone"
        ? '<div class="zb-cone"></div>'
        : this.def.hat === "bucket"
          ? '<div class="zb-bucket"></div>'
          : "";
    root.innerHTML = `
      <div class="hp-bar"><div class="hp-fill" style="width:100%"></div></div>
      <div class="zb-body">
        ${hat}
        <div class="zb-head">
          <div class="zb-eye l"></div><div class="zb-eye r"></div>
        </div>
        <div class="zb-arm l"></div><div class="zb-arm r"></div>
        <div class="zb-torso"></div>
        <div class="zb-leg l"></div><div class="zb-leg r"></div>
      </div>`;
    this._syncPos();
    this.game.entitiesEl.appendChild(root);
    return root;
  }

  _syncPos() {
    this.el.style.left = `${this.x - 10}px`;
    this.el.style.top = `${this.row * CONFIG.CELL_H}px`;
  }

  update(dt) {
    if (!this.alive) return;

    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.speed = this.baseSpeed;
        this.el.classList.remove("slowed");
      }
    }

    const plant = this.game.getPlantAtPixel(this.x + 10, this.row);
    if (plant && plant.alive) {
      this.eating = plant;
      this.el.classList.add("eating");
      this.eatTimer -= dt;
      if (this.eatTimer <= 0) {
        plant.takeDamage(this.damage);
        this.eatTimer = this.def.eatInterval;
      }
    } else {
      this.eating = null;
      this.el.classList.remove("eating");
      this.x -= this.speed * dt;
      this._syncPos();
    }

    if (this.x < -40) {
      this.game.onZombieReachedHouse(this);
    }
  }

  takeDamage(amount, slow) {
    if (!this.alive) return;
    this.hp -= amount;
    this.el.classList.add("hit", "show-hp");
    setTimeout(() => this.el.classList.remove("hit"), 80);

    const fill = this.el.querySelector(".hp-fill");
    if (fill) {
      const pct = Utils.clamp((this.hp / this.maxHp) * 100, 0, 100);
      fill.style.width = `${pct}%`;
      fill.classList.toggle("low", pct < 35);
    }

    if (slow && slow.factor) {
      this.speed = this.baseSpeed * slow.factor;
      this.slowTimer = slow.duration || 3000;
      this.el.classList.add("slowed");
    }

    if (this.hp <= 0) this.die();
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.el.classList.add("dying");
    this.game.stats.kills += 1;
    setTimeout(() => this.el.remove(), 550);
  }
}

class Projectile {
  constructor(opts, game) {
    this.id = Utils.uid();
    this.game = game;
    this.x = opts.x;
    this.y = opts.y;
    this.row = opts.row;
    this.damage = opts.damage;
    this.type = opts.type || "pea";
    this.slowFactor = opts.slowFactor;
    this.slowDuration = opts.slowDuration;
    this.speed = 0.32;
    this.alive = true;
    this.el = Utils.el("div", `projectile ${this.type}`);
    this.el.style.left = `${this.x}px`;
    this.el.style.top = `${this.y}px`;
    game.entitiesEl.appendChild(this.el);
  }

  update(dt) {
    if (!this.alive) return;
    this.x += this.speed * dt;
    this.el.style.left = `${this.x}px`;

    if (this.x > CONFIG.COLS * CONFIG.CELL_W + 100) {
      this.destroy();
      return;
    }

    for (const z of this.game.zombies) {
      if (!z.alive || z.row !== this.row) continue;
      if (this.x >= z.x && this.x <= z.x + 50) {
        z.takeDamage(this.damage, {
          factor: this.slowFactor,
          duration: this.slowDuration,
        });
        this.destroy();
        return;
      }
    }
  }

  destroy() {
    this.alive = false;
    this.el.remove();
  }
}

class Sun {
  constructor(x, y, game, fromPlant) {
    this.id = Utils.uid();
    this.game = game;
    this.x = x;
    this.y = fromPlant ? y : -40;
    this.targetY = y;
    this.fromPlant = fromPlant;
    this.alive = true;
    this.life = CONFIG.SUN_LIFE;
    this.falling = !fromPlant;
    this.el = Utils.el("div", "sun");
    this.el.style.left = `${this.x - 24}px`;
    this.el.style.top = `${this.y - 24}px`;
    this.el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.collect();
    });
    game.entitiesEl.appendChild(this.el);
  }

  update(dt) {
    if (!this.alive) return;

    if (this.falling) {
      this.y += 0.06 * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.falling = false;
      }
      this.el.style.top = `${this.y - 24}px`;
    } else {
      this.life -= dt;
      if (this.life <= 0) this.destroy();
    }
  }

  collect() {
    if (!this.alive) return;
    this.alive = false;
    this.el.classList.add("collecting");
    const value = Math.round(CONFIG.SUN_VALUE * this.game.diff.sunMult);
    this.game.addSun(value);
    this.game.stats.suns += value;
    setTimeout(() => this.el.remove(), 400);
  }

  destroy() {
    this.alive = false;
    this.el.remove();
  }
}
