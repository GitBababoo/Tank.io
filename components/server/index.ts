import { Database } from "bun:sqlite";

declare var Bun: any;

// --- CONFIGURATION ---
const PORT = parseInt(process.env.PORT || "8080");
const BROADCAST_RATE = 50; // 20 updates/sec (Smooth & Bandwidth efficient)
const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;
const FRICTION = 0.90;

// --- DATABASE (REAL PERSISTENCE) ---
// Using Bun's native SQLite - extremely fast file-based DB.
const db = new Database("game_data.sqlite", { create: true });

// Init DB
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

// --- QUADTREE (Spatial Partitioning) ---
// Optimized for collision detection with minimal CPU usage
class QuadTree {
    bounds: { x: number, y: number, w: number, h: number };
    capacity: number;
    points: PlayerData[];
    divided: boolean = false;
    northeast: QuadTree | null = null;
    northwest: QuadTree | null = null;
    southeast: QuadTree | null = null;
    southwest: QuadTree | null = null;

    constructor(bounds: { x: number, y: number, w: number, h: number }, capacity: number) {
        this.bounds = bounds;
        this.capacity = capacity;
        this.points = [];
    }

    insert(p: PlayerData): boolean {
        if (!this.contains(this.bounds, p)) return false;
        if (this.points.length < this.capacity) {
            this.points.push(p);
            return true;
        }
        if (!this.divided) this.subdivide();
        return (this.northeast!.insert(p) || this.northwest!.insert(p) || this.southeast!.insert(p) || this.southwest!.insert(p));
    }

    subdivide() {
        const { x, y, w, h } = this.bounds;
        const hw = w / 2, hh = h / 2;
        this.northeast = new QuadTree({ x: x + hw, y: y, w: hw, h: hh }, this.capacity);
        this.northwest = new QuadTree({ x: x, y: y, w: hw, h: hh }, this.capacity);
        this.southeast = new QuadTree({ x: x + hw, y: y + hh, w: hw, h: hh }, this.capacity);
        this.southwest = new QuadTree({ x: x, y: y + hh, w: hw, h: hh }, this.capacity);
        this.divided = true;
    }

    query(range: { x: number, y: number, w: number, h: number }, found: PlayerData[] = []): PlayerData[] {
        if (!this.intersects(this.bounds, range)) return found;
        for (const p of this.points) {
            if (this.contains(range, p)) found.push(p);
        }
        if (this.divided) {
            this.northwest!.query(range, found);
            this.northeast!.query(range, found);
            this.southwest!.query(range, found);
            this.southeast!.query(range, found);
        }
        return found;
    }

    private contains(r: any, p: any) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
    private intersects(a: any, b: any) { return !(b.x > a.x + a.w || b.x + b.w < a.x || b.y > a.y + a.h || b.y + b.h < a.y); }
}

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
const MSG_WORLD_UPDATE = 2;

// --- GAME SERVER LOGIC ---
const allSockets = new Set<any>();

class GameRoom {
    id: string;
    players: Map<string, PlayerData> = new Map();
    quadTree: QuadTree;

    constructor(id: string) {
        this.id = id;
        this.quadTree = new QuadTree({ x: 0, y: 0, w: WORLD_WIDTH, h: WORLD_HEIGHT }, 4);
        
        console.log(`[ROOM ${id}] Engine Active. Persistence: SQLite.`);
        
        // Game Loop (60Hz Physics)
        setInterval(() => this.tick(), 1000 / 60);
        // Network Loop (20Hz Broadcast)
        setInterval(() => this.broadcastSnapshot(), BROADCAST_RATE);
    }

    tick() {
        this.quadTree = new QuadTree({ x: 0, y: 0, w: WORLD_WIDTH, h: WORLD_HEIGHT }, 4);

        this.players.forEach(p => {
            p.vx *= FRICTION; p.vy *= FRICTION;
            if (Math.abs(p.vx) < 0.01) p.vx = 0;
            if (Math.abs(p.vy) < 0.01) p.vy = 0;
            p.x += p.vx; p.y += p.vy;
            p.x = clamp(p.x, 0, WORLD_WIDTH);
            p.y = clamp(p.y, 0, WORLD_HEIGHT);
            this.quadTree.insert(p);
        });

        // Basic Collision (Push)
        this.players.forEach(p => {
            const neighbors = this.quadTree.query({ x: p.x - 50, y: p.y - 50, w: 100, h: 100 });
            for (const other of neighbors) {
                if (p.id !== other.id) {
                    const dx = p.x - other.x, dy = p.y - other.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 40 && dist > 0) {
                        const angle = Math.atan2(dy, dx);
                        const force = 0.5;
                        p.vx += Math.cos(angle) * force;
                        p.vy += Math.sin(angle) * force;
                    }
                }
            }
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

            view.setUint8(offset, Math.floor((p.hp / p.maxHp) * 100)); offset += 1;
            view.setUint16(offset, p.lastSeq, true); offset += 2;
        });

        const packet = new Uint8Array(buffer);
        this.players.forEach(p => p.ws.send(packet));
    }

    handleInput(p: PlayerData, view: DataView) {
        // [Type 1][VX 4][VY 4][ROT 4][SEQ 2]
        const vx = view.getFloat32(1, true);
        const vy = view.getFloat32(5, true);
        const r = view.getFloat32(9, true);
        const seq = view.getUint16(13, true);

        // Security Cap
        p.vx = clamp(vx, -15, 15);
        p.vy = clamp(vy, -15, 15);
        p.r = r;
        p.lastSeq = seq;
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
            
            // Generate distinct visual ID for network
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

            // Load from SQLite
            const saved = stmts.getPlayer.get({ $id: p.id }) as any;
            if (saved) {
                p.level = saved.level;
                p.xp = saved.xp;
                p.score = saved.score;
                p.classPath = saved.classPath;
                console.log(`[DB] Restored ${p.name}: Lv ${p.level} ${p.classPath}`);
            }

            ws.send(JSON.stringify({ 
                t: 'hello', id: p.id,
                restore: { level: p.level, xp: p.xp, classPath: p.classPath, score: p.score } 
            }));
        },
        message(ws, message) {
            const p = ws.data as PlayerData;

            // Binary Input (Fast)
            if (message instanceof Uint8Array || message instanceof ArrayBuffer) {
                if (p.room) {
                    const view = message instanceof Uint8Array 
                        ? new DataView(message.buffer, message.byteOffset, message.byteLength)
                        : new DataView(message as ArrayBuffer);
                    getRoom(p.room).handleInput(p, view);
                }
                return;
            }

            // JSON Events (Reliable)
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

                        // Sync others
                        const others: any[] = [];
                        room.players.forEach(o => {
                            if (o.id !== p.id) others.push({ netId: o.netId, id: o.id, name: o.name, x: o.x, y: o.y, classPath: o.classPath });
                        });
                        ws.send(JSON.stringify({ t: 'init', d: others, self: { x: p.x, y: p.y, netId: p.netId } }));
                        
                        const joinData = JSON.stringify({ t: 'j', d: { netId: p.netId, id: p.id, name: p.name, x: p.x, y: p.y, classPath: p.classPath } });
                        room.players.forEach(o => { if(o.id !== p.id) o.ws.send(joinData); });
                    }
                    else if (msg.t === 'update_stat') {
                        // Real-time Save to SQLite
                        p.level = msg.d.level;
                        p.classPath = msg.d.classPath;
                        p.xp = msg.d.xp;
                        p.score = msg.d.score;
                        
                        stmts.upsertPlayer.run({
                            $id: p.id, $name: p.name, $level: p.level, $xp: p.xp, 
                            $score: p.score, $classPath: p.classPath, $bossKills: 0, 
                            $lastSeen: Date.now()
                        });
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
            // Final Save
            stmts.upsertPlayer.run({
                $id: p.id, $name: p.name, $level: p.level, $xp: p.xp, 
                $score: p.score, $classPath: p.classPath, $bossKills: 0, 
                $lastSeen: Date.now()
            });
        }
    }
});

console.log(`[TANK.IO] Server running on ${server.port}`);