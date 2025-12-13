
import { Vector2, Entity, StatKey, PlayerState, GameSettings, BossType, GameMode, FactionType, EntityType, Barrel } from '../types';
import { RenderSystem } from './systems/RenderSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { WorldSystem } from './systems/WorldSystem';
import { MapSystem } from './systems/MapSystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { WeaponSystem } from './systems/WeaponSystem';
import { AISystem } from './systems/AISystem';
import { InputManager } from './managers/InputManager';
import { PlayerManager } from './managers/PlayerManager';
import { EntityManager } from './managers/EntityManager';
import { NetworkManager } from './managers/NetworkManager';
import { CameraManager } from './managers/CameraManager';
import { ChatManager } from './managers/ChatManager';
import { LeaderboardManager } from './managers/LeaderboardManager';
import { NotificationManager } from './managers/NotificationManager';
import { AudioManager } from './managers/AudioManager';
import { StatManager } from './managers/StatManager';
import { StatusEffectSystem } from './systems/StatusEffectSystem';
import { SpawnManager } from './managers/SpawnManager';
import { DeathManager } from './managers/DeathManager';
import { PlayerController } from './controllers/PlayerController';
import { AIController } from './controllers/AIController';
import { WorldController } from './controllers/WorldController';
import { MinimapSystem } from './systems/MinimapSystem';
import { TANK_CLASSES } from '../data/tanks';
import { COLORS, WORLD_SIZE } from '../constants';

export class GameEngine {
    // Systems
    renderSystem: RenderSystem;
    physicsSystem: PhysicsSystem;
    minimapSystem: MinimapSystem;
    statusEffectSystem: StatusEffectSystem;
    
    // Managers
    inputManager: InputManager;
    playerManager: PlayerManager;
    entityManager: EntityManager;
    networkManager: NetworkManager;
    cameraManager: CameraManager;
    chatManager: ChatManager;
    leaderboardManager: LeaderboardManager;
    notificationManager: NotificationManager;
    audioManager: AudioManager;
    statManager: StatManager;
    spawnManager: SpawnManager;
    deathManager: DeathManager;

    // Controllers
    playerController: PlayerController;
    aiController: AIController;
    worldController: WorldController;

    // Loop Control
    private isRunning: boolean = false;
    private lastTime: number = 0;
    private accumulator: number = 0;
    private readonly FIXED_STEP: number = 1 / 60; // 60 Hz Physics

    // Callbacks
    private onUpdateStats: (s: PlayerState) => void;
    private onDebugUpdate: (d: any) => void;

    // State
    public gameMode: GameMode;
    public settings: GameSettings;
    public isDebugMode: boolean = false;
    public canvas: HTMLCanvasElement;

    constructor(
        canvas: HTMLCanvasElement,
        settings: GameSettings,
        gameMode: GameMode,
        playerName: string,
        faction: FactionType,
        initialClass: string,
        onUpdateStats: (s: PlayerState) => void,
        onDebugUpdate: (d: any) => void,
        minimapCanvas: HTMLCanvasElement | null
    ) {
        this.canvas = canvas;
        this.settings = settings;
        this.gameMode = gameMode;
        this.onUpdateStats = onUpdateStats;
        this.onDebugUpdate = onDebugUpdate;

        // Init Core
        this.renderSystem = new RenderSystem(canvas);
        this.minimapSystem = new MinimapSystem();
        if (minimapCanvas) this.minimapSystem.setCanvas(minimapCanvas);
        
        this.inputManager = new InputManager(canvas, settings);
        this.audioManager = new AudioManager(settings.audio);
        this.statManager = new StatManager();
        this.entityManager = new EntityManager();
        this.networkManager = new NetworkManager();
        this.statusEffectSystem = new StatusEffectSystem();
        
        // Init Managers
        this.notificationManager = new NotificationManager();
        this.leaderboardManager = new LeaderboardManager();
        this.spawnManager = new SpawnManager();
        this.cameraManager = new CameraManager();
        this.chatManager = new ChatManager(() => {}, (msg) => this.networkManager.sendChat(msg, playerName));

        // Player Setup
        this.playerManager = new PlayerManager(
            playerName, 
            (gameMode === 'TEAMS_2' || gameMode === 'TEAMS_4') ? 'BLUE' : undefined,
            onUpdateStats,
            this.audioManager,
            this.statusEffectSystem
        );
        this.playerManager.setStatManager(this.statManager);
        this.playerManager.setFaction(faction);
        if (initialClass) this.playerManager.evolve(initialClass);

        // World Setup
        MapSystem.generateMap(this.entityManager.entities, gameMode);
        this.playerManager.entity.pos = this.entityManager.getSpawnPos(this.playerManager.entity.teamId);

        this.deathManager = new DeathManager(this.playerManager, this.notificationManager, this.cameraManager, this.audioManager, settings);
        
        // Controllers
        this.playerController = new PlayerController(this.inputManager, this.playerManager, settings, canvas, this.audioManager, this.cameraManager);
        this.aiController = new AIController(this.audioManager, this.statManager, this.statusEffectSystem);
        this.worldController = new WorldController(
            this.entityManager, this.playerManager, this.deathManager, this.inputManager, canvas, settings, 
            this.audioManager, this.statManager, this.statusEffectSystem, this.spawnManager, gameMode
        );

        this.setupNetworking();
        this.startLoop();
    }

    private setupNetworking() {
        // HOST EVENTS
        this.networkManager.on('player_joined', (data: any) => {
            if (!this.networkManager.isHost) return;
            const newPlayer = this.createRemotePlayer(data);
            this.entityManager.add(newPlayer);
            this.notificationManager.push(`${data.name} joined!`, 'info');
            // IMPORTANT: Send full world state to new player immediately
            this.networkManager.sendWelcomePackage(data.id, [this.playerManager.entity, ...this.entityManager.entities]);
        });

        this.networkManager.on('remote_input', (data: any) => {
            if (!this.networkManager.isHost) return;
            const ent = this.entityManager.entities.find(e => e.id === data.id);
            if (ent) (ent as any).remoteInput = data;
        });

        // CLIENT EVENTS
        this.networkManager.on('connected', (initialState: any) => {
            // Load initial world
            console.log("Connected! Loading world...", initialState.length);
            // Clear current dynamic entities but keep walls? Or simple replace
            const staticWalls = this.entityManager.entities.filter(e => e.type === EntityType.WALL || e.type === EntityType.ZONE);
            
            // Merge
            const serverEntities = initialState.map((raw: any) => this.parseSnapshotEntity(raw));
            this.entityManager.entities = [...staticWalls, ...serverEntities];
        });

        this.networkManager.on('player_left', (data: any) => {
            const idx = this.entityManager.entities.findIndex(e => e.id === data.id);
            if (idx !== -1) {
                this.entityManager.entities.splice(idx, 1);
                this.notificationManager.push("Player disconnected", 'warning');
            }
        });

        this.networkManager.on('chat', (data: any) => {
            this.chatManager.addMessage(data.sender, data.content);
            // Visual text bubble
            const speaker = this.entityManager.entities.find(e => e.name === data.sender) || (data.sender === this.playerManager.entity.name ? this.playerManager.entity : null);
            if (speaker) PhysicsSystem.spawnFloatingText(this.entityManager.entities, speaker.pos, data.content, '#fff');
        });

        this.networkManager.on('leaderboard', (data: any) => {
            if (!this.networkManager.isHost) {
                this.playerManager.state.leaderboard = data;
                // Update Leader Arrow
                if (data[0] && data[0].id !== this.networkManager.myId) {
                    const leader = this.entityManager.entities.find(e => e.id === data[0].id);
                    this.playerManager.state.leaderPos = leader ? leader.pos : undefined;
                } else {
                    this.playerManager.state.leaderPos = undefined;
                }
            }
        });
    }

    private startLoop() {
        this.isRunning = true;
        this.lastTime = performance.now();
        const loop = (time: number) => {
            if (!this.isRunning) return;
            
            const frameTime = (time - this.lastTime) / 1000;
            this.lastTime = time;
            
            // Spiral of death protection
            if (frameTime > 0.25) this.accumulator = 0; 
            else this.accumulator += frameTime;

            // Fixed Update (Physics)
            while (this.accumulator >= this.FIXED_STEP) {
                this.fixedUpdate(this.FIXED_STEP);
                this.accumulator -= this.FIXED_STEP;
            }

            // Render Update (Visuals)
            // Calculate alpha for interpolation if needed (accumulator / FIXED_STEP)
            this.render();
            
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    // --- PHYSICS LOOP (60 Hz) ---
    private fixedUpdate(dt: number) {
        if (this.networkManager.isHost) {
            this.updateHost(dt);
        } else {
            this.updateClient(dt);
        }

        // Shared Logic
        this.chatManager.update(dt, this.entityManager.entities);
        if (this.notificationManager.update()) {
            this.playerManager.state.notifications = this.notificationManager.notifications;
        }
        
        // Debug Data
        if (this.isDebugMode) {
            this.onDebugUpdate({
                fps: Math.round(this.renderSystem.currentFps),
                ping: this.networkManager.stats.ping,
                entities: this.entityManager.entities.length + 1,
                pos: this.playerManager.entity.pos,
                isHost: this.networkManager.isHost
            });
        }
    }

    // --- HOST LOGIC ---
    private updateHost(dt: number) {
        const entities = this.entityManager.entities;
        const player = this.playerManager.entity;
        
        // 1. Process Inputs (Local + Remote)
        this.playerController.update(dt, entities, this.pushNotification.bind(this));
        
        // Apply remote inputs
        entities.forEach(ent => {
            if (ent.type === EntityType.PLAYER && ent.id !== 'player' && (ent as any).remoteInput) {
                const input = (ent as any).remoteInput;
                const speed = this.statManager.getStat(ent, 'moveSpd') * 60;
                ent.vel.x += input.x * speed * dt * 5;
                ent.vel.y += input.y * speed * dt * 5;
                ent.rotation = input.r;
                
                // Remote Shooting
                if (input.fire) {
                    const config = TANK_CLASSES[ent.classPath || 'basic'];
                    if (config) {
                        WeaponSystem.update(ent, config, dt, true, false, entities, 
                            (k) => this.statManager.getStat(ent, k),
                            (s, a, o, b) => PhysicsSystem.processHitscan(s, a, o, b, entities, player, this.handleDeath.bind(this), this.cameraManager, this.statManager, this.statusEffectSystem, this.audioManager)
                        );
                    }
                }
            }
        });

        // 2. AI & Spawning
        this.aiController.update(dt, entities, player, this.cameraManager, this.handleDeath.bind(this));
        if (this.gameMode !== 'SANDBOX') {
            this.spawnManager.update(dt, entities, player, this.gameMode, (t) => this.entityManager.getSpawnPos(t), this.pushNotification.bind(this));
        }

        // 3. Physics & Collisions
        this.worldController.update(dt, this.playerController.autoSpin, this.cameraManager, this.handleDeath.bind(this));

        // 4. Broadcast State (20Hz to save bandwidth, but physics runs 60Hz)
        // We can use a timer here or just send every frame if local
        this.networkManager.broadcastWorldState([player, ...entities]);
        
        // Leaderboard Update
        if (this.leaderboardManager.shouldUpdate()) {
            this.leaderboardManager.update(entities, player, this.playerManager.state);
            this.playerManager.emitUpdate();
            this.networkManager.broadcastLeaderboard(this.leaderboardManager.getLatest());
        }
    }

    // --- CLIENT LOGIC ---
    private updateClient(dt: number) {
        // 1. Prediction (Local Player)
        const move = this.inputManager.getMovementVector();
        const fire = this.inputManager.getIsFiring();
        
        // Send Input
        this.networkManager.sendInput({ 
            x: move.x, y: move.y, r: this.playerManager.entity.rotation, fire 
        });

        // Predict Movement
        this.playerController.update(dt, [], () => {});
        PhysicsSystem.updateMovement([this.playerManager.entity], dt, this.statManager, WORLD_SIZE, WORLD_SIZE);

        // 2. Interpolation (Remote Entities)
        const snapshots = this.networkManager.snapshots;
        if (snapshots.length >= 2) {
            // Find the two snapshots to interpolate between
            // Render time is "now - 100ms" (buffer)
            const renderTime = Date.now() - 100;
            
            let t0 = snapshots[0];
            let t1 = snapshots[1];

            // Find window
            for (let i = 0; i < snapshots.length - 1; i++) {
                if (snapshots[i].time <= renderTime && snapshots[i+1].time >= renderTime) {
                    t0 = snapshots[i];
                    t1 = snapshots[i+1];
                    break;
                }
            }

            // Interpolate
            if (t0 && t1) {
                const total = t1.time - t0.time;
                const portion = renderTime - t0.time;
                const ratio = Math.max(0, Math.min(1, portion / total));

                this.applyInterpolation(t0.entities, t1.entities, ratio);
            }
        }

        // 3. Client-Side Effects (Particles)
        ParticleSystem.update(this.entityManager.entities, dt);
    }

    private applyInterpolation(prevList: any[], nextList: any[], ratio: number) {
        const nextMap = new Map(nextList.map((e: any) => [e.id, e]));
        const currentIds = new Set<string>();

        nextList.forEach((next: any) => {
            currentIds.add(next.id);
            if (next.id === this.networkManager.myId) {
                // Reconciliation for Self (Health, Score only, Position is predicted)
                this.playerManager.entity.health = next.h;
                this.playerManager.entity.maxHealth = next.m || 100;
                this.playerManager.state.score = next.s || 0;
                return;
            }

            let ent = this.entityManager.entities.find(e => e.id === next.id);
            const prev = prevList.find((e: any) => e.id === next.id) || next;

            if (!ent) {
                // Spawn new
                ent = this.parseSnapshotEntity(next);
                this.entityManager.add(ent);
            } else {
                // Lerp Position & Rotation
                ent.pos.x = prev.x + (next.x - prev.x) * ratio;
                ent.pos.y = prev.y + (next.y - prev.y) * ratio;
                
                // Shortest path rotation
                let diff = next.r - prev.r;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                ent.rotation = prev.r + diff * ratio;

                // Snap visuals
                ent.health = next.h;
                ent.maxHealth = next.m || ent.maxHealth;
                ent.classPath = next.cp || ent.classPath;
                ent.color = next.c || ent.color;
            }
        });

        // Cleanup missing
        this.entityManager.entities = this.entityManager.entities.filter(e => {
            if (e.type === EntityType.PARTICLE || e.type === EntityType.FLOATING_TEXT) return true;
            if (e.type === EntityType.WALL || e.type === EntityType.ZONE) return true;
            return currentIds.has(e.id);
        });
    }

    // --- HELPERS ---
    
    private parseSnapshotEntity(raw: any): Entity {
        return {
            id: raw.id,
            type: raw.t,
            pos: { x: raw.x, y: raw.y },
            vel: { x: 0, y: 0 },
            rotation: raw.r,
            radius: 20, // Should be derived from type/class
            color: raw.c || '#fff',
            health: raw.h,
            maxHealth: raw.m || 100,
            damage: 0,
            isDead: false,
            classPath: raw.cp || 'basic',
            name: raw.n,
            teamId: raw.ti
        };
    }

    private createRemotePlayer(data: any): Entity {
        return {
            id: data.id,
            name: data.name,
            type: EntityType.PLAYER,
            pos: this.entityManager.getSpawnPos(),
            vel: { x: 0, y: 0 },
            radius: 20,
            rotation: 0,
            color: COLORS.enemy,
            health: 100, maxHealth: 100, damage: 20,
            isDead: false,
            classPath: data.tank || 'basic',
            scoreValue: 0,
            // @ts-ignore
            remoteInput: { x: 0, y: 0, fire: false, r: 0 },
            barrelCooldowns: [], barrelCharges: [], barrelRecoils: []
        };
    }

    private render() {
        const camera = this.cameraManager.getCameraTarget(this.playerManager.entity, this.entityManager.entities);
        this.renderSystem.draw(
            this.entityManager.entities,
            this.playerManager.entity,
            this.playerManager.state,
            this.playerManager.activeAbilityTimer,
            camera,
            this.gameMode,
            this.settings
        );
        this.minimapSystem.update(
            this.entityManager.entities,
            this.playerManager.entity,
            { pos: camera.pos, zoom: camera.zoom, canvasWidth: this.canvas.width, canvasHeight: this.canvas.height },
            this.gameMode,
            this.spawnManager.getNextBossTime()
        );
    }

    private handleDeath(v: Entity, k: Entity) {
        this.deathManager.handleDeath(v, k, this.entityManager.entities);
    }

    public pushNotification(msg: string, type: any = 'info') {
        this.notificationManager.push(msg, type);
    }

    public upgradeStat(key: StatKey) { this.playerManager.upgradeStat(key); }
    public evolve(c: string) { this.playerManager.evolve(c); }
    public spawnBoss(t?: BossType) { if(this.networkManager.isHost) this.spawnManager.spawnBoss(this.entityManager.entities, this.playerManager.entity, this.pushNotification.bind(this), t); }
    public closeArena() { if(this.networkManager.isHost) this.spawnManager.closeArena(this.pushNotification.bind(this)); }
    public respawn() { 
        if(this.spawnManager.isArenaClosing) return alert("Arena Closed");
        if(this.playerManager.entity.isDead) this.playerManager.reset(this.entityManager.getSpawnPos(this.playerManager.entity.teamId));
    }
    public destroy() {
        this.isRunning = false;
        this.inputManager.destroy();
        this.networkManager.disconnect();
        delete (window as any).tankAPI;
    }
    
    // Sandbox
    public cheatLevelUp() { this.playerManager.gainXp(999999, 1); }
    public cheatSetLevel(l: number) { this.playerManager.setLevel(l); }
    public cheatMaxStats() { this.playerManager.state.availablePoints += 50; }
    public cheatToggleGodMode() { this.playerManager.state.godMode = !this.playerManager.state.godMode; }
    public cheatSpawnDummy() { if(this.networkManager.isHost) AISystem.spawnBots(this.entityManager.entities, 1, 'SANDBOX', () => ({x:2500,y:2500})); }
    public cheatSpawnBoss() { if(this.networkManager.isHost) this.spawnBoss(); }
    public cheatClassSwitch(id: string) { this.playerManager.evolve(id); }
    public cheatSuicide() { this.handleDeath(this.playerManager.entity, this.playerManager.entity); }
    
    public updateSettings(s: GameSettings) { 
        this.settings = s; 
        this.audioManager.updateSettings(s.audio); 
        this.deathManager.updateSettings(s);
        this.worldController.updateSettings(s);
    }
    public executeCommand(c: string) { /* ... command manager ... */ return "Executed"; }
}
