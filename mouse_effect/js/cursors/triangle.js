/**
 * 空实心交错三角型鼠标指针
 * API: MouseCursorTriangle.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-triangle';
  let enabled = false;
  let canvas, ctx, raf = 0;
  let mx = -9999, my = -9999;
  let angle = 0;
  let tris = [];
  let flash = 0;
  let opts = { fill: '#ff8f6b', stroke: '#ffe0d4' };

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

  function pathTri(size) {
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.9, size * 0.7);
    ctx.lineTo(-size * 0.9, size * 0.7);
    ctx.closePath();
  }

  function drawTri(x, y, size, rot, solid, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    pathTri(size);
    if (solid) {
      ctx.fillStyle = opts.fill;
      ctx.shadowColor = opts.fill;
      ctx.shadowBlur = 12;
      ctx.fill();
    } else {
      ctx.strokeStyle = opts.stroke;
      ctx.lineWidth = 2;
      ctx.shadowColor = opts.stroke;
      ctx.shadowBlur = 10;
      ctx.stroke();
    }
    ctx.restore();
  }

  function loop() {
    if (!enabled) return;
    angle += 0.05;
    flash *= 0.88;
    ctx.clearRect(0, 0, innerWidth, innerHeight);

    for (let i = tris.length - 1; i >= 0; i--) {
      const t = tris[i];
      t.x += t.vx;
      t.y += t.vy;
      t.rot += t.vr;
      t.life -= 0.02;
      if (t.life <= 0) { tris.splice(i, 1); continue; }
      drawTri(t.x, t.y, t.size, t.rot, t.solid, t.life);
    }

    // orbiting alternating triangles
    for (let i = 0; i < 6; i++) {
      const a = angle + (i * Math.PI * 2) / 6;
      const r = 26 + flash * 10;
      drawTri(mx + Math.cos(a) * r, my + Math.sin(a) * r, 7, a + Math.PI / 2, i % 2 === 0, 0.85);
    }

    // main stacked pair
    drawTri(mx, my, 14 + flash * 4, angle * 0.4, true, 1);
    drawTri(mx, my, 20 + flash * 6, -angle * 0.55, false, 0.9);

    raf = requestAnimationFrame(loop);
  }

  function onMove(e) {
    if (Math.hypot(e.clientX - mx, e.clientY - my) > 8) {
      tris.push({
        x: mx, y: my,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: 5 + Math.random() * 5,
        rot: angle,
        vr: (Math.random() - 0.5) * 0.1,
        solid: Math.random() > 0.5,
        life: 1
      });
      if (tris.length > 24) tris.shift();
    }
    mx = e.clientX; my = e.clientY;
  }
  function onClick() {
    flash = 1;
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10;
      tris.push({
        x: mx, y: my,
        vx: Math.cos(a) * 2.5,
        vy: Math.sin(a) * 2.5,
        size: 6,
        rot: a,
        vr: 0.15,
        solid: i % 2 === 0,
        life: 1
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
      tris = [];
      if (canvas) { canvas.remove(); canvas = null; ctx = null; }
      hideCursor(false);
      return api;
    },
    toggle(o) { return enabled ? api.disable() : api.enable(o); },
    isEnabled() { return enabled; },
    destroy() { return api.disable(); }
  };

  global.MouseCursorTriangle = api;
})(typeof window !== 'undefined' ? window : globalThis);
