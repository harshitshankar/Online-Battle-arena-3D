function createCharacter(color) {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd1a4 });
  const bodyMat = new THREE.MeshStandardMaterial({ color });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x222244 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7 });

  // ===== HEAD =====
  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), skinMat);
  head.add(skull);
  // Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07,8,8), eyeMat);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.07,8,8), eyeMat);
  eyeL.position.set(-0.12, 0.05, -0.27); eyeR.position.set(0.12, 0.05, -0.27);
  const pupL = new THREE.Mesh(new THREE.SphereGeometry(0.035,6,6), pupilMat);
  const pupR = new THREE.Mesh(new THREE.SphereGeometry(0.035,6,6), pupilMat);
  pupL.position.set(-0.12, 0.05, -0.33); pupR.position.set(0.12, 0.05, -0.33);
  head.add(eyeL); head.add(eyeR); head.add(pupL); head.add(pupR);
  // Mouth
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.02),
    new THREE.MeshBasicMaterial({ color: 0x442211 }));
  mouth.position.set(0, -0.12, -0.3);
  head.add(mouth);
  // Hair / helmet
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 16, 0, Math.PI*2, 0, Math.PI/2),
    new THREE.MeshStandardMaterial({ color: 0x333333 }));
  helmet.position.y = 0.05;
  head.add(helmet);
  head.position.y = 2.2;
  head.castShadow = true;
  group.add(head);

  // ===== TORSO =====
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), bodyMat);
  torso.position.y = 1.5;
  torso.castShadow = true;
  group.add(torso);
  // Vest detail
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x222222 }));
  vest.position.y = 1.45;
  group.add(vest);

  // ===== ARMS (will animate) =====
  const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
  const leftArm = new THREE.Mesh(armGeo, bodyMat);
  const rightArm = new THREE.Mesh(armGeo, bodyMat);
  leftArm.position.set(-0.45, 1.55, 0); leftArm.castShadow = true;
  rightArm.position.set(0.45, 1.55, 0); rightArm.castShadow = true;
  // Pivot at shoulder
  const leftArmPivot = new THREE.Group();
  const rightArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.45, 1.9, 0);
  rightArmPivot.position.set(0.45, 1.9, 0);
  leftArm.position.set(0, -0.35, 0);
  rightArm.position.set(0, -0.35, 0);
  leftArmPivot.add(leftArm); rightArmPivot.add(rightArm);
  // Hands
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.13,8,8), skinMat);
  const handR = new THREE.Mesh(new THREE.SphereGeometry(0.13,8,8), skinMat);
  handL.position.set(0, -0.75, 0); handR.position.set(0, -0.75, 0);
  leftArmPivot.add(handL); rightArmPivot.add(handR);
  group.add(leftArmPivot); group.add(rightArmPivot);

  // ===== GUN (in right hand) =====
  const gun = new THREE.Group();
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.7), gunMat);
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4), gunMat);
  gunBarrel.rotation.x = Math.PI/2;
  gunBarrel.position.set(0, 0, -0.5);
  const gunGrip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.12), gunMat);
  gunGrip.position.set(0, -0.18, 0.1);
  gun.add(gunBody); gun.add(gunBarrel); gun.add(gunGrip);
  gun.position.set(0, -0.7, -0.35);
  rightArmPivot.add(gun);

  // ===== LEGS (will animate) =====
  const legGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
  const leftLegPivot = new THREE.Group();
  const rightLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.2, 1.0, 0);
  rightLegPivot.position.set(0.2, 1.0, 0);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.y = -0.4; rightLeg.position.y = -0.4;
  leftLeg.castShadow = true; rightLeg.castShadow = true;
  leftLegPivot.add(leftLeg); rightLegPivot.add(rightLeg);
  // Boots
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.35), bootMat);
  const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.35), bootMat);
  bootL.position.set(0, -0.85, -0.05); bootR.position.set(0, -0.85, -0.05);
  leftLegPivot.add(bootL); rightLegPivot.add(bootR);
  group.add(leftLegPivot); group.add(rightLegPivot);

  // Store animation refs
  group.userData = {
    head, leftArmPivot, rightArmPivot, leftLegPivot, rightLegPivot,
    walkPhase: 0,
    isMoving: false
  };

  // Animate function
  group.animate = function(delta, moving) {
    const ud = this.userData;
    ud.isMoving = moving;
    if (moving) {
      ud.walkPhase += delta * 8;
      const swing = Math.sin(ud.walkPhase) * 0.6;
      ud.leftLegPivot.rotation.x = swing;
      ud.rightLegPivot.rotation.x = -swing;
      ud.leftArmPivot.rotation.x = -swing * 0.7;
      // right arm holds gun mostly forward
      ud.rightArmPivot.rotation.x = -Math.PI/4 + swing * 0.2;
    } else {
      // idle: slowly return to neutral
      ud.leftLegPivot.rotation.x *= 0.85;
      ud.rightLegPivot.rotation.x *= 0.85;
      ud.leftArmPivot.rotation.x *= 0.85;
      ud.rightArmPivot.rotation.x = -Math.PI/4;
    }
  };

  return group;
}

// First-person arms (visible to local player)
function createFPArms(color) {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd1a4 });
  const bodyMat = new THREE.MeshStandardMaterial({ color });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7 });

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.5), bodyMat);
  arm.position.set(0.3, -0.3, -0.4);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8), skinMat);
  hand.position.set(0.3, -0.35, -0.7);

  const gun = new THREE.Group();
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.6), gunMat);
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3), gunMat);
  gunBarrel.rotation.x = Math.PI/2;
  gunBarrel.position.set(0, 0, -0.45);
  gun.add(gunBody); gun.add(gunBarrel);
  gun.position.set(0.3, -0.4, -0.9);

  group.add(arm); group.add(hand); group.add(gun);
  return group;
}