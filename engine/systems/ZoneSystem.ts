
import { Entity, EntityType, ShapeType } from '../../types';
import { COLORS } from '../../constants';

export class ZoneSystem {
    
    /**
     * Updates all zones and handles interactions with entities.
     * Logic: 
     * - Teammates in Base = Safe, Heal, Invulnerable.
     * - Enemies in Base = Damage, Repel, Drone Attack.
     */
    static update(entities: Entity[], player: Entity, dt: number) {
        const zones = entities.filter(e => e.type === EntityType.ZONE);
        // Include player in the entity loop for consistent processing
        const targets = [...entities, player].filter(e => 
            !e.isDead && 
            e.type !== EntityType.ZONE && 
            e.type !== EntityType.WALL && 
            e.type !== EntityType.PARTICLE && 
            e.type !== EntityType.FLOATING_TEXT
        );

        zones.forEach(zone => {
            if (!zone.width || !zone.height) return;
            const halfW = zone.width / 2;
            const halfH = zone.height / 2;
            
            targets.forEach(ent => {
                // AABB Check (Axis-Aligned Bounding Box)
                if (ent.pos.x > zone.pos.x - halfW && ent.pos.x < zone.pos.x + halfW &&
                    ent.pos.y > zone.pos.y - halfH && ent.pos.y < zone.pos.y + halfH) {
                    
                    // --- CASE 1: TEAMMATE (SAFE) ---
                    if (ent.teamId === zone.teamId) {
                        // Grant Invulnerability & Visual Flag
                        ent.isInvulnerable = true;
                        ent.inSafeZone = true; // Use this for drawing the shield

                        // Rapid Heal (50% max HP per sec)
                        if (ent.health < ent.maxHealth) {
                            ent.health = Math.min(ent.maxHealth, ent.health + (ent.maxHealth * 0.5 * dt));
                        }
                    } 
                    
                    // --- CASE 2: ENEMY (DANGER) ---
                    else if (ent.teamId !== zone.teamId && ent.teamId !== 'BOSS') {
                        // Don't kill Arena Closers
                        if (ent.teamId === 'ARENA_CLOSER') return;

                        // Destroy projectiles instantly
                        if (ent.type === EntityType.BULLET || ent.type === EntityType.DRONE || ent.type === EntityType.TRAP) {
                            ent.isDead = true;
                            return;
                        }
                        
                        // Damage & Repel Tanks
                        if (ent.type === EntityType.PLAYER || ent.type === EntityType.ENEMY) {
                            // Heavy Damage
                            ent.health -= 1000 * dt; 
                            ent.lastDamageTime = Date.now();
                            
                            // Strong Repulsion Force (Push out from center)
                            const dx = ent.pos.x - zone.pos.x;
                            const dy = ent.pos.y - zone.pos.y;
                            const dist = Math.hypot(dx, dy) || 1;
                            
                            // Normalize & Push
                            ent.vel.x += (dx/dist) * 2000 * dt;
                            ent.vel.y += (dy/dist) * 2000 * dt;

                            // Spawn Base Drones if not enough
                            const existingDrones = entities.filter(e => e.type === EntityType.DRONE && e.teamId === zone.teamId && e.ownerId === zone.id);
                            if (existingDrones.length < 6) { // Increased limit
                                 ZoneSystem.spawnBaseDrone(entities, zone, ent);
                            }
                        }
                    }
                }
            });
        });
    }

    static spawnBaseDrone(entities: Entity[], zone: Entity, target: Entity) {
        const safeId = Math.random().toString(36).slice(2);
        entities.push({
           id: `base_drone_${safeId}`,
           type: EntityType.DRONE,
           pos: { x: zone.pos.x, y: zone.pos.y },
           vel: { x: 0, y: 0 },
           radius: 12,
           rotation: 0,
           color: COLORS.baseDrone,
           health: 500,
           maxHealth: 500,
           damage: 200, // Insta-kill most things
           isDead: false,
           teamId: zone.teamId,
           ownerId: zone.id,
           aiState: 'ATTACK',
           targetPos: target.pos,
           shapeType: ShapeType.TRIANGLE
        });
    }
}
