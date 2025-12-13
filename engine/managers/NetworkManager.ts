
import Peer, { DataConnection } from 'peerjs';
import { Entity, GameMode, FactionType } from '../../types';

// Protocol Opcodes
const OP = {
    JOIN_REQ: 1,
    JOIN_ACK: 2,
    WORLD_STATE: 3, // Full state (High bandwidth, rare)
    WORLD_DELTA: 4, // Changes only (Low bandwidth, frequent)
    INPUT: 5,
    CHAT: 6,
    PING: 7,
    PONG: 8,
    LEADERBOARD: 9,
    EVENT: 10 // Sound/Particles
};

export class NetworkManager {
    public isHost: boolean = false;
    public myId: string | null = null;
    public connections: Map<string, DataConnection> = new Map();
    private hostConn: DataConnection | null = null;
    private handlers: Record<string, Function[]> = {};
    
    // Snapshot Buffer for Interpolation
    public snapshots: any[] = [];
    public serverTimeOffset: number = 0;

    // Stats
    public stats = { ping: 0, rtt: 0, packetsIn: 0, packetsOut: 0, bytesIn: 0, bytesOut: 0 };

    constructor() {
        setInterval(() => this.resetStats(), 1000);
        setInterval(() => this.measurePing(), 1000);
    }

    private resetStats() {
        this.stats.packetsIn = 0; this.stats.packetsOut = 0;
        this.stats.bytesIn = 0; this.stats.bytesOut = 0;
    }

    // --- HOSTING ---
    async hostGame(info: { name: string, mode: GameMode }): Promise<string> {
        this.isHost = true;
        const peer = new Peer();
        
        return new Promise((resolve, reject) => {
            peer.on('open', (id) => {
                this.myId = id;
                console.log(`[NET] HOST STARTED: ${id}`);
                resolve(id);
            });
            peer.on('connection', (conn) => this.handleIncoming(conn));
            peer.on('error', reject);
        });
    }

    // --- JOINING ---
    async joinGame(hostId: string, playerInfo: any): Promise<void> {
        this.isHost = false;
        const peer = new Peer();

        return new Promise((resolve, reject) => {
            peer.on('open', (id) => {
                this.myId = id;
                const conn = peer.connect(hostId, { reliable: true });
                conn.on('open', () => {
                    this.hostConn = conn;
                    this.send(OP.JOIN_REQ, { ...playerInfo, id });
                    resolve();
                });
                conn.on('data', (data) => this.processMessage(data));
                conn.on('close', () => this.emit('disconnected', null));
                conn.on('error', reject);
            });
        });
    }

    private send(op: number, data: any) {
        if (this.hostConn && this.hostConn.open) {
            this.hostConn.send([op, data, Date.now()]);
        }
    }

    // --- MESSAGE HANDLING ---
    private handleIncoming(conn: DataConnection) {
        this.connections.set(conn.peer, conn);
        conn.on('data', (data) => {
            this.processMessage(data, conn.peer);
        });
        conn.on('close', () => {
            this.connections.delete(conn.peer);
            this.emit('player_left', { id: conn.peer });
        });
    }

    private processMessage(raw: any, senderId?: string) {
        // Simple packet structure: [OP, Payload, Timestamp]
        const [op, data, ts] = raw;
        this.stats.packetsIn++;
        this.stats.bytesIn += JSON.stringify(raw).length; // Approx

        switch (op) {
            case OP.JOIN_REQ:
                this.emit('player_joined', { ...data, id: senderId });
                break;
            case OP.JOIN_ACK:
                // We are accepted, data contains initial world state
                this.emit('connected', data);
                break;
            case OP.WORLD_STATE:
                // Push to snapshot buffer
                this.snapshots.push({ time: Date.now(), entities: data });
                if (this.snapshots.length > 20) this.snapshots.shift(); // Keep buffer small
                break;
            case OP.INPUT:
                this.emit('remote_input', { id: senderId, ...data });
                break;
            case OP.PING:
                if (this.isHost && senderId) {
                    const conn = this.connections.get(senderId);
                    if (conn) conn.send([OP.PONG, null, ts]);
                }
                break;
            case OP.PONG:
                this.stats.rtt = Date.now() - ts;
                this.stats.ping = Math.floor(this.stats.rtt / 2);
                this.emit('net_stat', { ping: this.stats.ping });
                break;
            case OP.CHAT:
                this.emit('chat', data);
                if (this.isHost) this.broadcast(OP.CHAT, data, senderId); // Relay
                break;
            case OP.LEADERBOARD:
                this.emit('leaderboard', data);
                break;
        }
    }

    // --- SENDING ---
    public sendInput(input: any) {
        if (!this.isHost && this.hostConn) {
            this.hostConn.send([OP.INPUT, input, Date.now()]);
        }
    }

    public broadcastWorldState(entities: Entity[]) {
        if (!this.isHost) return;
        
        // Optimize: Round numbers, remove static entities (walls) from frequent updates
        const minData = entities
            .filter(e => e.type !== 'WALL' && e.type !== 'ZONE')
            .map(e => ({
                id: e.id,
                t: e.type,
                x: Math.round(e.pos.x),
                y: Math.round(e.pos.y),
                r: Number(e.rotation.toFixed(2)),
                h: Math.ceil(e.health),
                m: Math.ceil(e.maxHealth),
                c: e.color,
                cp: e.classPath,
                n: e.name,
                ti: e.teamId
            }));

        this.broadcast(OP.WORLD_STATE, minData);
    }

    public sendWelcomePackage(playerId: string, entities: Entity[]) {
        const conn = this.connections.get(playerId);
        if (conn) {
            // Full reliable state for new player
            const fullState = entities.map(e => ({
                ...e,
                pos: { x: Math.round(e.pos.x), y: Math.round(e.pos.y) }
            }));
            conn.send([OP.JOIN_ACK, fullState, Date.now()]);
        }
    }

    public broadcast(op: number, data: any, excludeId?: string) {
        const packet = [op, data, Date.now()];
        this.stats.packetsOut += this.connections.size; // Approx
        this.connections.forEach((conn, id) => {
            if (id !== excludeId && conn.open) conn.send(packet);
        });
    }

    public sendChat(msg: string, sender: string) {
        const payload = { sender, content: msg };
        if (this.isHost) {
            this.emit('chat', payload); // Local echo
            this.broadcast(OP.CHAT, payload);
        } else if (this.hostConn) {
            this.hostConn.send([OP.CHAT, payload, Date.now()]);
        }
    }

    public broadcastLeaderboard(data: any) {
        this.broadcast(OP.LEADERBOARD, data);
    }

    private measurePing() {
        if (!this.isHost && this.hostConn) {
            this.hostConn.send([OP.PING, null, Date.now()]);
        }
    }

    // --- EVENTS ---
    on(event: string, fn: Function) {
        if (!this.handlers[event]) this.handlers[event] = [];
        this.handlers[event].push(fn);
    }

    emit(event: string, data: any) {
        if (this.handlers[event]) this.handlers[event].forEach(fn => fn(data));
    }

    disconnect() {
        if (this.isHost) {
            this.connections.forEach(c => c.close());
        } else {
            this.hostConn?.close();
        }
    }
}
