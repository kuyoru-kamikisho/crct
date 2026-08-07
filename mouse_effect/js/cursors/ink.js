/**
 * 墨水泼溅型（艺术）
 * API: MouseCursorInk.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-ink';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, blobs = [], drip = [], pulse = 0;

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
  function blot(x, y, r, a) {
    ctx.globalAlpha = a; ctx.fillStyle = '#1a1528';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (Math.PI * 2 * i) / 8;
      const rr = r * (0.75 + Math.sin(ang * 3 + r) * 0.25);
      const px = x + Math.cos(ang) * rr;
      const py = y + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  }
  function loop() {
    if (!enabled) return;
    pulse = 1 + Math.sin(performance.now() / 200) * 0.08;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = blobs.length - 1; i >= 0; i--) {
      const b = blobs[i]; b.life -= 0.018; b.r += 0.3;
      if (b.life <= 0) { blobs.splice(i, 1); continue; }
      blot(b.x, b.y, b.r, b.life * 0.55);
    }
    for (let i = drip.length - 1; i >= 0; i--) {
      const d = drip[i]; d.y += d.vy; d.vy += 0.04; d.life -= 0.015;
      if (d.life <= 0) { drip.splice(i, 1); continue; }
      ctx.globalAlpha = d.life; ctx.fillStyle = '#1a1528';
      ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r * 0.6, d.r, 0, 0, Math.PI * 2); ctx.fill();
    }
    blot(mx, my, 9 * pulse, 0.9);
    ctx.globalAlpha = 0.9; ctx.fillStyle = '#f0e8ff';
    ctx.beginPath(); ctx.arc(mx - 2, my - 2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) {
    if (Math.hypot(e.clientX - mx, e.clientY - my) > 8) {
      blobs.push({ x: mx, y: my, r: 4 + Math.random() * 4, life: 1 });
      if (blobs.length > 22) blobs.shift();
      if (Math.random() < 0.3) drip.push({ x: mx, y: my, vy: 0.8, r: 2 + Math.random() * 2, life: 1 });
    }
    mx = e.clientX; my = e.clientY;
  }
  function onClick(e) {
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      blobs.push({ x: e.clientX + Math.cos(a) * 10, y: e.clientY + Math.sin(a) * 10, r: 6, life: 1 });
      drip.push({ x: e.clientX + Math.cos(a) * 6, y: e.clientY, vy: 1 + Math.random(), r: 3, life: 1 });
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
      blobs = []; drip = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorInk = api;
})(typeof window !== 'undefined' ? window : globalThis);
