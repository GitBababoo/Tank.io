
import { ServerRegion, GameMode, FactionType, Entity } from '../../types';
import Peer, { DataConnection } from 'peerjs';

type NetworkEventHandler = (data: any) => void;

// Protocol Constants
const OP_JOIN = 1;
const OP_UPDATE = 2;
const OP_INPUT = 3;
const OP_CHAT = 4;
const OP_PING = 5; // NEW: Ping operation
const OP_PONG = 6; // NEW: Pong operation

export class NetworkManager {
    private handlers: Record<string, NetworkEventHandler[]> = {};
    public isConnected: boolean = false;
    public isHost: boolean = false;
    public myId: string | null = null;
    
    private peer: Peer | null = null;
    private connections: DataConnection[] = []; 
    private hostConn: DataConnection | null = null;

    // Monitoring Stats
    public latency: number = 0;
    public connectedPeers: number = 0;
    private lastPingTime: number = 0;

    constructor() {
        // Start Ping Loop
        setInterval(() => this.measurePing(), 1000);
    }

    // ... (Host/Join Logic remains same until we attach listeners) ...

    async hostGame(playerInfo: { name: string; mode: GameMode }) {
        this.isHost = true;
        this.isConnected = true;
        this.peer = new Peer(); // Auto-generate ID

        return new Promise<string>((resolve, reject) => {
            this.peer!.on('open', (id) => {
                this.myId = id;
                console.log(`[NET] Hosting Room: ${id}`);
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
                const conn = this.peer!.connect(hostId, { reliable: true });
                
                conn.on('open', () => {
                    this.isConnected = true;
                    this.hostConn = conn;
                    
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
                conn.on('close', () => { this.isConnected = false; alert("Host Disconnected"); });
                conn.on('error', (err) => reject(err));
            });
        });
    }

    private handleIncomingConnection(conn: DataConnection) {
        this.connections.push(conn);
        this.updatePeerCount();

        conn.on('data', (raw: any) => {
            if (raw.op === OP_JOIN) {
                this.emit('player_joined', { id: conn.peer, ...raw.data });
            } else if (raw.op === OP_INPUT) {
                this.emit('remote_input', { id: conn.peer, ...raw.data });
            } else if (raw.op === OP_CHAT) {
                this.broadcast({ op: OP_CHAT, data: raw.data });
                this.emit('chat_message', raw.data);
            } else if (raw.op === OP_PING) {
                // Reply to Ping immediately
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
        this.connectedPeers = this.connections.length;
        // Emit to UI
        this.emit('net_stat', { players: this.connectedPeers + 1, ping: 0 });
    }

    private handleClientMessage(raw: any) {
        if (raw.op === OP_UPDATE) {
            this.emit('world_update', raw.data);
        } else if (raw.op === OP_CHAT) {
            this.emit('chat_message', raw.data);
        } else if (raw.op === OP_PONG) {
            // Calculate Latency (Round Trip Time)
            const now = Date.now();
            this.latency = now - raw.t;
            this.emit('net_stat', { players: -1, ping: this.latency }); // -1 means don't update players count (Client doesn't know total)
        }
    }

    // --- REAL PING MEASUREMENT ---
    private measurePing() {
        if (this.isHost) {
            // Host has 0 ping
            this.latency = 0;
            this.emit('net_stat', { players: this.connections.length + 1, ping: 0 });
        } else if (this.hostConn?.open) {
            const t = Date.now();
            this.hostConn.send({ op: OP_PING, t: t });
        }
    }

    // ... (Broadcast and Send Input methods remain roughly the same) ...

    public broadcastWorldState(entities: Entity[]) {
        if (!this.isHost || this.connections.length === 0) return;
        
        // Optimization: Create lightweight snapshot
        const snapshot = entities.map(e => ({
            id: e.id,
            t: e.type,
            x: Math.round(e.pos.x),
            y: Math.round(e.pos.y),
            r: parseFloat(e.rotation.toFixed(2)),
            h: Math.ceil(e.health),
            m: Math.ceil(e.maxHealth),
            c: e.color,
            cp: e.classPath,
            n: e.name,
            ti: e.teamId
        }));

        this.broadcast({ op: OP_UPDATE, data: snapshot });
    }

    private broadcast(msg: any) {
        this.connections.forEach(c => { if (c.open) c.send(msg); });
    }

    public sendClientInput(input: any) {
        if (this.hostConn?.open) this.hostConn.send({ op: OP_INPUT, data: input });
    }

    public sendChat(message: string, sender: string) {
        const payload = { sender, content: message };
        if (this.isHost) {
            this.broadcast({ op: OP_CHAT, data: payload });
            this.emit('chat_message', payload);
        } else if (this.hostConn?.open) {
            this.hostConn.send({ op: OP_CHAT, data: payload });
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
    
    // Legacy stubs
    syncPlayerState() {} 
    syncPlayerDetails() {}
    processInterpolation() {}
}
