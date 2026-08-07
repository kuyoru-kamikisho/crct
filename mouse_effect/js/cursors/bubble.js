/**
 * 气泡型鼠标指针
 * API: MouseCursorBubble.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-bubble';
  let enabled = false;
  let canvas, ctx, raf = 0;
  let mx = -9999, my = -9999;
  let bubbles = [];
  let pops = [];
  let wobble = 0;
  let opts = { hue: 190, max: 20 };

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

  function spawn(x, y, big) {
    bubbles.push({
      x, y,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -0.4 - Math.random() * 1.2,
      r: big ? 10 + Math.random() * 8 : 3 + Math.random() * 6,
      life: 1,
      decay: 0.006 + Math.random() * 0.01,
      phase: Math.random() * Math.PI * 2
    });
    if (bubbles.length > opts.max) bubbles.shift();
  }

  function drawBubble(x, y, r, alpha) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, `hsla(${opts.hue}, 90%, 92%, ${alpha * 0.95})`);
    g.addColorStop(0.45, `hsla(${opts.hue}, 80%, 70%, ${alpha * 0.35})`);
    g.addColorStop(1, `hsla(${opts.hue + 30}, 70%, 55%, ${alpha * 0.08})`);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = `hsla(${opts.hue}, 90%, 85%, ${alpha * 0.7})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // highlight
    ctx.beginPath();
    ctx.ellipse(x - r * 0.28, y - r * 0.32, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.85})`;
    ctx.fill();
  }

  function loop() {
    if (!enabled) return;
    wobble = Math.sin(performance.now() / 180) * 2;
    ctx.clearRect(0, 0, innerWidth, innerHeight);

    if (Math.random() < 0.35) spawn(mx + (Math.random() - 0.5) * 10, my + 4);

    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.phase += 0.08;
      b.x += b.vx + Math.sin(b.phase) * 0.35;
      b.y += b.vy;
      b.life -= b.decay;
      if (b.life <= 0) {
        pops.push({ x: b.x, y: b.y, r: b.r, life: 1 });
        bubbles.splice(i, 1);
        continue;
      }
      drawBubble(b.x, b.y, b.r * (0.7 + b.life * 0.3), b.life);
    }

    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.life -= 0.06;
      p.r += 1.5;
      if (p.life <= 0) { pops.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${opts.hue}, 90%, 80%, ${p.life})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // main cursor bubble
    drawBubble(mx + wobble * 0.3, my, 14 + Math.sin(performance.now() / 250) * 1.5, 0.95);
    // tiny orbiting bubbles
    for (let i = 0; i < 3; i++) {
      const a = performance.now() / 400 + i * 2.1;
      drawBubble(mx + Math.cos(a) * 22, my + Math.sin(a) * 16, 4, 0.7);
    }

    raf = requestAnimationFrame(loop);
  }

  function onMove(e) { mx = e.clientX; my = e.clientY; }
  function onClick(e) {
    for (let i = 0; i < 8; i++) {
      spawn(e.clientX + (Math.random() - 0.5) * 20, e.clientY + (Math.random() - 0.5) * 20, true);
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
      bubbles = []; pops = [];
      if (canvas) { canvas.remove(); canvas = null; ctx = null; }
      hideCursor(false);
      return api;
    },
    toggle(o) { return enabled ? api.disable() : api.enable(o); },
    isEnabled() { return enabled; },
    destroy() { return api.disable(); }
  };

  global.MouseCursorBubble = api;
})(typeof window !== 'undefined' ? window : globalThis);
