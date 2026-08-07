/**
 * 枪械瞄准准星型
 * API: MouseCursorCrosshair.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-crosshair';
  let enabled = false;
  let canvas, ctx, raf = 0;
  let mx = -9999, my = -9999;
  let angle = 0;
  let pulse = 0;
  let recoil = 0;
  let trails = [];
  let opts = { color: '#7dffb3', secondary: '#ff5a5a', rotateSpeed: 0.04 };

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

  function draw() {
    if (!enabled) return;
    angle += opts.rotateSpeed;
    pulse = (Math.sin(performance.now() / 220) + 1) * 0.5;
    recoil += (0 - recoil) * 0.12;

    ctx.clearRect(0, 0, innerWidth, innerHeight);

    for (let i = trails.length - 1; i >= 0; i--) {
      const t = trails[i];
      t.life -= 0.04;
      if (t.life <= 0) { trails.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(t.x, t.y, 3 + (1 - t.life) * 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,90,90,${t.life * 0.7})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const s = 18 + recoil * 8;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(angle);

    ctx.strokeStyle = opts.color;
    ctx.shadowColor = opts.color;
    ctx.shadowBlur = 10 + pulse * 8;
    ctx.lineWidth = 2;

    // outer rotating ring
    ctx.beginPath();
    ctx.arc(0, 0, s + 10, 0, Math.PI * 2);
    ctx.stroke();

    // gaps as dashes
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, s + 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // cross lines
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(0, -s);
      ctx.stroke();
      // tip ticks
      ctx.beginPath();
      ctx.moveTo(-4, -s);
      ctx.lineTo(4, -s);
      ctx.stroke();
    }

    // center diamond
    ctx.rotate(-angle * 2);
    ctx.fillStyle = opts.secondary;
    ctx.shadowColor = opts.secondary;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(4, 0);
    ctx.lineTo(0, 4);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    raf = requestAnimationFrame(draw);
  }

  function onMove(e) {
    if (Math.hypot(e.clientX - mx, e.clientY - my) > 2) {
      trails.push({ x: mx, y: my, life: 1 });
      if (trails.length > 18) trails.shift();
    }
    mx = e.clientX; my = e.clientY;
  }
  function onClick() {
    recoil = 1;
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 8 + Math.random() * 16;
      trails.push({ x: mx + Math.cos(a) * d, y: my + Math.sin(a) * d, life: 1 });
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
      raf = requestAnimationFrame(draw);
      return api;
    },
    disable() {
      if (!enabled) return api;
      enabled = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onClick);
      trails = [];
      if (canvas) { canvas.remove(); canvas = null; ctx = null; }
      hideCursor(false);
      return api;
    },
    toggle(o) { return enabled ? api.disable() : api.enable(o); },
    isEnabled() { return enabled; },
    destroy() { return api.disable(); }
  };

  global.MouseCursorCrosshair = api;
})(typeof window !== 'undefined' ? window : globalThis);
