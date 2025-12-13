
import { type ServerWebSocket } from "bun";

// Fix for missing Bun type definitions
declare var Bun: any;

// --- CONFIGURATION ---
const PORT = parseInt(process.env.PORT || "8080");
const TICK_RATE = 60;
const TICK_DT = 1000 / TICK_RATE;
const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;
const FRICTION = 0.90;

// --- PROTOCOL ---
const MSG_INPUT = 1;
const MSG_WORLD_UPDATE = 2;

// --- TYPES ---
interface PlayerData {
    id: string;
    netId: number;
    name: string;
    room: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    hp: number;
    maxHp: number;
    score: number;
}

// --- UTILS ---
const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

// --- GAME STATE ---
class GameRoom {
    id: string;
    players: Map<string, PlayerData> = new Map();
    lastTime: number = Date.now();

    constructor(id: string) {
        this.id = id;
        console.log(`[ROOM ${id}] Initialized`);
        // Start Physics Loop
        setInterval(() => this.tick(), TICK_DT);
    }

    tick() {
        const now = Date.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        // 1. Physics
        this.players.forEach(p => {
            const frictionFactor = Math.pow(FRICTION, dt * 60);
            p.vx *= frictionFactor;
            p.vy *= frictionFactor;

            if (Math.abs(p.vx) < 0.01) p.vx = 0;
            if (Math.abs(p.vy) < 0.01) p.vy = 0;

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            p.x = clamp(p.x, 0, WORLD_WIDTH);
            p.y = clamp(p.y, 0, WORLD_HEIGHT);
        });

        // 2. Broadcast Snapshot
        // Bun Optimization: We only build the buffer once and publish to the topic
        if (this.players.size > 0) {
            const snapshot = this.createSnapshotBuffer(now);
            // Native Bun Publish (High Performance)
            server.publish(this.id, snapshot);
        }
    }

    createSnapshotBuffer(time: number): Uint8Array {
        const count = this.players.size;
        const size = 11 + (count * 8);
        const buffer = new ArrayBuffer(size);
        const view = new DataView(buffer);
        let offset = 0;

        view.setUint8(offset, MSG_WORLD_UPDATE); offset++;
        view.setFloat64(offset, time, true); offset += 8;
        view.setUint16(offset, count, true); offset += 2;

        this.players.forEach(p => {
            view.setUint16(offset, p.netId, true); offset += 2;
            
            const cx = Math.floor((p.x / WORLD_WIDTH) * 65535);
            const cy = Math.floor((p.y / WORLD_HEIGHT) * 65535);
            view.setUint16(offset, clamp(cx, 0, 65535), true); offset += 2;
            view.setUint16(offset, clamp(cy, 0, 65535), true); offset += 2;

            let normRot = (p.r + Math.PI) / (Math.PI * 2);
            if (normRot < 0) normRot = 0;
            if (normRot > 1) normRot = 1;
            view.setUint8(offset, Math.floor(normRot * 255)); offset += 1;

            view.setUint8(offset, Math.floor((p.hp / p.maxHp) * 100)); offset += 1;
        });

        return new Uint8Array(buffer);
    }

    handleInput(player: PlayerData, view: DataView) {
        // [Type(1)][VX(4)][VY(4)][Rot(4)]
        const vx = view.getFloat32(1, true);
        const vy = view.getFloat32(5, true);
        const r = view.getFloat32(9, true);

        player.vx = vx;
        player.vy = vy;
        player.r = r;
    }
}

const rooms = new Map<string, GameRoom>();
const getRoom = (id: string) => {
    if (!rooms.has(id)) rooms.set(id, new GameRoom(id));
    return rooms.get(id)!;
};

// Initialize default room
getRoom('FFA');

const server = Bun.serve({
    port: PORT,
    fetch(req, server) {
        const url = new URL(req.url);
        
        // Handle WebSocket Upgrade
        if (url.searchParams.has('room')) {
            const roomId = url.searchParams.get('room') || 'FFA';
            const uid = url.searchParams.get('uid') || `guest_${Math.random().toString(36).substr(2, 4)}`;
            const name = url.searchParams.get('name') || 'Player';

            // Initial Data for the socket
            const playerData: PlayerData = {
                id: uid,
                netId: Math.floor(Math.random() * 60000) + 1,
                name: name,
                room: roomId,
                x: Math.random() * (WORLD_WIDTH - 200) + 100,
                y: Math.random() * (WORLD_HEIGHT - 200) + 100,
                vx: 0, vy: 0, r: 0,
                hp: 100, maxHp: 100, score: 0
            };

            const success = server.upgrade(req, { data: playerData });
            if (success) return undefined;
        }

        return new Response("Tank.io V2 High-Performance Server (Bun)", { status: 200 });
    },
    websocket: {
        open(ws) {
            const p = ws.data;
            const room = getRoom(p.room);
            
            // Subscribe to room topic for broadcasting
            ws.subscribe(p.room);
            room.players.set(p.id, p);

            // 1. Send Handshake
            ws.send(JSON.stringify({
                t: 'hello',
                netId: p.netId,
                x: p.x,
                y: p.y
            }));

            // 2. Send Init (Existing players)
            const others: any[] = [];
            room.players.forEach(other => {
                if (other.id !== p.id) others.push({ netId: other.netId, id: other.id, name: other.name, x: other.x, y: other.y });
            });
            ws.send(JSON.stringify({ t: 'init', d: others }));

            // 3. Broadcast Join to room
            const joinMsg = JSON.stringify({ t: 'j', d: { netId: p.netId, id: p.id, name: p.name, x: p.x, y: p.y } });
            ws.publish(p.room, joinMsg); // Efficient broadcast excluding sender? Bun publishes to subscribers.
            // Note: Bun's publish sends to *everyone* subscribed. We filter on client or accept self-message.
            // Client logic already handles "if (msg.d.id !== this.myId)" so this is safe.
        },
        message(ws, message) {
            const p = ws.data;
            const room = getRoom(p.room);

            if (message instanceof Uint8Array || message instanceof ArrayBuffer) {
                // Binary Input
                const view = message instanceof Uint8Array 
                    ? new DataView(message.buffer, message.byteOffset, message.byteLength)
                    : new DataView(message as ArrayBuffer);
                
                room.handleInput(p, view);
            } else if (typeof message === 'string') {
                // JSON (Chat/Events)
                try {
                    const msg = JSON.parse(message);
                    if (msg.t === 'c') {
                        // Re-broadcast chat using Pub/Sub
                        ws.publish(p.room, JSON.stringify({ t: 'c', d: { sender: p.name, content: msg.d } }));
                        // Also send back to sender (optional, client usually predicts)
                        ws.send(JSON.stringify({ t: 'c', d: { sender: p.name, content: msg.d } }));
                    }
                } catch(e) {}
            }
        },
        close(ws) {
            const p = ws.data;
            const room = getRoom(p.room);
            room.players.delete(p.id);
            ws.unsubscribe(p.room);
            
            // Broadcast Leave
            server.publish(p.room, JSON.stringify({ t: 'l', d: { id: p.id } }));
        },
        perMessageDeflate: false, // Disable compression for speed on binary packets
    },
});

console.log(`🚀 BUN SERVER running on port ${PORT}`);
