import { ServerRegion, GameMode, FactionType, Entity, EntityType } from '../../types';
import { WORLD_SIZE } from '../../constants';

// --- BINARY PROTOCOL SCHEMA ---
// 1. INPUT (Client -> Server): [TYPE:1][VX:f32][VY:f32][ROT:f32][SEQ:u16]
// 2. WORLD (Server -> Client): [TYPE:2][TIME:f64][COUNT:u16]...[NETID:u16][X:u16][Y:u16][ROT:u8][HP:u8][LAST_SEQ:u16]

interface Snapshot {
    time: number;
    entities: Map<number, EntityState>;
}

interface EntityState {
    x: number;
    y: number;
    r: number;
    hpPct: number;
    vx?: number; 
    vy?: number; 
    lastSeq?: number; // Server ack of input
}

type NetworkEventHandler = (data: any) => void;

export class NetworkManager {
    private handlers: Record<string, NetworkEventHandler[]> = {};
    public isConnected: boolean = false;
    public isHost: boolean = false; 
    
    private myId: string | null = null;
    private myNetId: number | null = null;
    
    private ws: WebSocket | null = null;

    private snapshots: Snapshot[] = [];
    private netIdMap: Map<number, string> = new Map(); 
    
    private serverTimeOffset: number = 0;
    private renderDelay: number = 100;
    
    private lastInputTime: number = 0;
    private readonly INPUT_RATE = 1000 / 30; 

    // Sequence Numbering for Deterministic Input
    private inputSequence: number = 0;

    // Reusable Buffers (Size increased for SEQ)
    private inputBuffer = new ArrayBuffer(16);
    private inputView = new DataView(this.inputBuffer);

    constructor() {}

    async connect(region: ServerRegion, playerInfo: { name: string; tank: string; mode: GameMode; faction: FactionType }) {
        const userId = `guest_${Math.random().toString(36).substr(2, 8)}`;
        this.myId = userId;

        let wsUrl = region.url;
        if (region.url === 'public') {
             const isHttps = window.location.protocol === 'https:';
             const protocol = isHttps ? 'wss:' : 'ws:';
             let hostname = window.location.hostname;
             let port = window.location.port;
             if (port === '5173' && hostname === 'localhost') port = '8080';
             if (!hostname) { hostname = 'localhost'; port = '8080'; }
             const portStr = port ? `:${port}` : '';
             wsUrl = `${protocol}//${hostname}${portStr}/ws`;
        }
        
        wsUrl += `?uid=${userId}&name=${encodeURIComponent(playerInfo.name)}`;

        try {
            this.ws = new WebSocket(wsUrl);
            this.ws.binaryType = "arraybuffer";

            this.ws.onopen = () => {
                console.log("%c[NET] Connected to Lobby", "color: #0f0; font-weight: bold;");
                this.isConnected = true;
                this.joinRoom(playerInfo.mode);
            };

            this.ws.onmessage = (event) => {
                if (event.data instanceof ArrayBuffer) {
                    this.processBinarySnapshot(event.data);
                } else {
                    try {
                        const msg = JSON.parse(event.data as string);
                        this.handleJsonEvent(msg);
                    } catch (e) { }
                }
            };
            
            this.ws.onclose = (e) => { 
                this.isConnected = false; 
                this.emit('disconnected', {}); 
            };
            
            this.ws.onerror = (e) => {
                console.warn("[NET] Socket Error.");
            };
        } catch (e) {
            console.error("[NET] Connection Failed:", e);
        }
    }

    private joinRoom(roomName: string) {
        if (!this.ws) return;
        this.ws.send(JSON.stringify({
            t: 'join',
            d: { room: roomName }
        }));
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

    private handleJsonEvent(msg: any) {
        if (msg.t === 'hello') {
            // Check for restored data
            if (msg.restore) {
                console.log("[NET] Restoring Session Data...", msg.restore);
                // Important: Engine listens to this to restore class/level
                this.emit('restore_data', msg.restore);
            }
        }
        else if (msg.t === 'stats') {
            this.emit('server_stats', msg.d);
        }
        else if (msg.t === 'init') {
            if (msg.self) {
                this.myNetId = msg.self.netId;
                this.netIdMap.set(msg.self.netId, this.myId!);
                this.emit('teleport', { x: msg.self.x, y: msg.self.y });
                this.emit('connected', { isHost: false });
            }
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

        if (type === 2) { 
            const serverTime = view.getFloat64(offset, true); offset += 8;
            const count = view.getUint16(offset, true); offset += 2;

            const snapshot: Snapshot = {
                time: serverTime,
                entities: new Map()
            };

            for (let i = 0; i < count; i++) {
                const netId = view.getUint16(offset, true); offset += 2;
                
                const cx = view.getUint16(offset, true); offset += 2;
                const cy = view.getUint16(offset, true); offset += 2;
                
                const x = (cx / 65535) * WORLD_SIZE; 
                const y = (cy / 65535) * WORLD_SIZE;

                const rotByte = view.getUint8(offset); offset += 1;
                const r = (rotByte / 255) * (Math.PI * 2) - Math.PI;

                const hpPct = view.getUint8(offset); offset += 1;
                
                // Get Last Processed Input Sequence (for Reconciliation)
                const lastSeq = view.getUint16(offset, true); offset += 2;

                snapshot.entities.set(netId, { x, y, r, hpPct, lastSeq });
            }

            if (this.snapshots.length > 0) {
                const prev = this.snapshots[this.snapshots.length - 1];
                const dt = (serverTime - prev.time) / 1000;
                if (dt > 0) {
                    snapshot.entities.forEach((state, netId) => {
                        const prevState = prev.entities.get(netId);
                        if (prevState) {
                            state.vx = (state.x - prevState.x) / dt;
                            state.vy = (state.y - prevState.y) / dt;
                        } else {
                            state.vx = 0; state.vy = 0;
                        }
                    });
                }
            }

            this.snapshots.push(snapshot);
            if (this.snapshots.length > 20) this.snapshots.shift();
        }
    }

    syncPlayerState(pos: {x: number, y: number}, vel: {x: number, y: number}, rotation: number) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const now = Date.now();
        if (now - this.lastInputTime < this.INPUT_RATE) return;
        this.lastInputTime = now;

        this.inputSequence++;
        if (this.inputSequence > 65535) this.inputSequence = 0;

        // Protocol: [1][VX][VY][ROT][SEQ] (15 bytes)
        this.inputView.setUint8(0, 1); 
        this.inputView.setFloat32(1, vel.x, true);
        this.inputView.setFloat32(5, vel.y, true);
        this.inputView.setFloat32(9, rotation, true);
        this.inputView.setUint16(13, this.inputSequence, true); // Send Seq

        this.ws.send(this.inputBuffer);
    }
    
    // Sync persistence data to server
    syncPlayerDetails(health: number, maxHealth: number, score: number, classPath: string, level: number, xp: number) {
        // Send occassionally via JSON to keep server memory updated
        // 5% chance per frame (~1-2 times per second) is enough
        if (this.ws && Math.random() < 0.05) {
             this.ws.send(JSON.stringify({
                 t: 'update_stat',
                 d: { level, xp, classPath, score }
             }));
        }
    }

    sendChat(message: string, sender: string) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ t: 'c', d: message }));
        }
    }

    public processInterpolation(entities: Entity[], dt: number) {
        const renderTime = this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1].time - this.renderDelay : 0;

        let prev: Snapshot | null = null;
        let next: Snapshot | null = null;

        for (let i = this.snapshots.length - 1; i >= 0; i--) {
            if (this.snapshots[i].time <= renderTime) {
                prev = this.snapshots[i];
                if (i + 1 < this.snapshots.length) {
                    next = this.snapshots[i + 1];
                }
                break;
            }
        }

        if (!next || !prev) return;

        const totalWindow = next.time - prev.time;
        const timeIntoWindow = renderTime - prev.time;
        const alpha = Math.max(0, Math.min(1, timeIntoWindow / totalWindow));

        next.entities.forEach((nextState, netId) => {
            // For Reconciliation: We could check nextState.lastSeq here
            // But for simple smoothing, we still skip self if prediction is enabled
            if (netId === this.myNetId) return;

            const stringId = this.netIdMap.get(netId);
            if (!stringId) return;

            const entity = entities.find(e => e.id === stringId);
            const prevState = prev!.entities.get(netId);

            if (entity && prevState) {
                const targetX = prevState.x + (nextState.x - prevState.x) * alpha;
                const targetY = prevState.y + (nextState.y - prevState.y) * alpha;
                
                if (Math.abs(targetX - entity.pos.x) > 500) {
                    entity.pos.x = targetX;
                    entity.pos.y = targetY;
                } else {
                    entity.pos.x = targetX;
                    entity.pos.y = targetY;
                }
                
                let da = nextState.r - prevState.r;
                while (da > Math.PI) da -= Math.PI * 2;
                while (da < -Math.PI) da += Math.PI * 2;
                entity.rotation = prevState.r + da * alpha;

                entity.health = (nextState.hpPct / 100) * entity.maxHealth;
            }
        });
    }

    on(event: string, handler: NetworkEventHandler) {
        if (!this.handlers[event]) this.handlers[event] = [];
        this.handlers[event].push(handler);
    }

    private emit(event: string, data: any) {
        if (this.handlers[event]) this.handlers[event].forEach(handler => handler(data));
    }
}