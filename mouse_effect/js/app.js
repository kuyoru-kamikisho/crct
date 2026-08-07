/**
 * Cursor Atelier — 测试页切换逻辑
 */
(function () {
  const CATALOG = [
    {
      id: 'snowflake',
      name: '雪花',
      genre: '自然',
      emoji: '❄',
      glow: '#9ad8ff',
      api: 'MouseCursorSnowflake',
      hint: '移动时飘落；静止片刻渐隐；点击小范围炸开。'
    },
    {
      id: 'crosshair',
      name: '枪械准星',
      genre: '游戏',
      emoji: '⌖',
      glow: '#7dffb3',
      api: 'MouseCursorCrosshair',
      hint: '准星持续旋转，移动留残影，点击产生后坐力扩散。'
    },
    {
      id: 'bubble',
      name: '气泡',
      genre: '可爱',
      emoji: '🫧',
      glow: '#7dd3fc',
      api: 'MouseCursorBubble',
      hint: '主气泡轻微晃动，周围环绕小泡，点击会冒出更多气泡。'
    },
    {
      id: 'hollow-square',
      name: '空心方格',
      genre: '极简',
      emoji: '▢',
      glow: '#9ad0ff',
      api: 'MouseCursorHollowSquare',
      hint: '多层方框错速旋转，移动留下扩张方格轨迹。'
    },
    {
      id: 'triangle',
      name: '交错三角',
      genre: '几何',
      emoji: '△',
      glow: '#ff8f6b',
      api: 'MouseCursorTriangle',
      hint: '空心/实心三角交错环绕，点击向外迸射。'
    },
    {
      id: 'flower',
      name: '萌系小花',
      genre: '可爱',
      emoji: '❀',
      glow: '#ff8fb8',
      api: 'MouseCursorFlower',
      hint: '旋转开花；静止渐隐；点击花瓣四散。'
    },
    {
      id: 'neon-trail',
      name: '霓虹拖尾',
      genre: '科幻',
      emoji: '⚡',
      glow: '#2dd4bf',
      api: 'MouseCursorNeonTrail',
      hint: '彩虹霓虹轨迹跟随，点击溅射电火花。'
    },
    {
      id: 'hologram',
      name: '全息光环',
      genre: '科幻',
      emoji: '◎',
      glow: '#5ae6ff',
      api: 'MouseCursorHologram',
      hint: '双椭圆轨道旋转，扫描线扫过，点击扩散全息环。'
    },
    {
      id: 'magic-spark',
      name: '魔法火花',
      genre: '游戏',
      emoji: '✦',
      glow: '#e9c6ff',
      api: 'MouseCursorMagicSpark',
      hint: '星芒环绕施法，移动落星屑，点击法术爆发。'
    },
    {
      id: 'pixel',
      name: '复古像素',
      genre: '游戏',
      emoji: '▣',
      glow: '#ffd93d',
      api: 'MouseCursorPixel',
      hint: '像素箭头闪烁，拖尾掉色块，点击抖动碎裂。'
    },
    {
      id: 'heart',
      name: '爱心',
      genre: '可爱',
      emoji: '♥',
      glow: '#ff5d8f',
      api: 'MouseCursorHeart',
      hint: '心跳缩放，移动飘出爱心，点击向心炸开。'
    },
    {
      id: 'paw',
      name: '猫爪',
      genre: '可爱',
      emoji: '🐾',
      glow: '#f2b28a',
      api: 'MouseCursorPaw',
      hint: '爪印沿路径落下，轻微弹跳，点击撒下一圈爪印。'
    },
    {
      id: 'blood',
      name: '血滴',
      genre: '恐怖',
      emoji: '🩸',
      glow: '#ff1a1a',
      api: 'MouseCursorBlood',
      hint: '血滴不断下坠，点击溅射小范围血雾。'
    },
    {
      id: 'ghost',
      name: '幽灵',
      genre: '恐怖',
      emoji: '👻',
      glow: '#b8d4ff',
      api: 'MouseCursorGhost',
      hint: '幽灵延迟跟随并漂浮，点击惊散成光雾。'
    },
    {
      id: 'eye',
      name: '邪眼',
      genre: '恐怖',
      emoji: '👁',
      glow: '#5cff7a',
      api: 'MouseCursorEye',
      hint: '虹膜脉动、随机眨眼，移动拉出血丝，点击猛眨。'
    },
    {
      id: 'fire',
      name: '烈焰',
      genre: '元素',
      emoji: '🔥',
      glow: '#ff8c42',
      api: 'MouseCursorFire',
      hint: '火焰粒子上涌，点击爆出火团。'
    },
    {
      id: 'lightning',
      name: '闪电',
      genre: '元素',
      emoji: '↯',
      glow: '#9ad0ff',
      api: 'MouseCursorLightning',
      hint: '核心持续放电，周围闪出细小电弧。'
    },
    {
      id: 'butterfly',
      name: '蝴蝶',
      genre: '自然',
      emoji: '🦋',
      glow: '#c084fc',
      api: 'MouseCursorButterfly',
      hint: '翅翼开合飞舞，撒下彩粉，点击粉尘爆发。'
    },
    {
      id: 'comet',
      name: '彗星',
      genre: '宇宙',
      emoji: '☄',
      glow: '#8ec8ff',
      api: 'MouseCursorComet',
      hint: '彗尾拉丝，星屑飞溅，点击流星散开。'
    },
    {
      id: 'glitch',
      name: '故障',
      genre: '科幻',
      emoji: '▓▓',
      glow: '#ff2a6d',
      api: 'MouseCursorGlitch',
      hint: 'RGB 错位抖动，不断切出色块噪点。'
    },
    {
      id: 'galaxy',
      name: '星系',
      genre: '宇宙',
      emoji: '🌌',
      glow: '#b388ff',
      api: 'MouseCursorGalaxy',
      hint: '螺旋臂旋转，星点外扩，点击超新星。'
    },
    {
      id: 'ink',
      name: '墨水',
      genre: '艺术',
      emoji: '✒',
      glow: '#a78bfa',
      api: 'MouseCursorInk',
      hint: '墨渍拖尾与垂滴，点击泼墨绽放。'
    },
    {
      id: 'smoke',
      name: '烟尘',
      genre: '氛围',
      emoji: '☁',
      glow: '#c8d0d8',
      api: 'MouseCursorSmoke',
      hint: '轻烟缭绕上升，点击喷出一团烟雾。'
    },
    {
      id: 'rainbow-star',
      name: '彩虹星',
      genre: '可爱',
      emoji: '★',
      glow: '#f472b6',
      api: 'MouseCursorRainbowStar',
      hint: '彩虹五星环绕变色，点击烟花式散开。'
    },
    {
      id: 'gear',
      name: '齿轮',
      genre: '蒸汽朋克',
      emoji: '⚙',
      glow: '#d4a574',
      api: 'MouseCursorGear',
      hint: '双齿轮咬合旋转，移动迸出火星。'
    }
  ];

  const genres = ['全部', ...Array.from(new Set(CATALOG.map((c) => c.genre)))];
  let activeId = null;
  let activeGenre = '全部';

  const grid = document.getElementById('cursor-grid');
  const filters = document.getElementById('filters');
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');
  const stageTitle = document.getElementById('stage-title');
  const stageHint = document.getElementById('stage-hint');
  const countEl = document.getElementById('cursor-count');

  countEl.textContent = String(CATALOG.length);

  function getApi(item) {
    return window[item.api] || null;
  }

  function disableAll() {
    CATALOG.forEach((item) => {
      const api = getApi(item);
      if (api && api.isEnabled && api.isEnabled()) api.disable();
    });
  }

  function setStatus(item) {
    if (!item) {
      statusPill.classList.remove('on');
      statusText.textContent = '未启用';
      stageTitle.textContent = '选择一款指针开始';
      stageHint.textContent = '建议在空白区域来回滑动，停顿片刻再点击，体验「动起来 / 停下来 / 点一下」三套互动。';
      return;
    }
    statusPill.classList.add('on');
    statusText.textContent = `当前：${item.name}（${item.genre}）`;
    stageTitle.textContent = item.name;
    stageHint.textContent = item.hint;
  }

  function activate(id) {
    const item = CATALOG.find((c) => c.id === id);
    if (!item) return;
    const api = getApi(item);
    if (!api) {
      statusText.textContent = `${item.name} 模块未加载`;
      return;
    }
    disableAll();
    api.enable();
    activeId = id;
    setStatus(item);
    renderGrid();
  }

  function renderFilters() {
    filters.innerHTML = '';
    genres.forEach((g) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-btn' + (g === activeGenre ? ' active' : '');
      btn.textContent = g;
      btn.addEventListener('click', () => {
        activeGenre = g;
        renderFilters();
        renderGrid();
      });
      filters.appendChild(btn);
    });
  }

  function renderGrid() {
    grid.innerHTML = '';
    const list = CATALOG.filter((c) => activeGenre === '全部' || c.genre === activeGenre);
    list.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cursor-btn' + (item.id === activeId ? ' active' : '');
      btn.style.setProperty('--btn-glow', item.glow);
      btn.innerHTML = `<span class="emoji">${item.emoji}</span><span class="name">${item.name}</span><span class="genre">${item.genre}</span>`;
      btn.addEventListener('click', () => activate(item.id));
      grid.appendChild(btn);
    });
  }

  document.getElementById('btn-disable').addEventListener('click', () => {
    disableAll();
    activeId = null;
    setStatus(null);
    renderGrid();
  });

  document.getElementById('btn-retrigger').addEventListener('click', () => {
    if (!activeId) return;
    const item = CATALOG.find((c) => c.id === activeId);
    const api = item && getApi(item);
    if (!api) return;
    // 重新 enable 以刷新视觉状态；若有 burst 则额外触发
    api.disable();
    api.enable();
    if (typeof api.burst === 'function') {
      api.burst(window.innerWidth / 2, window.innerHeight / 2);
    }
  });

  renderFilters();
  renderGrid();

  // 默认启用第一款，方便立刻试玩
  activate('snowflake');
})();
