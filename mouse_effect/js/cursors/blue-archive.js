/**
 * 碧蓝档案触摸指针（游戏）
 * 复刻《ブルーアカイブ》触摸反馈：青色扩散圆盘、旋转变宽弧环、三角碎片与拖尾光轨。
 * API: MouseCursorBlueArchive.enable() / disable() / toggle() / isEnabled() / destroy() / burst()
 */
(function (global) {
  const ID = 'mouse-cursor-blue-archive';
  const COLOR = '45,175,255';
  const RING_START = [250, 252, 252];
  const RING_END = COLOR.split(',').map(Number).map((n) => (n + 255 * 2) / 3);

  const FILLED = { rAddRate: 26, maxLife: 16 };
  const RINGS = {
    rsList: [0, 0.08, 0.1],
    rRoundRateList: [0, 1, 1.5, 2],
    len: 1.1 * Math.PI,
    maxLife: 23,
    segNum: 10,
    minW: 0.4,
    maxW: 3.3,
    lenStopAddPoint: 0.1,
    lenStartDimPoint: 0.4
  };

  let enabled = false;
  let canvas, ctx, raf = 0;
  let mx = -9999, my = -9999;
  let scale = 1.35;
  let waves = [];
  let sparks = [];
  let trail = [];
  let lastPos = null;
  let pulse = 0;
  let lastFrame = 0;

  function ensure() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = ID;
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '2147483646'
    });
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
  }

  function resize() {
    if (!canvas) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function hide(on) {
    document.documentElement.classList.toggle('mc-hide-cursor', on);
    if (on && !document.getElementById('mc-hide-cursor-style')) {
      const s = document.createElement('style');
      s.id = 'mc-hide-cursor-style';
      s.textContent = '.mc-hide-cursor,.mc-hide-cursor *{cursor:none!important}';
      document.head.appendChild(s);
    }
  }

  function createWave(x, y) {
    const wave = {
      x, y, r: 0, life: 0,
      ring: {
        ang: Math.random() * Math.PI * 2,
        rs: RINGS.rsList[(Math.random() * RINGS.rsList.length) | 0],
        segs: [
          {
            off: 0,
            len: RINGS.len,
            rRoundRate: RINGS.rRoundRateList[(Math.random() * RINGS.rRoundRateList.length) | 0]
          },
          {
            off: (Math.random() * 3 - 1.5) * Math.PI,
            len: RINGS.len,
            rRoundRate: RINGS.rRoundRateList[(Math.random() * RINGS.rRoundRateList.length) | 0]
          }
        ]
      }
    };
    waves.push(wave);

    const speedAdjust = scale / 1.5;
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = (4.8 + Math.random() * 2) * speedAdjust;
      sparks.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        rot: Math.random() * Math.PI * 2,
        rs: (Math.random() - 0.5) * 0.28,
        s: (4 + Math.random() * 3) * scale,
        a: 1,
        f: 0.9,
        fromClick: true
      });
    }
  }

  function spawnTrailSpark(x, y) {
    const a = Math.random() * Math.PI * 2;
    const speedAdjust = scale / 1.5;
    sparks.push({
      x: x + Math.cos(a) * 10 * scale,
      y: y + Math.sin(a) * 10 * scale,
      vx: Math.cos(a) * 1.3 * speedAdjust,
      vy: Math.sin(a) * 1.3 * speedAdjust,
      rot: Math.random() * Math.PI * 2,
      rs: 0.16,
      s: 9 * scale,
      a: 0.7,
      f: 0.95,
      fromClick: false
    });
  }

  function drawTrail() {
    const n = trail.length;
    const baseDecay = 0.085;
    for (let i = n - 1; i >= 0; i--) {
      const t = trail[i];
      const along = n > 1 ? i / Math.max(1, n - 1) : 1;
      t.life -= Math.min(0.42, baseDecay * (1.25 - 0.55 * along));
      if (t.life <= 0) trail.splice(i, 1);
    }

    const head = lastPos;
    const pts = head && trail.length > 0
      ? trail.concat([{ x: head.x, y: head.y, life: 1 }])
      : trail.slice();
    if (pts.length < 2) return;

    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.shadowColor = `rgba(${COLOR},0.55)`;
    ctx.shadowBlur = 4;

    const lastIdx = pts.length - 1;
    for (let i = 0; i < lastIdx; i++) {
      const a0 = pts[i];
      const a1 = pts[i + 1];
      const alphaStart = (i / lastIdx) * a0.life;
      const alphaEnd = ((i + 1) / lastIdx) * a1.life;
      const g = ctx.createLinearGradient(a0.x, a0.y, a1.x, a1.y);
      g.addColorStop(0, `rgba(${COLOR},${alphaStart})`);
      g.addColorStop(1, `rgba(${COLOR},${alphaEnd})`);
      ctx.beginPath();
      ctx.moveTo(a0.x, a0.y);
      ctx.lineTo(a1.x, a1.y);
      ctx.strokeStyle = g;
      ctx.stroke();
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  function ringRgbAt(prog) {
    const t = Math.min(1.2 * prog, 1);
    return [
      Math.round(RING_START[0] * (1 - t) + RING_END[0] * t),
      Math.round(RING_START[1] * (1 - t) + RING_END[1] * t),
      Math.round(RING_START[2] * (1 - t) + RING_END[2] * t)
    ];
  }

  function weightProp(t) {
    return Math.min(2 - Math.abs(4 * (t - 0.5)), 1);
  }

  function drawWaves(fs) {
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.life += fs;
      const waveProg = Math.min(w.life / FILLED.maxLife, 1);
      const ringProg = Math.min(w.life / RINGS.maxLife, 1);

      // 填充扩散圆盘
      const ease = 1 - Math.pow(1 - waveProg, 3);
      w.r = FILLED.rAddRate * scale * ease;
      const discA = Math.max(0, 1 - waveProg);
      if (discA > 0) {
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${COLOR},${discA})`;
        ctx.fill();
      }

      // 旋转弧环（两端细、中间粗）
      const r = w.ring;
      r.ang -= r.rs * fs;
      const lineWidthMul = Math.min(-0.8 * (ringProg - 0.8) + 1, 1);
      const [rr, gg, bb] = ringRgbAt(ringProg);
      const alphaRing = Math.min(1.1 - 0.3 * ringProg, 1);

      for (let si = 0; si < 2; si++) {
        const seg = r.segs[si];
        const base = r.ang + seg.off;
        let start, end, len;
        if (ringProg <= RINGS.lenStopAddPoint) {
          len = seg.len * (ringProg / RINGS.lenStopAddPoint);
          end = base + seg.len;
          start = end - len;
        } else if (ringProg > RINGS.lenStartDimPoint) {
          len = seg.len * (1 - (ringProg - RINGS.lenStartDimPoint) / (1 - RINGS.lenStartDimPoint));
          start = base;
          end = start + len;
        } else {
          start = base;
          end = base + seg.len;
        }

        for (let k = 0; k < RINGS.segNum; k++) {
          const t0 = k / RINGS.segNum;
          const t1 = (k + 1) / RINGS.segNum;
          const a0 = start + (end - start) * t0;
          const a1 = start + (end - start) * t1;
          if (Math.abs(a1 - a0) < 0.01) continue;
          const wT = weightProp(t0);
          const lw = (RINGS.minW * (1 - wT) + RINGS.maxW * wT) * lineWidthMul;
          ctx.beginPath();
          ctx.arc(w.x, w.y, w.r + seg.rRoundRate * scale, a0, a1);
          ctx.lineWidth = lw;
          ctx.strokeStyle = `rgba(${rr},${gg},${bb},${alphaRing})`;
          ctx.stroke();
        }
      }

      if (ringProg >= 1 && waveProg >= 1) waves.splice(i, 1);
    }
  }

  function drawSparks(clickFs, trailFs) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      const fs = s.fromClick ? clickFs : trailFs;
      s.x += s.vx * fs;
      s.y += s.vy * fs;
      s.vx *= Math.pow(s.f, fs);
      s.vy *= Math.pow(s.f, fs);
      s.rot += s.rs * fs;
      s.a -= 0.032 * fs;
      if (s.a <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.beginPath();
      ctx.moveTo(0, -s.s);
      ctx.lineTo(s.s * 0.6, s.s * 0.6);
      ctx.lineTo(-s.s * 0.6, s.s * 0.6);
      ctx.closePath();
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, s.a))})`;
      ctx.fill();
      ctx.restore();
    }
  }

  function drawCursorTip() {
    if (mx < -1000) return;
    const t = performance.now() / 1000;
    const breathe = 1 + Math.sin(t * 4.2) * 0.08 + pulse * 0.35;
    const r = 5.5 * scale * breathe;

    // 外晕
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, r * 3.2);
    g.addColorStop(0, `rgba(${COLOR},0.55)`);
    g.addColorStop(0.45, `rgba(${COLOR},0.18)`);
    g.addColorStop(1, `rgba(${COLOR},0)`);
    ctx.beginPath();
    ctx.arc(mx, my, r * 3.2, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    // 内核
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${COLOR},0.92)`;
    ctx.shadowColor = `rgba(${COLOR},0.9)`;
    ctx.shadowBlur = 10;
    ctx.fill();

    // 高光点
    ctx.beginPath();
    ctx.arc(mx - r * 0.25, my - r * 0.28, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.shadowBlur = 0;
    ctx.fill();

    // 细环
    ctx.beginPath();
    ctx.arc(mx, my, r * 1.55 + pulse * 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(250,252,252,${0.55 + pulse * 0.35})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  function loop(now) {
    if (!enabled) return;
    const delta = Math.min(now - (lastFrame || now), 100);
    lastFrame = now;
    const fs = delta / (1000 / 60);
    pulse *= Math.pow(0.88, fs);

    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalCompositeOperation = 'lighter';
    drawTrail();
    drawWaves(fs);
    drawSparks(fs, fs);
    ctx.globalCompositeOperation = 'source-over';
    drawCursorTip();

    raf = requestAnimationFrame(loop);
  }

  function onMove(e) {
    mx = e.clientX;
    my = e.clientY;
    const p = { x: mx, y: my };
    if (lastPos) {
      const d = Math.hypot(p.x - lastPos.x, p.y - lastPos.y);
      if (d > 2) {
        trail.push({ x: p.x, y: p.y, life: 1 });
        if (trail.length > 18) trail.shift();
        if (Math.random() < 0.28) spawnTrailSpark(p.x, p.y);
      }
    }
    lastPos = p;
  }

  function onClick(e) {
    pulse = 1;
    createWave(e.clientX, e.clientY);
  }

  function onLeave() {
    mx = -9999;
    my = -9999;
    lastPos = null;
  }

  const api = {
    enable(options) {
      if (enabled) return api;
      if (options && options.scale != null) scale = Math.max(0.6, Math.min(2.5, Number(options.scale) || 1.35));
      enabled = true;
      ensure();
      hide(true);
      waves = [];
      sparks = [];
      trail = [];
      lastPos = null;
      pulse = 0;
      lastFrame = performance.now();
      addEventListener('resize', resize);
      addEventListener('mousemove', onMove);
      addEventListener('mousedown', onClick);
      addEventListener('mouseleave', onLeave);
      raf = requestAnimationFrame(loop);
      return api;
    },
    disable() {
      if (!enabled) return api;
      enabled = false;
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      removeEventListener('mousemove', onMove);
      removeEventListener('mousedown', onClick);
      removeEventListener('mouseleave', onLeave);
      waves = [];
      sparks = [];
      trail = [];
      lastPos = null;
      if (canvas) {
        canvas.remove();
        canvas = null;
        ctx = null;
      }
      hide(false);
      return api;
    },
    toggle(options) {
      return enabled ? api.disable() : api.enable(options);
    },
    isEnabled() {
      return enabled;
    },
    destroy() {
      return api.disable();
    },
    burst(x = mx, y = my) {
      if (!enabled || x < -1000) return api;
      pulse = 1;
      createWave(x, y);
      return api;
    }
  };

  global.MouseCursorBlueArchive = api;
})(typeof window !== 'undefined' ? window : globalThis);
