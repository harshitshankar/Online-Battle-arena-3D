const peers = {};
let localStream = null;
let voiceEnabled = false;

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

async function startVoice() {
  if (voiceEnabled && localStream && localStream.active) {
    updateMicStatus(true);
    return true;
  }
  try {
    // Strong audio constraints to PREVENT echo & feedback
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        googEchoCancellation: true,
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googHighpassFilter: true,
        googTypingNoiseDetection: true,
        sampleRate: 48000,
        channelCount: 1
      },
      video: false
    });
    voiceEnabled = true;
    updateMicStatus(true);
    for (const id in players) {
      if (id !== myId) callPeer(id);
    }
    return true;
  } catch (err) {
    console.error('Mic error:', err);
    alert('Microphone access denied.');
    voiceEnabled = false;
    updateMicStatus(false);
    return false;
  }
}

function stopVoice() {
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  for (const id in peers) {
    if (peers[id].pc) peers[id].pc.close();
    if (peers[id].audio) {
      peers[id].audio.pause();
      peers[id].audio.srcObject = null;
      peers[id].audio.remove();
    }
  }
  Object.keys(peers).forEach(k => delete peers[k]);
  voiceEnabled = false;
  updateMicStatus(false);
}

async function toggleVoice() {
  const reallyOn = !!(localStream && localStream.active);
  if (reallyOn || voiceEnabled) {
    stopVoice();
  } else {
    await startVoice();
  }
}

function createPeer(targetId) {
  const pc = new RTCPeerConnection(rtcConfig);
  peers[targetId] = { pc };

  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('voice-ice', { target: targetId, candidate: e.candidate });
    }
  };

  pc.ontrack = (e) => {
    const audio = document.createElement('audio');
    audio.srcObject = e.streams[0];
    audio.autoplay = true;
    audio.playsInline = true;
    audio.muted = false;
    audio.volume = 1.0;
    audio.setAttribute('playsinline', '');
    document.body.appendChild(audio);
    peers[targetId].audio = audio;
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
      removePeer(targetId);
    }
  };

  return pc;
}

async function callPeer(targetId) {
  if (!localStream || peers[targetId]) return;
  const pc = createPeer(targetId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('voice-offer', { target: targetId, offer });
}

function removePeer(id) {
  if (peers[id]) {
    if (peers[id].pc) peers[id].pc.close();
    if (peers[id].audio) {
      peers[id].audio.pause();
      peers[id].audio.srcObject = null;
      peers[id].audio.remove();
    }
    delete peers[id];
  }
}

function updateMicStatus(on) {
  const el = document.getElementById('micStatus');
  if (el) {
    el.textContent = on ? '🎤 ON' : '🎤 OFF';
    el.style.color = on ? '#00ff88' : '#ff6666';
    el.style.borderColor = on ? '#00ff88' : '#ff6666';
    el.style.background = on ? 'rgba(0,40,20,0.9)' : 'rgba(0,0,0,0.85)';
  }
  const btn = document.getElementById('btnMic');
  if (btn) {
    if (on) btn.classList.add('active');
    else btn.classList.remove('active');
  }
}

function setupVoiceSockets() {
  socket.on('voice-offer', async (data) => {
    if (!localStream) return;
    if (peers[data.from]) {
      removePeer(data.from);
    }
    const pc = createPeer(data.from);
    await pc.setRemoteDescription(data.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('voice-answer', { target: data.from, answer });
  });
  socket.on('voice-answer', async (data) => {
    if (peers[data.from] && peers[data.from].pc.signalingState !== 'stable') {
      try {
        await peers[data.from].pc.setRemoteDescription(data.answer);
      } catch (e) {
        console.error('Voice answer error:', e);
      }
    }
  });
  socket.on('voice-ice', async (data) => {
    if (peers[data.from]) {
      try { await peers[data.from].pc.addIceCandidate(data.candidate); }
      catch(e) { console.error(e); }
    }
  });
}

// Auto-sync UI based on actual mic state every 400ms
setInterval(function() {
  var el = document.getElementById('micStatus');
  if (!el) return;
  var actuallyOn = !!(localStream && localStream.active);
  var isShownOn = el.textContent.indexOf('ON') !== -1 && el.textContent.indexOf('OFF') === -1;
  if (actuallyOn !== isShownOn) {
    updateMicStatus(actuallyOn);
  }
}, 400);

// Health check for peers — auto-reconnect if disconnected
setInterval(function() {
  if (!voiceEnabled || !localStream) return;
  for (const id in players) {
    if (id === myId) continue;
    if (!peers[id] || peers[id].pc.connectionState === 'disconnected' || peers[id].pc.connectionState === 'failed') {
      console.log('Re-calling peer:', id);
      if (peers[id]) removePeer(id);
      callPeer(id);
    }
  }
}, 5000);