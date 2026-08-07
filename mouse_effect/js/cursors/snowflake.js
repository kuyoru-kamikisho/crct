/**
 * 雪花型鼠标指针
 * API: MouseCursorSnowflake.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-snowflake';
  let enabled = false;
  let canvas, ctx, raf = 0;
  let mx = -9999, my = -9999;
  let lastMove = 0;
  let flakes = [];
  let bursts = [];
  let idleFade = 1;
  let opts = { maxFlakes: 28, color: '#d8f1ff', idleMs: 900 };

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = ID;
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: '2147483646'
    });
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
  }

  function resize() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnFlake(x, y, force) {
    flakes.push({
      x, y,
      vx: (Math.random() - 0.5) * 1.2,
      vy: 0.6 + Math.random() * 1.4,
      r: 2 + Math.random() * 3.5,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.08,
      life: force ? 1 : 0.85 + Math.random() * 0.15,
      decay: 0.008 + Math.random() * 0.01
    });
    if (flakes.length > opts.maxFlakes) flakes.shift();
  }

  function explode(x, y) {
    for (let i = 0; i < 14; i++) {
      const a = (Math.PI * 2 * i) / 14 + Math.random() * 0.2;
      const sp = 1.2 + Math.random() * 2.2;
      bursts.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: 1.5 + Math.random() * 2.5,
        life: 1,
        decay: 0.03 + Math.random() * 0.02
      });
    }
  }

  function drawSnowflake(x, y, r, rot, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = 1.2;
    ctx.shadowColor = opts.color;
    ctx.shadowBlur = 8;
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -r);
      ctx.moveTo(0, -r * 0.55);
      ctx.lineTo(-r * 0.22, -r * 0.75);
      ctx.moveTo(0, -r * 0.55);
      ctx.lineTo(r * 0.22, -r * 0.75);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCursor(x, y, alpha) {
    if (alpha <= 0.01) return;
    drawSnowflake(x, y, 10, performance.now() / 900, alpha);
  }

  function loop() {
    if (!enabled) return;
    const now = performance.now();
    const idle = now - lastMove > opts.idleMs;
    idleFade += (idle ? -0.035 : 0.08);
    idleFade = Math.max(0, Math.min(1, idleFade));

    ctx.clearRect(0, 0, innerWidth, innerHeight);

    if (!idle && idleFade > 0.2) {
      if (Math.random() < 0.45) spawnFlake(mx + (Math.random() - 0.5) * 18, my + (Math.random() - 0.5) * 18);
    }

    for (let i = flakes.length - 1; i >= 0; i--) {
      const f = flakes[i];
      f.x += f.vx;
      f.y += f.vy;
      f.rot += f.vr;
      f.life -= f.decay;
      const a = f.life * idleFade;
      if (a <= 0) { flakes.splice(i, 1); continue; }
      drawSnowflake(f.x, f.y, f.r, f.rot, a);
    }

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= 0.94;
      b.vy *= 0.94;
      b.life -= b.decay;
      if (b.life <= 0) { bursts.splice(i, 1); continue; }
      drawSnowflake(b.x, b.y, b.r, b.life * 3, b.life);
    }

    drawCursor(mx, my, idleFade);
    raf = requestAnimationFrame(loop);
  }

  function onMove(e) {
    mx = e.clientX; my = e.clientY;
    lastMove = performance.now();
  }
  function onClick(e) {
    mx = e.clientX; my = e.clientY;
    lastMove = performance.now();
    explode(mx, my);
  }
  function onLeave() { idleFade = 0; }

  const api = {
    enable(options = {}) {
      opts = { ...opts, ...options };
      if (enabled) return api;
      enabled = true;
      ensureCanvas();
      document.documentElement.classList.add('mc-hide-cursor');
      if (!document.getElementById('mc-hide-cursor-style')) {
        const s = document.createElement('style');
        s.id = 'mc-hide-cursor-style';
        s.textContent = '.mc-hide-cursor, .mc-hide-cursor * { cursor: none !important; }';
        document.head.appendChild(s);
      }
      window.addEventListener('resize', resize);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mousedown', onClick);
      window.addEventListener('mouseleave', onLeave);
      lastMove = performance.now();
      raf = requestAnimationFrame(loop);
      return api;
    },
    disable() {
      if (!enabled) return api;
      enabled = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('mouseleave', onLeave);
      flakes = []; bursts = [];
      if (canvas) { canvas.remove(); canvas = null; ctx = null; }
      document.documentElement.classList.remove('mc-hide-cursor');
      return api;
    },
    toggle(options) { return enabled ? api.disable() : api.enable(options); },
    isEnabled() { return enabled; },
    destroy() { return api.disable(); },
    burst(x = mx, y = my) { explode(x, y); return api; }
  };

  global.MouseCursorSnowflake = api;
})(typeof window !== 'undefined' ? window : globalThis);
