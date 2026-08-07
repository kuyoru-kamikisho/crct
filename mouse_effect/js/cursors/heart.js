/**
 * 爱心拖尾型（可爱）
 * API: MouseCursorHeart.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-heart';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, hearts = [], beat = 0, burst = 0;

  function ensure() {
    if (canvas) return;
    canvas = document.createElement('canvas'); canvas.id = ID;
    Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '2147483646' });
    document.body.appendChild(canvas); ctx = canvas.getContext('2d'); resize();
  }
  function resize() {
    if (!canvas) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function hide(on) {
    document.documentElement.classList.toggle('mc-hide-cursor', on);
    if (on && !document.getElementById('mc-hide-cursor-style')) {
      const s = document.createElement('style'); s.id = 'mc-hide-cursor-style';
      s.textContent = '.mc-hide-cursor,.mc-hide-cursor *{cursor:none!important}'; document.head.appendChild(s);
    }
  }
  function heart(x, y, s, a, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.bezierCurveTo(0, 3, -5, -1, -5, -4);
    ctx.bezierCurveTo(-5, -7, -1, -7, 0, -4.5);
    ctx.bezierCurveTo(1, -7, 5, -7, 5, -4);
    ctx.bezierCurveTo(5, -1, 0, 3, 0, 3);
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.fill();
    ctx.restore();
  }
  function loop() {
    if (!enabled) return;
    beat = 1 + Math.sin(performance.now() / 180) * 0.12;
    burst *= 0.9;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i];
      h.x += h.vx; h.y += h.vy; h.vy -= 0.02; h.life -= 0.015; h.rot += 0.02;
      if (h.life <= 0) { hearts.splice(i, 1); continue; }
      heart(h.x, h.y, h.s * h.life, h.life, h.c);
    }
    heart(mx, my, 1.4 * beat + burst * 0.5, 1, '#ff5d8f');
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) {
    if (Math.hypot(e.clientX - mx, e.clientY - my) > 6) {
      hearts.push({
        x: mx, y: my, vx: (Math.random() - 0.5) * 0.8, vy: -0.6 - Math.random(),
        s: 0.5 + Math.random() * 0.5, life: 1, rot: 0,
        c: ['#ff5d8f', '#ff8fab', '#ffb3c6', '#ff3366'][Math.floor(Math.random() * 4)]
      });
      if (hearts.length > 28) hearts.shift();
    }
    mx = e.clientX; my = e.clientY;
  }
  function onClick(e) {
    burst = 1;
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      hearts.push({
        x: e.clientX, y: e.clientY, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2,
        s: 0.7, life: 1, rot: 0, c: '#ff3366'
      });
    }
  }
  const api = {
    enable() {
      if (enabled) return api; enabled = true; ensure(); hide(true);
      addEventListener('resize', resize); addEventListener('mousemove', onMove); addEventListener('mousedown', onClick);
      raf = requestAnimationFrame(loop); return api;
    },
    disable() {
      if (!enabled) return api; enabled = false; cancelAnimationFrame(raf);
      removeEventListener('resize', resize); removeEventListener('mousemove', onMove); removeEventListener('mousedown', onClick);
      hearts = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorHeart = api;
})(typeof window !== 'undefined' ? window : globalThis);
