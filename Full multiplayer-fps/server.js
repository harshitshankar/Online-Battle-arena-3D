const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

const SAFE_SPAWNS = [
  { x: 0, y: 3, z: 0 }, { x: 5, y: 3, z: 5 }, { x: -5, y: 3, z: -5 },
  { x: 10, y: 3, z: -8 }, { x: -10, y: 3, z: 8 }, { x: 8, y: 3, z: 50 },
  { x: -8, y: 3, z: -50 }, { x: 50, y: 3, z: 8 }, { x: -50, y: 3, z: -8 },
  { x: 60, y: 3, z: 60 }, { x: -60, y: 3, z: 60 }, { x: 60, y: 3, z: -60 },
  { x: -60, y: 3, z: -60 }
];

function getSafeSpawn() {
  const base = SAFE_SPAWNS[Math.floor(Math.random() * SAFE_SPAWNS.length)];
  return { x: base.x + (Math.random()-0.5)*3, y: 3, z: base.z + (Math.random()-0.5)*3 };
}

const PICKUP_SPOTS = [
  { x:20,z:20 },{ x:-20,z:20 },{ x:20,z:-20 },{ x:-20,z:-20 },
  { x:50,z:0 },{ x:-50,z:0 },{ x:0,z:50 },{ x:0,z:-50 },
  { x:35,z:35 },{ x:-35,z:-35 },{ x:35,z:-35 },{ x:-35,z:35 }
];

function spawnPickups(room) {
  const types = ['health','armor','ammo'];
  rooms[room].pickups = PICKUP_SPOTS.map((spot,i) => ({
    id:'p'+i, type:types[i%3], x:spot.x, y:1, z:spot.z, active:true
  }));
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('joinRoom', (data) => {
    const room = data.room.toUpperCase().trim();
    socket.roomCode = room;
    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = {
        players: {}, map: data.map || 'desert', pickups: [],
        customObjects: [], mapLocked: false
      };
      spawnPickups(room);
    }

    const spawn = getSafeSpawn();
    rooms[room].players[socket.id] = {
      id: socket.id, name: data.name || 'Player',
      x: spawn.x, y: spawn.y, z: spawn.z,
      rotY: 0, health: 150, maxHealth: 150,
      armor: 0, maxArmor: 100,
      ammo: 30, maxAmmo: 30, reserveAmmo: 90,
      kills: 0, deaths: 0,
      color: data.color || '#ff4444', moving: false
    };

    // Lock map if 2+ players are in room
    const playerCount = Object.keys(rooms[room].players).length;
    if (playerCount >= 2) {
      rooms[room].mapLocked = true;
    }

    socket.emit('init', {
      id: socket.id,
      players: rooms[room].players,
      map: rooms[room].map,
      pickups: rooms[room].pickups,
      customObjects: rooms[room].customObjects,
      mapLocked: rooms[room].mapLocked,
      room: room
    });

    socket.to(room).emit('playerJoined', rooms[room].players[socket.id]);
    io.to(room).emit('notification', {
      type: 'join', msg: `${rooms[room].players[socket.id].name} joined!`
    });

    // Tell everyone if map is now locked
    if (rooms[room].mapLocked) {
      io.to(room).emit('mapLockStatus', true);
    }
  });

  socket.on('changeMap', (mapName) => {
    const room = socket.roomCode;
    if (!rooms[room]) return;
    // Check if map is locked
    if (rooms[room].mapLocked) {
      socket.emit('notification', { type: 'leave', msg: '🔒 Map is locked! Cannot change map during game.' });
      return;
    }
    rooms[room].map = mapName;
    rooms[room].customObjects = [];
    spawnPickups(room);
    io.to(room).emit('mapChanged', { map: mapName, pickups: rooms[room].pickups });
    io.to(room).emit('notification', { type: 'join', msg: `🗺️ Map: ${mapName.toUpperCase()}` });
  });

  // ===== BUILDER =====
  socket.on('builderPlace', (obj) => {
    const room = socket.roomCode;
    if (!rooms[room]) return;
    rooms[room].customObjects.push(obj);
    socket.to(room).emit('builderPlaced', obj);
  });

  socket.on('builderUndo', () => {
    const room = socket.roomCode;
    if (!rooms[room]) return;
    rooms[room].customObjects.pop();
    socket.to(room).emit('builderUndone');
  });

  socket.on('builderClear', () => {
    const room = socket.roomCode;
    if (!rooms[room]) return;
    rooms[room].customObjects = [];
    socket.to(room).emit('builderCleared');
  });

  socket.on('move', (data) => {
    const room = socket.roomCode;
    if (rooms[room] && rooms[room].players[socket.id]) {
      Object.assign(rooms[room].players[socket.id], data);
      socket.to(room).emit('playerMoved', { id: socket.id, ...data });
    }
  });

  socket.on('shoot', (data) => {
    const room = socket.roomCode;
    if (!rooms[room]) return;
    const shooter = rooms[room].players[socket.id];
    if (!shooter || shooter.ammo <= 0) return;
    shooter.ammo -= 1;
    socket.emit('ammoUpdate', { ammo: shooter.ammo, reserve: shooter.reserveAmmo });
    socket.to(room).emit('bulletFired', { id: socket.id, ...data });
  });

  socket.on('reload', () => {
    const room = socket.roomCode;
    if (!rooms[room]) return;
    const p = rooms[room].players[socket.id];
    if (!p) return;
    const needed = p.maxAmmo - p.ammo;
    const take = Math.min(needed, p.reserveAmmo);
    p.ammo += take; p.reserveAmmo -= take;
    socket.emit('ammoUpdate', { ammo: p.ammo, reserve: p.reserveAmmo });
  });

  socket.on('hit', (data) => {
    const room = socket.roomCode;
    if (!rooms[room]) return;
    const target = rooms[room].players[data.targetId];
    const shooter = rooms[room].players[socket.id];
    if (target && shooter) {
      let damage = data.headshot ? 30 : 15;
      if (target.armor > 0) {
        const armorAbsorb = Math.min(target.armor, damage);
        target.armor -= armorAbsorb; damage -= armorAbsorb;
      }
      target.health -= damage;
      if (target.health <= 0) {
        target.deaths += 1; shooter.kills += 1;
        const spawn = getSafeSpawn();
        target.x=spawn.x; target.y=spawn.y; target.z=spawn.z;
        target.health=target.maxHealth; target.armor=0;
        target.ammo=target.maxAmmo; target.reserveAmmo=90;
       /* io.to(room).emit('playerKilled', {
          killer:shooter.name, victim:target.name, targetId:target.id,
          killerId:shooter.id, headshot:data.headshot,
          newPos:{x:target.x,y:target.y,z:target.z}
        }); */
        io.to(room).emit('playerKilled', {
  killer: shooter.name,
  victim: target.name,

  targetId: target.id,
  killerId: shooter.id,

  killerKills: shooter.kills,
  killerDeaths: shooter.deaths,

  victimKills: target.kills,
  victimDeaths: target.deaths,

  headshot: data.headshot,

  newPos: {
    x: target.x,
    y: target.y,
    z: target.z
  }
});
        io.to(room).emit('notification', {
          type:'kill',
          msg: data.headshot ? `🎯 ${shooter.name} HEADSHOT ${target.name}!`
            : `💀 ${shooter.name} eliminated ${target.name}`
        });
      } else {
        io.to(room).emit('statsUpdate', { id:target.id, health:target.health, armor:target.armor });
      }
    }
  });

  socket.on('pickupGrab', (pickupId) => {
    const room = socket.roomCode;
    if (!rooms[room]) return;
    const p = rooms[room].players[socket.id];
    const pickup = rooms[room].pickups.find(pk => pk.id === pickupId);
    if (!p||!pickup||!pickup.active) return;
    const dist = Math.hypot(p.x-pickup.x, p.z-pickup.z);
    if (dist > 3) return;
    let picked = false;
    if (pickup.type==='health' && p.health<p.maxHealth) { p.health=Math.min(p.maxHealth,p.health+50); picked=true; }
    else if (pickup.type==='armor' && p.armor<p.maxArmor) { p.armor=Math.min(p.maxArmor,p.armor+50); picked=true; }
    else if (pickup.type==='ammo' && p.reserveAmmo<180) { p.reserveAmmo=Math.min(180,p.reserveAmmo+60); picked=true; }
    if (picked) {
      pickup.active = false;
      io.to(room).emit('pickupTaken', { id:pickup.id, byId:socket.id });
      socket.emit('statsUpdate', { id:socket.id, health:p.health, armor:p.armor });
      socket.emit('ammoUpdate', { ammo:p.ammo, reserve:p.reserveAmmo });
      setTimeout(() => {
        if (rooms[room]) { pickup.active=true; io.to(room).emit('pickupRespawn', pickup); }
      }, 15000);
    }
  });

  socket.on('voice-offer', (data) => { io.to(data.target).emit('voice-offer', {from:socket.id,offer:data.offer}); });
  socket.on('voice-answer', (data) => { io.to(data.target).emit('voice-answer', {from:socket.id,answer:data.answer}); });
  socket.on('voice-ice', (data) => { io.to(data.target).emit('voice-ice', {from:socket.id,candidate:data.candidate}); });

  socket.on('disconnect', () => {
    const room = socket.roomCode;
    if (rooms[room] && rooms[room].players[socket.id]) {
      const name = rooms[room].players[socket.id].name;
      io.to(room).emit('notification', { type:'leave', msg:`${name} left` });
      io.to(room).emit('playerLeft', socket.id);
      delete rooms[room].players[socket.id];
      const count = Object.keys(rooms[room].players).length;
      if (count === 0) { delete rooms[room]; }
      else if (count < 2) {
        rooms[room].mapLocked = false;
        io.to(room).emit('mapLockStatus', false);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`🎮 Server running on http://localhost:${PORT}`); });
