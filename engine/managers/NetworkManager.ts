
import { Entity, GameMode, EntityType } from '../../types';
import { WORLD_SIZE } from '../../constants';

const OP_JOIN = 1;
const OP_WORLD_UPDATE = 2;
const OP_INPUT = 3;
const OP_INIT = 4;

export class NetworkManager {
    public isConnected: boolean = false;
    public myNetId: number | null = null;
    
    private ws: WebSocket | null = null;
    
    // Snapshot Interpolation Buffer
    private snapshots: { time: number, entities: Map<number, any> }[] = [];
    private renderDelay = 100; // 100ms interpolation buffer (smoothness vs latency trade-off)

    private handlers: Record<string, Function[]> = {};

    public stats = { ping: 0, packetsIn: 0, packetsOut: 0 };

    constructor() {}

    async hostGame(settings: any): Promise<string> {
        // Mock hosting logic for P2P/Local mode compatibility
        // In a real implementation, this would request a room ID from a matchmaking server
        await this.joinGame({ ...settings, isHost: true });
        return "local_room_" + Math.floor(Math.random() * 10000);
    }

    async joinGame(roomIdOrInfo: string | any, playerInfo?: any): Promise<void> {
        let info = roomIdOrInfo;
        if (typeof roomIdOrInfo === 'string') {
            info = playerInfo || {};
            info.roomId = roomIdOrInfo;
        }

        return new Promise((resolve, reject) => {
            const uid = info.id || `guest_${Math.random().toString(36).slice(2)}`;
            const roomParam = info.roomId ? `&room=${info.roomId}` : '';
            
            // --- CONNECTION LOGIC UPDATE ---
            // 1. Check for Environment Variable (For Vercel Production)
            // 2. Fallback to Localhost logic if not set
            let wsUrl = "";
            
            // @ts-ignore
            const envUrl = import.meta.env.VITE_GAME_SERVER_URL;

            if (envUrl) {
                // If provided via Env Var (e.g. wss://my-game-server.railway.app)
                wsUrl = `${envUrl}/ws?uid=${uid}${roomParam}`;
            } else {
                // Localhost Development fallback
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.hostname;
                const port = '8080';
                wsUrl = `${protocol}//${host}:${port}/ws?uid=${uid}${roomParam}`;
            }

            console.log(`[NET] Connecting to ${wsUrl}`);
            this.ws = new WebSocket(wsUrl);
            this.ws.binaryType = 'arraybuffer';

            this.ws.onopen = () => {
                this.isConnected = true;
                resolve();
            };

            this.ws.onmessage = (event) => this.handleMessage(event.data);
            this.ws.onclose = () => this.emit('disconnected', null);
            this.ws.onerror = (err) => reject(err);
        });
    }

    // High Frequency Input Sending (60Hz)
    sendInput(input: { x: number, y: number, r: number, fire: boolean }) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        // Create a compact binary packet: 14 bytes
        const buffer = new ArrayBuffer(14);
        const view = new DataView(buffer);
        
        view.setUint8(0, OP_INPUT);
        view.setFloat32(1, input.x, true);
        view.setFloat32(5, input.y, true);
        view.setFloat32(9, input.r, true);
        view.setUint8(13, input.fire ? 1 : 0);

        this.ws.send(buffer);
        this.stats.packetsOut++;
    }

    private handleMessage(data: ArrayBuffer | string) {
        this.stats.packetsIn++;

        // 1. Binary World Update
        if (data instanceof ArrayBuffer) {
            const view = new DataView(data);
            const op = view.getUint8(0);

            if (op === OP_WORLD_UPDATE) {
                const serverTime = view.getFloat64(1, true);
                const count = view.getUint16(9, true);
                let offset = 11;

                const entities = new Map();
                for (let i = 0; i < count; i++) {
                    const netId = view.getUint16(offset, true); offset += 2;
                    const x = (view.getUint16(offset, true) / 65535) * WORLD_SIZE; offset += 2;
                    const y = (view.getUint16(offset, true) / 65535) * WORLD_SIZE; offset += 2;
                    const r = (view.getUint8(offset) / 255) * (Math.PI * 2) - Math.PI; offset += 1;
                    const hp = view.getUint8(offset); offset += 1;

                    entities.set(netId, { x, y, r, hp });
                }

                this.snapshots.push({ time: Date.now(), entities });
                // Trim buffer
                if (this.snapshots.length > 20) this.snapshots.shift();
            }
            return;
        }

        // 2. JSON Events (Init, Chat, etc)
        if (typeof data === 'string') {
            try {
                const msg = JSON.parse(data);
                if (msg.t === OP_INIT) {
                    this.myNetId = msg.d.netId;
                    this.emit('connected', msg.d);
                } else if (msg.t === OP_JOIN) {
                    this.emit('player_joined', msg.d);
                }
            } catch (e) { console.error(e); }
        }
    }

    // The Magic: Get smoothed position for an entity
    public getInterpolatedState(netId: number) {
        const renderTime = Date.now() - this.renderDelay;
        
        // Find snapshots around renderTime
        for (let i = 0; i < this.snapshots.length - 1; i++) {
            if (this.snapshots[i].time <= renderTime && this.snapshots[i+1].time >= renderTime) {
                const prev = this.snapshots[i];
                const next = this.snapshots[i+1];
                const pEnt = prev.entities.get(netId);
                const nEnt = next.entities.get(netId);

                if (pEnt && nEnt) {
                    const ratio = (renderTime - prev.time) / (next.time - prev.time);
                    // Lerp
                    return {
                        x: pEnt.x + (nEnt.x - pEnt.x) * ratio,
                        y: pEnt.y + (nEnt.y - pEnt.y) * ratio,
                        r: this.lerpAngle(pEnt.r, nEnt.r, ratio),
                        hp: nEnt.hp
                    };
                }
            }
        }
        return null;
    }

    private lerpAngle(start: number, end: number, t: number) {
        let diff = end - start;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        return start + diff * t;
    }

    on(event: string, fn: Function) {
        if (!this.handlers[event]) this.handlers[event] = [];
        this.handlers[event].push(fn);
    }

    emit(event: string, data: any) {
        if (this.handlers[event]) this.handlers[event].forEach(fn => fn(data));
    }
    
    disconnect() { this.ws?.close(); }
}
