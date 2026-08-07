/**
 * 烟尘缭绕型（氛围）
 * API: MouseCursorSmoke.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-smoke';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, puffs = [], swirl = 0, puff = 0;

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
    puffs.push({
      x, y, vx: (Math.random() - 0.5) * (force ? 2 : 0.6), vy: -0.4 - Math.random() * (force ? 2 : 1),
      r: 6 + Math.random() * 10, life: 1, rot: Math.random() * Math.PI
    });
    if (puffs.length > 35) puffs.shift();
  }
  function loop() {
    if (!enabled) return;
    swirl += 0.05; puff *= 0.9;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    spawn(mx, my, false);
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.x += p.vx + Math.sin(swirl + p.rot) * 0.3;
      p.y += p.vy; p.r += 0.35; p.life -= 0.016;
      if (p.life <= 0) { puffs.splice(i, 1); continue; }
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(200,210,220,${p.life * 0.35})`);
      g.addColorStop(1, 'rgba(160,170,180,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(mx, my, 5 + puff * 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(230,235,240,0.85)'; ctx.shadowColor = '#c8d0d8'; ctx.shadowBlur = 12; ctx.fill();
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) { mx = e.clientX; my = e.clientY; }
  function onClick(e) {
    puff = 1;
    for (let i = 0; i < 14; i++) spawn(e.clientX, e.clientY, true);
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
      puffs = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorSmoke = api;
})(typeof window !== 'undefined' ? window : globalThis);
