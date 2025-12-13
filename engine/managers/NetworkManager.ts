
import { ServerRegion, GameMode, FactionType, Entity } from '../../types';
import Peer, { DataConnection } from 'peerjs';

type NetworkEventHandler = (data: any) => void;

// Protocol Constants to save bandwidth
const OP_JOIN = 1;
const OP_UPDATE = 2;
const OP_INPUT = 3;
const OP_CHAT = 4;

export class NetworkManager {
    private handlers: Record<string, NetworkEventHandler[]> = {};
    public isConnected: boolean = false;
    public isHost: boolean = false;
    public myId: string | null = null;
    
    private peer: Peer | null = null;
    private connections: DataConnection[] = []; // For Host: list of clients
    private hostConn: DataConnection | null = null; // For Client: connection to host

    private lastSyncTime: number = 0;
    private readonly HOST_UPDATE_RATE = 50; // Host broadcasts world every 50ms (20 ticks/sec)

    constructor() {}

    // --- HOST MODE: Create a Game ---
    async hostGame(playerInfo: { name: string; mode: GameMode }) {
        this.isHost = true;
        this.isConnected = true;
        
        // Use a random ID or a fixed one based on name for testing
        // Creating a Peer with no ID lets PeerJS server assign one
        this.peer = new Peer();

        return new Promise<string>((resolve, reject) => {
            this.peer!.on('open', (id) => {
                this.myId = id;
                console.log(`[NET] Hosting Game. Room ID: ${id}`);
                this.emit('connected', { isHost: true, id: this.myId });
                resolve(id);
            });

            this.peer!.on('connection', (conn) => {
                this.handleIncomingConnection(conn);
            });

            this.peer!.on('error', (err) => {
                console.error("[NET] Peer Error:", err);
                reject(err);
            });
        });
    }

    // --- CLIENT MODE: Join a Game ---
    async joinGame(hostId: string, playerInfo: { name: string; tank: string; faction: FactionType }) {
        this.isHost = false;
        this.peer = new Peer();

        return new Promise<void>((resolve, reject) => {
            this.peer!.on('open', (id) => {
                this.myId = id;
                console.log(`[NET] Connecting to Host: ${hostId}...`);
                
                const conn = this.peer!.connect(hostId, { reliable: true });
                
                conn.on('open', () => {
                    this.isConnected = true;
                    this.hostConn = conn;
                    console.log("[NET] Connected to Host!");
                    
                    // Send Join Request immediately
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
                
                conn.on('close', () => {
                    this.isConnected = false;
                    alert("Disconnected from Host");
                });

                conn.on('error', (err) => reject(err));
            });
            
            this.peer!.on('error', (err) => {
                console.error("Peer Error", err);
                reject(err);
            });
        });
    }

    // --- HOST LOGIC ---
    private handleIncomingConnection(conn: DataConnection) {
        console.log(`[NET] New Player Connecting: ${conn.peer}`);
        this.connections.push(conn);

        conn.on('data', (raw: any) => {
            // Relay inputs/joins to game engine
            if (raw.op === OP_JOIN) {
                this.emit('player_joined', { id: conn.peer, ...raw.data });
            } else if (raw.op === OP_INPUT) {
                // Input contains movement/aim data
                this.emit('remote_input', { id: conn.peer, ...raw.data });
            } else if (raw.op === OP_CHAT) {
                // Broadcast chat to everyone else
                this.broadcast({ op: OP_CHAT, data: raw.data });
                this.emit('chat_message', raw.data);
            }
        });

        conn.on('close', () => {
            console.log(`[NET] Player Disconnected: ${conn.peer}`);
            this.connections = this.connections.filter(c => c !== conn);
            this.emit('player_left', { id: conn.peer });
        });
    }

    // Called by GameLoop if (isHost) to send world state to all clients
    public broadcastWorldState(entities: Entity[]) {
        if (!this.isHost || this.connections.length === 0) return;

        const now = Date.now();
        if (now - this.lastSyncTime < this.HOST_UPDATE_RATE) return;
        this.lastSyncTime = now;

        // Simplify entities to minimize bandwidth
        const snapshot = entities.map(e => ({
            id: e.id,
            t: e.type, // type
            x: Math.round(e.pos.x),
            y: Math.round(e.pos.y),
            r: parseFloat(e.rotation.toFixed(2)),
            h: Math.ceil(e.health),
            m: Math.ceil(e.maxHealth),
            c: e.color, // Send color for sync
            cp: e.classPath,
            n: e.name, // name
            ti: e.teamId // team
        }));

        this.broadcast({ op: OP_UPDATE, data: snapshot });
    }

    private broadcast(msg: any) {
        this.connections.forEach(c => {
            if (c.open) c.send(msg);
        });
    }

    // --- CLIENT LOGIC ---
    private handleClientMessage(raw: any) {
        if (raw.op === OP_UPDATE) {
            // World State Received
            this.emit('world_update', raw.data);
        } else if (raw.op === OP_CHAT) {
            this.emit('chat_message', raw.data);
        }
    }

    // Called by GameLoop if (!isHost) to send inputs to host
    public sendClientInput(input: { x: number; y: number; r: number; fire: boolean }) {
        if (this.isHost || !this.hostConn?.open) return;
        this.hostConn.send({ op: OP_INPUT, data: input });
    }

    // --- SHARED ---
    public sendChat(message: string, sender: string) {
        const payload = { sender, content: message };
        if (this.isHost) {
            this.broadcast({ op: OP_CHAT, data: payload });
            this.emit('chat_message', payload); // Show locally
        } else if (this.hostConn?.open) {
            this.hostConn.send({ op: OP_CHAT, data: payload });
        }
    }

    disconnect() {
        this.peer?.destroy();
        this.isConnected = false;
        this.connections = [];
        this.hostConn = null;
    }

    // --- Event Emitter ---
    on(event: string, handler: NetworkEventHandler) {
        if (!this.handlers[event]) this.handlers[event] = [];
        this.handlers[event].push(handler);
    }

    private emit(event: string, data: any) {
        if (this.handlers[event]) this.handlers[event].forEach(handler => handler(data));
    }

    // Stubs to match old interface signatures to prevent breakages
    syncPlayerState() {} 
    syncPlayerDetails() {}
    processInterpolation(entities: Entity[], dt: number) {
        // P2P logic handles interpolation inside the GameEngine's receive handler directly now
        // This stub keeps TypeScript happy if called elsewhere
    }
}
