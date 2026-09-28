// Фотореалистичный дождь: боке, капли с преломлением, объёмные молнии, дым.
(function () {
  function initRain() {
    const cv = document.getElementById('rain');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H;

    function resize() {
      const r = cv.parentElement.getBoundingClientRect();
      W = cv.width = Math.max(300, r.width);
      H = cv.height = Math.max(180, r.height);
    }
    resize();
    window.addEventListener('resize', resize);

    // --- боке: размытые огни города за окном ---
    const bokeh = [];
    for (let i = 0; i < 18; i++) {
      bokeh.push({
        x: Math.random() * W,
        y: H * 0.3 + Math.random() * H * 0.6,
        r: 3 + Math.random() * 14,
        c: ['255,200,100', '255,150,80', '150,200,255', '255,255,220', '200,150,255'][Math.floor(Math.random() * 5)],
        o: 0.08 + Math.random() * 0.2,
        drift: 0.1 + Math.random() * 0.3
      });
    }

    // --- капли на стекле с преломлением ---
    const drops = [];
    for (let i = 0; i < 120; i++) {
      drops.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.8 + Math.random() * 3.5,
        speed: 0,
        maxSpeed: 0.3 + Math.random() * 1.2,
        wobble: Math.random() * Math.PI * 2,
        stuck: Math.random() > 0.4
      });
    }

    // --- объёмные капли, стекающие вниз ---
    const streams = [];
    for (let i = 0; i < 8; i++) {
      streams.push({
        x: Math.random() * W,
        y: Math.random() * H,
        len: 20 + Math.random() * 60,
        speed: 1 + Math.random() * 3,
        width: 1 + Math.random() * 2,
        opacity: 0.15 + Math.random() * 0.25
      });
    }

    // --- дым/туман ---
    const fog = [];
    for (let i = 0; i < 6; i++) {
      fog.push({
        x: Math.random() * W,
        y: H * 0.5 + Math.random() * H * 0.5,
        rx: 80 + Math.random() * 150,
        ry: 30 + Math.random() * 60,
        speed: 0.1 + Math.random() * 0.3,
        opacity: 0.02 + Math.random() * 0.04
      });
    }

    // --- молния с объёмным светом ---
    let lightningPhase = 0; // 0 = нет, 1 = вспышка, 2 = затухание
    let lightningIntensity = 0;
    let lightningTimer = 0;

    function triggerLightning() {
      lightningPhase = 1;
      lightningIntensity = 0.6 + Math.random() * 0.4;
      lightningTimer = 0;
      if (window.NoirSound) window.NoirSound.thunder();
    }

    function updateLightning(dt) {
      if (lightningPhase === 1) {
        lightningTimer += dt;
        if (lightningTimer > 0.15) {
          lightningPhase = 2;
          lightningTimer = 0;
        }
      } else if (lightningPhase === 2) {
        lightningTimer += dt;
        lightningIntensity *= 0.92;
        if (lightningIntensity < 0.01) {
          lightningPhase = 0;
          lightningIntensity = 0;
        }
      }
    }

    function drawLightning() {
      if (lightningIntensity <= 0) return;
      // основная вспышка
      const g = ctx.createRadialGradient(W * 0.5, H * 0.3, 0, W * 0.5, H * 0.3, W * 0.8);
      g.addColorStop(0, `rgba(200,220,255,${lightningIntensity * 0.4})`);
      g.addColorStop(0.5, `rgba(150,180,255,${lightningIntensity * 0.15})`);
      g.addColorStop(1, 'rgba(100,120,200,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // молния-ветвь
      if (lightningIntensity > 0.3) {
        ctx.strokeStyle = `rgba(220,235,255,${lightningIntensity * 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let lx = W * 0.3 + Math.random() * W * 0.4;
        let ly = 0;
        ctx.moveTo(lx, ly);
        while (ly < H * 0.7) {
          lx += (Math.random() - 0.5) * 40;
          ly += 20 + Math.random() * 30;
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }
    }

    // --- основной цикл ---
    let lastTime = performance.now();
    let nextLightning = 8000 + Math.random() * 12000;

    function loop(now) {
      const dt = Math.min(50, now - lastTime);
      lastTime = now;

      // фон: ночное небо
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#04050e');
      sky.addColorStop(0.5, '#0a1024');
      sky.addColorStop(1, '#05070f');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // луна с ореолом
      const moonX = W * 0.78, moonY = H * 0.2;
      const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 60);
      moonGlow.addColorStop(0, 'rgba(220,230,255,0.3)');
      moonGlow.addColorStop(1, 'rgba(220,230,255,0)');
      ctx.fillStyle = moonGlow;
      ctx.fillRect(moonX - 60, moonY - 60, 120, 120);
      ctx.fillStyle = 'rgba(220,230,255,0.85)';
      ctx.beginPath(); ctx.arc(moonX, moonY, 14, 0, 7); ctx.fill();

      // боке-огни
      bokeh.forEach(b => {
        b.x += b.drift * 0.1;
        if (b.x > W + 20) b.x = -20;
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, `rgba(${b.c},${b.o})`);
        g.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
      });

      // дым
      fog.forEach(f => {
        f.x += f.speed * 0.2;
        if (f.x - f.rx > W) f.x = -f.rx;
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.rx);
        g.addColorStop(0, `rgba(180,200,220,${f.opacity})`);
        g.addColorStop(1, 'rgba(180,200,220,0)');
        ctx.fillStyle = g;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.scale(1, f.ry / f.rx);
        ctx.beginPath(); ctx.arc(0, 0, f.rx, 0, 7); ctx.fill();
        ctx.restore();
      });

      // капли на стекне с преломлением
      drops.forEach(d => {
        if (!d.stuck) {
          d.speed = Math.min(d.maxSpeed, d.speed + 0.02);
          d.y += d.speed;
          d.wobble += 0.05;
          d.x += Math.sin(d.wobble) * 0.3;
          if (d.y > H + 10) {
            d.y = -10;
            d.x = Math.random() * W;
            d.stuck = Math.random() > 0.5;
            d.speed = 0;
          }
        }
        // капля как линза: тёмный край, светлый центр, блик
        const g = ctx.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, 0, d.x, d.y, d.r);
        g.addColorStop(0, 'rgba(255,255,255,0.5)');
        g.addColorStop(0.4, 'rgba(200,220,255,0.15)');
        g.addColorStop(0.8, 'rgba(100,120,180,0.1)');
        g.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill();
        // блик
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.25, 0, 7); ctx.fill();
      });

      // объёмные струйки
      streams.forEach(s => {
        s.y += s.speed;
        if (s.y - s.len > H) {
          s.y = -s.len;
          s.x = Math.random() * W;
        }
        const g = ctx.createLinearGradient(s.x, s.y - s.len, s.x, s.y);
        g.addColorStop(0, 'rgba(200,220,255,0)');
        g.addColorStop(0.5, `rgba(200,220,255,${s.opacity})`);
        g.addColorStop(1, `rgba(220,235,255,${s.opacity * 1.5})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = s.width;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - s.len);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      });

      // молния
      updateLightning(dt);
      drawLightning();

      // расписание молний
      nextLightning -= dt;
      if (nextLightning <= 0) {
        triggerLightning();
        nextLightning = 10000 + Math.random() * 15000;
      }

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  }
  window.initRain = initRain;
})();
