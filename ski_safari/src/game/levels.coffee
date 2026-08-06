# 难度与关卡配置

export DIFFICULTIES =
  easy:
    id: 'easy'
    name: '轻松漫滑'
    desc: '速度较慢，障碍稀疏，适合热身'
    speedMul: 0.78
    spawnMul: 0.7
    damageMul: 0.75
    scoreMul: 0.9
    lives: 5
  normal:
    id: 'normal'
    name: '标准雪道'
    desc: '均衡节奏，经典冒险体验'
    speedMul: 1
    spawnMul: 1
    damageMul: 1
    scoreMul: 1
    lives: 3
  hard:
    id: 'hard'
    name: '极限挑战'
    desc: '更快、更密、更刺激'
    speedMul: 1.28
    spawnMul: 1.35
    damageMul: 1.25
    scoreMul: 1.35
    lives: 3
  extreme:
    id: 'extreme'
    name: '雪崩模式'
    desc: '近乎疯狂的速度与密度'
    speedMul: 1.55
    spawnMul: 1.7
    damageMul: 1.5
    scoreMul: 1.8
    lives: 2

export TERRAINS =
  powder:
    id: 'powder'
    name: '粉雪平原'
    friction: 0.92
    boost: 1
    sky: ['#6eb6e8', '#c8e8ff', '#f2f8fc']
    ground: ['#e8f4fc', '#d0e8f5', '#b8d8ec']
    accent: '#7fd4ff'
    treeColor: '#2d6b4f'
    rockColor: '#7a8694'
  ice:
    id: 'ice'
    name: '镜面冰道'
    friction: 0.78
    boost: 1.22
    sky: ['#3a6ea5', '#7eb8e0', '#d4eefc']
    ground: ['#c5e8f8', '#a8d8f0', '#8ec8e4']
    accent: '#b8f0ff'
    treeColor: '#3d7a6a'
    rockColor: '#8a9aaa'
  forest:
    id: 'forest'
    name: '密林雪径'
    friction: 0.95
    boost: 0.95
    sky: ['#4a7a98', '#8eb4c8', '#dce8f0']
    ground: ['#dce8f0', '#c4d4e0', '#a8bcc8']
    accent: '#5ce0a8'
    treeColor: '#1e4a32'
    rockColor: '#5a5048'
  alpine:
    id: 'alpine'
    name: '阿尔卑斯峰'
    friction: 0.88
    boost: 1.12
    sky: ['#2a4a78', '#5a8ab8', '#b8d4f0']
    ground: ['#e0ecf8', '#c8d8ec', '#a8c0d8']
    accent: '#ff8a4c'
    treeColor: '#245038'
    rockColor: '#6a6870'
  night:
    id: 'night'
    name: '极夜星滑'
    friction: 0.9
    boost: 1.08
    sky: ['#060e1c', '#122038', '#1a3050']
    ground: ['#1a2838', '#243848', '#2e4858']
    accent: '#7fd4ff'
    treeColor: '#0e2a1c'
    rockColor: '#3a4450'
  volcano:
    id: 'volcano'
    name: '火山灰坡'
    friction: 0.86
    boost: 1.18
    sky: ['#2a1810', '#5a3020', '#8a5040']
    ground: ['#3a2a28', '#4a3834', '#5a4840']
    accent: '#ff8a4c'
    treeColor: '#2a2018'
    rockColor: '#2a2220'

export LEVELS = [
  {
    id: 1
    name: '初雪山谷'
    terrain: 'powder'
    length: 1800
    unlock: true
    baseSpeed: 4.2
    density: 0.55
    coinRate: 0.45
    powerRate: 0.12
    enemyRate: 0.08
    intro: '感受粉雪的轻盈，熟悉转向与跳跃'
  }
  {
    id: 2
    name: '冰湖冲刺'
    terrain: 'ice'
    length: 2200
    unlock: false
    baseSpeed: 4.8
    density: 0.7
    coinRate: 0.4
    powerRate: 0.14
    enemyRate: 0.12
    intro: '冰面打滑！保持平衡一路冲刺'
  }
  {
    id: 3
    name: '松林穿梭'
    terrain: 'forest'
    length: 2600
    unlock: false
    baseSpeed: 4.5
    density: 0.95
    coinRate: 0.5
    powerRate: 0.15
    enemyRate: 0.15
    intro: '密林障碍密集，找准空隙穿梭'
  }
  {
    id: 4
    name: '云端峭壁'
    terrain: 'alpine'
    length: 3000
    unlock: false
    baseSpeed: 5.2
    density: 0.85
    coinRate: 0.42
    powerRate: 0.18
    enemyRate: 0.18
    intro: '高海拔加速，特技连击拿高分'
  }
  {
    id: 5
    name: '极夜幻境'
    terrain: 'night'
    length: 3200
    unlock: false
    baseSpeed: 5.0
    density: 1.0
    coinRate: 0.48
    powerRate: 0.2
    enemyRate: 0.2
    intro: '星光下的夜滑，视野受限更考验反应'
  }
  {
    id: 6
    name: '熔岩雪崩'
    terrain: 'volcano'
    length: 3600
    unlock: false
    baseSpeed: 5.6
    density: 1.15
    coinRate: 0.55
    powerRate: 0.22
    enemyRate: 0.25
    intro: '最终关卡：岩浆岩与飞雪并存'
  }
]

export STORAGE_KEY = 'ski_safari_progress_v1'

export loadProgress = ->
  try
    raw = localStorage.getItem STORAGE_KEY
    return JSON.parse(raw) if raw
  catch e
    console.warn e
  {
    unlocked: [1]
    stars: {}
    best: {}
    lastDifficulty: 'normal'
  }

export saveProgress = (progress) ->
  try
    localStorage.setItem STORAGE_KEY, JSON.stringify(progress)
  catch e
    console.warn e
