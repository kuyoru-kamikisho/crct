/**
 * 全息光环型（科幻）
 * API: MouseCursorHologram.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-hologram';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, a1 = 0, a2 = 0, scan = 0, rings = [];

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
    a1 += 0.04; a2 -= 0.055; scan = (scan + 2) % 40;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.r += 2.2; r.life -= 0.03;
      if (r.life <= 0) { rings.splice(i, 1); continue; }
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.35, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(80,220,255,${r.life * 0.7})`; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.save(); ctx.translate(mx, my);
    ctx.strokeStyle = 'rgba(90,230,255,0.9)'; ctx.shadowColor = '#5ae6ff'; ctx.shadowBlur = 12; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 26, 10, a1, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 26, 10, a2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120,240,255,0.35)'; ctx.fill();
    ctx.strokeStyle = 'rgba(180,250,255,0.95)'; ctx.stroke();
    // scan line
    ctx.beginPath(); ctx.moveTo(-18, -12 + scan * 0.6); ctx.lineTo(18, -12 + scan * 0.6);
    ctx.strokeStyle = `rgba(120,255,220,${0.3 + (scan % 20) / 40})`; ctx.stroke();
    // data ticks
    for (let i = 0; i < 8; i++) {
      const a = a1 * 2 + i * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18); ctx.stroke();
    }
    ctx.restore();
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) { mx = e.clientX; my = e.clientY; }
  function onClick(e) { rings.push({ x: e.clientX, y: e.clientY, r: 8, life: 1 }); }
  const api = {
    enable() {
      if (enabled) return api; enabled = true; ensure(); hide(true);
      addEventListener('resize', resize); addEventListener('mousemove', onMove); addEventListener('mousedown', onClick);
      raf = requestAnimationFrame(loop); return api;
    },
    disable() {
      if (!enabled) return api; enabled = false; cancelAnimationFrame(raf);
      removeEventListener('resize', resize); removeEventListener('mousemove', onMove); removeEventListener('mousedown', onClick);
      rings = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorHologram = api;
})(typeof window !== 'undefined' ? window : globalThis);
