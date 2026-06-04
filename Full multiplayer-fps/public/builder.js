const BUILDER_PIECES = [
  { name: 'Wall', icon: '🧱', width: 8, height: 6, depth: 1, color: 0xccbbaa },
  { name: 'Tower', icon: '🗼', width: 4, height: 15, depth: 4, color: 0x888888 },
  { name: 'House', icon: '🏠', width: 10, height: 8, depth: 10, color: 0xddccaa },
  { name: 'Crate', icon: '📦', width: 2, height: 2, depth: 2, color: 0x8b5a2b },
  { name: 'Barrier', icon: '🚧', width: 5, height: 1.5, depth: 1, color: 0xff8800 },
  { name: 'Pillar', icon: '🏛️', width: 1.5, height: 10, depth: 1.5, color: 0xaaaaaa },
  { name: 'Platform', icon: '⬜', width: 8, height: 0.5, depth: 8, color: 0x666666 },
  { name: 'Bunker', icon: '🏗️', width: 12, height: 4, depth: 8, color: 0x556655 },
  { name: 'Container', icon: '🚛', width: 6, height: 3, depth: 2.5, color: 0xcc3333 },
  { name: 'Ramp', icon: '📐', width: 6, height: 3, depth: 4, color: 0x777777 },
  { name: 'Fence', icon: '🚪', width: 10, height: 3, depth: 0.3, color: 0x554433 },
  { name: 'Rock', icon: '🪨', width: 3, height: 2.5, depth: 3, color: 0x665544 }
];

let builderMode = false;
let selectedPiece = 0;
let placedObjects = [];
let previewMesh = null;
let builderRotation = 0;
let mapWallCount = 0;

function initBuilder() {
  const grid = document.getElementById('pieceGrid');
  if (!grid) return;
  grid.innerHTML = '';
  BUILDER_PIECES.forEach((piece, i) => {
    const btn = document.createElement('button');
    btn.className = 'piece-btn';
    btn.innerHTML = piece.icon + '<br>' + piece.name;
    btn.onclick = () => {
      document.querySelectorAll('.piece-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedPiece = i;
      updatePreview();
    };
    if (i === 0) btn.classList.add('selected');
    grid.appendChild(btn);
  });
}

function toggleBuilder() {
  builderMode = !builderMode;
  const panel = document.getElementById('builderPanel');
  const placeBtn = document.getElementById('btnPlace');
  if (!panel) return;

  if (builderMode) {
    panel.style.display = 'block';
    document.exitPointerLock();
    createPreview();
    // Show PLACE button on mobile
    if (placeBtn && isMobile) placeBtn.style.display = 'block';
  } else {
    panel.style.display = 'none';
    removePreview();
    if (placeBtn) placeBtn.style.display = 'none';
    if (!isMobile) document.body.requestPointerLock();
  }
}
function createPreview() {
  removePreview();
  const piece = BUILDER_PIECES[selectedPiece];
  const geo = new THREE.BoxGeometry(piece.width, piece.height, piece.depth);
  const mat = new THREE.MeshStandardMaterial({
    color: piece.color,
    transparent: true,
    opacity: 0.5
  });
  previewMesh = new THREE.Mesh(geo, mat);
  previewMesh.rotation.y = builderRotation;
  scene.add(previewMesh);
}

function updatePreview() {
  if (!builderMode) return;
  createPreview();
}

function removePreview() {
  if (previewMesh) {
    scene.remove(previewMesh);
    previewMesh = null;
  }
}

function movePreview() {
  if (!previewMesh || !builderMode) return;
  const piece = BUILDER_PIECES[selectedPiece];
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const pos = camera.position.clone().add(dir.multiplyScalar(12));
  pos.x = Math.round(pos.x / 2) * 2;
  pos.z = Math.round(pos.z / 2) * 2;
  pos.y = piece.height / 2;
  previewMesh.position.copy(pos);
  previewMesh.rotation.y = builderRotation;
}

function placePiece() {
  if (!builderMode || !previewMesh) return;
  const obj = {
    type: selectedPiece,
    x: previewMesh.position.x,
    y: previewMesh.position.y,
    z: previewMesh.position.z,
    rotY: builderRotation
  };
  addBuilderObject(obj);
  socket.emit('builderPlace', obj);
  initAudio();
  playTone(400, 0.1, 'sine', 0.08);
  setTimeout(() => playTone(600, 0.1, 'sine', 0.08), 80);
}

function addBuilderObject(obj) {
  const piece = BUILDER_PIECES[obj.type];
  if (!piece) return;
  const geo = new THREE.BoxGeometry(piece.width, piece.height, piece.depth);
  const mat = new THREE.MeshStandardMaterial({ color: piece.color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(obj.x, obj.y, obj.z);
  mesh.rotation.y = obj.rotY || 0;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  walls.push(new THREE.Box3().setFromObject(mesh));
  placedObjects.push({ ...obj, mesh });
}

function undoLastPiece() {
  if (placedObjects.length === 0) return;
  const last = placedObjects.pop();
  if (last.mesh) scene.remove(last.mesh);
  rebuildCustomWalls();
  socket.emit('builderUndo');
  initAudio();
  playTone(200, 0.1, 'sawtooth', 0.06);
}

function rebuildCustomWalls() {
  walls = walls.slice(0, mapWallCount);
  placedObjects.forEach(obj => {
    if (obj.mesh) {
      walls.push(new THREE.Box3().setFromObject(obj.mesh));
    }
  });
}

function clearAllCustom() {
  placedObjects.forEach(obj => {
    if (obj.mesh) scene.remove(obj.mesh);
  });
  placedObjects = [];
  rebuildCustomWalls();
  socket.emit('builderClear');
}

function rotatePreview() {
  builderRotation += Math.PI / 4;
  if (builderRotation >= Math.PI * 2) builderRotation = 0;
  if (previewMesh) previewMesh.rotation.y = builderRotation;
}

function saveMapWallCount() {
  mapWallCount = walls.length;
}