
import { Database } from "bun:sqlite";

declare var Bun: any;

// --- CONFIGURATION ---
const PORT = parseInt(process.env.PORT || "8080");
const BROADCAST_RATE = 50; // 20ms = 50Hz updates (High Performance)
const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;
const FRICTION = 0.90;

// --- DATABASE ---
const db = new Database("game_data.sqlite", { create: true });
db.run(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    classPath TEXT DEFAULT 'basic',
    bossKills INTEGER DEFAULT 0,
    lastSeen INTEGER
  )
`);

const stmts = {
  upsertPlayer: db.prepare(`
    INSERT INTO players (id, name, level, xp, score, classPath, bossKills, lastSeen)
    VALUES ($id, $name, $level, $xp, $score, $classPath, $bossKills, $lastSeen)
    ON CONFLICT(id) DO UPDATE SET
      level = excluded.level,
      xp = excluded.xp,
      score = excluded.score,
      classPath = excluded.classPath,
      lastSeen = excluded.lastSeen
  `),
  getPlayer: db.prepare(`SELECT * FROM players WHERE id = $id`)
};

// --- TYPES ---
interface PlayerData {
    id: string;
    ws: any;
    netId: number;
    name: string;
    room: string | null;
    x: number; y: number; vx: number; vy: number; r: number;
    hp: number; maxHp: number; score: number;
    level: number; xp: number; classPath: string;
    lastSeq: number;
}

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
const MSG_INPUT = 1;
const MSG_WORLD_UPDATE = 2;

const allSockets = new Set<any>();

class GameRoom {
    id: string;
    players: Map<string, PlayerData> = new Map();

    constructor(id: string) {
        this.id = id;
        console.log(`[ROOM ${id}] Engine Active.`);
        setInterval(() => this.tick(), 1000 / 60);
        setInterval(() => this.broadcastSnapshot(), BROADCAST_RATE);
    }

    tick() {
        this.players.forEach(p => {
            // Physics Simulation
            p.vx *= FRICTION; 
            p.vy *= FRICTION;
            
            if (Math.abs(p.vx) < 0.01) p.vx = 0;
            if (Math.abs(p.vy) < 0.01) p.vy = 0;
            
            p.x += p.vx; 
            p.y += p.vy;
            
            p.x = clamp(p.x, 0, WORLD_WIDTH);
            p.y = clamp(p.y, 0, WORLD_HEIGHT);
        });
    }

    broadcastSnapshot() {
        if (this.players.size === 0) return;
        
        // --- BINARY PACKING FOR PERFORMANCE ---
        // Header (11b) + Entity (10b each)
        const size = 11 + (this.players.size * 10);
        const buffer = new ArrayBuffer(size);
        const view = new DataView(buffer);
        let offset = 0;

        view.setUint8(offset, MSG_WORLD_UPDATE); offset++;
        view.setFloat64(offset, Date.now(), true); offset += 8;
        view.setUint16(offset, this.players.size, true); offset += 2;

        this.players.forEach(p => {
            view.setUint16(offset, p.netId, true); offset += 2;
            
            // Compress Coords (0-65535) maps to (0-WORLD_SIZE)
            const cx = Math.floor((p.x / WORLD_WIDTH) * 65535);
            const cy = Math.floor((p.y / WORLD_HEIGHT) * 65535);
            view.setUint16(offset, clamp(cx, 0, 65535), true); offset += 2;
            view.setUint16(offset, clamp(cy, 0, 65535), true); offset += 2;

            // Compress Rotation (0-255)
            let normRot = (p.r + Math.PI) / (Math.PI * 2);
            if (normRot < 0) normRot = 0; if (normRot > 1) normRot = 1;
            view.setUint8(offset, Math.floor(normRot * 255)); offset += 1;

            // Health % (0-100)
            view.setUint8(offset, Math.floor((p.hp / p.maxHp) * 100)); offset += 1;
            
            view.setUint16(offset, p.lastSeq, true); offset += 2;
        });

        const packet = new Uint8Array(buffer);
        this.players.forEach(p => p.ws.send(packet));
    }

    handleInput(p: PlayerData, view: DataView) {
        // [Type 1][VX 4][VY 4][ROT 4]
        // Note: For production, we should accept Input Keys (W,A,S,D) instead of Velocity 
        // to prevent speed hacking, but for this step we match the client's current vector output.
        const vx = view.getFloat32(1, true);
        const vy = view.getFloat32(5, true);
        const r = view.getFloat32(9, true);

        // Simple Anti-Cheat Speed Cap
        const MAX_SPEED = 20; 
        p.vx = clamp(vx * 15, -MAX_SPEED, MAX_SPEED); // Apply speed multiplier here
        p.vy = clamp(vy * 15, -MAX_SPEED, MAX_SPEED);
        p.r = r;
    }
}

const rooms = new Map<string, GameRoom>();
const getRoom = (id: string) => {
    if (!rooms.has(id)) rooms.set(id, new GameRoom(id));
    return rooms.get(id)!;
};

// --- BUN SERVER ---
const server = Bun.serve({
    port: PORT,
    fetch(req, server) {
        const url = new URL(req.url);
        if (url.pathname === "/ws") {
            const uid = url.searchParams.get('uid') || `guest_${Math.random()}`;
            const name = url.searchParams.get('name') || 'Player';
            const netId = Math.floor(Math.random() * 60000) + 1;

            const playerData: PlayerData = {
                id: uid, ws: undefined, netId, name, room: null,
                x: 0, y: 0, vx: 0, vy: 0, r: 0, hp: 100, maxHp: 100, score: 0,
                level: 1, xp: 0, classPath: 'basic', lastSeq: 0
            };

            const success = server.upgrade(req, { data: playerData });
            return success ? undefined : new Response("WebSocket Upgrade Failed", { status: 400 });
        }
        return new Response("Tank.io Real-Time Server Active", { status: 200 });
    },
    websocket: {
        open(ws) {
            ws.data.ws = ws;
            allSockets.add(ws);
            const p = ws.data as PlayerData;

            // Load Persisted Data
            const saved = stmts.getPlayer.get({ $id: p.id }) as any;
            if (saved) {
                p.level = saved.level;
                p.xp = saved.xp;
                p.score = saved.score;
                p.classPath = saved.classPath;
            }

            ws.send(JSON.stringify({ 
                t: 'hello', id: p.id,
                restore: { level: p.level, xp: p.xp, classPath: p.classPath, score: p.score } 
            }));
        },
        message(ws, message) {
            const p = ws.data as PlayerData;

            // Binary Input
            if (message instanceof Uint8Array || message instanceof ArrayBuffer) {
                if (p.room) {
                    const view = message instanceof Uint8Array 
                        ? new DataView(message.buffer, message.byteOffset, message.byteLength)
                        : new DataView(message as ArrayBuffer);
                    getRoom(p.room).handleInput(p, view);
                }
                return;
            }

            // JSON Events
            if (typeof message === 'string') {
                try {
                    const msg = JSON.parse(message);
                    if (msg.t === 'join') {
                        const roomId = msg.d.room || 'FFA';
                        const room = getRoom(roomId);
                        p.room = roomId;
                        p.x = Math.random() * (WORLD_WIDTH - 200) + 100;
                        p.y = Math.random() * (WORLD_HEIGHT - 200) + 100;
                        room.players.set(p.id, p);

                        // Send existing players to new player
                        // IMPORTANT: Send classPath here!
                        const others: any[] = [];
                        room.players.forEach(o => {
                            if (o.id !== p.id) others.push({ 
                                netId: o.netId, id: o.id, name: o.name, 
                                x: o.x, y: o.y, classPath: o.classPath // Sync Class
                            });
                        });
                        ws.send(JSON.stringify({ t: 'init', d: others, self: { x: p.x, y: p.y, netId: p.netId } }));
                        
                        // Broadcast new player to others
                        const joinData = JSON.stringify({ t: 'j', d: { netId: p.netId, id: p.id, name: p.name, x: p.x, y: p.y, classPath: p.classPath } });
                        room.players.forEach(o => { if(o.id !== p.id) o.ws.send(joinData); });
                    }
                    else if (msg.t === 'update_stat') {
                        p.level = msg.d.level;
                        p.classPath = msg.d.classPath;
                        p.xp = msg.d.xp;
                        // Broadcast class change to others? Ideally yes, but skipping for brevity
                    }
                    else if (msg.t === 'c' && p.room) {
                        const chatMsg = JSON.stringify({ t: 'c', d: { sender: p.name, content: msg.d } });
                        getRoom(p.room).players.forEach(o => o.ws.send(chatMsg));
                    }
                } catch(e) {}
            }
        },
        close(ws) {
            const p = ws.data as PlayerData;
            allSockets.delete(ws);
            if (p.room) {
                const room = getRoom(p.room);
                room.players.delete(p.id);
                const leaveMsg = JSON.stringify({ t: 'l', d: { id: p.id } });
                room.players.forEach(o => o.ws.send(leaveMsg));
            }
            stmts.upsertPlayer.run({
                $id: p.id, $name: p.name, $level: p.level, $xp: p.xp, 
                $score: p.score, $classPath: p.classPath, $bossKills: 0, 
                $lastSeen: Date.now()
            });
        }
    }
});

console.log(`[TANK.IO] Server running on ${server.port}`);
