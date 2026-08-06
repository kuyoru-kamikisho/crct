/**
 * 游戏配置：植物、僵尸、关卡、难度
 */
const CONFIG = {
  COLS: 9,
  ROWS: 5,
  CELL_W: 80,
  CELL_H: 90,
  START_SUN: 50,
  SUN_VALUE: 25,
  SUN_FALL_INTERVAL: 10000,
  SUN_LIFE: 8000,
  LAWN_MOWER: true,
};

const PLANTS = {
  sunflower: {
    id: "sunflower",
    name: "向日葵",
    cost: 50,
    hp: 300,
    cooldown: 7500,
    produceInterval: 24000,
    sunAmount: 25,
    type: "producer",
    icon: "icon-sunflower",
  },
  peashooter: {
    id: "peashooter",
    name: "豌豆射手",
    cost: 100,
    hp: 300,
    cooldown: 7500,
    fireInterval: 1400,
    damage: 20,
    projectile: "pea",
    type: "shooter",
    icon: "icon-peashooter",
  },
  snowpea: {
    id: "snowpea",
    name: "寒冰射手",
    cost: 175,
    hp: 300,
    cooldown: 7500,
    fireInterval: 1400,
    damage: 20,
    projectile: "snow",
    slowFactor: 0.5,
    slowDuration: 3000,
    type: "shooter",
    icon: "icon-snowpea",
  },
  wallnut: {
    id: "wallnut",
    name: "坚果墙",
    cost: 50,
    hp: 4000,
    cooldown: 30000,
    type: "defense",
    icon: "icon-wallnut",
  },
  cherry: {
    id: "cherry",
    name: "樱桃炸弹",
    cost: 150,
    hp: 300,
    cooldown: 50000,
    type: "instant",
    explodeDelay: 1000,
    explodeDamage: 1800,
    explodeRadius: 1.5,
    icon: "icon-cherry",
  },
};

const ZOMBIES = {
  normal: {
    id: "normal",
    name: "普通僵尸",
    hp: 200,
    speed: 0.028,
    damage: 100,
    eatInterval: 800,
    reward: 0,
  },
  cone: {
    id: "cone",
    name: "路障僵尸",
    hp: 560,
    speed: 0.026,
    damage: 100,
    eatInterval: 800,
    reward: 0,
    hat: "cone",
  },
  bucket: {
    id: "bucket",
    name: "铁桶僵尸",
    hp: 1300,
    speed: 0.024,
    damage: 100,
    eatInterval: 800,
    reward: 0,
    hat: "bucket",
  },
};

const DIFFICULTIES = {
  easy: {
    id: "easy",
    name: "简单",
    desc: "阳光充足 · 僵尸较少",
    sunMult: 1.4,
    zombieHpMult: 0.75,
    zombieSpeedMult: 0.85,
    spawnMult: 1.25,
    startSunBonus: 50,
  },
  normal: {
    id: "normal",
    name: "普通",
    desc: "经典节奏 · 均衡挑战",
    sunMult: 1,
    zombieHpMult: 1,
    zombieSpeedMult: 1,
    spawnMult: 1,
    startSunBonus: 0,
  },
  hard: {
    id: "hard",
    name: "困难",
    desc: "资源紧张 · 强敌压境",
    sunMult: 0.75,
    zombieHpMult: 1.35,
    zombieSpeedMult: 1.15,
    spawnMult: 0.8,
    startSunBonus: -25,
  },
};

/**
 * waves: [{ delay, interval, count, types }]
 * plants: 可用植物 id 列表
 */
const LEVELS = [
  {
    id: 1,
    name: "初见草坪",
    desc: "熟悉种植与收集阳光",
    plants: ["sunflower", "peashooter"],
    startSun: 150,
    waves: [
      {
        delay: 12000,
        interval: 3500,
        count: 4,
        types: ["normal"],
      },
      {
        delay: 6000,
        interval: 3000,
        count: 6,
        types: ["normal"],
      },
      {
        delay: 5000,
        interval: 2500,
        count: 8,
        types: ["normal", "normal", "cone"],
      },
    ],
  },
  {
    id: 2,
    name: "坚壁清野",
    desc: "解锁坚果墙，挡住先锋",
    plants: ["sunflower", "peashooter", "wallnut"],
    startSun: 100,
    waves: [
      {
        delay: 12000,
        interval: 7000,
        count: 5,
        types: ["normal"],
      },
      {
        delay: 7000,
        interval: 5500,
        count: 7,
        types: ["normal", "cone"],
      },
      {
        delay: 5000,
        interval: 4000,
        count: 10,
        types: ["normal", "cone", "cone"],
      },
    ],
  },
  {
    id: 3,
    name: "冰火两重天",
    desc: "寒冰射手与樱桃炸弹登场",
    plants: ["sunflower", "peashooter", "snowpea", "wallnut", "cherry"],
    startSun: 75,
    waves: [
      {
        delay: 10000,
        interval: 6000,
        count: 6,
        types: ["normal", "cone"],
      },
      {
        delay: 6000,
        interval: 4500,
        count: 9,
        types: ["normal", "cone", "bucket"],
      },
      {
        delay: 5000,
        interval: 3500,
        count: 12,
        types: ["normal", "cone", "bucket"],
      },
      {
        delay: 4000,
        interval: 3000,
        count: 14,
        types: ["cone", "bucket", "normal"],
      },
    ],
  },
  {
    id: 4,
    name: "末日防线",
    desc: "终极考验，守住家园",
    plants: ["sunflower", "peashooter", "snowpea", "wallnut", "cherry"],
    startSun: 50,
    waves: [
      {
        delay: 8000,
        interval: 5000,
        count: 8,
        types: ["normal", "cone"],
      },
      {
        delay: 5000,
        interval: 3800,
        count: 10,
        types: ["normal", "cone", "bucket"],
      },
      {
        delay: 4000,
        interval: 3200,
        count: 14,
        types: ["cone", "bucket", "normal"],
      },
      {
        delay: 3000,
        interval: 2800,
        count: 16,
        types: ["bucket", "cone", "bucket"],
      },
      {
        delay: 3000,
        interval: 2500,
        count: 18,
        types: ["normal", "cone", "bucket", "bucket"],
      },
    ],
  },
];
