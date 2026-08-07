/**
 * 齿轮机械型（蒸汽朋克/工业）
 * API: MouseCursorGear.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-gear';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, rot = 0, sparks = [], kick = 0;

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
  function gear(x, y, r, teeth, a, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const ang = (i / (teeth * 2)) * Math.PI * 2;
      const rr = i % 2 === 0 ? r : r * 0.72;
      const px = Math.cos(ang) * rr;
      const py = Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  function loop() {
    if (!enabled) return;
    rot += 0.06 + kick * 0.15; kick *= 0.9;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]; s.x += s.vx; s.y += s.vy; s.life -= 0.03;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(255,180,80,${s.life})`;
      ctx.fillRect(s.x, s.y, 2, 2);
    }
    gear(mx, my, 16 + kick * 4, 8, rot, '#d4a574');
    gear(mx + 18, my + 10, 9, 6, -rot * 1.4, '#c4925a');
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) {
    if (Math.hypot(e.clientX - mx, e.clientY - my) > 8 && Math.random() < 0.4) {
      sparks.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 1 });
      if (sparks.length > 20) sparks.shift();
    }
    mx = e.clientX; my = e.clientY;
  }
  function onClick(e) {
    kick = 1;
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      sparks.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: 1 });
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
      sparks = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorGear = api;
})(typeof window !== 'undefined' ? window : globalThis);
