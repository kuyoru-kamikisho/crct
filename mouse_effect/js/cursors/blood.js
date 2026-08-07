/**
 * 血滴型（恐怖）
 * API: MouseCursorBlood.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-blood';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, drops = [], splat = [], drip = 0;

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
  function drop(x, y, r, a) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r, -r * 0.2, r * 0.7, r, 0, r * 1.4);
    ctx.bezierCurveTo(-r * 0.7, r, -r, -r * 0.2, 0, -r);
    ctx.fillStyle = '#8b0000'; ctx.shadowColor = '#ff1a1a'; ctx.shadowBlur = 8; ctx.fill();
    ctx.restore();
  }
  function loop() {
    if (!enabled) return;
    drip = (drip + 0.05) % (Math.PI * 2);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (Math.random() < 0.2) {
      drops.push({ x: mx + (Math.random() - 0.5) * 8, y: my + 6, vy: 1 + Math.random() * 2, r: 2 + Math.random() * 3, life: 1 });
      if (drops.length > 25) drops.shift();
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i]; d.y += d.vy; d.vy += 0.05; d.life -= 0.012;
      if (d.life <= 0) { drops.splice(i, 1); continue; }
      drop(d.x, d.y, d.r, d.life);
    }
    for (let i = splat.length - 1; i >= 0; i--) {
      const s = splat[i]; s.life -= 0.025; s.r += 0.8;
      if (s.life <= 0) { splat.splice(i, 1); continue; }
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(120,0,0,${s.life * 0.4})`; ctx.fill();
    }
    drop(mx, my + Math.sin(drip) * 2, 7, 0.95);
    // small orbit drips
    drop(mx + 10, my + 8 + Math.sin(drip * 2) * 3, 3, 0.7);
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) { mx = e.clientX; my = e.clientY; }
  function onClick(e) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      drops.push({ x: e.clientX, y: e.clientY, vy: Math.sin(a) * 2 + 1, r: 2 + Math.random() * 4, life: 1 });
      drops[drops.length - 1].x += Math.cos(a) * 8;
    }
    splat.push({ x: e.clientX, y: e.clientY, r: 6, life: 1 });
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
      drops = []; splat = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorBlood = api;
})(typeof window !== 'undefined' ? window : globalThis);
