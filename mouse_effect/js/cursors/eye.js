/**
 * 邪眼凝视型（恐怖）
 * API: MouseCursorEye.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-eye';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, blink = 0, veins = [], pulse = 0, open = 1;

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
    pulse = (Math.sin(performance.now() / 250) + 1) * 0.5;
    if (blink > 0) { blink -= 0.08; open = Math.max(0.08, 1 - blink * 2); }
    else {
      open += (1 - open) * 0.2;
      if (Math.random() < 0.008) blink = 1;
    }
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = veins.length - 1; i >= 0; i--) {
      const v = veins[i]; v.life -= 0.03;
      if (v.life <= 0) { veins.splice(i, 1); continue; }
      ctx.beginPath(); ctx.moveTo(v.x, v.y); ctx.lineTo(v.x2, v.y2);
      ctx.strokeStyle = `rgba(160,20,20,${v.life * 0.7})`; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.save(); ctx.translate(mx, my); ctx.scale(1, open);
    // sclera
    ctx.beginPath(); ctx.ellipse(0, 0, 16 + pulse * 2, 10 + pulse, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f5efe6'; ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 14; ctx.fill();
    ctx.strokeStyle = 'rgba(120,20,20,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    // iris
    const g = ctx.createRadialGradient(2, -1, 1, 0, 0, 8);
    g.addColorStop(0, '#5cff7a'); g.addColorStop(0.55, '#0a5c2a'); g.addColorStop(1, '#03140a');
    ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    // pupil
    ctx.beginPath(); ctx.arc(0, 0, 3 + pulse, 0, Math.PI * 2); ctx.fillStyle = '#050805'; ctx.fill();
    ctx.beginPath(); ctx.arc(-2, -2, 1.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
    ctx.restore();
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) {
    if (Math.hypot(e.clientX - mx, e.clientY - my) > 10) {
      const a = Math.random() * Math.PI * 2;
      veins.push({ x: mx, y: my, x2: mx + Math.cos(a) * 16, y2: my + Math.sin(a) * 16, life: 1 });
      if (veins.length > 20) veins.shift();
    }
    mx = e.clientX; my = e.clientY;
  }
  function onClick() {
    blink = 1;
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      veins.push({ x: mx, y: my, x2: mx + Math.cos(a) * 22, y2: my + Math.sin(a) * 22, life: 1 });
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
      veins = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorEye = api;
})(typeof window !== 'undefined' ? window : globalThis);
