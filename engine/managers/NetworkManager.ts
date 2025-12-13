
import { ServerRegion, GameMode, FactionType, Entity, EntityType } from '../../types';
import { WORLD_SIZE } from '../../constants';
import { db } from '../../firebase';
import { ref, set, onDisconnect, onChildAdded, onChildChanged, onChildRemoved, push, onValue, get } from "firebase/database";

type NetworkEventHandler = (data: any) => void;

export class NetworkManager {
    private handlers: Record<string, NetworkEventHandler[]> = {};
    public isConnected: boolean = false;
    public isHost: boolean = false; 
    
    private myId: string | null = null;
    private myRef: any = null;
    
    // Throttling updates to save bandwidth (Firebase limit)
    private lastSyncTime: number = 0;
    private readonly SYNC_RATE = 100; // 10Hz (Every 100ms) - Good balance for free tier

    constructor() {}

    async connect(region: ServerRegion, playerInfo: { name: string; tank: string; mode: GameMode; faction: FactionType }) {
        // Generate a simpler ID for Firebase keys
        const userId = `p_${Math.random().toString(36).substr(2, 6)}`;
        this.myId = userId;
        
        // Use the game mode as the room ID
        const roomId = playerInfo.mode; 
        const roomRef = ref(db, `rooms/${roomId}/players`);
        this.myRef = ref(db, `rooms/${roomId}/players/${userId}`);

        console.log(`[NET] Connecting to Firebase Room: ${roomId} as ${playerInfo.name}`);

        try {
            // 1. Setup Presence (Remove me if I disconnect)
            await onDisconnect(this.myRef).remove();

            // 2. Initial Spawn Data
            const initialData = {
                id: userId,
                name: playerInfo.name,
                x: Math.random() * (WORLD_SIZE - 200) + 100,
                y: Math.random() * (WORLD_SIZE - 200) + 100,
                r: 0,
                vx: 0,
                vy: 0,
                hp: 100,
                maxHp: 100,
                score: 0,
                classPath: playerInfo.tank,
                teamId: playerInfo.faction === 'NONE' ? undefined : playerInfo.faction,
                lastSeen: Date.now()
            };

            await set(this.myRef, initialData);
            this.isConnected = true;
            
            // Notify Game Engine
            this.emit('connected', { isHost: false });
            this.emit('teleport', { x: initialData.x, y: initialData.y });

            // 3. Listen for Other Players
            this.setupListeners(roomId);

        } catch (e) {
            console.error("[NET] Connection Failed:", e);
        }
    }

    private setupListeners(roomId: string) {
        const playersRef = ref(db, `rooms/${roomId}/players`);
        const chatRef = ref(db, `rooms/${roomId}/chat`);

        // Player Joined
        onChildAdded(playersRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.id !== this.myId) {
                this.emit('player_joined', data);
            }
        });

        // Player Moved / Updated
        onChildChanged(playersRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.id !== this.myId) {
                this.handleRemoteUpdate(data);
            }
        });

        // Player Left
        onChildRemoved(playersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.emit('player_left', { id: data.id });
            }
        });

        // Chat
        onChildAdded(chatRef, (snapshot) => {
            const data = snapshot.val();
            // Only show recent messages (simple filter based on time could be added)
            if (data && Date.now() - data.timestamp < 10000) {
                this.emit('chat_message', data);
            }
        });
    }

    disconnect() {
        if (this.myRef) {
            set(this.myRef, null); // Remove self
            this.myRef = null;
        }
        this.isConnected = false;
    }

    // --- OUTGOING ---

    syncPlayerState(pos: {x: number, y: number}, vel: {x: number, y: number}, rotation: number) {
        if (!this.isConnected || !this.myRef) return;

        const now = Date.now();
        if (now - this.lastSyncTime < this.SYNC_RATE) return;
        this.lastSyncTime = now;

        // Update Position & Velocity in Firebase
        // We use .update to minimal payload
        // NOTE: floating point precision reduction to save bandwidth
        set(this.myRef, {
            ...this.currentDetails, // Keep static details
            x: Math.round(pos.x),
            y: Math.round(pos.y),
            vx: parseFloat(vel.x.toFixed(2)),
            vy: parseFloat(vel.y.toFixed(2)),
            r: parseFloat(rotation.toFixed(2)),
            lastSeen: now
        }).catch(() => {});
    }
    
    private currentDetails: any = {};

    syncPlayerDetails(health: number, maxHealth: number, score: number, classPath: string, level: number, xp: number) {
        // Cache details to merge with syncPlayerState
        this.currentDetails = {
            hp: Math.ceil(health),
            maxHp: Math.ceil(maxHealth),
            score,
            classPath,
            level
        };
    }

    sendChat(message: string, sender: string) {
        if (!this.isConnected) return;
        const chatRef = ref(db, `rooms/${this.myRef.parent.key}/chat`);
        push(chatRef, {
            sender,
            content: message,
            timestamp: Date.now()
        });
    }

    // --- INCOMING ---

    // Since Firebase gives us the state directly, we don't need complex binary snapshot processing
    // We just emit the data to the engine to interpolate
    private handleRemoteUpdate(data: any) {
        // We can pass data directly to engine's entity or store in a buffer
        // For simplicity in this adaptation, we'll mimic the 'snapshot' behavior
        // by storing it in a local map for the engine loop to read.
        this.remoteStates.set(data.id, data);
    }

    private remoteStates = new Map<string, any>();

    public processInterpolation(entities: Entity[], dt: number) {
        this.remoteStates.forEach((data, id) => {
            const entity = entities.find(e => e.id === id);
            if (entity) {
                // Linear Interpolation (Lerp) to smooth movement
                const lerpSpeed = 5 * dt;
                
                entity.pos.x += (data.x - entity.pos.x) * lerpSpeed;
                entity.pos.y += (data.y - entity.pos.y) * lerpSpeed;
                
                // Rotation Lerp
                let da = data.r - entity.rotation;
                while (da > Math.PI) da -= Math.PI * 2;
                while (da < -Math.PI) da += Math.PI * 2;
                entity.rotation += da * lerpSpeed;

                // Sync Stats
                entity.health = data.hp;
                entity.maxHealth = data.maxHp;
                entity.scoreValue = data.score;
                entity.classPath = data.classPath;
                
                // Dead reckoning correction if needed
                if (Math.abs(entity.pos.x - data.x) > 200) entity.pos.x = data.x;
                if (Math.abs(entity.pos.y - data.y) > 200) entity.pos.y = data.y;
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
