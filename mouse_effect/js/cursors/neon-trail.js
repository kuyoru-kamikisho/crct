/**
 * 霓虹拖尾型（科幻）
 * API: MouseCursorNeonTrail.enable() / disable() / toggle() / isEnabled() / destroy()
 */
(function (global) {
  const ID = 'mouse-cursor-neon-trail';
  let enabled = false, canvas, ctx, raf = 0;
  let mx = -9999, my = -9999, points = [], spark = [], hue = 170, burst = 0;

  function ensure() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = ID;
    Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '2147483646' });
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
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
      s.textContent = '.mc-hide-cursor,.mc-hide-cursor *{cursor:none!important}';
      document.head.appendChild(s);
    }
  }
  function loop() {
    if (!enabled) return;
    hue = (hue + 0.8) % 360;
    burst *= 0.9;
    ctx.clearRect(0, 0, innerWidth, innerHeight);

    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.strokeStyle = `hsla(${hue},100%,65%,0.85)`;
      ctx.lineWidth = 3 + burst * 4;
      ctx.lineCap = 'round';
      ctx.shadowColor = `hsl(${hue},100%,60%)`;
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = `hsla(${hue},100%,90%,0.9)`;
      ctx.stroke();
    }
    for (let i = points.length - 1; i >= 0; i--) {
      points[i].life -= 0.035;
      if (points[i].life <= 0) points.splice(i, 1);
    }
    for (let i = spark.length - 1; i >= 0; i--) {
      const p = spark[i];
      p.x += p.vx; p.y += p.vy; p.life -= 0.03;
      if (p.life <= 0) { spark.splice(i, 1); continue; }
      ctx.fillStyle = `hsla(${hue + 40},100%,70%,${p.life})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
    }
    const r = 6 + Math.sin(performance.now() / 150) * 1.5 + burst * 5;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, r * 2);
    g.addColorStop(0, `hsla(${hue},100%,85%,1)`);
    g.addColorStop(1, `hsla(${hue},100%,50%,0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(mx, my, r * 2, 0, Math.PI * 2); ctx.fill();
    raf = requestAnimationFrame(loop);
  }
  function onMove(e) {
    mx = e.clientX; my = e.clientY;
    points.push({ x: mx, y: my, life: 1 });
    if (points.length > 28) points.shift();
  }
  function onClick(e) {
    burst = 1;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      spark.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: 1 });
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
      points = []; spark = []; if (canvas) { canvas.remove(); canvas = null; } hide(false); return api;
    },
    toggle() { return enabled ? api.disable() : api.enable(); },
    isEnabled() { return enabled; }, destroy() { return api.disable(); }
  };
  global.MouseCursorNeonTrail = api;
})(typeof window !== 'undefined' ? window : globalThis);
