
import { ServerRegion, GameMode, FactionType, Entity } from '../../types';
import Peer, { DataConnection } from 'peerjs';

type NetworkEventHandler = (data: any) => void;

// --- PROTOCOL Opcodes (Minimize bandwidth) ---
const OP_JOIN = 1;
const OP_UPDATE = 2; // World State (High Frequency)
const OP_INPUT = 3;  // Player Input
const OP_CHAT = 4;
const OP_PING = 5;
const OP_PONG = 6;
const OP_LEADERBOARD = 7; 

export class NetworkManager {
    private handlers: Record<string, NetworkEventHandler[]> = {};
    public isConnected: boolean = false;
    public isHost: boolean = false;
    public myId: string | null = null;
    
    private peer: Peer | null = null;
    private connections: DataConnection[] = []; 
    private hostConn: DataConnection | null = null;

    public stats = {
        ping: 0,
        rtt: 0,
        packetsIn: 0,
        packetsOut: 0,
        bytesIn: 0,
        bytesOut: 0,
        lastUpdate: Date.now()
    };

    constructor() {
        setInterval(() => this.measurePing(), 1000);
        setInterval(() => {
            this.stats.packetsIn = 0; this.stats.packetsOut = 0;
            this.stats.bytesIn = 0; this.stats.bytesOut = 0;
        }, 1000);
    }

    async hostGame(playerInfo: { name: string; mode: GameMode }) {
        this.isHost = true;
        this.isConnected = true;
        this.peer = new Peer(); 

        return new Promise<string>((resolve, reject) => {
            this.peer!.on('open', (id) => {
                this.myId = id;
                console.log(`[NET] HOST STARTED: ${id}`);
                this.emit('connected', { isHost: true, id: this.myId });
                resolve(id);
            });

            this.peer!.on('connection', (conn) => {
                this.handleIncomingConnection(conn);
            });

            this.peer!.on('error', (err) => reject(err));
        });
    }

    async joinGame(hostId: string, playerInfo: { name: string; tank: string; faction: FactionType }) {
        this.isHost = false;
        this.peer = new Peer();

        return new Promise<void>((resolve, reject) => {
            this.peer!.on('open', (id) => {
                this.myId = id;
                console.log(`[NET] CONNECTING TO: ${hostId}`);
                const conn = this.peer!.connect(hostId, { reliable: true });
                
                conn.on('open', () => {
                    this.isConnected = true;
                    this.hostConn = conn;
                    
                    // Send Join Request with initial tank class
                    conn.send({
                        op: OP_JOIN,
                        data: { 
                            name: playerInfo.name, 
                            tank: playerInfo.tank,
                            faction: playerInfo.faction 
                        }
                    });

                    this.emit('connected', { isHost: false });
                    resolve();
                });

                conn.on('data', (data) => this.handleClientMessage(data));
                conn.on('close', () => { this.isConnected = false; this.emit('disconnected', {}); alert("Host Disconnected"); });
                conn.on('error', (err) => reject(err));
            });
        });
    }

    private handleIncomingConnection(conn: DataConnection) {
        this.connections.push(conn);
        this.updatePeerCount();

        conn.on('data', (raw: any) => {
            this.trackStats(raw, true);
            if (raw.op === OP_JOIN) {
                this.emit('player_joined', { id: conn.peer, ...raw.data });
            } else if (raw.op === OP_INPUT) {
                this.emit('remote_input', { id: conn.peer, ...raw.data });
            } else if (raw.op === OP_CHAT) {
                this.broadcast({ op: OP_CHAT, data: raw.data });
                this.emit('chat_message', raw.data);
            } else if (raw.op === OP_PING) {
                conn.send({ op: OP_PONG, t: raw.t });
            }
        });

        conn.on('close', () => {
            this.connections = this.connections.filter(c => c !== conn);
            this.updatePeerCount();
            this.emit('player_left', { id: conn.peer });
        });
    }

    private updatePeerCount() {
        this.emit('net_stat', { players: this.connections.length + 1, ping: 0 });
    }

    private handleClientMessage(raw: any) {
        this.trackStats(raw, true);
        
        if (raw.op === OP_UPDATE) {
            this.emit('world_update', raw.data);
        } else if (raw.op === OP_LEADERBOARD) {
            this.emit('leaderboard_update', raw.data);
        } else if (raw.op === OP_CHAT) {
            this.emit('chat_message', raw.data);
        } else if (raw.op === OP_PONG) {
            const now = Date.now();
            this.stats.rtt = now - raw.t;
            this.stats.ping = Math.floor(this.stats.rtt / 2);
            this.emit('net_stat', { players: -1, ping: this.stats.ping });
        }
    }

    private measurePing() {
        if (this.isHost) {
            this.stats.ping = 0;
            this.emit('net_stat', { players: this.connections.length + 1, ping: 0 });
        } else if (this.hostConn?.open) {
            const t = Date.now();
            this.send({ op: OP_PING, t: t });
        }
    }

    private trackStats(data: any, incoming: boolean) {
        const size = JSON.stringify(data).length * 2; 
        if (incoming) {
            this.stats.packetsIn++;
            this.stats.bytesIn += size;
        } else {
            this.stats.packetsOut++;
            this.stats.bytesOut += size;
        }
    }

    // --- BROADCAST FUNCTIONS ---

    public broadcastWorldState(entities: Entity[]) {
        if (!this.isHost || this.connections.length === 0) return;
        
        // OPTIMIZATION: Send crucial visual data (ClassPath, MaxHealth)
        const snapshot = entities.map(e => ({
            id: e.id,
            t: e.type,
            x: Math.round(e.pos.x),
            y: Math.round(e.pos.y),
            r: parseFloat(e.rotation.toFixed(2)),
            h: Math.ceil(e.health),
            m: Math.ceil(e.maxHealth), // Send Max HP (Fixes red screen)
            c: e.color,
            cp: e.classPath || 'basic', // Send Class Path (Fixes invisible tank)
            n: e.name,
            ti: e.teamId
        }));

        this.broadcast({ op: OP_UPDATE, data: snapshot });
    }

    public broadcastLeaderboard(leaderboardData: any[]) {
        if (!this.isHost || this.connections.length === 0) return;
        this.broadcast({ op: OP_LEADERBOARD, data: leaderboardData });
    }

    private broadcast(msg: any) {
        this.trackStats(msg, false);
        this.connections.forEach(c => { if (c.open) c.send(msg); });
    }

    private send(msg: any) {
        if (this.hostConn?.open) {
            this.trackStats(msg, false);
            this.hostConn.send(msg);
        }
    }

    public sendClientInput(input: any) {
        this.send({ op: OP_INPUT, data: input });
    }

    public sendChat(message: string, sender: string) {
        const payload = { sender, content: message };
        if (this.isHost) {
            this.broadcast({ op: OP_CHAT, data: payload });
            this.emit('chat_message', payload);
        } else {
            this.send({ op: OP_CHAT, data: payload });
        }
    }

    disconnect() {
        this.peer?.destroy();
        this.isConnected = false;
    }

    on(event: string, handler: NetworkEventHandler) {
        if (!this.handlers[event]) this.handlers[event] = [];
        this.handlers[event].push(handler);
    }

    private emit(event: string, data: any) {
        if (this.handlers[event]) this.handlers[event].forEach(handler => handler(data));
    }
}
