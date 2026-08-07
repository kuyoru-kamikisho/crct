/**
 * 彩虹星屑型（可爱/派对）
 * API: MouseCursorRainbowStar.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-rainbow-star';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, stars = [], hue = 0, pop = 0;

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
  function star(x, y, r, rot, color, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a1 = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const a2 = a1 + Math.PI / 5;
      ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
      ctx.lineTo(Math.cos(a2) * r * 0.4, Math.sin(a2) * r * 0.4);
    }
    ctx.closePath(); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.fill();
    ctx.restore();
  }
  function loop() {
    if (!enabled) return;
    hue = (hue + 2) % 360; pop *= 0.9;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.x += s.vx; s.y += s.vy; s.rot += s.vr; s.life -= 0.02;
      if (s.life <= 0) { stars.splice(i, 1); continue; }
      star(s.x, s.y, s.r * s.life, s.rot, `hsl(${s.hue},90%,65%)`, s.life);
    }
    star(mx, my, 9 + pop * 5, performance.now() / 400, `hsl(${hue},95%,70%)`, 1);
    for (let i = 0; i < 5; i++) {
      const a = performance.now() / 300 + i * 1.256;
      star(mx + Math.cos(a) * 20, my + Math.sin(a) * 20, 4, a, `hsl(${(hue + i * 40) % 360},90%,65%)`, 0.85);
    }
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) {
    if (Math.hypot(e.clientX - mx, e.clientY - my) > 5) {
      stars.push({
        x: mx, y: my, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5),
        r: 3 + Math.random() * 4, rot: Math.random(), vr: 0.1, life: 1, hue: hue
      });
      if (stars.length > 35) stars.shift();
    }
    mx = e.clientX; my = e.clientY;
  }
  function onClick(e) {
    pop = 1;
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16;
      stars.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 2.5, r: 5, rot: a, vr: 0.2, life: 1, hue: (hue + i * 20) % 360 });
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
      stars = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorRainbowStar = api;
})(typeof window !== 'undefined' ? window : globalThis);
