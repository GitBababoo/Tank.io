
import { Vector2, Entity, PlayerState, GameSettings, GameMode, FactionType, EntityType } from '../types';
import { RenderSystem } from './systems/RenderSystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { InputManager } from './managers/InputManager';
import { PlayerManager } from './managers/PlayerManager';
import { EntityManager } from './managers/EntityManager';
import { NetworkManager } from './managers/NetworkManager';
import { CameraManager } from './managers/CameraManager';
import { AudioManager } from './managers/AudioManager';
import { COLORS, WORLD_SIZE } from '../constants';

export class GameEngine {
    renderSystem: RenderSystem;
    inputManager: InputManager;
    playerManager: PlayerManager;
    entityManager: EntityManager;
    networkManager: NetworkManager;
    cameraManager: CameraManager;
    audioManager: AudioManager;
    
    private isRunning: boolean = false;
    private lastTime: number = 0;

    // Callbacks
    private onUpdateStats: (s: PlayerState) => void;
    private onDebugUpdate: (d: any) => void;

    public canvas: HTMLCanvasElement;
    public settings: GameSettings;
    public gameMode: GameMode;

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

        this.audioManager = new AudioManager(settings.audio);
        this.renderSystem = new RenderSystem(canvas);
        this.inputManager = new InputManager(canvas, settings);
        this.entityManager = new EntityManager();
        this.networkManager = new NetworkManager();
        this.cameraManager = new CameraManager();
        
        // Mock Player Manager just for HUD/Input handling
        this.playerManager = new PlayerManager(
            playerName, undefined, onUpdateStats, this.audioManager, null as any
        );

        this.setupNetworking();
        this.startLoop();
    }

    private setupNetworking() {
        this.networkManager.on('connected', (data: any) => {
            // Set initial position
            this.playerManager.entity.pos = { x: data.x, y: data.y };
            (this.playerManager.entity as any).netId = data.netId;
        });

        this.networkManager.on('player_joined', (data: any) => {
            const newEntity: Entity = {
                id: data.id,
                type: EntityType.PLAYER,
                pos: { x: 0, y: 0 },
                vel: { x: 0, y: 0 },
                radius: 20,
                rotation: 0,
                color: COLORS.enemy,
                health: 100, maxHealth: 100, damage: 0, isDead: false
            };
            (newEntity as any).netId = data.netId;
            this.entityManager.add(newEntity);
        });
    }

    private startLoop() {
        this.isRunning = true;
        this.lastTime = performance.now();
        
        const loop = (time: number) => {
            if (!this.isRunning) return;
            const dt = (time - this.lastTime) / 1000;
            this.lastTime = time;

            this.update(dt);
            this.render();
            
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    private update(dt: number) {
        // 1. Send Input
        const move = this.inputManager.getMovementVector();
        const fire = this.inputManager.getIsFiring();
        const player = this.playerManager.entity;
        
        // Calculate Rotation
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const mouseX = this.inputManager.mousePos.x * scaleX;
        const mouseY = this.inputManager.mousePos.y * scaleY;
        player.rotation = Math.atan2(mouseY - centerY, mouseX - centerX);

        this.networkManager.sendInput({ 
            x: move.x, y: move.y, r: player.rotation, fire 
        });

        // 2. Client Prediction (Visual Only)
        // We move the player locally to feel responsive, server will correct us via interpolation later
        const speed = 300; // Match server
        player.pos.x += move.x * speed * dt;
        player.pos.y += move.y * speed * dt;

        // 3. Interpolate Others
        this.entityManager.entities.forEach(ent => {
            if ((ent as any).netId) {
                const state = this.networkManager.getInterpolatedState((ent as any).netId);
                if (state) {
                    ent.pos.x = state.x;
                    ent.pos.y = state.y;
                    ent.rotation = state.r;
                    ent.health = state.hp;
                }
            }
        });

        // 4. Update Particles
        ParticleSystem.update(this.entityManager.entities, dt);

        // Debug
        if (this.onDebugUpdate) {
            this.onDebugUpdate({
                fps: Math.round(1/dt),
                ping: 0,
                entities: this.entityManager.entities.length
            });
        }
    }

    private render() {
        const camera = { pos: this.playerManager.entity.pos, zoom: 1.0, shake: {x:0, y:0} };
        this.renderSystem.draw(
            this.entityManager.entities,
            this.playerManager.entity,
            this.playerManager.state,
            0,
            camera,
            this.gameMode,
            this.settings
        );
    }

    public destroy() {
        this.isRunning = false;
        this.networkManager.disconnect();
    }
    
    // Stubs to satisfy interface
    public updateSettings(s: GameSettings) { this.settings = s; this.audioManager.updateSettings(s.audio); }
    public upgradeStat() {}
    public evolve() {}
    public respawn() {}
    public executeCommand() { return ""; }
    public cheatLevelUp() {}
    public cheatSetLevel() {}
    public cheatMaxStats() {}
    public cheatToggleGodMode() {}
    public cheatSpawnDummy() {}
    public cheatSpawnBoss() {}
    public cheatClassSwitch() {}
    public cheatSuicide() {}
}
