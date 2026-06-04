const MAPS = {
  desert: {
    name: '🏜️ Desert Storm',
    sky: 0xf4d3a3,
    fog: 0xe8c39e,
    ground: 0xd4a373,
    ambientColor: 0xffd9b3,
    sunColor: 0xfff4e0,
    build: (scene, walls) => {
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xeee0c8 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b6f47 });
      const crateMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
      const positions = [
        [-25,-25,12,15,12],[25,-25,14,18,14],[-25,25,15,10,15],[25,25,12,14,12],
        [0,-40,20,12,10],[0,40,18,15,12],[-45,0,12,16,18],[45,0,14,18,15],
        [-15,-10,8,8,8],[15,10,10,10,10],[-30,15,8,12,8],[30,-15,10,8,10],
        [-10,30,8,9,12],[10,-30,12,10,8]
      ];
      positions.forEach(([x,z,w,h,d]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);
        b.position.set(x,h/2,z); b.castShadow=true; b.receiveShadow=true;
        scene.add(b); walls.push(new THREE.Box3().setFromObject(b));
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w+0.5,0.5,d+0.5), roofMat);
        roof.position.set(x,h+0.25,z); scene.add(roof);
      });
      for (let i=0;i<30;i++) {
        const s = 1.5+Math.random()*1.2;
        const c = new THREE.Mesh(new THREE.BoxGeometry(s,s,s), crateMat);
        c.position.set((Math.random()-0.5)*80,s/2,(Math.random()-0.5)*80);
        c.castShadow=true; c.receiveShadow=true;
        scene.add(c); walls.push(new THREE.Box3().setFromObject(c));
      }
      for (let i=0;i<8;i++) {
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3,0.4,6),
          new THREE.MeshStandardMaterial({ color: 0x6b4423 })
        );
        trunk.position.set((Math.random()-0.5)*70,3,(Math.random()-0.5)*70);
        scene.add(trunk); walls.push(new THREE.Box3().setFromObject(trunk));
      }
    }
  },

  snow: {
    name: '❄️ Frozen Outpost',
    sky: 0xc8d8e8,
    fog: 0xd8e8f0,
    ground: 0xf0f8ff,
    ambientColor: 0xe0eaff,
    sunColor: 0xffffff,
    build: (scene, walls) => {
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x556677 });
      const snowRoof = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const metalMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5a, metalness:0.7 });
      const bunkers = [
        [-30,-30,16,8,16],[30,-30,18,10,18],[-30,30,16,8,16],[30,30,14,9,14],
        [0,-45,25,7,12],[0,45,22,8,14],[-50,0,12,12,20],[50,0,14,10,20],
        [-15,15,10,6,10],[15,-15,10,6,10]
      ];
      bunkers.forEach(([x,z,w,h,d]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);
        b.position.set(x,h/2,z); b.castShadow=true; b.receiveShadow=true;
        scene.add(b); walls.push(new THREE.Box3().setFromObject(b));
        const snow = new THREE.Mesh(new THREE.BoxGeometry(w+0.3,0.8,d+0.3), snowRoof);
        snow.position.set(x,h+0.4,z); snow.castShadow=true; scene.add(snow);
      });
      for (let i=0;i<20;i++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(4,2.5,2), metalMat);
        c.position.set((Math.random()-0.5)*80,1.25,(Math.random()-0.5)*80);
        c.rotation.y = Math.random()*Math.PI;
        c.castShadow=true; c.receiveShadow=true;
        scene.add(c); walls.push(new THREE.Box3().setFromObject(c));
      }
      for (let i=0;i<25;i++) {
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3,0.4,3),
          new THREE.MeshStandardMaterial({ color: 0x4a2a1a })
        );
        const px = (Math.random()-0.5)*90, pz=(Math.random()-0.5)*90;
        trunk.position.set(px,1.5,pz);
        const leaves = new THREE.Mesh(
          new THREE.ConeGeometry(2,5,8),
          new THREE.MeshStandardMaterial({ color: 0x1a4a2a })
        );
        leaves.position.set(px,5,pz); leaves.castShadow=true;
        scene.add(trunk); scene.add(leaves);
        walls.push(new THREE.Box3().setFromObject(trunk));
      }
    }
  },

  city: {
    name: '🌆 Neon City',
    sky: 0x1a0a2e,
    fog: 0x2a1a4e,
    ground: 0x1a1a2e,
    ambientColor: 0x4a3a8e,
    sunColor: 0xff66cc,
    build: (scene, walls) => {
      const colors = [0x2a2a4a, 0x3a2a4a, 0x2a3a4a, 0x4a2a3a];
      const neonColors = [0xff00ff, 0x00ffff, 0xff0066, 0x66ff00, 0xffaa00];
      const buildings = [
        [-30,-30,14,30,14],[30,-30,16,40,16],[-30,30,15,35,15],[30,30,13,28,13],
        [0,-45,22,25,12],[0,45,20,32,14],[-50,0,12,45,18],[50,0,14,38,18],
        [-15,0,8,20,8],[15,0,10,25,10],[0,15,10,22,10],[0,-15,8,18,8],
        [-40,-40,10,15,10],[40,40,10,18,10],[-40,40,8,20,8],[40,-40,12,22,12]
      ];
      buildings.forEach(([x,z,w,h,d],i) => {
        const mat = new THREE.MeshStandardMaterial({ color: colors[i%4] });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
        b.position.set(x,h/2,z); b.castShadow=true; b.receiveShadow=true;
        scene.add(b); walls.push(new THREE.Box3().setFromObject(b));
        const neon = new THREE.Mesh(
          new THREE.BoxGeometry(w,0.3,d),
          new THREE.MeshBasicMaterial({ color: neonColors[i%5] })
        );
        neon.position.set(x,h+0.15,z); scene.add(neon);
        const light = new THREE.PointLight(neonColors[i%5], 1, 30);
        light.position.set(x,h+1,z); scene.add(light);
      });
      for (let i=0;i<15;i++) {
        const c = new THREE.Mesh(
          new THREE.BoxGeometry(3,1.5,1),
          new THREE.MeshStandardMaterial({ color: 0xffaa00 })
        );
        c.position.set((Math.random()-0.5)*80,0.75,(Math.random()-0.5)*80);
        c.castShadow=true; scene.add(c);
        walls.push(new THREE.Box3().setFromObject(c));
      }
    }
  },

  forest: {
    name: '🌲 Forest Camp',
    sky: 0x88aabb,
    fog: 0x6a8a6a,
    ground: 0x3a5a2a,
    ambientColor: 0xa0c090,
    sunColor: 0xfff8e0,
    build: (scene, walls) => {
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423 });
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x8b5a3a });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
      const cabins = [
        [-30,-30,14,6,14],[30,-30,16,7,16],[-30,30,15,6,15],[30,30,12,8,12],
        [0,-40,20,7,12],[0,40,18,6,14],[-45,0,14,8,18],[45,0,12,7,18],
        [-15,15,10,5,10],[15,-15,10,6,10]
      ];
      cabins.forEach(([x,z,w,h,d]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), cabinMat);
        b.position.set(x,h/2,z); b.castShadow=true; b.receiveShadow=true;
        scene.add(b); walls.push(new THREE.Box3().setFromObject(b));
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(Math.max(w,d)*0.75,3,4),
          roofMat
        );
        roof.position.set(x,h+1.5,z); roof.rotation.y=Math.PI/4;
        scene.add(roof);
      });
      for (let i=0;i<60;i++) {
        const px = (Math.random()-0.5)*90, pz=(Math.random()-0.5)*90;
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4,0.5,4), woodMat
        );
        trunk.position.set(px,2,pz); trunk.castShadow=true;
        const leaves = new THREE.Mesh(
          new THREE.SphereGeometry(2.5,8,8),
          new THREE.MeshStandardMaterial({ color: 0x2a5a2a })
        );
        leaves.position.set(px,5,pz); leaves.castShadow=true;
        scene.add(trunk); scene.add(leaves);
        walls.push(new THREE.Box3().setFromObject(trunk));
      }
      for (let i=0;i<15;i++) {
        const log = new THREE.Mesh(
          new THREE.CylinderGeometry(0.6,0.6,3), woodMat
        );
        log.position.set((Math.random()-0.5)*80,0.6,(Math.random()-0.5)*80);
        log.rotation.z = Math.PI/2; log.rotation.y=Math.random()*Math.PI;
        log.castShadow=true; scene.add(log);
        walls.push(new THREE.Box3().setFromObject(log));
      }
    }
  },

  warehouse: {
    name: '🏭 Warehouse Wars',
    sky: 0x666677,
    fog: 0x777788,
    ground: 0x444444,
    ambientColor: 0xaaaabb,
    sunColor: 0xffeecc,
    build: (scene, walls) => {
      const metalMat = new THREE.MeshStandardMaterial({ color: 0x666677, metalness:0.6 });
      const containerMats = [
        new THREE.MeshStandardMaterial({ color: 0xcc3333 }),
        new THREE.MeshStandardMaterial({ color: 0x3366cc }),
        new THREE.MeshStandardMaterial({ color: 0x33aa66 }),
        new THREE.MeshStandardMaterial({ color: 0xddaa33 })
      ];
      const sheds = [
        [-35,-35,18,10,18],[35,-35,20,12,20],[-35,35,18,10,18],[35,35,16,11,16],
        [0,-50,30,9,12],[0,50,28,10,14]
      ];
      sheds.forEach(([x,z,w,h,d]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), metalMat);
        b.position.set(x,h/2,z); b.castShadow=true; b.receiveShadow=true;
        scene.add(b); walls.push(new THREE.Box3().setFromObject(b));
      });
      for (let i=0;i<35;i++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(6,2.8,2.5), containerMats[i%4]);
        const x = (Math.random()-0.5)*80;
        const z = (Math.random()-0.5)*80;
        const stacked = Math.random()>0.5 ? 2.8 : 0;
        c.position.set(x,1.4+stacked,z);
        c.rotation.y = Math.random()>0.5 ? Math.PI/2 : 0;
        c.castShadow=true; c.receiveShadow=true;
        scene.add(c); walls.push(new THREE.Box3().setFromObject(c));
      }
      for (let i=0;i<10;i++) {
        const pipe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.8,0.8,8),
          new THREE.MeshStandardMaterial({ color: 0x999999, metalness:0.8 })
        );
        pipe.position.set((Math.random()-0.5)*80,4,(Math.random()-0.5)*80);
        pipe.castShadow=true; scene.add(pipe);
        walls.push(new THREE.Box3().setFromObject(pipe));
      }
      for (let i=0;i<20;i++) {
        const barrel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.7,0.7,1.5),
          new THREE.MeshStandardMaterial({ color: 0xaa3333 })
        );
        barrel.position.set((Math.random()-0.5)*80,0.75,(Math.random()-0.5)*80);
        barrel.castShadow=true; scene.add(barrel);
        walls.push(new THREE.Box3().setFromObject(barrel));
      }
    }
  },

  custom: {
    name: '🎨 Custom Map',
    sky: 0x88aacc,
    fog: 0xaaccdd,
    ground: 0x6a8a5a,
    ambientColor: 0xffffff,
    sunColor: 0xffffff,
    build: (scene, walls) => {
      const mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
      const platform = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 20), mat);
      platform.position.set(0, 0.25, 0);
      platform.receiveShadow = true;
      scene.add(platform);

      const markerMat = new THREE.MeshStandardMaterial({
        color: 0xff6b35,
        emissive: 0xff6b35,
        emissiveIntensity: 0.5
      });
      [[-40,-40],[40,-40],[-40,40],[40,40]].forEach(([x,z]) => {
        const marker = new THREE.Mesh(
          new THREE.CylinderGeometry(1, 1, 3),
          markerMat
        );
        marker.position.set(x, 1.5, z);
        marker.castShadow = true;
        scene.add(marker);
      });

      // Center beacon
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 8),
        new THREE.MeshStandardMaterial({
          color: 0xffff00,
          emissive: 0xffff00,
          emissiveIntensity: 0.6
        })
      );
      beacon.position.set(0, 4, 0);
      scene.add(beacon);
    }
  }
};