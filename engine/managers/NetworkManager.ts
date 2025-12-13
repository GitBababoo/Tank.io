
import { ServerRegion, GameMode, FactionType, Entity } from '../../types';
import { WORLD_SIZE } from '../../constants';
import { db } from '../../firebase';
import { ref, set, onDisconnect, onChildAdded, onChildChanged, onChildRemoved, push, onValue, get, remove } from "firebase/database";

type NetworkEventHandler = (data: any) => void;

export class NetworkManager {
    private handlers: Record<string, NetworkEventHandler[]> = {};
    public isConnected: boolean = false;
    public isHost: boolean = false; // In Firebase mode, everyone is a client, host logic is shared or minimal
    
    private myId: string | null = null;
    private myRef: any = null;
    private roomRef: any = null;
    
    // Throttling updates to save bandwidth (Firebase limit) & Costs
    private lastSyncTime: number = 0;
    private readonly SYNC_RATE = 80; // ~12 updates per second (Good balance for free tier)

    constructor() {}

    async connect(region: ServerRegion, playerInfo: { name: string; tank: string; mode: GameMode; faction: FactionType }) {
        // 1. Generate ID
        const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
        this.myId = userId;
        
        // 2. Define Room Path (e.g., rooms/FFA/players/user_abc123)
        const roomId = playerInfo.mode; 
        this.roomRef = ref(db, `rooms/${roomId}`);
        this.myRef = ref(db, `rooms/${roomId}/players/${userId}`);

        console.log(`[NET] Real Connection to Firebase: ${roomId} as ${playerInfo.name}`);

        try {
            // 3. Setup Presence (CRITICAL: This ensures 'Online' count is real)
            // If the user closes the tab or loses internet, Firebase will auto-delete this key.
            await onDisconnect(this.myRef).remove();

            // 4. Initial Spawn Data
            const initialData = {
                id: userId,
                name: playerInfo.name,
                // Random spawn within map bounds
                x: Math.random() * (WORLD_SIZE - 400) + 200,
                y: Math.random() * (WORLD_SIZE - 400) + 200,
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

            // Write self to DB
            await set(this.myRef, initialData);
            this.isConnected = true;
            
            // Notify Game Engine to spawn our local player
            this.emit('connected', { isHost: false });
            this.emit('teleport', { x: initialData.x, y: initialData.y });

            // 5. Listen for REAL players
            this.setupListeners(roomId);

        } catch (e) {
            console.error("[NET] Connection Failed:", e);
            alert("Connection failed. Please check your internet.");
        }
    }

    private setupListeners(roomId: string) {
        const playersRef = ref(db, `rooms/${roomId}/players`);
        const chatRef = ref(db, `rooms/${roomId}/chat`);

        // Someone joined (Real Player)
        onChildAdded(playersRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.id !== this.myId) {
                // Check if data is not stale (older than 30 seconds)
                if (Date.now() - data.lastSeen < 30000) {
                    this.emit('player_joined', data);
                }
            }
        });

        // Someone moved (Real Movement)
        onChildChanged(playersRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.id !== this.myId) {
                this.handleRemoteUpdate(data);
            }
        });

        // Someone left (Tab closed / Disconnected)
        onChildRemoved(playersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.emit('player_left', { id: data.id });
            }
        });

        // Chat messages
        onChildAdded(chatRef, (snapshot) => {
            const data = snapshot.val();
            // Only accept messages from the last 10 seconds to avoid flooding history
            if (data && Date.now() - data.timestamp < 10000) {
                this.emit('chat_message', data);
            }
        });
    }

    disconnect() {
        if (this.myRef) {
            remove(this.myRef); // Delete self immediately
            this.myRef = null;
        }
        this.isConnected = false;
    }

    // --- OUTGOING (SENDING MY DATA) ---

    syncPlayerState(pos: {x: number, y: number}, vel: {x: number, y: number}, rotation: number) {
        if (!this.isConnected || !this.myRef) return;

        const now = Date.now();
        if (now - this.lastSyncTime < this.SYNC_RATE) return;
        this.lastSyncTime = now;

        // Update Position & Velocity in Firebase
        // We assume 'update' logic is handled by 'set' merging if we carefully construct the path, 
        // or just overwrite the node if it's flat. For speed, we overwrite mainly kinematic data.
        
        // Optimization: Round numbers to reduce bandwidth usage
        set(this.myRef, {
            ...this.currentDetails, // Include static details to prevent data loss on overwrite
            id: this.myId,
            x: Math.round(pos.x),
            y: Math.round(pos.y),
            vx: parseFloat(vel.x.toFixed(1)),
            vy: parseFloat(vel.y.toFixed(1)),
            r: parseFloat(rotation.toFixed(2)),
            lastSeen: now
        }).catch(() => {});
    }
    
    private currentDetails: any = {};

    syncPlayerDetails(health: number, maxHealth: number, score: number, classPath: string, level: number, xp: number) {
        // Cache these details so syncPlayerState can include them
        this.currentDetails = {
            hp: Math.ceil(health),
            maxHp: Math.ceil(maxHealth),
            score,
            classPath,
            level,
            name: this.currentDetails.name || "Player" // Preserve name
        };
    }

    sendChat(message: string, sender: string) {
        if (!this.isConnected || !this.roomRef) return;
        const chatRef = ref(db, `rooms/${this.roomRef.key}/chat`);
        push(chatRef, {
            sender,
            content: message,
            timestamp: Date.now()
        });
    }

    // --- INCOMING (RECEIVING OTHER DATA) ---

    private remoteStates = new Map<string, any>();

    private handleRemoteUpdate(data: any) {
        // Store the latest snapshot of the remote player
        this.remoteStates.set(data.id, data);
    }

    // Called every game frame (60fps) to smooth out the movement
    public processInterpolation(entities: Entity[], dt: number) {
        this.remoteStates.forEach((data, id) => {
            const entity = entities.find(e => e.id === id);
            if (entity) {
                // --- INTERPOLATION LOGIC ---
                // Instead of teleporting, we glide towards the target position.
                const lerpSpeed = 10 * dt; // Adjust for smoothness vs responsiveness
                
                entity.pos.x += (data.x - entity.pos.x) * lerpSpeed;
                entity.pos.y += (data.y - entity.pos.y) * lerpSpeed;
                
                // Rotation Lerp (Handle the 360 -> 0 wrapping issue)
                let da = data.r - entity.rotation;
                while (da > Math.PI) da -= Math.PI * 2;
                while (da < -Math.PI) da += Math.PI * 2;
                entity.rotation += da * lerpSpeed;

                // Sync Stats
                entity.health = data.hp;
                entity.maxHealth = data.maxHp;
                entity.scoreValue = data.score;
                entity.classPath = data.classPath;
                
                // Snap if too far (Lag spike correction)
                if (Math.abs(entity.pos.x - data.x) > 300) entity.pos.x = data.x;
                if (Math.abs(entity.pos.y - data.y) > 300) entity.pos.y = data.y;
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
