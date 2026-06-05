let audioCtx;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTone(freq, duration, type = 'square', volume = 0.1, sweep = 0) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  if (sweep) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, freq + sweep), audioCtx.currentTime + duration
    );
  }
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function noiseBurst(duration, volume) {
  if (!audioCtx) return;
  const size = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
  const out = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) out[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  noise.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start();
}

// 🔫 Gunshot — loud and punchy
function soundShoot() {
  initAudio();
  playTone(180, 0.18, 'square', 0.45, -120);
  playTone(90, 0.15, 'sawtooth', 0.35, -50);
  noiseBurst(0.12, 0.5);
}

// 💥 Hit — sharp impact
function soundHit() {
  initAudio();
  playTone(300, 0.2, 'sawtooth', 0.5, -200);
  noiseBurst(0.08, 0.4);
}

// ☠️ Death — dramatic
function soundDeath() {
  initAudio();
  playTone(400, 0.6, 'sawtooth', 0.6, -350);
  setTimeout(() => playTone(200, 0.5, 'square', 0.5, -150), 100);
  setTimeout(() => playTone(100, 0.4, 'sawtooth', 0.4, -80), 300);
  noiseBurst(0.3, 0.5);
}

// 🎯 Kill — satisfying ding
function soundKill() {
  initAudio();
  playTone(600, 0.15, 'sine', 0.5, 200);
  setTimeout(() => playTone(900, 0.2, 'sine', 0.5, 100), 80);
  setTimeout(() => playTone(1200, 0.15, 'sine', 0.4, 50), 180);
}

// 🔔 Player joins
function soundJoin() {
  initAudio();
  playTone(500, 0.15, 'sine', 0.4, 200);
  setTimeout(() => playTone(700, 0.18, 'sine', 0.4, 100), 100);
  setTimeout(() => playTone(900, 0.12, 'sine', 0.35, 50), 200);
}

// 👋 Player leaves
function soundLeave() {
  initAudio();
  playTone(500, 0.15, 'sine', 0.4, -200);
  setTimeout(() => playTone(300, 0.2, 'sine', 0.35, -100), 100);
}
