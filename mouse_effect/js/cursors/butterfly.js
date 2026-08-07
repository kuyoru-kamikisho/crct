/**
 * 蝴蝶飞舞型（自然可爱）
 * API: MouseCursorButterfly.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-butterfly';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, flap = 0, dust = [], scatter = 0;

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
  function wing(side, open) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(side * 8 * open, -14, side * 18 * open, -8, side * 14 * open, 2);
    ctx.bezierCurveTo(side * 16 * open, 10, side * 6 * open, 8, 0, 0);
    const g = ctx.createLinearGradient(0, -10, side * 14, 5);
    g.addColorStop(0, '#ff9ecd'); g.addColorStop(0.5, '#c084fc'); g.addColorStop(1, '#67e8f9');
    ctx.fillStyle = g; ctx.globalAlpha = 0.85; ctx.fill();
  }
  function loop() {
    if (!enabled) return;
    flap += 0.25; scatter *= 0.9;
    const open = 0.55 + Math.abs(Math.sin(flap)) * 0.55 + scatter * 0.3;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (Math.random() < 0.4) {
      dust.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, life: 1, c: `hsl(${280 + Math.random() * 60},80%,75%)` });
      if (dust.length > 30) dust.shift();
    }
    for (let i = dust.length - 1; i >= 0; i--) {
      const d = dust[i]; d.x += d.vx; d.y += d.vy; d.life -= 0.025;
      if (d.life <= 0) { dust.splice(i, 1); continue; }
      ctx.globalAlpha = d.life; ctx.fillStyle = d.c;
      ctx.beginPath(); ctx.arc(d.x, d.y, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save(); ctx.translate(mx, my); ctx.rotate(Math.sin(flap * 0.3) * 0.2);
    wing(-1, open); wing(1, open);
    ctx.globalAlpha = 1; ctx.fillStyle = '#3b2f4a';
    ctx.beginPath(); ctx.ellipse(0, 0, 2, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(-4, -14, -6, -16);
    ctx.moveTo(0, -6); ctx.quadraticCurveTo(4, -14, 6, -16);
    ctx.strokeStyle = '#3b2f4a'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) { mx = e.clientX; my = e.clientY; }
  function onClick(e) {
    scatter = 1;
    for (let i = 0; i < 16; i++) {
      dust.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 1, c: `hsl(${300 + Math.random() * 40},90%,75%)` });
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
      dust = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorButterfly = api;
})(typeof window !== 'undefined' ? window : globalThis);
