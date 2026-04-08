
import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
const PORT = process.env.PORT || 8080;
const TICK_RATE = 60;
const TICK_DT = 1000 / TICK_RATE;
const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;

// Physics Constants (Must match Client)
const FRICTION = 0.90;
const SPEED_FACTOR = 60; // Normalize velocity to per-second

// --- PROTOCOL CONSTANTS ---
const MSG_INPUT = 1;
const MSG_WORLD_UPDATE = 2;
const MSG_JOIN = 3;
const MSG_INIT = 4;

// --- UTILS ---
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

// --- CLASS: GAME ROOM ---
class GameRoom {
    constructor(id) {
        this.id = id;
        this.players = new Map(); // SocketID -> PlayerData
        this.entities = new Map(); // Bullets, Shapes, etc.
        this.lastTime = Date.now();
        this.intervalId = null;
    }

    start() {
        console.log(`[ROOM ${this.id}] Starting Loop`);
        this.intervalId = setInterval(() => this.tick(), TICK_DT);
    }

    tick() {
        const now = Date.now();
        const dt = (now - this.lastTime) / 1000; // Delta in seconds
        this.lastTime = now;

        // 1. Update Physics
        this.players.forEach(p => {
            // Friction
            const frictionFactor = Math.pow(FRICTION, dt * 60);
            p.vx *= frictionFactor;
            p.vy *= frictionFactor;

            // Velocity Deadzone
            if (Math.abs(p.vx) < 0.01) p.vx = 0;
            if (Math.abs(p.vy) < 0.01) p.vy = 0;

            // Move
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Bounds
            p.x = clamp(p.x, 0, WORLD_WIDTH);
            p.y = clamp(p.y, 0, WORLD_HEIGHT);
        });

        // 2. Broadcast Snapshot (Binary)
        if (this.players.size > 0) {
            const snapshot = this.createSnapshotBuffer(now);
            this.players.forEach(p => {
                if (p.ws.readyState === 1) p.ws.send(snapshot);
            });
        }
    }

    addPlayer(ws, userData) {
        const netId = this.generateNetId();
        const player = {
            ws,
            id: userData.uid,
            netId: netId,
            name: userData.name,
            x: Math.random() * (WORLD_WIDTH - 200) + 100,
            y: Math.random() * (WORLD_HEIGHT - 200) + 100,
            vx: 0, vy: 0, r: 0,
            hp: 100, maxHp: 100, score: 0
        };
        
        this.players.set(userData.uid, player);
        ws.player = player; // Link

        // Send Initial Handshake (JSON for complex meta data)
        const initData = {
            t: 'hello',
            netId: netId,
            x: player.x,
            y: player.y
        };
        ws.send(JSON.stringify(initData));

        // Send Existing Players to new guy
        const others = [];
        this.players.forEach(p => {
            if (p.id !== player.id) others.push({ netId: p.netId, id: p.id, name: p.name, x: p.x, y: p.y });
        });
        ws.send(JSON.stringify({ t: 'init', d: others }));

        // Broadcast Join to others
        const joinMsg = JSON.stringify({ t: 'j', d: { netId, id: player.id, name: player.name, x: player.x, y: player.y } });
        this.broadcastJson(joinMsg, player.id);
    }

    removePlayer(id) {
        if (this.players.has(id)) {
            const p = this.players.get(id);
            this.players.delete(id);
            this.broadcastJson(JSON.stringify({ t: 'l', d: { id } }));
        }
    }

    handleInput(ws, buffer) {
        if (!ws.player) return;
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        
        // Protocol: [Type(1)][VX(4)][VY(4)][Rot(4)]
        const vx = view.getFloat32(1, true);
        const vy = view.getFloat32(5, true);
        const r = view.getFloat32(9, true);

        // Security: Cap velocity inputs
        // In a real game, inputs should be KeyStates (W,A,S,D pressed) not Velocity
        // But to match current client logic:
        ws.player.vx = vx;
        ws.player.vy = vy;
        ws.player.r = r;
    }

    createSnapshotBuffer(time) {
        // Header: Type(1) + Time(8) + Count(2) = 11 bytes
        // Entity: NetID(2) + X(2) + Y(2) + Rot(1) + HP(1) = 8 bytes
        const count = this.players.size;
        const buffer = Buffer.allocUnsafe(11 + (count * 8));
        let offset = 0;

        buffer.writeUInt8(MSG_WORLD_UPDATE, offset); offset++;
        buffer.writeDoubleLE(time, offset); offset += 8;
        buffer.writeUInt16LE(count, offset); offset += 2;

        this.players.forEach(p => {
            buffer.writeUInt16LE(p.netId, offset); offset += 2;
            
            // Compression: Map 0-5000 to 0-65535
            const cx = Math.floor((p.x / WORLD_WIDTH) * 65535);
            const cy = Math.floor((p.y / WORLD_HEIGHT) * 65535);
            buffer.writeUInt16LE(clamp(cx, 0, 65535), offset); offset += 2;
            buffer.writeUInt16LE(clamp(cy, 0, 65535), offset); offset += 2;

            // Compression: Radians -PI to PI -> 0 to 255
            let normRot = (p.r + Math.PI) / (Math.PI * 2); // 0 to 1
            if (normRot < 0) normRot = 0;
            if (normRot > 1) normRot = 1;
            buffer.writeUInt8(Math.floor(normRot * 255), offset); offset += 1;

            buffer.writeUInt8(Math.floor((p.hp / p.maxHp) * 100), offset); offset += 1;
        });

        return buffer;
    }

    broadcastJson(msg, excludeId) {
        this.players.forEach(p => {
            if (p.id !== excludeId && p.ws.readyState === 1) {
                p.ws.send(msg);
            }
        });
    }

    generateNetId() {
        // Simple distinct ID generator
        return Math.floor(Math.random() * 60000) + 1; 
    }
}

// --- SERVER SETUP ---
const rooms = new Map();
rooms.set('FFA', new GameRoom('FFA'));
rooms.get('FFA').start();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '../dist')));

const server = app.listen(PORT, () => {
    console.log(`🚀 TITAN ENGINE (60Hz Binary) running on port ${PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
    ws.binaryType = 'nodebuffer'; 

    const url = new URL(req.url, `http://${req.headers.host}`);
    const roomId = url.searchParams.get('room') || 'FFA';
    const uid = url.searchParams.get('uid') || `guest_${Math.random().toString(36).substr(2, 4)}`;
    const name = url.searchParams.get('name') || 'Player';

    // Auto-create room if missing (for scalability)
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new GameRoom(roomId));
        rooms.get(roomId).start();
    }

    const room = rooms.get(roomId);
    room.addPlayer(ws, { uid, name });

    ws.on('message', (data, isBinary) => {
        if (isBinary) {
            room.handleInput(ws, data);
        } else {
            // Handle JSON events (Chat, Upgrade, Class Change)
            try {
                const msg = JSON.parse(data.toString());
                if (msg.t === 'c') { // Chat
                    room.broadcastJson(JSON.stringify({ t: 'c', d: { sender: name, content: msg.d } }));
                }
            } catch(e) {}
        }
    });

    ws.on('close', () => {
        room.removePlayer(uid);
    });
});
