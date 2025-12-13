
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
    private readonly FIXED_STEP: number = 1 / 60; 

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
            undefined,
            onUpdateStats,
            this.audioManager,
            this.statusEffectSystem
        );
        this.playerManager.setStatManager(this.statManager);
        this.playerManager.setFaction(faction);
        if (initialClass) this.playerManager.evolve(initialClass);

        // World Setup
        MapSystem.generateMap(this.entityManager.entities, gameMode);
        
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
        // --- 1. REMOTE PLAYER JOINED ---
        this.networkManager.on('player_joined', (data: any) => {
            console.log("Remote Join:", data);
            const newPlayer: Entity = {
                id: data.id,
                name: data.name,
                type: EntityType.PLAYER,
                pos: { x: data.x, y: data.y },
                vel: { x: 0, y: 0 },
                radius: 20,
                rotation: 0,
                color: COLORS.enemy,
                health: 100, maxHealth: 100, damage: 20, isDead: false,
                classPath: data.classPath || 'basic', // Critical: Get class
                scoreValue: 0,
                barrelCooldowns: [], barrelCharges: [], barrelRecoils: []
            };
            // Map netId for interpolation
            (newPlayer as any).netId = data.netId;
            this.entityManager.add(newPlayer);
            this.notificationManager.push(`${data.name} joined.`, 'info');
        });

        // --- 2. INITIAL WORLD LOAD ---
        this.networkManager.on('connected', (players: any[]) => {
            console.log(`[NET] Syncing with ${players.length} existing players`);
            players.forEach(p => {
                const ent: Entity = {
                    id: p.id,
                    name: p.name,
                    type: EntityType.PLAYER,
                    pos: { x: p.x, y: p.y },
                    vel: { x: 0, y: 0 },
                    radius: 20, rotation: 0, color: COLORS.enemy,
                    health: 100, maxHealth: 100, damage: 0, isDead: false,
                    classPath: p.classPath || 'basic',
                    barrelCooldowns: []
                };
                (ent as any).netId = p.netId;
                this.entityManager.add(ent);
            });
        });

        // --- 3. TELEPORT SELF (Spawn) ---
        this.networkManager.on('teleport', (pos: any) => {
            this.playerManager.entity.pos = { x: pos.x, y: pos.y };
            (this.playerManager.entity as any).netId = pos.netId;
        });

        this.networkManager.on('player_left', (data: any) => {
            const idx = this.entityManager.entities.findIndex(e => e.id === data.id);
            if (idx !== -1) {
                this.entityManager.entities.splice(idx, 1);
            }
        });

        this.networkManager.on('chat', (data: any) => {
            this.chatManager.addMessage(data.sender, data.content);
            const speaker = this.entityManager.entities.find(e => e.name === data.sender) || (data.sender === this.playerManager.entity.name ? this.playerManager.entity : null);
            if (speaker) PhysicsSystem.spawnFloatingText(this.entityManager.entities, speaker.pos, data.content, '#fff');
        });
    }

    private startLoop() {
        this.isRunning = true;
        this.lastTime = performance.now();
        const loop = (time: number) => {
            if (!this.isRunning) return;
            const frameTime = (time - this.lastTime) / 1000;
            this.lastTime = time;
            if (frameTime > 0.25) this.accumulator = 0; else this.accumulator += frameTime;

            while (this.accumulator >= this.FIXED_STEP) {
                this.fixedUpdate(this.FIXED_STEP);
                this.accumulator -= this.FIXED_STEP;
            }
            this.render();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    private fixedUpdate(dt: number) {
        // 1. INPUT (Send to Server)
        const move = this.inputManager.getMovementVector();
        const fire = this.inputManager.getIsFiring();
        this.networkManager.sendInput({ 
            x: move.x, y: move.y, r: this.playerManager.entity.rotation, fire 
        });

        // 2. CLIENT-SIDE PREDICTION (Move Self)
        this.playerController.update(dt, [], () => {}); 
        const player = this.playerManager.entity;
        // Simple physics for local feel
        player.pos.x += player.vel.x * dt;
        player.pos.y += player.vel.y * dt;
        player.vel.x *= 0.90; // Match Server Friction
        player.vel.y *= 0.90;

        // 3. SERVER RECONCILIATION (Remote Entities)
        const serverState = this.networkManager.getCurrentWorldState();
        if (serverState) {
            serverState.forEach((snap: any) => {
                // If it's me, sync stats/health but trust my position (mostly)
                if (snap.netId === (player as any).netId) {
                    player.health = snap.hp; // 0-100 mapped to maxHp
                    return;
                }

                // If it's another player, find them and SNAP/LERP
                const ent = this.entityManager.entities.find(e => (e as any).netId === snap.netId);
                if (ent) {
                    ent.pos.x = snap.x;
                    ent.pos.y = snap.y;
                    ent.rotation = snap.r;
                    ent.health = snap.hp; // Visual only
                }
            });
        }

        // 4. Local Simulation (Particles, etc.)
        ParticleSystem.update(this.entityManager.entities, dt);
        this.statusEffectSystem.update(this.entityManager.entities, dt);
        
        // Debug Data
        if (this.isDebugMode) {
            this.onDebugUpdate({
                fps: Math.round(this.renderSystem.currentFps),
                ping: this.networkManager.stats.ping,
                entities: this.entityManager.entities.length + 1,
                pos: this.playerManager.entity.pos
            });
        }
        
        this.chatManager.update(dt, this.entityManager.entities);
        if (this.notificationManager.update()) {
            this.playerManager.state.notifications = this.notificationManager.notifications;
        }
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

    // ... (Helpers remain same) ...
    private handleDeath(v: Entity, k: Entity) {
        this.deathManager.handleDeath(v, k, this.entityManager.entities);
    }
    public upgradeStat(key: StatKey) { 
        this.playerManager.upgradeStat(key); 
        // Sync stats to server
        this.networkManager.sendChat(JSON.stringify({ t:'update_stat', d: this.playerManager.state }), 'SYSTEM');
    }
    public evolve(c: string) { this.playerManager.evolve(c); }
    public spawnBoss(t?: BossType) {}
    public closeArena() {}
    public respawn() { 
        if(this.playerManager.entity.isDead) {
            const spawn = this.entityManager.getSpawnPos();
            this.playerManager.reset(spawn);
        }
    }
    public destroy() {
        this.isRunning = false;
        this.inputManager.destroy();
        this.networkManager.disconnect();
        delete (window as any).tankAPI;
    }
    public updateSettings(s: GameSettings) { 
        this.settings = s; 
        this.audioManager.updateSettings(s.audio); 
    }
    public executeCommand(c: string) { return "CMD"; }
    // Cheats (disabled in prod usually)
    public cheatLevelUp() { this.playerManager.gainXp(999999, 1); }
    public cheatSetLevel(l: number) { this.playerManager.setLevel(l); }
    public cheatMaxStats() {}
    public cheatToggleGodMode() {}
    public cheatSpawnDummy() {}
    public cheatSpawnBoss() {}
    public cheatClassSwitch(id: string) { this.playerManager.evolve(id); }
    public cheatSuicide() {}
}
