
import { ServerRegion, GameMode, FactionType, Entity, EntityType } from '../../types';
import { auth } from '../../firebase';
import { WORLD_SIZE } from '../../constants';

// --- INTERPOLATION TYPES ---
interface Snapshot {
    time: number;
    entities: Map<number, EntityState>;
}

interface EntityState {
    x: number;
    y: number;
    r: number;
    hpPct: number;
}

type NetworkEventHandler = (data: any) => void;

export class NetworkManager {
    private handlers: Record<string, NetworkEventHandler[]> = {};
    public isConnected: boolean = false;
    public isHost: boolean = false; 
    
    private myId: string | null = null;
    private myNetId: number | null = null;
    
    private ws: WebSocket | null = null;

    // --- SNAPSHOT INTERPOLATION BUFFER ---
    private snapshots: Snapshot[] = [];
    private netIdMap: Map<number, string> = new Map(); // NetID (short) -> UUID (string)
    
    // Time Sync
    private serverTimeOffset: number = 0;
    private renderDelay: number = 100; // 100ms interpolation buffer (standard for smooth .io)

    constructor() {}

    connect(region: ServerRegion, playerInfo: { name: string; tank: string; mode: GameMode; faction: FactionType }) {
        const userId = auth.currentUser ? auth.currentUser.uid : `guest_${Math.random().toString(36).substr(2, 5)}`;
        this.myId = userId;

        let wsUrl = region.url;
        if (region.url === 'public') {
             const isHttps = window.location.protocol === 'https:';
             const protocol = isHttps ? 'wss:' : 'ws:';
             
             let hostname = window.location.hostname;
             let port = window.location.port;

             // DEV FIX: If running on Vite default port (5173), assume backend is on 8080
             if (port === '5173' && hostname === 'localhost') {
                 port = '8080';
             }
             
             // Fallback for local development or file:// protocol where host might be empty
             if (!hostname) {
                 hostname = 'localhost';
                 port = '8080';
             }
             
             const portStr = port ? `:${port}` : '';
             wsUrl = `${protocol}//${hostname}${portStr}`;
        }
        wsUrl += `?room=${playerInfo.mode}&uid=${userId}&name=${encodeURIComponent(playerInfo.name)}`;

        console.log(`[NET] Attempting connection to: ${wsUrl}`);

        try {
            this.ws = new WebSocket(wsUrl);
            this.ws.binaryType = "arraybuffer"; 

            this.ws.onopen = () => {
                console.log("[NET] Connected via Binary Protocol");
                this.isConnected = true;
                this.emit('connected', { isHost: false });
            };

            this.ws.onmessage = (event) => {
                if (event.data instanceof ArrayBuffer) {
                    this.processBinarySnapshot(event.data);
                } else {
                    try {
                        const msg = JSON.parse(event.data as string);
                        this.handleJsonEvent(msg);
                    } catch (e) { console.warn("Packet Error", e); }
                }
            };
            
            this.ws.onclose = (e) => { 
                this.isConnected = false; 
                this.emit('disconnected', {}); 
                if (!e.wasClean) {
                    console.log(`[NET] Connection closed unexpectedly. Code: ${e.code}, Reason: ${e.reason}`);
                }
            };
            
            this.ws.onerror = (e) => {
                // WebSocket errors are often silent in JS for security, but we can log that it happened.
                console.warn("[NET] Socket Error. If local, ensure 'node server/index.js' is running on port 8080.");
            };
        } catch (e) {
            console.error("[NET] Failed to construct WebSocket:", e);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.snapshots = [];
        this.netIdMap.clear();
    }

    // --- INCOMING DATA HANDLING ---

    private handleJsonEvent(msg: any) {
        if (msg.t === 'hello') {
            this.myNetId = msg.netId;
            this.netIdMap.set(msg.netId, this.myId!);
            console.log(`[NET] Handshake. My NetID: ${this.myNetId}`);
            
            // Initial position sync (Teleport)
            if (msg.x && msg.y) {
                this.emit('teleport', { x: msg.x, y: msg.y });
            }
        }
        else if (msg.t === 'init') {
            msg.d.forEach((p: any) => {
                this.netIdMap.set(p.netId, p.id);
                this.emit('player_joined', p);
            });
        }
        else if (msg.t === 'j') {
            this.netIdMap.set(msg.d.netId, msg.d.id);
            if (msg.d.id !== this.myId) this.emit('player_joined', msg.d);
        }
        else if (msg.t === 'l') {
            this.emit('player_left', msg.d);
        }
        else if (msg.t === 'c') {
            this.emit('chat_message', msg.d);
        }
    }

    private processBinarySnapshot(buffer: ArrayBuffer) {
        const view = new DataView(buffer);
        let offset = 0;

        const type = view.getUint8(offset); offset += 1;

        if (type === 2) { // MSG_WORLD_UPDATE
            const serverTime = view.getFloat64(offset, true); offset += 8;
            const count = view.getUint16(offset, true); offset += 2;

            const snapshot: Snapshot = {
                time: serverTime,
                entities: new Map()
            };

            // Calculate Time Offset (Moving Average) to sync clocks
            const now = Date.now();
            const latency = now - serverTime; 
            // We assume one-way latency is roughly half of RTT, but for simplified sync:
            // renderTime = serverTime - buffer. 
            // We just store serverTime relative to local time.
            // Simple approach: Use server timestamps directly for interpolation.

            for (let i = 0; i < count; i++) {
                const netId = view.getUint16(offset, true); offset += 2;
                
                // Decompression: 0-65535 -> 0-WORLD_SIZE
                const cx = view.getUint16(offset, true); offset += 2;
                const cy = view.getUint16(offset, true); offset += 2;
                
                const x = (cx / 65535) * 5000; // Hardcoded WORLD_SIZE for now, should be config
                const y = (cy / 65535) * 5000;

                // Decompression: 0-255 -> -PI to PI
                const rotByte = view.getUint8(offset); offset += 1;
                const r = (rotByte / 255) * (Math.PI * 2) - Math.PI;

                const hpPct = view.getUint8(offset); offset += 1;

                snapshot.entities.set(netId, { x, y, r, hpPct });
            }

            this.snapshots.push(snapshot);
            // Limit buffer size
            if (this.snapshots.length > 20) this.snapshots.shift();
        }
    }

    // --- OUTGOING DATA HANDLING (Binary) ---
    
    // Pre-allocate buffer for performance
    private inputBuffer = new ArrayBuffer(13);
    private inputView = new DataView(this.inputBuffer);

    syncPlayerState(pos: {x: number, y: number}, vel: {x: number, y: number}, rotation: number) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        // Protocol: [Type(1)][VX(4)][VY(4)][Rot(4)]
        this.inputView.setUint8(0, 1); // MSG_INPUT
        this.inputView.setFloat32(1, vel.x, true);
        this.inputView.setFloat32(5, vel.y, true);
        this.inputView.setFloat32(9, rotation, true);

        this.ws.send(this.inputBuffer);
    }
    
    syncPlayerDetails(health: number, maxHealth: number, score: number, classPath: string) {
        // Low priority sync via JSON
        if (this.ws && this.ws.readyState === WebSocket.OPEN && Math.random() < 0.02) { // Once every ~50 frames
             this.ws.send(JSON.stringify({ t: 's', d: { hp: health, maxHp: maxHealth, score, classPath } }));
        }
    }

    sendChat(message: string, sender: string) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ t: 'c', d: message }));
        }
    }

    // --- INTERPOLATION ENGINE (The Magic) ---
    
    public processInterpolation(entities: Entity[]) {
        if (this.snapshots.length < 2) return;

        // We render at (CurrentTime - renderDelay).
        // This ensures we always have a "next" snapshot to interpolate towards.
        const now = Date.now();
        // Server time estimation: Take the latest snapshot time and subtract elapsed real time?
        // Simpler approach: Use the timestamps in the snapshots.
        // The render time is defined by the latest snapshot's time minus buffer.
        const latestTime = this.snapshots[this.snapshots.length - 1].time;
        const renderTime = latestTime - this.renderDelay;

        // 1. Find the two snapshots surrounding renderTime
        let prev: Snapshot | null = null;
        let next: Snapshot | null = null;

        for (let i = this.snapshots.length - 2; i >= 0; i--) {
            if (this.snapshots[i].time <= renderTime) {
                prev = this.snapshots[i];
                next = this.snapshots[i + 1];
                break;
            }
        }

        // If we don't have data (lag spike), extrapolate or snap to latest
        if (!prev || !next) {
            // Fallback: Snap to latest
            /*
            const snap = this.snapshots[this.snapshots.length - 1];
            snap.entities.forEach((state, netId) => {
                this.updateEntity(entities, netId, state, 1.0); // Snap
            });
            */
            return;
        }

        // 2. Calculate Interpolation Alpha (0.0 to 1.0)
        const total = next.time - prev.time;
        const current = renderTime - prev.time;
        const alpha = Math.max(0, Math.min(1, current / total));

        // 3. Apply to Entities
        next.entities.forEach((nextState, netId) => {
            const prevState = prev!.entities.get(netId);
            if (prevState) {
                this.updateEntity(entities, netId, prevState, nextState, alpha);
            }
        });
    }

    private updateEntity(entities: Entity[], netId: number, prev: EntityState, next: EntityState, alpha: number) {
        // Skip local player (Prediction handles it)
        if (netId === this.myNetId) {
            // Optional: Implement Server Reconciliation here (Correct position if drifting)
            // For now, we trust client prediction for responsiveness
            return;
        }

        const stringId = this.netIdMap.get(netId);
        if (!stringId) return;

        const entity = entities.find(e => e.id === stringId);
        if (entity) {
            // Pos
            entity.pos.x = prev.x + (next.x - prev.x) * alpha;
            entity.pos.y = prev.y + (next.y - prev.y) * alpha;
            
            // Rotation (Handle wrapping)
            let da = next.r - prev.r;
            if (da > Math.PI) da -= Math.PI * 2;
            if (da < -Math.PI) da += Math.PI * 2;
            entity.rotation = prev.r + da * alpha;

            // Health
            entity.health = (next.hpPct / 100) * entity.maxHealth;
        }
    }

    on(event: string, handler: NetworkEventHandler) {
        if (!this.handlers[event]) this.handlers[event] = [];
        this.handlers[event].push(handler);
    }

    private emit(event: string, data: any) {
        if (this.handlers[event]) this.handlers[event].forEach(handler => handler(data));
    }
}
