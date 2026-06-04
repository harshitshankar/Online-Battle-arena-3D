let audioCtx;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playTone(freq, duration, type='square', volume=0.1, sweep=0) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freq;
  if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq+sweep), audioCtx.currentTime + duration);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + duration);
}
function noiseBurst(duration, volume) {
  if (!audioCtx) return;
  const size = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
  const out = buffer.getChannelData(0);
  for (let i=0; i<size; i++) out[i] = Math.random()*2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  noise.connect(gain); gain.connect(audioCtx.destination);
  noise.start();
}
function soundShoot() { initAudio(); playTone(180,0.12,'square',0.08,-120); playTone(90,0.1,'sawtooth',0.06,-50); noiseBurst(0.05,0.06); }
function soundHit() { initAudio(); playTone(300,0.15,'sawtooth',0.12,-200); }
function soundDeath() { initAudio(); playTone(400,0.5,'sawtooth',0.15,-350); setTimeout(()=>playTone(200,0.4,'square',0.1,-150),100); }
function soundKill() { initAudio(); playTone(600,0.1,'sine',0.1,200); setTimeout(()=>playTone(900,0.15,'sine',0.1,100),80); }
function soundJoin() { initAudio(); playTone(500,0.1,'sine',0.08,200); setTimeout(()=>playTone(700,0.12,'sine',0.08,100),100); }
function soundLeave() { initAudio(); playTone(400,0.15,'sine',0.08,-150); }