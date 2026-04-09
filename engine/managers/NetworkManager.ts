
import { Entity, GameMode, EntityType } from '../../types';

// Protocol Tags (Must match Server)
const MSG_INPUT = 1;
const MSG_WORLD_UPDATE = 2;
const MSG_JOIN = 3;
const MSG_INIT = 4;

export class NetworkManager {
    public isConnected: boolean = false;
    public isHost: boolean = false; // Deprecated concept in Client-Server, but kept for compatibility
    public myId: string | null = null;
    
    private ws: WebSocket | null = null;
    
    // --- SNAPSHOT INTERPOLATION ---
    // Stores the last 20 updates from server to smooth out movement
    public snapshots: { time: number, entities: any[] }[] = [];
    public serverTimeOffset: number = 0;
    public renderDelay: number = 100; // 100ms buffer for smooth lerping

    // Event Handlers
    private handlers: Record<string, Function[]> = {};

    public stats = { ping: 0, rtt: 0, packetsIn: 0, packetsOut: 0, bytesIn: 0, bytesOut: 0 };

    constructor() {
        setInterval(() => this.measurePing(), 1000);
    }

    // --- CONNECT ---
    async joinGame(roomId: string, playerInfo: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname;
            const port = '8080';
            const targetRoom = (roomId === 'SERVER' || !roomId) ? 'FFA' : roomId;
            const url = `${protocol}//${host}:${port}/ws?uid=${playerInfo.id || 'guest'}&name=${playerInfo.name}&room=${targetRoom}`;

            console.log(`[NET] Attempting connection: ${url}`);
            
            try {
                this.ws = new WebSocket(url);
                this.ws.binaryType = 'arraybuffer';

                const timeout = setTimeout(() => {
                    if (this.ws?.readyState !== WebSocket.OPEN) {
                        console.error("[NET] Connection Timeout");
                        this.ws?.close();
                        reject(new Error("Connection Timeout - Is the server running?"));
                    }
                }, 5000);

                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    this.isConnected = true;
                    this.isHost = false;
                    console.log("[NET] WebSocket Connected to Room:", targetRoom);
                    this.sendJson({ t: 'join', d: { room: targetRoom, ...playerInfo } });
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onclose = () => {
                    this.isConnected = false;
                    this.emit('disconnected', null);
                    console.log("[NET] Disconnected from Server");
                };

                this.ws.onerror = (err) => {
                    console.error("[NET] WebSocket Error", err);
                    reject(new Error("Connection failed - Server unreachable"));
                };
            } catch (e) {
                console.error("[NET] Immediate Connection Error:", e);
                reject(e);
            }
        });
    }

    // Unused in Client-Server architecture but kept for interface compatibility
    async hostGame(info: any): Promise<string> {
        // In this architecture, "Hosting" just means joining the dedicated server as a player
        await this.joinGame('SERVER', info);
        return "OFFICIAL_SERVER";
    }

    // --- SENDING ---
    
    // Send Input (Velocity/Rotation) to Server efficiently
    public sendInput(input: { x: number, y: number, r: number, fire: boolean }) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        // Binary Packing: [Type(1)][VX(4)][VY(4)][Rot(4)][Seq(2)]
        const buffer = new ArrayBuffer(15);
        const view = new DataView(buffer);
        
        view.setUint8(0, MSG_INPUT); // Opcode
        view.setFloat32(1, input.x, true); // VX
        view.setFloat32(5, input.y, true); // VY
        view.setFloat32(9, input.r, true); // Rotation
        // Fire status could be packed into bits, keeping it simple for now
        
        this.ws.send(buffer);
        this.stats.packetsOut++;
        this.stats.bytesOut += 15;
    }

    public sendChat(msg: string, sender: string) {
        this.sendJson({ t: 'c', d: msg });
    }

    public sendUpdateStat(state: any) {
        this.sendJson({ t: 'update_stat', d: state });
    }

    private sendJson(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    // --- RECEIVING ---

    private handleMessage(data: ArrayBuffer | string) {
        this.stats.packetsIn++;

        // 1. Binary World Update (High Frequency)
        if (data instanceof ArrayBuffer) {
            this.stats.bytesIn += data.byteLength;
            const view = new DataView(data);
            const op = view.getUint8(0);

            if (op === MSG_WORLD_UPDATE) {
                const serverTime = view.getFloat64(1, true);
                const count = view.getUint16(9, true);
                let offset = 11;

                const entities = [];
                for (let i = 0; i < count; i++) {
                    // Protocol matched with Server
                    const netId = view.getUint16(offset, true); offset += 2;
                    const x = view.getUint16(offset, true); offset += 2; // 0-65535 map
                    const y = view.getUint16(offset, true); offset += 2;
                    const r = view.getUint8(offset); offset += 1;
                    const hp = view.getUint8(offset); offset += 1;
                    const seq = view.getUint16(offset, true); offset += 2;

                    entities.push({
                        netId,
                        // Decompress Coordinates
                        x: (x / 65535) * 5000, // 5000 is World Size
                        y: (y / 65535) * 5000,
                        r: (r / 255) * (Math.PI * 2) - Math.PI,
                        hp: hp, // 0-100%
                        seq
                    });
                }

                // Add to Snapshot Buffer
                this.snapshots.push({ time: Date.now(), entities });
                // Keep buffer small (approx 1 sec of data)
                if (this.snapshots.length > 20) this.snapshots.shift();
            }
            return;
        }

        // 2. JSON Events (Low Frequency)
        if (typeof data === 'string') {
            try {
                const msg = JSON.parse(data);
                if (msg.t === 'hello') {
                    this.myId = msg.id;
                    if (msg.restore) this.emit('restore_stats', msg.restore);
                } else if (msg.t === 'init') {
                    // Initial load of players
                    this.emit('connected', msg.d);
                    if (msg.self) {
                        // Sync my initial position
                        this.emit('teleport', msg.self);
                    }
                } else if (msg.t === 'j') {
                    // Player Join
                    this.emit('player_joined', msg.d);
                } else if (msg.t === 'l') {
                    // Player Left
                    this.emit('player_left', msg.d);
                } else if (msg.t === 'c') {
                    this.emit('chat', msg.d);
                }
            } catch (e) {
                console.error("JSON Parse Error", e);
            }
        }
    }

    // --- INTERPOLATION ENGINE ( The "Smoothness" ) ---
    // Returns the calculated position for entities at the current render time
    public getCurrentWorldState() {
        const renderTime = Date.now() - this.renderDelay;

        // Find the two snapshots surrounding renderTime
        let prev = null;
        let next = null;

        for (let i = 0; i < this.snapshots.length - 1; i++) {
            if (this.snapshots[i].time <= renderTime && this.snapshots[i+1].time >= renderTime) {
                prev = this.snapshots[i];
                next = this.snapshots[i+1];
                break;
            }
        }

        // If valid window found, interpolate
        if (prev && next) {
            const total = next.time - prev.time;
            const elapsed = renderTime - prev.time;
            const t = elapsed / total; // 0.0 to 1.0

            return next.entities.map((n: any) => {
                const p = prev!.entities.find((e: any) => e.netId === n.netId);
                if (!p) return n; // No previous state, snap to current

                return {
                    ...n,
                    x: p.x + (n.x - p.x) * t,
                    y: p.y + (n.y - p.y) * t,
                    // Shortest path rotation interpolation
                    r: this.lerpAngle(p.r, n.r, t)
                };
            });
        }

        // Fallback: Return latest if available
        if (this.snapshots.length > 0) return this.snapshots[this.snapshots.length - 1].entities;
    }

    private lerpAngle(start: number, end: number, t: number) {
        let diff = end - start;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        return start + diff * t;
    }

    private measurePing() {
        // WebSocket has no built-in ping API exposed to JS, 
        // usually handled by heartbeat frames or calculating difference between update timestamps.
        // Simplified:
        if (this.snapshots.length >= 2) {
            const latest = this.snapshots[this.snapshots.length - 1];
            this.stats.ping = Date.now() - latest.time; 
            this.emit('net_stat', { ping: this.stats.ping });
        }
    }

    disconnect() {
        this.ws?.close();
    }

    on(event: string, fn: Function) {
        if (!this.handlers[event]) this.handlers[event] = [];
        this.handlers[event].push(fn);
    }

    emit(event: string, data: any) {
        if (this.handlers[event]) this.handlers[event].forEach(fn => fn(data));
    }
}
