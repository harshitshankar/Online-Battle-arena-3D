// Auto-detect: use online server if installed as APK, local for development
const SERVER_URL = window.location.protocol === 'file:'
  ? 'https://online-battle-arena-3d.onrender.com'
  : window.location.origin;
const socket = io(SERVER_URL);
let scene, camera, renderer, myId, myRoom;
const players = {};
const bullets = [];
const keys = {};
let velocity = new THREE.Vector3();
let canJump = false;
let yaw = 0, pitch = 0;
let myHealth = 150;
let myArmor = 0;
let myAmmo = 30;
let myReserve = 90;
const pickups = [];
let walls = [];
let mapObjects = [];
let selectedMap = 'desert';
let lastTime = 0;
let myMoving = false;
let vKeyPressed = false;
let isMapLocked = false;

document.getElementById('randomRoomBtn').onclick = () => {
  document.getElementById('roomInput').value = 'ROOM' + Math.floor(1000 + Math.random() * 9000);
};

document.querySelectorAll('#menu .map-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('#menu .map-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedMap = card.dataset.map;
  });
});
document.querySelector('#menu .map-card[data-map="desert"]').classList.add('selected');

document.getElementById('joinBtn').onclick = async () => {
  const name = document.getElementById('nameInput').value || 'Player';
  const color = document.getElementById('colorInput').value;
  const room = document.getElementById('roomInput').value.trim();
  const wantVoice = document.getElementById('voiceEnabled').checked;
  if (!room) { alert('Please enter a Room Code!'); return; }
  initAudio();
  document.getElementById('menu').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  initGame();
  socket.emit('joinRoom', { name, color, room, map: selectedMap });
  setupVoiceSockets();
  if (wantVoice) await startVoice();
  if (!detectMobile()) document.body.requestPointerLock();
};

document.querySelectorAll('#mapMenu .map-card').forEach(card => {
  card.addEventListener('click', () => {
    if (isMapLocked) {
      showNotification({ type: 'leave', msg: '🔒 Map is locked during game!' });
      return;
    }
    socket.emit('changeMap', card.dataset.map);
    document.getElementById('mapMenu').style.display = 'none';
    if (!isMobile) document.body.requestPointerLock();
  });
});
document.getElementById('closeMapMenu').onclick = () => {
  document.getElementById('mapMenu').style.display = 'none';
  if (!isMobile) document.body.requestPointerLock();
};

function initGame() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 0);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  loadMap(selectedMap);

  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'KeyM') {
      if (isMapLocked) {
        showNotification({ type: 'leave', msg: '🔒 Map locked during game!' });
        return;
      }
      document.getElementById('mapMenu').style.display = 'flex';
      document.exitPointerLock();
    }
    if (e.code === 'KeyV') {
      if (!vKeyPressed) { vKeyPressed = true; toggleVoice(); }
    }
    if (e.code === 'KeyR') reload();
    if (e.code === 'KeyU') unstuck();
    if (e.code === 'KeyH') toggleHelp();
    if (e.code === 'KeyB') toggleBuilder();
    if (e.code === 'KeyQ' && builderMode) rotatePreview();
    if (e.code === 'KeyZ' && builderMode) undoLastPiece();
    if (e.code === 'KeyX' && builderMode) clearAllCustom();
  });
  document.addEventListener('keyup', e => {
    keys[e.code] = false;
    if (e.code === 'KeyV') vKeyPressed = false;
  });

  document.addEventListener('click', (e) => {
    if (isMobile) return;
    if (e.target.closest('#controlsPanel') || e.target.closest('#mapMenu') ||
        e.target.closest('#builderPanel') || e.target.closest('#leaveDialog') ||
        e.target.id === 'helpBtn' || e.target.id === 'micStatus' ||
        e.target.id === 'buildBtn' || e.target.id === 'leaveBtn') return;
    if (builderMode) {
      placePiece();
      return;
    }
    if (document.pointerLockElement) shoot();
    else if (
      document.getElementById('mapMenu').style.display === 'none' &&
      document.getElementById('controlsPanel').style.display !== 'block' &&
      document.getElementById('leaveDialog').style.display !== 'block' &&
      !builderMode
    ) document.body.requestPointerLock();
  });
  document.addEventListener('mousemove', e => {
    if (document.pointerLockElement) {
      yaw -= e.movementX * 0.002;
      pitch -= e.movementY * 0.002;
      pitch = Math.max(-Math.PI/2+0.1, Math.min(Math.PI/2-0.1, pitch));
    }
  });
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  setupControlsAutoDetect();
  setupMobileControls();
  initBuilder();

  if (selectedMap === 'custom') {
    const bb = document.getElementById('buildBtn');
    if (bb) bb.style.display = 'block';
  }

  const helpBtn = document.getElementById('helpBtn');
  const closeHelp = document.getElementById('closeHelp');
  if (helpBtn) helpBtn.onclick = toggleHelp;
  if (closeHelp) closeHelp.onclick = toggleHelp;

  const buildBtn = document.getElementById('buildBtn');
  if (buildBtn) {
    buildBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleBuilder(); });
    buildBtn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); toggleBuilder(); }, { passive: false });
  }

  const micBadge = document.getElementById('micStatus');
  if (micBadge) {
    micBadge.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); toggleVoice(); });
    micBadge.addEventListener('touchstart', function(e) { e.preventDefault(); e.stopPropagation(); toggleVoice(); }, { passive: false });
  }

  // Leave game button
  const leaveBtn = document.getElementById('leaveBtn');
  const confirmLeave = document.getElementById('confirmLeave');
  const cancelLeave = document.getElementById('cancelLeave');
  const leaveDialog = document.getElementById('leaveDialog');

  function showLeaveDialog() {
    if (leaveDialog) leaveDialog.style.display = 'block';
    document.exitPointerLock();
  }

  function hideLeaveDialog() {
    if (leaveDialog) leaveDialog.style.display = 'none';
    if (!isMobile && document.getElementById('game').style.display !== 'none') {
      document.body.requestPointerLock();
    }
  }

  if (leaveBtn) {
    leaveBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showLeaveDialog(); });
    leaveBtn.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); showLeaveDialog(); }, { passive: false });
  }
  if (cancelLeave) {
    cancelLeave.addEventListener('click', hideLeaveDialog);
    cancelLeave.addEventListener('touchstart', (e) => { e.preventDefault(); hideLeaveDialog(); }, { passive: false });
  }
  if (confirmLeave) {
    confirmLeave.addEventListener('click', leaveGame);
    confirmLeave.addEventListener('touchstart', (e) => { e.preventDefault(); leaveGame(); }, { passive: false });
  }

  animate();
}

function leaveGame() {
  if (voiceEnabled) stopVoice();
  socket.disconnect();

  document.getElementById('game').style.display = 'none';
  document.getElementById('leaveDialog').style.display = 'none';
  document.getElementById('mapMenu').style.display = 'none';
  document.getElementById('controlsPanel').style.display = 'none';
  if (document.getElementById('builderPanel')) document.getElementById('builderPanel').style.display = 'none';
  if (document.getElementById('mobileControls')) document.getElementById('mobileControls').style.display = 'none';
  document.getElementById('deathScreen').style.display = 'none';
  document.getElementById('menu').style.display = 'flex';

  if (document.pointerLockElement) document.exitPointerLock();

  setTimeout(() => {
    window.location.reload();
  }, 300);
}

function loadMap(mapName) {
  const map = MAPS[mapName];
  if (!map) {
    console.error('Map not found:', mapName);
    return;
  }
  mapObjects.forEach(o => scene.remove(o));
  mapObjects = []; walls = [];
  placedObjects.forEach(obj => { if (obj.mesh) scene.remove(obj.mesh); });
  placedObjects = [];
  scene.children.filter(c => c.isLight).forEach(l => scene.remove(l));

  scene.background = new THREE.Color(map.sky);
  scene.fog = new THREE.Fog(map.fog, 30, 180);

  const ambient = new THREE.AmbientLight(map.ambientColor || 0xffffff, 0.7);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(map.sunColor || 0xffffff, 1.0);
  sun.position.set(50, 100, 50);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -100;
  sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100;
  sun.shadow.camera.bottom = -100;
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(map.sky || 0xffffff, map.ground || 0x444444, 0.4);
  scene.add(hemi);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: map.ground })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  mapObjects.push(ground);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
  [[0, 100, 200, 2], [0, -100, 200, 2], [100, 0, 2, 200], [-100, 0, 2, 200]].forEach(([x, z, w, d]) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 8, d), wallMat);
    wall.position.set(x, 4, z);
    scene.add(wall);
    mapObjects.push(wall);
    walls.push(new THREE.Box3().setFromObject(wall));
  });

  const before = scene.children.length;
  try {
    map.build(scene, walls);
  } catch (err) {
    console.error('Error building map:', err);
  }
  for (let i = before; i < scene.children.length; i++) {
    mapObjects.push(scene.children[i]);
  }

  document.getElementById('mapName').textContent = map.name;

  for (const id in players) scene.add(players[id].mesh);

  saveMapWallCount();

  const bb = document.getElementById('buildBtn');
  if (bb) bb.style.display = (mapName === 'custom') ? 'block' : 'none';
}

function loadPickups(pickupData) {
  pickups.forEach(p => { if (p.mesh) scene.remove(p.mesh); });
  pickups.length = 0;
  pickupData.forEach(pk => {
    const colors = { health: 0xff3333, armor: 0x3388ff, ammo: 0xffcc00 };
    const labels = { health: '+ HEALTH', armor: '+ ARMOR', ammo: '+ AMMO' };
    const group = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.8, 0.8),
      new THREE.MeshStandardMaterial({ color: colors[pk.type], emissive: colors[pk.type], emissiveIntensity: 0.4 })
    );
    group.add(box);
    const light = new THREE.PointLight(colors[pk.type], 1, 6);
    light.position.y = 0.5;
    group.add(light);
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#' + colors[pk.type].toString(16).padStart(6, '0');
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 5;
    ctx.strokeText(labels[pk.type], 128, 44);
    ctx.fillText(labels[pk.type], 128, 44);
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
    sprite.scale.set(2, 0.5, 1);
    sprite.position.y = 1.5;
    group.add(sprite);
    group.position.set(pk.x, pk.y, pk.z);
    group.userData.type = pk.type;
    group.visible = pk.active;
    scene.add(group);
    pickups.push({ ...pk, mesh: group });
  });
}

function checkPickups() {
  for (const pk of pickups) {
    if (!pk.active || !pk.mesh.visible) continue;
    if (Math.hypot(camera.position.x - pk.x, camera.position.z - pk.z) < 2) {
      socket.emit('pickupGrab', pk.id);
    }
  }
}

socket.on('init', (data) => {
  const me = data.players[data.id];

document.getElementById('kills').textContent =
  me.kills || 0;

document.getElementById('deaths').textContent =
  me.deaths || 0;
  myId = data.id; myRoom = data.room;
  document.getElementById('roomDisplay').textContent = '🏠 Room: ' + data.room;
  if (data.map) loadMap(data.map);
  if (data.pickups) loadPickups(data.pickups);
  if (data.customObjects) {
    data.customObjects.forEach(obj => addBuilderObject(obj));
  }
  if (data.mapLocked) { isMapLocked = true; }
  for (const id in data.players) {
    if (id !== myId) addPlayer(data.players[id]);
    else {
      const p = data.players[id];
      camera.position.set(p.x, p.y, p.z);
      myHealth = p.health; myArmor = p.armor; myAmmo = p.ammo; myReserve = p.reserveAmmo;
      updateHealthUI(); updateAmmoUI();
    }
  }
  updateScoreboard();
});

socket.on('mapChanged', (data) => {
  loadMap(data.map);
  if (data.pickups) loadPickups(data.pickups);
});

socket.on('mapLockStatus', (locked) => {
  isMapLocked = locked;
  if (locked) {
    const el = document.getElementById('mapLocked');
    if (el) {
      el.style.display = 'block';
      el.style.animation = 'none';
      el.offsetHeight;
      el.style.animation = 'fadeOut 3s forwards';
    }
    showNotification({ type: 'join', msg: '🔒 Map locked!' });
  } else {
    showNotification({ type: 'join', msg: '🔓 Map unlocked!' });
  }
});

socket.on('builderPlaced', (obj) => addBuilderObject(obj));
socket.on('builderUndone', () => {
  if (placedObjects.length > 0) {
    const last = placedObjects.pop();
    if (last.mesh) scene.remove(last.mesh);
    rebuildCustomWalls();
  }
});
socket.on('builderCleared', () => {
  placedObjects.forEach(obj => { if (obj.mesh) scene.remove(obj.mesh); });
  placedObjects = [];
  rebuildCustomWalls();
});

socket.on('playerJoined', (p) => {
  addPlayer(p); updateScoreboard(); soundJoin();
  if (voiceEnabled) callPeer(p.id);
});
socket.on('playerLeft', (id) => {
  if (players[id]) { scene.remove(players[id].mesh); delete players[id]; }
  removePeer(id); updateScoreboard(); soundLeave();
});
socket.on('playerMoved', (d) => {
  if (players[d.id]) {
    players[d.id].mesh.position.set(d.x, d.y - 2, d.z);
    players[d.id].mesh.rotation.y = d.rotY;
    players[d.id].moving = d.moving;
  }
});
socket.on('statsUpdate', (d) => {
  if (d.id === myId) { myHealth = d.health; myArmor = d.armor; updateHealthUI(); soundHit(); flashRed(); }
});
socket.on('ammoUpdate', (d) => { myAmmo = d.ammo; myReserve = d.reserve; updateAmmoUI(); });
socket.on('pickupTaken', (d) => {
  const pk = pickups.find(p => p.id === d.id);
  if (pk && pk.mesh) { pk.mesh.visible = false; pk.active = false; }
});
socket.on('pickupRespawn', (pickup) => {
  const pk = pickups.find(p => p.id === pickup.id);
  if (pk && pk.mesh) { pk.mesh.visible = true; pk.active = true; }
});
/*socket.on('playerKilled', (d) => {
  if (d.targetId === myId) {
    myHealth = 150; myArmor = 0; myAmmo = 30; myReserve = 90;
    camera.position.set(d.newPos.x, d.newPos.y, d.newPos.z);
    updateHealthUI(); updateAmmoUI(); showDeath(); soundDeath();
  } else if (players[d.targetId]) {
    players[d.targetId].mesh.position.set(d.newPos.x, d.newPos.y - 2, d.newPos.z);
  }
  if (d.killerId === myId) soundKill();
}); */
socket.on('playerKilled', (d) => {

  // Update my kill count
  if (d.killerId === myId) {
    document.getElementById('kills').textContent =
      d.killerKills;

    soundKill();
  }

  // Update my death count
  if (d.targetId === myId) {
    document.getElementById('deaths').textContent =
      d.victimDeaths;

    myHealth = 150;
    myArmor = 0;
    myAmmo = 30;
    myReserve = 90;

    camera.position.set(
      d.newPos.x,
      d.newPos.y,
      d.newPos.z
    );

    updateHealthUI();
    updateAmmoUI();

    showDeath();
    soundDeath();
  }

  // Move respawned player
  if (players[d.targetId]) {
    players[d.targetId].mesh.position.set(
      d.newPos.x,
      d.newPos.y - 2,
      d.newPos.z
    );
  }
});
socket.on('notification', showNotification);
socket.on('bulletFired', (d) => spawnBullet(d.origin, d.dir, d.id));

function addPlayer(p) {
  const mesh = createCharacter(p.color);
  mesh.position.set(p.x, p.y - 2, p.z);
  scene.add(mesh);
  players[p.id] = { ...p, mesh, moving: false };
}

function shoot() {
  if (myAmmo <= 0) { initAudio(); playTone(150, 0.08, 'square', 0.05); return; }
  soundShoot(); myAmmo--; updateAmmoUI();
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const origin = camera.position.clone();
  spawnBullet(origin, dir, myId);
  socket.emit('shoot', { origin: origin.toArray(), dir: dir.toArray() });
  const ray = new THREE.Raycaster(origin, dir, 0, 100);
  for (const id in players) {
    const hit = ray.intersectObject(players[id].mesh, true);
    if (hit.length > 0) {
      const headshot = (hit[0].point.y - players[id].mesh.position.y) > 2.0;
      socket.emit('hit', { targetId: id, headshot });
      break;
    }
  }
}

function reload() {
  if (myAmmo < 30 && myReserve > 0) {
    socket.emit('reload'); initAudio();
    playTone(200, 0.1, 'square', 0.06);
    setTimeout(() => playTone(300, 0.1, 'square', 0.06), 200);
  }
}

function unstuck() {
  camera.position.set((Math.random() - 0.5) * 10, 5, (Math.random() - 0.5) * 10);
  velocity.y = 0;
  showNotification({ type: 'join', msg: '✨ Unstuck!' });
}

function toggleHelp() {
  const panel = document.getElementById('controlsPanel');
  if (!panel) return;
  if (panel.style.display === 'block') {
    panel.style.display = 'none';
    if (!isMobile) document.body.requestPointerLock();
  } else {
    panel.style.display = 'block';
    document.exitPointerLock();
  }
}

function spawnBullet(origin, dir) {
  const o = Array.isArray(origin) ? new THREE.Vector3(...origin) : origin;
  const d = Array.isArray(dir) ? new THREE.Vector3(...dir) : dir;
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
  b.position.copy(o); scene.add(b);
  bullets.push({ mesh: b, dir: d.normalize(), life: 60 });
}

function checkCollision(pos) {
  const box = new THREE.Box3(
    new THREE.Vector3(pos.x - 0.4, pos.y - 2, pos.z - 0.4),
    new THREE.Vector3(pos.x + 0.4, pos.y, pos.z + 0.4)
  );
  return walls.some(w => w.intersectsBox(box));
}

function animate(time = 0) {
  requestAnimationFrame(animate);
  const delta = Math.min(0.1, (time - lastTime) / 1000);
  lastTime = time;
  const speed = 0.15;
  let mx = 0, my = 0;
  if (keys['KeyW']) my -= 1; if (keys['KeyS']) my += 1;
  if (keys['KeyA']) mx -= 1; if (keys['KeyD']) mx += 1;
  if (touchState.move.active) { mx = touchState.move.x; my = touchState.move.y; }
  if (touchState.look.x || touchState.look.y) {
    yaw -= touchState.look.x * 0.005;
    pitch -= touchState.look.y * 0.005;
    pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
    touchState.look.x = 0; touchState.look.y = 0;
  }
  const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const move = new THREE.Vector3();
  move.addScaledVector(fwd, -my); move.addScaledVector(right, mx);
  if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);
  myMoving = move.lengthSq() > 0.001;
  velocity.y -= 0.01;
  if ((keys['Space'] || touchState.jump) && canJump) { velocity.y = 0.2; canJump = false; }
  const newPos = camera.position.clone().add(move);
  if (!checkCollision(newPos)) { camera.position.x = newPos.x; camera.position.z = newPos.z; }
  else { if (checkCollision(camera.position)) { camera.position.y += 0.5; velocity.y = 0; } }
  camera.position.y += velocity.y;
  if (camera.position.y < 2) { camera.position.y = 2; velocity.y = 0; canJump = true; }
  camera.rotation.order = 'YXZ'; camera.rotation.y = yaw; camera.rotation.x = pitch;

  if (builderMode) movePreview();

  pickups.forEach(pk => {
    if (pk.mesh && pk.mesh.visible) {
      pk.mesh.rotation.y += delta * 2;
      pk.mesh.position.y = pk.y + Math.sin(time * 0.003) * 0.3;
    }
  });
  checkPickups();
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].mesh.position.add(bullets[i].dir.clone().multiplyScalar(1.5));
    bullets[i].life--;
    if (bullets[i].life <= 0) { scene.remove(bullets[i].mesh); bullets.splice(i, 1); }
  }
  for (const id in players) {
    if (players[id].mesh && players[id].mesh.animate) players[id].mesh.animate(delta, players[id].moving);
  }
  socket.emit('move', { x: camera.position.x, y: camera.position.y, z: camera.position.z, rotY: yaw, moving: myMoving });
  renderer.render(scene, camera);
}

function updateHealthUI() {
  document.getElementById('healthFill').style.width = (Math.max(0, myHealth) / 150 * 100) + '%';
  document.getElementById('healthText').textContent = Math.round(Math.max(0, myHealth));
  document.getElementById('armorFill').style.width = (Math.max(0, myArmor) / 100 * 100) + '%';
  document.getElementById('armorText').textContent = Math.round(Math.max(0, myArmor));
}
function updateAmmoUI() {
  document.getElementById('ammoText').textContent = myAmmo;
  document.getElementById('reserveText').textContent = myReserve;

  // Show "Please reload" popup when ammo is 0
  const reloadPrompt = document.getElementById('reloadPrompt');
  if (reloadPrompt) {
    if (myAmmo <= 0 && myReserve > 0) {
      reloadPrompt.style.display = 'block';
    } else {
      reloadPrompt.style.display = 'none';
    }
  }
}
function showNotification(n) {
  const div = document.createElement('div'); div.className = 'notif ' + n.type;
  div.textContent = n.msg; document.getElementById('notifications').appendChild(div);
  setTimeout(() => div.remove(), 4000);
}
function showDeath() {
  const ds = document.getElementById('deathScreen'); ds.style.display = 'flex';
  setTimeout(() => ds.style.display = 'none', 1500);
}
function flashRed() {
  const flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;inset:0;background:rgba(255,0,0,0.3);z-index:40;pointer-events:none;';
  document.body.appendChild(flash); setTimeout(() => flash.remove(), 150);
}
function updateScoreboard() {
  const list = document.getElementById('playerList'); list.innerHTML = '';
  for (const id in players) {
    const li = document.createElement('li');
    li.textContent = players[id].name + (id === myId ? ' (You)' : '');
    list.appendChild(li);
  }
}
