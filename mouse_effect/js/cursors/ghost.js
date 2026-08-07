/**
 * 幽灵光晕型（恐怖）
 * API: MouseCursorGhost.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-ghost';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, tx = -9999, ty = -9999, wisps = [], phase = 0, scare = 0;

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
  function ghost(x, y, s, a) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(210,230,255,0.85)'; ctx.shadowColor = '#b8d4ff'; ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, -6, 10, Math.PI, 0);
    ctx.lineTo(10, 10);
    ctx.quadraticCurveTo(6, 6, 3, 12);
    ctx.quadraticCurveTo(0, 6, -3, 12);
    ctx.quadraticCurveTo(-6, 6, -10, 10);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a2030';
    ctx.beginPath(); ctx.arc(-3.5, -7, 2, 0, Math.PI * 2); ctx.arc(3.5, -7, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function loop() {
    if (!enabled) return;
    phase += 0.06; scare *= 0.9;
    tx += (mx - tx) * 0.12; ty += (my - ty) * 0.12;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (Math.random() < 0.25) {
      wisps.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 0.8, vy: -0.5 - Math.random(), life: 1, r: 4 + Math.random() * 8 });
      if (wisps.length > 20) wisps.shift();
    }
    for (let i = wisps.length - 1; i >= 0; i--) {
      const w = wisps[i]; w.x += w.vx; w.y += w.vy; w.life -= 0.02;
      if (w.life <= 0) { wisps.splice(i, 1); continue; }
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r * w.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,210,255,${w.life * 0.25})`; ctx.fill();
    }
    ghost(tx + Math.sin(phase) * 3, ty + Math.cos(phase * 0.8) * 2, 1 + scare * 0.35, 0.55 + Math.sin(phase) * 0.15);
    ghost(mx, my, 1.05 + scare * 0.2, 0.95);
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) { mx = e.clientX; my = e.clientY; }
  function onClick() {
    scare = 1;
    for (let i = 0; i < 10; i++) wisps.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 1, r: 10 });
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
      wisps = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorGhost = api;
})(typeof window !== 'undefined' ? window : globalThis);
