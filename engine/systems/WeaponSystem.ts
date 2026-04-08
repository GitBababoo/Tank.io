
import { Entity, EntityType, Barrel, TankConfig, ShapeType, SoundType, BarrelVisual, BulletType, ParticleType, WeaponBehavior } from '../../types';
import { COLORS } from '../../constants';
import { AudioManager } from '../managers/AudioManager';
import { ParticleSystem } from './ParticleSystem';
import { PhysicsSystem } from './PhysicsSystem';

export class WeaponSystem {
  static update(
    shooter: Entity, 
    config: TankConfig, 
    dt: number, 
    isShooting: boolean,
    resetCycle: boolean,
    entities: Entity[], 
    statsAccessor: (key: any) => number,
    onHitscan: (start: {x:number, y:number}, angle: number, owner: Entity, barrel: Barrel) => void,
    activeAbilityTimer: number = 0,
    audioManager?: AudioManager,
    listenerPos?: { x: number, y: number },
    onShake?: (amount: number) => void
  ) {
    const isSummoner = config.barrels.some((b) => b.isDroneSpawner);
    
    // Calculate Reload Time in Seconds
    const reloadFrames = shooter.id === 'player' ? statsAccessor('reload') : 40;
    const configReload = config.statBonus?.reload || 1.0;
    
    // HARD LIMIT: Prevent reloadTime from being 0 to avoid crashes
    let reloadTime = Math.max(0.03, (reloadFrames / 60) / configReload); 
    
    if (shooter.teamId === 'ARENA_CLOSER') reloadTime = 0.1; 

    // Initialize Arrays if missing
    if (!shooter.barrelCooldowns || shooter.barrelCooldowns.length !== config.barrels.length) {
        shooter.barrelCooldowns = config.barrels.map(b => (b.delay || 0) * reloadTime);
    }
    if (!shooter.barrelRecoils || shooter.barrelRecoils.length !== config.barrels.length) {
        shooter.barrelRecoils = new Array(config.barrels.length).fill(0);
    }
    if (!shooter.barrelCharges || shooter.barrelCharges.length !== config.barrels.length) {
        shooter.barrelCharges = new Array(config.barrels.length).fill(0);
    }

    // Reset Logic: Syncs barrels for a clean "First Shot"
    if (resetCycle && isShooting) {
         const allReady = shooter.barrelCooldowns.every(cd => cd <= 0.1);
         if (allReady) {
             shooter.barrelCooldowns = config.barrels.map(b => (b.delay || 0) * reloadTime);
         }
    }

    config.barrels.forEach((barrel: Barrel, i: number) => {
        // 1. Advance Time
        shooter.barrelCooldowns![i] -= dt;

        const shouldFire = isShooting || (isSummoner && isShooting);
        const maxCharge = barrel.chargeTime || 0;

        // --- CHARGING LOGIC ---
        // Only start charging if cooldown is ready
        if (shouldFire && maxCharge > 0 && shooter.barrelCooldowns![i] <= 0) {
            if (shooter.barrelCharges![i] < maxCharge) {
                // Play Charge Sound ONCE at start
                if (shooter.barrelCharges![i] <= 0 && audioManager) {
                    audioManager.play(SoundType.CHARGE, shooter.pos, listenerPos);
                }

                shooter.barrelCharges![i] += dt;
                
                // Visual Spark (Implosion)
                if (Math.random() < 0.3) {
                    const muzzle = this.getMuzzlePos(shooter, barrel);
                    ParticleSystem.spawnChargeSpark(entities, muzzle, barrel.bulletColor || shooter.color);
                }
                return; // Stop here, waiting for full charge
            }
        } else if (!shouldFire) {
            // Decay charge quickly if button released
            if (shooter.barrelCharges![i] > 0) {
                shooter.barrelCharges![i] = Math.max(0, shooter.barrelCharges![i] - dt * 4);
            }
        }

        // --- FIRING LOGIC ---
        if (shouldFire) {
             // Charge Check: Must be fully charged
             if (maxCharge > 0 && shooter.barrelCharges![i] < maxCharge) return;

             // Drone Cap Check
             if (barrel.isDroneSpawner) {
                const myDrones = entities.filter(e => e.type === EntityType.DRONE && e.ownerId === shooter.id).length;
                const reloadStat = shooter.id === 'player' ? statsAccessor('reload') : 20;
                const maxDrones = Math.floor(reloadStat / 5) + 4;
                if (myDrones >= maxDrones) {
                    shooter.barrelCooldowns![i] = Math.max(0, shooter.barrelCooldowns![i]); 
                    return;
                }
             }

             // READY TO FIRE?
             if (shooter.barrelCooldowns![i] <= 0) {
                 
                 // === ROBUST FIRING LOGIC ===
                 // Separate logic for Charged vs Automatic weapons to prevent bugs.

                 if (maxCharge > 0 || barrel.behavior === WeaponBehavior.HITSCAN) {
                     // --- CHARGED / HITSCAN MODE (Single Shot, Hard Reset) ---
                     // We force a hard reset of cooldown to ensure the charge cycle restarts cleanly.
                     
                     const spawnPos = this.getMuzzlePos(shooter, barrel);
                     const spread = barrel.spread || 0;
                     const inaccuracy = (Math.random() - 0.5) * spread;
                     const fireAngle = shooter.rotation + barrel.angle + inaccuracy;

                     // 1. Effects
                     if (shooter.barrelRecoils) shooter.barrelRecoils[i] = 1.0;
                     if (onShake && shooter.id === 'player') onShake((barrel.recoil || 1) * 2);
                     
                     // 2. Execution
                     if (barrel.behavior === WeaponBehavior.HITSCAN) {
                         if (audioManager) audioManager.play(SoundType.LASER_BLAST, shooter.pos, listenerPos);
                         onHitscan(spawnPos, fireAngle, shooter, barrel);
                     } else {
                         // Charged Projectile (e.g. Plasma Railgun)
                         this.spawnBullet(shooter, barrel, i, entities, statsAccessor, audioManager, listenerPos, fireAngle, spawnPos, true);
                     }

                     // 3. HARD RESET (Critical Fix)
                     // Do not allow negative cooldown debt to accumulate for charged weapons.
                     shooter.barrelCooldowns![i] = reloadTime; 
                     shooter.barrelCharges![i] = 0;

                 } else {
                     // --- AUTOMATIC PROJECTILE MODE (Catch-up Loop) ---
                     // Standard bullets loop to maintain fire rate during lag
                     
                     let shotsFiredThisFrame = 0;
                     const MAX_SHOTS = 5;

                     while (shooter.barrelCooldowns![i] <= 0) {
                         const spread = barrel.spread || 0;
                         const inaccuracy = (Math.random() - 0.5) * spread;
                         const fireAngle = shooter.rotation + barrel.angle + inaccuracy;
                         const spawnPos = this.getMuzzlePos(shooter, barrel);

                         // Wall Check (Don't spawn inside walls)
                         const wallHit = this.checkWallObstruction(shooter.pos, spawnPos, entities);
                         if (wallHit) {
                             ParticleSystem.spawnHitEffect(entities, wallHit, '#888');
                             shooter.barrelCooldowns![i] = reloadTime; // Jam gun if in wall
                             break; 
                         }

                         // Visuals (First shot only to avoid flicker)
                         if (shotsFiredThisFrame === 0) {
                            if (shooter.barrelRecoils) shooter.barrelRecoils[i] = 1.0;
                            if (onShake && shooter.id === 'player') {
                                const shakeAmt = (barrel.recoil || 1) * (barrel.damageMult || 1) * 0.5;
                                if (shakeAmt > 0.5) onShake(shakeAmt);
                            }
                         }

                         this.spawnBullet(shooter, barrel, i, entities, statsAccessor, audioManager, listenerPos, fireAngle, spawnPos, shotsFiredThisFrame === 0);
                         
                         shooter.barrelCooldowns![i] += reloadTime;
                         shotsFiredThisFrame++;
                         if (shotsFiredThisFrame >= MAX_SHOTS) {
                             shooter.barrelCooldowns![i] = 0; // Cap loop
                             break; 
                         }
                     }
                 }
             }

        } else {
             // Cap negative cooldown to prevent "mega burst" after waiting
             if (shooter.barrelCooldowns![i] < -0.05) shooter.barrelCooldowns![i] = -0.05;
        }
    });
  }

  private static checkWallObstruction(start: {x:number, y:number}, end: {x:number, y:number}, entities: Entity[]): {x:number, y:number} | null {
        for (const e of entities) {
            if (e.type !== EntityType.WALL) continue;
            if (PhysicsSystem.isPointInRect(end, e)) return end;
        }
        return null;
  }

  private static getMuzzlePos(shooter: Entity, barrel: Barrel): { x: number, y: number } {
        const cosTank = Math.cos(shooter.rotation); 
        const sinTank = Math.sin(shooter.rotation);
        
        const baseRadius = 20;
        const scale = shooter.radius / baseRadius;

        const offsetXWorld = ((cosTank * barrel.offset.x) - (sinTank * barrel.offset.y)) * scale;
        const offsetYWorld = ((sinTank * barrel.offset.x) + (cosTank * barrel.offset.y)) * scale;

        const totalAngle = shooter.rotation + barrel.angle;
        const cosTotal = Math.cos(totalAngle);
        const sinTotal = Math.sin(totalAngle);
        
        const lengthXWorld = cosTotal * barrel.length * scale;
        const lengthYWorld = sinTotal * barrel.length * scale;

        return {
            x: shooter.pos.x + offsetXWorld + lengthXWorld,
            y: shooter.pos.y + offsetYWorld + lengthYWorld
        };
  }

  private static spawnBullet(
      shooter: Entity, 
      barrel: Barrel, 
      barrelIndex: number,
      entities: Entity[], 
      statsAccessor: (key: any) => number,
      audioManager: AudioManager | undefined,
      listenerPos: { x: number, y: number } | undefined,
      fireAngle: number,
      spawnPos: { x: number, y: number },
      isFirstShotOfFrame: boolean
  ) {
        if (isFirstShotOfFrame) {
            if (barrel.visualType !== 'MACHINE_GUN' && barrel.visualType !== 'FLAME' && barrel.visualType !== 'GATLING') {
                 if (audioManager) audioManager.play(barrel.chargeTime ? SoundType.LASER_BLAST : SoundType.SHOOT, shooter.pos, listenerPos);
            } else if (Math.random() < 0.25) {
                 if (audioManager) audioManager.play(SoundType.SHOOT, shooter.pos, listenerPos);
            }
        }

        let speedVal = shooter.id === 'player' ? statsAccessor('bulletSpd') : 5;
        if (shooter.teamId === 'ARENA_CLOSER') speedVal = 25; 

        const speed = speedVal * 60; 
        const baseRadius = 20;
        const scale = shooter.radius / baseRadius;

        if (!barrel.isAutoTurret) {
            const recoilForce = barrel.recoil * 150 * 0.016 * scale; 
            shooter.vel.x -= Math.cos(fireAngle) * recoilForce;
            shooter.vel.y -= Math.sin(fireAngle) * recoilForce;
        }
        
        let damage = shooter.id === 'player' ? statsAccessor('bulletDmg') : 10;
        let health = shooter.id === 'player' ? statsAccessor('bulletPen') : 10;
        
        const critChance = shooter.id === 'player' ? statsAccessor('critChance') : 0.05;
        const isCrit = Math.random() < critChance;
        if (isCrit) {
            const critMult = shooter.id === 'player' ? statsAccessor('critDamage') : 1.5;
            damage *= critMult;
        }

        if (shooter.teamId === 'ARENA_CLOSER') { damage = 1000; health = 1000; }

        const lifespan = barrel.visualType === 'FLAME' ? 0.6 : 3.0; 

        if (barrel.visualType === 'FLAME') {
             ParticleSystem.spawnFlameParticle(entities, spawnPos, fireAngle, shooter, statsAccessor);
             entities.push({
                id: `flame_hitbox_${Math.random()}`, 
                type: EntityType.BULLET, 
                pos: { ...spawnPos }, prevPos: { ...spawnPos },
                vel: { x: Math.cos(fireAngle) * speed * 0.7, y: Math.sin(fireAngle) * speed * 0.7 },
                radius: (barrel.width / 2) * scale * 2, 
                rotation: fireAngle, 
                color: 'transparent', 
                health: health * 0.5, maxHealth: health * 0.5, 
                damage: damage * barrel.damageMult * 0.2, 
                isDead: false, ownerId: shooter.id, teamId: shooter.teamId, 
                lifespan: 0.4, lastDamageTime: 0, bulletVisual: 'FLAME'
            });
            return;
        }

        if (barrel.isDroneSpawner) {
            entities.push({
                id: `drone_${Math.random()}`, type: EntityType.DRONE, pos: spawnPos, vel: { x: Math.cos(fireAngle) * speed, y: Math.sin(fireAngle) * speed },
                radius: 8 * scale, rotation: fireAngle, color: COLORS.drone, health: health * 2, maxHealth: health * 2, damage: damage, isDead: false, ownerId: shooter.id, teamId: shooter.teamId, lastDamageTime: 0
            });
        } else if (barrel.isTrapLayer) {
                entities.push({
                id: `trap_${Math.random()}`, type: EntityType.TRAP, pos: spawnPos, vel: { x: Math.cos(fireAngle) * speed, y: Math.sin(fireAngle) * speed },
                radius: 15 * scale, rotation: fireAngle, color: COLORS.trap, health: health * 5, maxHealth: health * 5, damage: damage * 2, isDead: false, ownerId: shooter.id, teamId: shooter.teamId, lifespan: 15, lastDamageTime: 0
            });
        } else {
            let bulletColor = isCrit ? '#ffd700' : (shooter.id === 'player' ? COLORS.player : (shooter.teamId ? shooter.color : COLORS.enemy));
            if (barrel.bulletColor && !isCrit) bulletColor = barrel.bulletColor;

            const bullet: Entity = {
                id: `bullet_${Math.random()}`, type: EntityType.BULLET, 
                pos: { ...spawnPos }, prevPos: { ...spawnPos },
                vel: { x: Math.cos(fireAngle) * speed, y: Math.sin(fireAngle) * speed },
                radius: (barrel.width / 2) * scale * (isCrit ? 1.3 : 1.0),
                rotation: fireAngle, 
                color: bulletColor,
                health: health, maxHealth: health, damage: damage * barrel.damageMult, 
                isDead: false, ownerId: shooter.id, teamId: shooter.teamId, 
                lifespan: lifespan, lastDamageTime: 0,
                bulletVisual: barrel.visualType,
                bulletType: barrel.bulletType || BulletType.STANDARD,
                isCritical: isCrit,
                trailConfig: barrel.trailConfig
            };

            if (bullet.bulletType === BulletType.HIGH_EXPLOSIVE) bullet.explosionRadius = 80 * scale;
            
            entities.push(bullet);
        }
  }
}
