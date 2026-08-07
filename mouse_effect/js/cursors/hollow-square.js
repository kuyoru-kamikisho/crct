/**
 * 空心方格型鼠标指针
 * API: MouseCursorHollowSquare.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-hollow-square';
  let enabled = false;
  let canvas, ctx, raf = 0;
  let mx = -9999, my = -9999;
  let tx = -9999, ty = -9999;
  let squares = [];
  let spin = 0;
  let clickPulse = 0;
  let opts = { color: '#9ad0ff', lag: 0.18 };

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

  function drawSquare(x, y, size, rot, alpha, lineW) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = lineW || 1.5;
    ctx.shadowColor = opts.color;
    ctx.shadowBlur = 8;
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function loop() {
    if (!enabled) return;
    spin += 0.03;
    clickPulse *= 0.9;
    tx += (mx - tx) * opts.lag;
    ty += (my - ty) * opts.lag;

    ctx.clearRect(0, 0, innerWidth, innerHeight);

    // trailing nested squares
    for (let i = squares.length - 1; i >= 0; i--) {
      const s = squares[i];
      s.life -= 0.025;
      s.size += 1.2;
      s.rot += 0.04;
      if (s.life <= 0) { squares.splice(i, 1); continue; }
      drawSquare(s.x, s.y, s.size, s.rot, s.life * 0.7, 1);
    }

    const base = 16 + clickPulse * 10;
    drawSquare(tx, ty, base + 18, spin, 0.45, 1);
    drawSquare(tx, ty, base + 8, -spin * 1.2, 0.7, 1.4);
    drawSquare(mx, my, base, spin * 0.6, 1, 2);

    // corner dots
    ctx.fillStyle = opts.color;
    const hs = base / 2;
    [[-hs, -hs], [hs, -hs], [-hs, hs], [hs, hs]].forEach(([dx, dy], i) => {
      const a = spin + i * Math.PI / 2;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(mx + Math.cos(a) * (hs + 4), my + Math.sin(a) * (hs + 4), 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    raf = requestAnimationFrame(loop);
  }

  function onMove(e) {
    if (Math.hypot(e.clientX - mx, e.clientY - my) > 6) {
      squares.push({ x: mx, y: my, size: 10, rot: spin, life: 1 });
      if (squares.length > 16) squares.shift();
    }
    mx = e.clientX; my = e.clientY;
  }
  function onClick() {
    clickPulse = 1;
    for (let i = 0; i < 4; i++) {
      squares.push({ x: mx, y: my, size: 8 + i * 4, rot: spin + i, life: 1 });
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
      squares = [];
      if (canvas) { canvas.remove(); canvas = null; ctx = null; }
      hideCursor(false);
      return api;
    },
    toggle(o) { return enabled ? api.disable() : api.enable(o); },
    isEnabled() { return enabled; },
    destroy() { return api.disable(); }
  };

  global.MouseCursorHollowSquare = api;
})(typeof window !== 'undefined' ? window : globalThis);
