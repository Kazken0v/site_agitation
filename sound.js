// Звук без внешних файлов: дождь = отфильтрованный шум (WebAudio).
// Если положишь свои файлы в sounds/rain.mp3, sounds/thunder.mp3 — они подхватятся автоматически.
(function () {
  let ctx = null, rainGain = null, muted = false, useMp3 = false;

  function ensure() {
    if (ctx) return;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    // шум дождя
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = 2500; filt.Q.value = 0.4;
    rainGain = ctx.createGain(); rainGain.gain.value = 0.06;
    src.connect(filt); filt.connect(rainGain); rainGain.connect(ctx.destination);
    src.start();
  }

  // попробовать mp3-файлы, если пользователь их добавил
  function tryMp3() {
    ['sounds/rain.mp3'].forEach(url => {
      fetch(url, { method: 'HEAD' }).then(r => {
        if (!r.ok) return;
        useMp3 = true;
        const a = document.createElement('audio');
        a.src = url; a.loop = true; a.volume = 0.35; a.id = 'mp3-rain';
        document.body.appendChild(a);
        a.play().catch(() => {});
        if (rainGain) rainGain.gain.value = 0.015; // приглушить синтез
      }).catch(() => {});
    });
  }

  function buzz() {
    if (muted) return; ensure(); if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 110;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.4);
  }
  function blip(ok) {
    if (muted) return; ensure(); if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = ok ? 880 : 220;
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.2);
  }
  function thunder() {
    if (muted) return; ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    // низкочастотный рокот с затуханием
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 1.8);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 2.3);
    // высокочастотный треск
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = 'square'; o2.frequency.value = 800;
    g2.gain.setValueAtTime(0.05, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o2.connect(g2); g2.connect(ctx.destination); o2.start(t); o2.stop(t + 0.35);
  }
  function toggleMute() {
    muted = !muted;
    if (ctx && rainGain) rainGain.gain.value = muted ? 0 : 0.06;
    const mp3 = document.getElementById('mp3-rain');
    if (mp3) muted ? mp3.pause() : mp3.play().catch(() => {});
    return muted;
  }

  window.NoirSound = {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); tryMp3(); },
    buzz, blip, thunder, toggleMute
  };
})();
