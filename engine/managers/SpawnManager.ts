
import { Entity, EntityType, BossType, GameMode, Vector2, AIPersonality } from '../../types';
import { BOSS_DATA } from '../../data/bosses';
import { COLORS, WORLD_SIZE, SANDBOX_SIZE } from '../../constants';
import { WorldSystem } from '../systems/WorldSystem';
import { AISystem } from '../systems/AISystem';

export class SpawnManager {
    lastBossSpawnTime: number = Date.now();
    bossSpawnInterval: number = 3 * 60 * 1000; // 3 Minutes default
    isArenaClosing: boolean = false;
    arenaCloserTimer: number = 0;
    
    public getNextBossTime(): number {
        const timeSinceLast = Date.now() - this.lastBossSpawnTime;
        const remaining = Math.max(0, this.bossSpawnInterval - timeSinceLast);
        return remaining / 1000; // In seconds
    }

    update(dt: number, entities: Entity[], player: Entity, gameMode: GameMode, getSpawnPos: (teamId?: string) => Vector2, notify: (msg: string, type: any) => void) {
        const now = Date.now();
        const bossAlive = entities.some(e => e.type === EntityType.BOSS);

        // --- SANDBOX SPECIFIC LOGIC (UNIFIED) ---
        if (gameMode === 'SANDBOX') {
            // 1. Maintain a high density of shapes for testing DPS
            // In Sandbox, we want shapes to respawn instanstly and consistently
            const shapeCount = entities.filter(e => e.type === EntityType.SHAPE || e.type === EntityType.CRASHER).length;
            const shapeCap = 150; // Higher cap for Sandbox
            
            if (shapeCount < shapeCap) {
                // Spawn in batches for performance
                WorldSystem.spawnShapes(entities, 5, gameMode);
            }

            // 2. Ensure there are always a few passive Dummies if no enemies exist
            // This ensures "Consistency" - you always have something to shoot without using the menu
            const enemyCount = entities.filter(e => e.type === EntityType.ENEMY).length;
            if (enemyCount < 2) {
                this.spawnSandboxDummy(entities, getSpawnPos);
            }

            // Note: Bosses in Sandbox are MANUAL only (via button), handled by command manager
            return;
        }

        // --- STANDARD GAME MODES ---

        // Boss Spawning
        if (!bossAlive && !this.isArenaClosing) {
            if (now - this.lastBossSpawnTime > this.bossSpawnInterval) {
                this.spawnBoss(entities, player, notify);
            }
        } else if (bossAlive) {
            this.lastBossSpawnTime = Date.now();
        }

        // Arena Closing Logic
        if (this.isArenaClosing) {
            this.arenaCloserTimer -= dt;
            if (this.arenaCloserTimer <= 0) {
                this.spawnArenaCloser(entities);
                this.arenaCloserTimer = 2.0; 
            }
        }

        // Standard Spawning (Repopulation)
        if (!this.isArenaClosing) {
            if (entities.filter(e => e.type === EntityType.SHAPE || e.type === EntityType.CRASHER).length < 120) {
                if (Math.random() < 0.2) WorldSystem.spawnShapes(entities, 1, gameMode);
            }
            if (entities.filter(e => e.type === EntityType.ENEMY && (!e.teamId || e.teamId !== 'ARENA_CLOSER')).length < 20) {
                if (Math.random() < 0.05) AISystem.spawnBots(entities, 1, gameMode, getSpawnPos);
            }
        }
    }

    spawnBoss(entities: Entity[], player: Entity, notify: (msg: string, type: any) => void, forcedType?: BossType) {
        if (entities.some(e => e.type === EntityType.BOSS)) return;
        
        const types = Object.values(BossType);
        const type = forcedType || types[Math.floor(Math.random() * types.length)];
        const config = BOSS_DATA[type];
        
        let spawnPos = { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE };
        const playerPos = player.pos;
        
        if (Math.hypot(spawnPos.x - playerPos.x, spawnPos.y - playerPos.y) < 1000) {
            spawnPos.x = (spawnPos.x + 2000) % WORLD_SIZE;
        }

        const safeId = Math.random().toString(36).slice(2);

        entities.push({
            id: `boss_${safeId}`, 
            type: EntityType.BOSS, bossType: type, pos: spawnPos, vel: { x: 0, y: 0 },
            radius: config.radius, rotation: 0, color: config.color, health: config.hp, maxHealth: config.hp, damage: config.damage,
            isDead: false, scoreValue: config.xp, aiState: 'IDLE', attackCooldown: 0, teamId: 'BOSS', lastDamageTime: 0
        });
        
        notify(`The ${config.name} has spawned!`, 'boss');
        this.lastBossSpawnTime = Date.now();
    }

    closeArena(notify: (msg: string, type: any) => void) {
        if (this.isArenaClosing) return;
        this.isArenaClosing = true;
        notify("Arena Closed: No players can join.", 'warning');
    }

    spawnArenaCloser(entities: Entity[]) {
        const side = Math.floor(Math.random() * 4);
        let x = 0, y = 0;
        if (side === 0) { x = Math.random() * WORLD_SIZE; y = 0; }
        else if (side === 1) { x = WORLD_SIZE; y = Math.random() * WORLD_SIZE; }
        else if (side === 2) { x = Math.random() * WORLD_SIZE; y = WORLD_SIZE; }
        else { x = 0; y = Math.random() * WORLD_SIZE; }

        const safeId = Math.random().toString(36).slice(2);

        entities.push({
            id: `arena_closer_${safeId}`,
            name: "Arena Closer",
            type: EntityType.ENEMY, 
            pos: { x, y },
            vel: { x: 0, y: 0 },
            radius: 25, 
            rotation: Math.random() * Math.PI * 2,
            color: COLORS.arenaCloser,
            health: 50000,
            maxHealth: 50000,
            damage: 5000,
            isDead: false,
            teamId: 'ARENA_CLOSER', 
            aiState: 'ATTACK',
            classPath: 'arena_closer',
            scoreValue: 0, 
            opacity: 1.0,
            isInvulnerable: true 
        });
    }

    // Helper for auto-populating Sandbox
    private spawnSandboxDummy(entities: Entity[], getSpawnPos: (teamId?: string) => Vector2) {
        // Spawn near center for Sandbox
        const pos = { 
            x: (SANDBOX_SIZE * 1.5)/2 + (Math.random() - 0.5) * 500, 
            y: (SANDBOX_SIZE * 1.5)/2 + (Math.random() - 0.5) * 500 
        };
        const safeId = Math.random().toString(36).slice(2);
        
        entities.push({
            id: `dummy_${safeId}`,
            type: EntityType.ENEMY,
            pos: pos,
            vel: { x: 0, y: 0 },
            radius: 24,
            rotation: 0,
            color: '#555555',
            health: 5000,
            maxHealth: 5000,
            damage: 0,
            isDead: false,
            name: "Target Dummy",
            aiState: 'IDLE',
            aiPersonality: AIPersonality.DUMMY,
            classPath: 'basic',
            scoreValue: 1000
        });
    }
}
