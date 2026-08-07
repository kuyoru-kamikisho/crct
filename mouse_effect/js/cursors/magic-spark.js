/**
 * 魔法火花型（游戏）
 * API: MouseCursorMagicSpark.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-magic-spark';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, sparks = [], orbit = 0, boom = 0;

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
  function star(x, y, r, a, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = Math.min(1, a > 10 ? 1 : 1);
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.moveTo(0, 0); ctx.lineTo(0.8, -r); ctx.lineTo(-0.8, -r);
    }
    ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function spawn(x, y, force) {
    sparks.push({
      x, y, vx: (Math.random() - 0.5) * (force ? 4 : 1.5), vy: (Math.random() - 0.5) * (force ? 4 : 1.5) - 0.5,
      life: 1, hue: 260 + Math.random() * 80, r: 3 + Math.random() * 5, rot: Math.random() * Math.PI
    });
    if (sparks.length > 40) sparks.shift();
  }
  function loop() {
    if (!enabled) return;
    orbit += 0.08; boom *= 0.88;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (Math.random() < 0.5) spawn(mx, my, false);
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx; s.y += s.vy; s.vy += 0.02; s.life -= 0.02; s.rot += 0.1;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = s.life;
      star(s.x, s.y, s.r * s.life, s.rot, `hsl(${s.hue},90%,70%)`);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      const a = orbit + i * 1.256;
      const rr = 18 + boom * 8;
      star(mx + Math.cos(a) * rr, my + Math.sin(a) * rr, 4, a, `hsl(${280 + i * 20},95%,75%)`);
    }
    star(mx, my, 8 + boom * 6, orbit * 0.5, '#e9c6ff');
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) { mx = e.clientX; my = e.clientY; }
  function onClick(e) {
    boom = 1;
    for (let i = 0; i < 18; i++) spawn(e.clientX, e.clientY, true);
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
  global.MouseCursorMagicSpark = api;
})(typeof window !== 'undefined' ? window : globalThis);
