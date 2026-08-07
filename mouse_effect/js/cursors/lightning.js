/**
 * 闪电弧光型（元素）
 * API: MouseCursorLightning.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-lightning';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, bolts = [], spin = 0, flash = 0;

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
  function makeBolt(x, y, ang, len) {
    const pts = [{ x, y }];
    let cx = x, cy = y;
    const steps = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < steps; i++) {
      ang += (Math.random() - 0.5) * 0.9;
      cx += Math.cos(ang) * (len / steps);
      cy += Math.sin(ang) * (len / steps);
      pts.push({ x: cx, y: cy });
    }
    return { pts, life: 1 };
  }
  function loop() {
    if (!enabled) return;
    spin += 0.1; flash *= 0.85;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (Math.random() < 0.15) bolts.push(makeBolt(mx, my, Math.random() * Math.PI * 2, 18 + Math.random() * 16));
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i]; b.life -= 0.06;
      if (b.life <= 0) { bolts.splice(i, 1); continue; }
      ctx.beginPath(); ctx.moveTo(b.pts[0].x, b.pts[0].y);
      for (let j = 1; j < b.pts.length; j++) ctx.lineTo(b.pts[j].x, b.pts[j].y);
      ctx.strokeStyle = `rgba(180,220,255,${b.life})`; ctx.lineWidth = 2; ctx.shadowColor = '#9ad0ff'; ctx.shadowBlur = 12; ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${b.life})`; ctx.lineWidth = 0.8; ctx.stroke();
    }
    // core
    ctx.save(); ctx.translate(mx, my); ctx.rotate(spin);
    ctx.strokeStyle = `rgba(200,230,255,${0.85 + flash * 0.15})`; ctx.lineWidth = 2; ctx.shadowColor = '#b8e0ff'; ctx.shadowBlur = 16 + flash * 20;
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2, -8); ctx.lineTo(-1, -12); ctx.lineTo(3, -18); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 4 + flash * 4, 0, Math.PI * 2);
    ctx.fillStyle = '#eef7ff'; ctx.fill();
    ctx.restore();
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) { mx = e.clientX; my = e.clientY; }
  function onClick(e) {
    flash = 1;
    for (let i = 0; i < 8; i++) bolts.push(makeBolt(e.clientX, e.clientY, (Math.PI * 2 * i) / 8, 28));
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
      bolts = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorLightning = api;
})(typeof window !== 'undefined' ? window : globalThis);
