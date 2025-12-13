
import { Vector2, Entity, EntityType } from '../../types';
import { BOSS_DATA } from '../../data/bosses';
import { TANK_CLASSES } from '../../data/tanks';

export class CameraManager {
    spectateTargetId: string | null = null;
    spectatePos: Vector2 = { x: 0, y: 0 };
    
    // Smart Camera Properties
    currentZoom: number = 1.0;
    targetZoom: number = 1.0;
    shake: Vector2 = { x: 0, y: 0 };
    shakeStrength: number = 0;

    getCameraTarget(player: Entity, entities: Entity[]): { pos: Vector2, zoom: number, shake: Vector2 } {
        this.updateShake();
        
        let targetEntity: Entity | undefined;

        if (!player.isDead) {
            targetEntity = player;
        } else if (this.spectateTargetId) {
            targetEntity = entities.find(e => e.id === this.spectateTargetId);
            
            // If target disappeared (died/despawned), switch to another interesting target
            if (!targetEntity) {
                this.cycleSpectatorTarget(entities, 1); // Auto-switch
                // Try finding again immediately
                targetEntity = entities.find(e => e.id === this.spectateTargetId);
            }
        }

        if (targetEntity) {
            // Smoothly lerp to target position
            this.spectatePos.x += (targetEntity.pos.x - this.spectatePos.x) * 0.1;
            this.spectatePos.y += (targetEntity.pos.y - this.spectatePos.y) * 0.1;
            this.updateDynamicZoom(targetEntity);
        }

        return { 
            pos: this.spectatePos,
            zoom: this.currentZoom,
            shake: this.shake
        };
    }

    // --- NEW: SPECTATOR CYCLING LOGIC ---
    cycleSpectatorTarget(entities: Entity[], direction: number) {
        // 1. Gather potential targets (Players, Bosses, High Level Bots)
        const candidates = entities.filter(e => 
            !e.isDead && 
            (e.type === EntityType.PLAYER || e.type === EntityType.BOSS || (e.type === EntityType.ENEMY && e.scoreValue && e.scoreValue > 1000))
        );

        // 2. Sort by "Interest" (Bosses > Score)
        candidates.sort((a, b) => {
            if (a.type === EntityType.BOSS && b.type !== EntityType.BOSS) return -1;
            if (b.type === EntityType.BOSS && a.type !== EntityType.BOSS) return 1;
            return (b.scoreValue || 0) - (a.scoreValue || 0);
        });

        if (candidates.length === 0) return;

        // 3. Find current index
        let currentIndex = candidates.findIndex(e => e.id === this.spectateTargetId);
        
        // 4. Cycle
        let newIndex = currentIndex + direction;
        if (newIndex >= candidates.length) newIndex = 0;
        if (newIndex < 0) newIndex = candidates.length - 1;

        this.spectateTargetId = candidates[newIndex].id;
    }

    getSpectatingName(entities: Entity[]): string {
        if (!this.spectateTargetId) return "Free Camera";
        const target = entities.find(e => e.id === this.spectateTargetId);
        if (!target) return "Searching...";
        
        if (target.type === EntityType.BOSS && target.bossType) return BOSS_DATA[target.bossType].name;
        if (target.name) return target.name;
        return "Unknown Tank";
    }

    private updateDynamicZoom(target: Entity) {
        // Base Radius Logic
        const baseRadiusReference = 22.0; 
        const sizeRatio = Math.max(1.0, target.radius / baseRadiusReference);
        
        // Size Zoom: Bigger tanks = Zoom out more
        const sizeZoom = 1.0 / Math.pow(sizeRatio, 0.6);

        // Speed Zoom: Moving fast = Zoom out
        const speed = Math.hypot(target.vel.x, target.vel.y);
        const speedFactor = Math.min(speed / 600, 1.0); 
        const speedZoomMult = 1.0 - (speedFactor * 0.15);

        // Class FOV Multiplier
        let fovMult = 1.0;
        if (target.classPath && TANK_CLASSES[target.classPath]) {
            fovMult = TANK_CLASSES[target.classPath].fovMult;
        }

        let desiredZoom = (sizeZoom * speedZoomMult) / fovMult;
        
        // Special Case: Bosses need massive zoom out
        if (target.type === EntityType.BOSS) desiredZoom *= 0.6;

        desiredZoom = Math.max(0.2, Math.min(1.5, desiredZoom));

        this.currentZoom += (desiredZoom - this.currentZoom) * 0.05;
    }

    private updateShake() {
        if (this.shakeStrength > 0.01) {
            this.shake.x = (Math.random() - 0.5) * this.shakeStrength * 0.05;
            this.shake.y = (Math.random() - 0.5) * this.shakeStrength * 0.05;
            this.shakeStrength *= 0.6;
        } else {
            this.shakeStrength = 0;
            this.shake = { x: 0, y: 0 };
        }
    }

    addShake(amount: number) {
        this.shakeStrength = Math.min(this.shakeStrength + (amount * 0.1), 4); 
    }

    handleDeath(victimId: string, killer: Entity, player: Entity, entities: Entity[]): { name: string, type: string } | null {
        if (victimId !== 'player') return null;
        
        // Start spectating from death position
        this.spectatePos = { x: player.pos.x, y: player.pos.y };
        this.addShake(5); 

        // Identify Killer to spectate immediately
        let actualKiller = killer;
        if ([EntityType.BULLET, EntityType.DRONE, EntityType.TRAP].includes(killer.type)) {
            if (killer.ownerId) {
                const owner = entities.find(e => e.id === killer.ownerId);
                if (owner) actualKiller = owner;
            }
        }

        // Set initial spectate target
        if (actualKiller && !actualKiller.isDead && actualKiller.id !== player.id) {
            this.spectateTargetId = actualKiller.id;
        } else {
            // If killer is dead or self, find top player
            this.cycleSpectatorTarget(entities, 1);
        }
        
        let killerName = "An unnamed tank";
        let killerType = "tank";

        if (actualKiller.id === 'player') {
             killerName = player.name || "Player";
        } else if (actualKiller.type === EntityType.SHAPE) {
            killerType = "shape";
            if (actualKiller.shapeType) killerName = actualKiller.shapeType.charAt(0) + actualKiller.shapeType.slice(1).toLowerCase().replace('_', ' ');
            else killerName = "Polygon";
        } else if (actualKiller.type === EntityType.BOSS) {
            killerType = "boss";
            if (actualKiller.bossType) killerName = BOSS_DATA[actualKiller.bossType].name;
            else killerName = "Boss";
        } else if (actualKiller.teamId === 'ARENA_CLOSER') {
            killerName = "Arena Closer";
        } else if (actualKiller.type === EntityType.ENEMY) {
            killerName = actualKiller.name || "An unnamed tank";
        }

        return { name: killerName, type: killerType };
    }

    reset() {
        this.spectateTargetId = null;
        this.currentZoom = 1.0;
        this.shakeStrength = 0;
    }
}
