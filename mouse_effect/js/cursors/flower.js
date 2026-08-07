/**
 * 萌系小花型鼠标指针
 * API: MouseCursorFlower.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-flower';
  let enabled = false;
  let canvas, ctx, raf = 0;
  let mx = -9999, my = -9999;
  let rot = 0;
  let petals = [];
  let bloom = 0;
  let idleT = 0;
  let lastMove = 0;
  let visible = 1;
  let opts = { petal: '#ff8fb8', center: '#ffe566', idleMs: 1000 };

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

  function drawFlower(x, y, scale, rotation, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.ellipse(0, -8, 5, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = opts.petal;
      ctx.shadowColor = opts.petal;
      ctx.shadowBlur = 10;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = opts.center;
    ctx.shadowColor = opts.center;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }

  function loop() {
    if (!enabled) return;
    const now = performance.now();
    const idle = now - lastMove > opts.idleMs;
    visible += idle ? -0.03 : 0.08;
    visible = Math.max(0, Math.min(1, visible));
    rot += 0.04;
    bloom *= 0.9;

    ctx.clearRect(0, 0, innerWidth, innerHeight);

    if (!idle && visible > 0.2 && Math.random() < 0.3) {
      petals.push({
        x: mx + (Math.random() - 0.5) * 12,
        y: my + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 0.5 + Math.random(),
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.1,
        life: 1,
        s: 0.4 + Math.random() * 0.4
      });
      if (petals.length > 22) petals.shift();
    }

    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.015;
      if (p.life <= 0) { petals.splice(i, 1); continue; }
      drawFlower(p.x, p.y, p.s, p.rot, p.life * visible);
    }

    const s = 1 + bloom * 0.45 + Math.sin(now / 280) * 0.05;
    drawFlower(mx, my, s, rot, visible);

    raf = requestAnimationFrame(loop);
  }

  function onMove(e) {
    mx = e.clientX; my = e.clientY;
    lastMove = performance.now();
  }
  function onClick(e) {
    bloom = 1;
    lastMove = performance.now();
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10;
      petals.push({
        x: e.clientX, y: e.clientY,
        vx: Math.cos(a) * 2,
        vy: Math.sin(a) * 2,
        rot: a, vr: 0.12, life: 1, s: 0.55
      });
    }
  }

  function hideCursor(on) {
    document.documentElement.classList.toggle('mc-hide-cursor', on);
    if (on && !document.getElementById('mc-hide-cursor-style')) {
      const s = document.createElement('style');
      s.id = 'mc-hide-cursor-style';
      s.textContent = '.mc-hide-cursor, .mc-hide-cursor * { cursor: none !important; }';
      document.head.appendChild(s);
    }
  }

  const api = {
    enable(options = {}) {
      opts = { ...opts, ...options };
      if (enabled) return api;
      enabled = true;
      ensureCanvas();
      hideCursor(true);
      window.addEventListener('resize', resize);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mousedown', onClick);
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
      petals = [];
      if (canvas) { canvas.remove(); canvas = null; ctx = null; }
      hideCursor(false);
      return api;
    },
    toggle(o) { return enabled ? api.disable() : api.enable(o); },
    isEnabled() { return enabled; },
    destroy() { return api.disable(); }
  };

  global.MouseCursorFlower = api;
})(typeof window !== 'undefined' ? window : globalThis);
