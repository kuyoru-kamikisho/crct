/**
 * 猫爪印型（可爱）
 * API: MouseCursorPaw.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-paw';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, paws = [], lastDrop = 0, bounce = 0, bob = 0;

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
  function paw(x, y, s, a, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha = a;
    ctx.fillStyle = '#f2b28a'; ctx.shadowColor = '#f2b28a'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.ellipse(0, 4, 7, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    [[-7, -4], [-2.5, -7], [2.5, -7], [7, -4]].forEach(([px, py]) => {
      ctx.beginPath(); ctx.ellipse(px, py, 3, 3.6, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }
  function loop() {
    if (!enabled) return;
    bounce *= 0.9; bob = Math.sin(performance.now() / 200) * 2;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = paws.length - 1; i >= 0; i--) {
      const p = paws[i]; p.life -= 0.012;
      if (p.life <= 0) { paws.splice(i, 1); continue; }
      paw(p.x, p.y, p.s, p.life * 0.85, p.rot);
    }
    paw(mx, my + bob, 1.1 + bounce * 0.3, 1, Math.sin(performance.now() / 400) * 0.15);
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) {
    const now = performance.now();
    if (now - lastDrop > 90 && Math.hypot(e.clientX - mx, e.clientY - my) > 10) {
      paws.push({ x: mx, y: my, s: 0.7 + Math.random() * 0.25, rot: (Math.random() - 0.5) * 0.5, life: 1 });
      if (paws.length > 18) paws.shift();
      lastDrop = now;
    }
    mx = e.clientX; my = e.clientY;
  }
  function onClick(e) {
    bounce = 1;
    for (let i = 0; i < 5; i++) {
      paws.push({
        x: e.clientX + (Math.random() - 0.5) * 30,
        y: e.clientY + (Math.random() - 0.5) * 30,
        s: 0.6, rot: Math.random() * 1, life: 1
      });
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
      paws = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorPaw = api;
})(typeof window !== 'undefined' ? window : globalThis);
