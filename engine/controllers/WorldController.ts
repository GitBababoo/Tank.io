
import { GameSettings, StatKey, Entity, Barrel, Vector2, EntityType, GameMode } from '../../types';
import { EntityManager } from '../managers/EntityManager';
import { PlayerManager } from '../managers/PlayerManager';
import { DeathManager } from '../managers/DeathManager';
import { InputManager } from '../managers/InputManager';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { ZoneSystem } from '../systems/ZoneSystem';
import { DroneSystem } from '../systems/DroneSystem';
import { CameraManager } from '../managers/CameraManager';
import { AudioManager } from '../managers/AudioManager';
import { AutoTurretSystem } from '../systems/AutoTurretSystem';
import { StatManager } from '../managers/StatManager';
import { StatusEffectSystem } from '../systems/StatusEffectSystem';
import { WeaponSystem } from '../systems/WeaponSystem';
import { SpawnManager } from '../managers/SpawnManager';
import { MAP_DEFINITIONS } from '../../data/maps/MapDefinitions';
import { WORLD_SIZE } from '../../constants';

export class WorldController {
    private autoTurretSystem: AutoTurretSystem;
    private gameMode: GameMode;

    constructor(
        private entityManager: EntityManager,
        private playerManager: PlayerManager,
        private deathManager: DeathManager,
        private inputManager: InputManager,
        private canvas: HTMLCanvasElement,
        private settings: GameSettings,
        private audioManager: AudioManager,
        private statManager: StatManager,
        private statusEffectSystem: StatusEffectSystem,
        private spawnManager: SpawnManager,
        gameMode: GameMode
    ) {
        this.gameMode = gameMode;
        this.autoTurretSystem = new AutoTurretSystem(this.entityManager, this.audioManager, this.statManager);
        
        // --- NEW: Inject EntityManager into PlayerManager to allow Area of Effect skills (Repel) ---
        this.playerManager.setEntityManager(this.entityManager);
    }

    updateSettings(settings: GameSettings) {
        this.settings = settings;
    }

    update(dt: number, autoSpin: boolean, cameraManager: CameraManager, handleDeath: (v: Entity, k: Entity) => void) {
        const entities = this.entityManager.entities;
        const player = this.playerManager.entity;

        // Sync Boss Timer
        this.playerManager.setNextBossTimer(this.spawnManager.getNextBossTime());

        // --- PRE-UPDATE: RESET SAFETY FLAGS ---
        // We reset flags here so ZoneSystem acts as the authority for the current frame.
        // If they leave the zone, this reset ensures they lose protection instantly.
        
        const allTanks = [player, ...entities.filter(e => e.type === EntityType.ENEMY)];
        allTanks.forEach(ent => {
            // Check for Spawn Protection logic (usually time based)
            // Assuming 15s spawn protection from creationTime
            const SPAWN_PROTECT_TIME = 15000;
            const isSpawnProtected = ent.creationTime && (Date.now() - ent.creationTime < SPAWN_PROTECT_TIME);
            const isGodMode = (ent.id === 'player' && this.playerManager.state.godMode);

            // Default to false unless specific conditions met
            ent.isInvulnerable = isSpawnProtected || isGodMode;
            ent.inSafeZone = false; // Always reset visual flag
        });

        // 0. Update Auto Turret AI
        this.autoTurretSystem.update(entities, player, dt, this.playerManager);

        // 1. Update Status Effects
        this.statusEffectSystem.update(entities, dt);

        // 2. Update Zones (This will override isInvulnerable to TRUE if in base)
        ZoneSystem.update(entities, player, dt);

        // 3. Physics Movement (NOW HANDLES PLAYER AND AI POSITION)
        // Passed statManager to access mass calculations dynamically
        // Passed Map Dimensions to fix boundaries
        const mapConfig = MAP_DEFINITIONS[this.gameMode];
        const mapW = mapConfig ? mapConfig.width : WORLD_SIZE;
        const mapH = mapConfig ? mapConfig.height : WORLD_SIZE;
        
        PhysicsSystem.updateMovement([...entities, player], dt, this.statManager, mapW, mapH);

        // 4. Drone Logic
        DroneSystem.update(
            entities,
            player,
            dt,
            this.inputManager,
            this.playerManager.state.classPath,
            autoSpin,
            this.settings.gameplay.autoFire,
            this.playerManager.activeAbilityTimer,
            this.canvas.width,
            this.canvas.height,
            (key) => this.playerManager.getStatValue(key as StatKey),
            cameraManager.currentZoom // Pass zoom for accurate mouse projection
        );

        // 5. Collisions & Death
        if (!player.isDead) {
            PhysicsSystem.handleCollisions(
                entities, 
                player, 
                this.playerManager.activeAbilityTimer, 
                this.playerManager.state.classPath, 
                handleDeath,
                cameraManager,
                this.statManager,
                this.statusEffectSystem,
                this.audioManager
            );
        } else {
            // Even if dead, other entities might collide
            PhysicsSystem.handleCollisions(
                entities, 
                { ...player, isDead: true } as Entity, 
                0, 
                'basic', 
                handleDeath, 
                cameraManager,
                this.statManager,
                this.statusEffectSystem,
                this.audioManager
            );
        }

        // 6. Cleanup dead entities
        this.entityManager.cleanup();
    }
}
