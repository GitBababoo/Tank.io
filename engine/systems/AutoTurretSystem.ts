import { Entity, EntityType, TankConfig, Barrel, SoundType, StatKey } from '../../types';
import { EntityManager } from '../managers/EntityManager';
import { PlayerManager } from '../managers/PlayerManager';
import { AudioManager } from '../managers/AudioManager';
import { TANK_CLASSES } from '../../data/tanks';
import { COLORS } from '../../constants';
import { StatManager } from '../managers/StatManager'; // NEW

export class AutoTurretSystem {

    constructor(
        private entityManager: EntityManager,
        private audioManager: AudioManager,
        private statManager: StatManager // NEW
    ) {}

    private static lerpAngle(start: number, end: number, amount: number): number {
        let difference = end - start;
        while (difference < -Math.PI) difference += Math.PI * 2;
        while (difference > Math.PI) difference -= Math.PI * 2;
        return start + difference * amount;
    }

    public update(entities: Entity[], player: Entity, dt: number, playerManager: PlayerManager) {
        const tanks = [player, ...entities.filter(e => e.type === EntityType.ENEMY && e.classPath)];

        for (const tank of tanks) {
            if (tank.isDead) continue;
            
            const config = TANK_CLASSES[tank.classPath || 'basic'];
            if (!config) continue;

            // Initialize state if not present
            if (!tank.autoTurretStates) {
                tank.autoTurretStates = [];
            }
            
            config.barrels.forEach((barrel, i) => {
                if (!barrel.isAutoTurret || !barrel.autoTurretConfig) return;
                
                let state = tank.autoTurretStates!.find(s => s.barrelIndex === i);
                if (!state) {
                    state = {
                        barrelIndex: i,
                        state: 'IDLE',
                        rotation: tank.rotation + barrel.angle,
                        targetId: null,
                        fireCooldown: 1 / barrel.autoTurretConfig.fireRate,
                        scanDirection: 1
                    };
                    tank.autoTurretStates!.push(state);
                }

                // --- LOGIC PIPELINE ---
                state.fireCooldown = Math.max(0, state.fireCooldown - dt);

                const bestTarget = this.findBestTarget(tank, barrel, entities);
                
                if (bestTarget) {
                    state.targetId = bestTarget.id;
                    state.state = 'TRACKING';

                    // Predict target position (simple prediction)
                    const timeToHit = Math.hypot(bestTarget.pos.x - tank.pos.x, bestTarget.pos.y - tank.pos.y) / 500; // 500 is avg bullet speed
                    const predictedPos = {
                        x: bestTarget.pos.x + bestTarget.vel.x * timeToHit,
                        y: bestTarget.pos.y + bestTarget.vel.y * timeToHit
                    };

                    const targetAngle = Math.atan2(predictedPos.y - tank.pos.y, predictedPos.x - tank.pos.x);
                    state.rotation = AutoTurretSystem.lerpAngle(state.rotation, targetAngle, barrel.autoTurretConfig.turnSpeed * dt);

                    // Check if aimed and ready to fire
                    const angleDiff = Math.abs(state.rotation - targetAngle);
                    if (state.fireCooldown <= 0 && angleDiff < 0.1) { // 0.1 radians tolerance
                        this.fireBullet(tank, barrel, i, state.rotation, playerManager);
                        state.fireCooldown = 1 / barrel.autoTurretConfig.fireRate;
                    }

                } else {
                    state.targetId = null;
                    state.state = 'SCANNING';
                    
                    // Idle scan behavior
                    const scanArc = barrel.autoTurretConfig.arc / 2;
                    const baseAngle = tank.rotation + barrel.angle;
                    const targetScanAngle = baseAngle + (scanArc * state.scanDirection!);
                    
                    state.rotation = AutoTurretSystem.lerpAngle(state.rotation, targetScanAngle, dt * 0.5);

                    if (Math.abs(state.rotation - targetScanAngle) < 0.1) {
                        state.scanDirection! *= -1; // Reverse direction
                    }
                }
            });
        }
    }
    
    private findBestTarget(owner: Entity, barrel: Barrel, allEntities: Entity[]): Entity | null {
        if (!barrel.autoTurretConfig) return null;

        const config = barrel.autoTurretConfig;
        const turretWorldPos = owner.pos; // Simplified position

        const candidates = allEntities.filter(e => 
            !e.isDead && 
            e.id !== owner.id &&
            e.ownerId !== owner.id &&
            (!e.teamId || e.teamId !== owner.teamId) &&
            (e.type === EntityType.SHAPE || e.type === EntityType.CRASHER || e.type === EntityType.ENEMY || e.type === EntityType.PLAYER)
        );

        let bestTarget: Entity | null = null;
        let maxScore = -Infinity;

        for (const target of candidates) {
            const dist = Math.hypot(target.pos.x - turretWorldPos.x, target.pos.y - turretWorldPos.y);

            // 1. Range Check
            if (dist > config.range) continue;
            
            // 2. Arc Check
            const targetAngle = Math.atan2(target.pos.y - turretWorldPos.y, owner.pos.y - turretWorldPos.y);
            const baseAngle = owner.rotation + barrel.angle;
            let angleDiff = targetAngle - baseAngle;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            if (Math.abs(angleDiff) > config.arc / 2) continue;

            // 3. Score Calculation
            let score = 0;
            const w = config.targetingWeights;

            // Proximity Score (higher is better)
            score += w.proximity * (1 - (dist / config.range));
            
            // Health Score (lower health is better)
            score += w.health * (1 - (target.health / target.maxHealth));

            if (score > maxScore) {
                maxScore = score;
                bestTarget = target;
            }
        }
        return bestTarget;
    }

    private fireBullet(shooter: Entity, barrel: Barrel, barrelIndex: number, fireAngle: number, playerManager: PlayerManager) {
        this.audioManager.play(SoundType.SHOOT, shooter.pos, playerManager.entity.pos);

        const getStat = (key: StatKey): number => {
            return this.statManager.getStat(shooter, key);
        };

        const speed = getStat('bulletSpd') * 60;
        const baseRadius = 20;
        const scale = shooter.radius / baseRadius;

        const cosTank = Math.cos(shooter.rotation);
        const sinTank = Math.sin(shooter.rotation);
        
        const offsetXWorld = ((cosTank * barrel.offset.x) - (sinTank * barrel.offset.y)) * scale;
        const offsetYWorld = ((sinTank * barrel.offset.x) + (cosTank * barrel.offset.y)) * scale;

        const cosTotal = Math.cos(fireAngle);
        const sinTotal = Math.sin(fireAngle);
        
        const lengthXWorld = cosTotal * barrel.length * scale;
        const lengthYWorld = sinTotal * barrel.length * scale;

        const spawnX = shooter.pos.x + offsetXWorld + lengthXWorld;
        const spawnY = shooter.pos.y + offsetYWorld + lengthYWorld;

        const damage = getStat('bulletDmg');
        const health = getStat('bulletPen');
        
        this.entityManager.add({
            id: `bullet_${Math.random()}`, 
            type: EntityType.BULLET, 
            pos: { x: spawnX, y: spawnY }, 
            vel: { x: Math.cos(fireAngle) * speed, y: Math.sin(fireAngle) * speed },
            radius: (barrel.width / 2) * scale,
            rotation: fireAngle, 
            color: shooter.id === 'player' ? COLORS.player : (shooter.teamId ? shooter.color : COLORS.enemy),
            health: health, 
            maxHealth: health, 
            damage: damage * barrel.damageMult, 
            isDead: false, 
            ownerId: shooter.id, 
            teamId: shooter.teamId, 
            lifespan: 3, 
            lastDamageTime: 0,
            bulletVisual: barrel.visualType
        });
    }
}