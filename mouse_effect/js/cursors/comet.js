/**
 * 彗星拖尾型（宇宙）
 * API: MouseCursorComet.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-comet';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, trail = [], stars = [], boom = 0;

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
  function loop() {
    if (!enabled) return;
    boom *= 0.9;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = trail.length - 1; i >= 0; i--) {
      const t = trail[i]; t.life -= 0.04;
      if (t.life <= 0) { trail.splice(i, 1); continue; }
      ctx.beginPath(); ctx.arc(t.x, t.y, 2 + t.life * 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160,210,255,${t.life * 0.55})`; ctx.fill();
    }
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i]; s.x += s.vx; s.y += s.vy; s.life -= 0.02;
      if (s.life <= 0) { stars.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(255,255,220,${s.life})`;
      ctx.fillRect(s.x, s.y, 2, 2);
    }
    if (trail.length > 1) {
      ctx.beginPath(); ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
      ctx.strokeStyle = 'rgba(140,200,255,0.65)'; ctx.lineWidth = 3 + boom * 3; ctx.lineCap = 'round';
      ctx.shadowColor = '#8ec8ff'; ctx.shadowBlur = 14; ctx.stroke();
    }
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, 12 + boom * 8);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#a8d8ff'); g.addColorStop(1, 'rgba(80,140,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, my, 12 + boom * 8, 0, Math.PI * 2); ctx.fill();
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) {
    trail.push({ x: e.clientX, y: e.clientY, life: 1 });
    if (trail.length > 22) trail.shift();
    if (Math.random() < 0.4) stars.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2, life: 1 });
    mx = e.clientX; my = e.clientY;
  }
  function onClick(e) {
    boom = 1;
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      stars.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: 1 });
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
      trail = []; stars = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorComet = api;
})(typeof window !== 'undefined' ? window : globalThis);
