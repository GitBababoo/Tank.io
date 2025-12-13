
import { Database } from "bun:sqlite";

declare var Bun: any;

// --- CONFIGURATION ---
const PORT = parseInt(process.env.PORT || "8080");
const TICK_RATE = 60; // Server Logic at 60 FPS
const BROADCAST_RATE = 20; // Broadcast snapshot every 50ms (20 FPS) to save bandwidth
const WORLD_SIZE = 5000;
const WORLD_HEIGHT = WORLD_SIZE;

// --- BINARY PROTOCOL OPCODES ---
const OP_JOIN = 1;
const OP_WORLD_UPDATE = 2;
const OP_INPUT = 3;
const OP_INIT = 4;
const OP_LEAVE = 5;

// --- DATABASE ---
const db = new Database("game_data.sqlite", { create: true });
db.run(`CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, score INTEGER DEFAULT 0)`);

// --- GAME STATE ---
interface Player {
    id: string;
    ws: any;
    netId: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    input: { x: number, y: number, fire: boolean };
    hp: number;
    maxHp: number;
    score: number;
    classPath: string;
    lastProcessedInput: number;
}

let nextNetId = 1;
const players = new Map<string, Player>();

// --- UTILS ---
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

// --- GAME LOOP ---
setInterval(() => {
    // 1. Physics & Logic (60Hz)
    players.forEach(p => {
        // Apply Input Force
        const speed = 5; // Base speed
        p.vx += p.input.x * speed;
        p.vy += p.input.y * speed;

        // Friction
        p.vx *= 0.9;
        p.vy *= 0.9;

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // World Bounds
        p.x = clamp(p.x, 0, WORLD_SIZE);
        p.y = clamp(p.y, 0, WORLD_HEIGHT);
    });
}, 1000 / TICK_RATE);

// --- BROADCAST LOOP (20Hz) ---
setInterval(() => {
    if (players.size === 0) return;

    // Binary Packing: [OP(1) | Time(8) | Count(2) | EntityData...]
    // EntityData: [NetID(2) | X(2) | Y(2) | Angle(1) | HP(1)]
    // Coordinates compressed to 0-65535 map range
    
    const count = players.size;
    const bufferSize = 11 + (count * 8); 
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    
    let offset = 0;
    view.setUint8(offset, OP_WORLD_UPDATE); offset += 1;
    view.setFloat64(offset, Date.now(), true); offset += 8;
    view.setUint16(offset, count, true); offset += 2;

    players.forEach(p => {
        view.setUint16(offset, p.netId, true); offset += 2;
        
        // Compress Position (0 to WORLD_SIZE -> 0 to 65535)
        view.setUint16(offset, (p.x / WORLD_SIZE) * 65535, true); offset += 2;
        view.setUint16(offset, (p.y / WORLD_SIZE) * 65535, true); offset += 2;
        
        // Compress Angle (-PI to PI -> 0 to 255)
        const normAngle = (p.angle + Math.PI) / (Math.PI * 2);
        view.setUint8(offset, Math.floor(normAngle * 255)); offset += 1;
        
        // HP Percent
        view.setUint8(offset, Math.floor((p.hp / p.maxHp) * 100)); offset += 1;
    });

    // Send to all
    players.forEach(p => p.ws.send(buffer));

}, 1000 / BROADCAST_RATE);

// --- SERVER SETUP ---
console.log(`🚀 TANK.IO SERVER RUNNING ON PORT ${PORT}`);

Bun.serve({
    port: PORT,
    fetch(req, server) {
        const url = new URL(req.url);
        if (url.pathname === "/ws") {
            const uid = url.searchParams.get("uid") || `guest_${Math.random()}`;
            const success = server.upgrade(req, { data: { uid } });
            return success ? undefined : new Response("WebSocket upgrade error", { status: 400 });
        }
        return new Response("Tank.io Game Server Active");
    },
    websocket: {
        open(ws) {
            const uid = ws.data.uid;
            console.log(`[+] Player connected: ${uid}`);
            
            const newPlayer: Player = {
                id: uid,
                ws,
                netId: nextNetId++,
                x: Math.random() * WORLD_SIZE,
                y: Math.random() * WORLD_SIZE,
                vx: 0, vy: 0, angle: 0,
                input: { x: 0, y: 0, fire: false },
                hp: 100, maxHp: 100, score: 0,
                classPath: 'basic',
                lastProcessedInput: 0
            };
            
            players.set(uid, newPlayer);

            // Send Init Packet (Your NetID)
            ws.send(JSON.stringify({ 
                t: OP_INIT, 
                d: { netId: newPlayer.netId, x: newPlayer.x, y: newPlayer.y } 
            }));

            // Broadcast Join (JSON for reliable events)
            const joinMsg = JSON.stringify({ t: OP_JOIN, d: { id: uid, netId: newPlayer.netId } });
            players.forEach(p => { if(p.id !== uid) p.ws.send(joinMsg); });
        },
        message(ws, message) {
            const player = players.get(ws.data.uid);
            if (!player) return;

            // Binary Input: [OP(1) | X(float) | Y(float) | Angle(float) | Fire(1)]
            if (message instanceof ArrayBuffer || message instanceof Uint8Array) {
                const view = new DataView(message instanceof ArrayBuffer ? message : message.buffer);
                const op = view.getUint8(0);
                
                if (op === OP_INPUT) {
                    player.input.x = view.getFloat32(1, true);
                    player.input.y = view.getFloat32(5, true);
                    player.angle = view.getFloat32(9, true);
                    player.input.fire = view.getUint8(13) === 1;
                }
            }
        },
        close(ws) {
            const uid = ws.data.uid;
            players.delete(uid);
            console.log(`[-] Player disconnected: ${uid}`);
        }
    }
});
