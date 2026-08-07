/**
 * 烈焰拖尾型（元素）
 * API: MouseCursorFire.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-fire';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, parts = [], boom = 0;

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
  function spawn(x, y, force) {
    parts.push({
      x, y, vx: (Math.random() - 0.5) * (force ? 3 : 1), vy: -1 - Math.random() * (force ? 3 : 2),
      life: 1, r: 4 + Math.random() * 8, hue: 20 + Math.random() * 40
    });
    if (parts.length > 50) parts.shift();
  }
  function loop() {
    if (!enabled) return;
    boom *= 0.9;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = 0; i < 3; i++) spawn(mx + (Math.random() - 0.5) * 8, my + (Math.random() - 0.5) * 8, false);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx; p.y += p.vy; p.vy -= 0.03; p.life -= 0.025; p.r *= 0.97;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `hsla(${p.hue + 30},100%,85%,${p.life})`);
      g.addColorStop(0.4, `hsla(${p.hue},100%,55%,${p.life * 0.7})`);
      g.addColorStop(1, `hsla(${p.hue - 10},100%,40%,0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    const r = 10 + boom * 8;
    const core = ctx.createRadialGradient(mx, my, 0, mx, my, r);
    core.addColorStop(0, '#fff6c8'); core.addColorStop(0.35, '#ffb347'); core.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) { mx = e.clientX; my = e.clientY; }
  function onClick(e) {
    boom = 1;
    for (let i = 0; i < 20; i++) spawn(e.clientX, e.clientY, true);
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
      parts = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorFire = api;
})(typeof window !== 'undefined' ? window : globalThis);
