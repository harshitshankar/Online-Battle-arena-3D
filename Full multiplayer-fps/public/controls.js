const touchState = {
  move: { x: 0, y: 0, active: false },
  look: { x: 0, y: 0, active: false, lastX: 0, lastY: 0, touchId: null },
  shoot: false,
  jump: false
};

let isMobile = false;
let lastInputType = 'unknown';

function detectMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window && window.innerWidth < 1024);
}

function showMobileControls() {
  document.getElementById('mobileControls').style.display = 'block';
  isMobile = true;
}
function hideMobileControls() {
  document.getElementById('mobileControls').style.display = 'none';
  isMobile = false;
}

function setupControlsAutoDetect() {
  if (detectMobile()) showMobileControls();

  window.addEventListener('keydown', () => {
    if (lastInputType !== 'keyboard') {
      lastInputType = 'keyboard';
      hideMobileControls();
    }
  });
  window.addEventListener('mousemove', (e) => {
    if (e.movementX || e.movementY) {
      if (lastInputType !== 'mouse') {
        lastInputType = 'mouse';
        hideMobileControls();
      }
    }
  });
  window.addEventListener('touchstart', () => {
    if (lastInputType !== 'touch') {
      lastInputType = 'touch';
      showMobileControls();
    }
  }, { passive: true });
}

function setupMobileControls() {
  const joystick = document.getElementById('joystick');
  const knob = document.getElementById('joystickKnob');
  const lookArea = document.getElementById('lookArea');

  const btnShoot = document.getElementById('btnShoot');
  const btnJump = document.getElementById('btnJump');
  const btnMap = document.getElementById('btnMap');
  const btnMic = document.getElementById('btnMic');

  let joyTouchId = null;
  let lookTouchId = null;

  const joyRadius = 52;

  function updateJoystick(touch) {
    const rect = joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const distance = Math.hypot(dx, dy);
    const limited = Math.min(distance, joyRadius);
    if (distance > 0) {
      dx = (dx / distance) * limited;
      dy = (dy / distance) * limited;
    }
    knob.style.transform =
      `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    touchState.move.x = dx / joyRadius;
    touchState.move.y = dy / joyRadius;
    touchState.move.active = true;
  }

  function resetJoystick() {
    joyTouchId = null;
    touchState.move.x = 0;
    touchState.move.y = 0;
    touchState.move.active = false;
    knob.style.transform = 'translate(-50%, -50%)';
  }

  joystick.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (joyTouchId !== null) return;
    const touch = e.changedTouches[0];
    joyTouchId = touch.identifier;
    updateJoystick(touch);
  }, { passive: false });

  lookArea.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (lookTouchId !== null) return;
    const touch = e.changedTouches[0];
    lookTouchId = touch.identifier;
    touchState.look.active = true;
    touchState.look.lastX = touch.clientX;
    touchState.look.lastY = touch.clientY;
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    let handled = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joyTouchId) {
        updateJoystick(touch);
        handled = true;
      }
      if (touch.identifier === lookTouchId) {
        const dx = touch.clientX - touchState.look.lastX;
        const dy = touch.clientY - touchState.look.lastY;
        touchState.look.x += dx;
        touchState.look.y += dy;
        touchState.look.lastX = touch.clientX;
        touchState.look.lastY = touch.clientY;
        handled = true;
      }
    }
    if (handled) e.preventDefault();
  }, { passive: false });

  function endTouch(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joyTouchId) resetJoystick();
      if (touch.identifier === lookTouchId) {
        lookTouchId = null;
        touchState.look.active = false;
        touchState.look.x = 0;
        touchState.look.y = 0;
      }
    }
  }

  document.addEventListener('touchend', endTouch, { passive: false });
  document.addEventListener('touchcancel', endTouch, { passive: false });

  btnShoot.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof shoot === 'function') shoot();
  }, { passive: false });

  btnJump.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    touchState.jump = true;
    setTimeout(() => touchState.jump = false, 120);
  }, { passive: false });

  btnMap.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('mapMenu').style.display = 'flex';
  }, { passive: false });

  const btnReload = document.getElementById('btnReload');
  if (btnReload) {
    btnReload.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof reload === 'function') reload();
    }, { passive: false });
  }

  const btnUnstuck = document.getElementById('btnUnstuck');
  if (btnUnstuck) {
    btnUnstuck.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof unstuck === 'function') unstuck();
    }, { passive: false });
  }
  // Build button (mobile)
  const btnBuild = document.getElementById('btnBuild');
  if (btnBuild) {
    btnBuild.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof toggleBuilder === 'function') toggleBuilder();
    }, { passive: false });
    btnBuild.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof toggleBuilder === 'function') toggleBuilder();
    });
  }

  // PLACE button (mobile builder)
  const btnPlace = document.getElementById('btnPlace');
  if (btnPlace) {
    btnPlace.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof placePiece === 'function') placePiece();
    }, { passive: false });
    btnPlace.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof placePiece === 'function') placePiece();
    });
  }
   btnMic.addEventListener('touchstart', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleVoice();
  }, { passive: false });

  btnMic.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleVoice();
  });

  // Help button (mobile support)
  const helpBtn = document.getElementById('helpBtn');
  if (helpBtn) {
    helpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof toggleHelp === 'function') toggleHelp();
    }, { passive: false });
    helpBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof toggleHelp === 'function') toggleHelp();
    });
  }

  const closeHelp = document.getElementById('closeHelp');
  if (closeHelp) {
    closeHelp.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof toggleHelp === 'function') toggleHelp();
    }, { passive: false });
    closeHelp.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof toggleHelp === 'function') toggleHelp();
    });
  }
}