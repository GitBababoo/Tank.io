
import { Entity, EntityType, ParticleType, Vector2 } from '../../types';

export class ParticleSystem {
    
    // --- OBJECT POOLING OPTIMIZATION ---
    // Instead of creating new objects every frame, we reuse dead ones.
    static spawnParticle(entities: Entity[], template: Partial<Entity>) {
        // 1. Try to find a dead particle to recycle
        const deadParticle = entities.find(e => e.type === EntityType.PARTICLE && e.isDead);
        
        if (deadParticle) {
            // Reset properties
            Object.assign(deadParticle, {
                isDead: false,
                opacity: 1.0,
                rotation: 0,
                vel: { x: 0, y: 0 },
                ...template,
                id: `p_${Math.random()}` // Refresh ID to ensure uniqueness for React keys if needed
            });
        } else {
            // Create new if pool is empty
            entities.push({
                id: `p_${Math.random()}`,
                type: EntityType.PARTICLE,
                pos: { x: 0, y: 0 },
                vel: { x: 0, y: 0 },
                radius: 1,
                rotation: 0,
                color: '#fff',
                health: 1, maxHealth: 1, damage: 0, isDead: false,
                ...template
            } as Entity);
        }
    }

    static spawnLevelUpEffect(entities: Entity[], pos: {x: number, y: number}, color: string) {
        this.spawnShockwave(entities, pos, 120, color);

        for (let i = 0; i < 6; i++) {
            this.spawnParticle(entities, {
                particleType: ParticleType.SMOKE, 
                pos: { x: pos.x + (Math.random()-0.5)*30, y: pos.y + (Math.random()-0.5)*10 },
                vel: { x: 0, y: -100 - Math.random() * 50 }, 
                radius: 4 + Math.random() * 3,
                color: '#ffffff', 
                lifespan: 0.8 + Math.random() * 0.4,
                opacity: 0.8
            });
        }
    }

    static spawnExplosion(entities: Entity[], pos: {x: number, y: number}, color: string, radius: number) {
        const count = Math.min(20, Math.floor(radius / 2));
        
        // 1. Flash
        this.spawnParticle(entities, {
            particleType: ParticleType.SMOKE,
            pos: { ...pos },
            radius: radius * 0.5,
            color: '#ffffff',
            lifespan: 0.15,
            opacity: 1.0
        });

        // 2. Shockwave
        this.spawnShockwave(entities, pos, radius * 1.5, color);

        // 3. Debris
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (Math.random() * 5 + 2) * (radius / 10);
            
            this.spawnParticle(entities, {
                particleType: ParticleType.DEBRIS,
                pos: { x: pos.x, y: pos.y },
                vel: { x: Math.cos(angle) * speed * 30, y: Math.sin(angle) * speed * 30 },
                radius: (Math.random() * 0.6 + 0.4) * (radius / 3),
                rotation: angle,
                color: color,
                lifespan: 0.5 + Math.random() * 0.5,
            });
        }

        // 4. Smoke
        for (let i = 0; i < 5; i++) {
             this.spawnParticle(entities, {
                particleType: ParticleType.SMOKE,
                pos: { x: pos.x + (Math.random()-0.5)*10, y: pos.y + (Math.random()-0.5)*10 },
                vel: { x: (Math.random()-0.5)*20, y: (Math.random()-0.5)*20 },
                radius: radius * 0.8,
                rotation: Math.random() * Math.PI * 2,
                color: '#ffffff',
                lifespan: 0.8 + Math.random() * 0.4,
                opacity: 0.4
            });
        }
    }

    static spawnHitEffect(entities: Entity[], pos: {x: number, y: number}, color: string) {
        for (let i = 0; i < 4; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 100;
            
            this.spawnParticle(entities, {
                particleType: ParticleType.SPARK,
                pos: { x: pos.x, y: pos.y },
                vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                radius: 3,
                rotation: angle,
                color: color,
                lifespan: 0.2 + Math.random() * 0.1,
            });
        }
    }

    static spawnCritHitEffect(entities: Entity[], pos: {x: number, y: number}, color: string) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 200 + Math.random() * 200;
            
            this.spawnParticle(entities, {
                particleType: ParticleType.SPARK,
                pos: { x: pos.x, y: pos.y },
                vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                radius: 5,
                rotation: angle,
                color: '#ffd700',
                lifespan: 0.3 + Math.random() * 0.2,
            });
        }
    }

    static spawnChargeSpark(entities: Entity[], pos: {x: number, y: number}, color: string) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 10;
        const startPos = { x: pos.x + Math.cos(angle)*dist, y: pos.y + Math.sin(angle)*dist };
        
        this.spawnParticle(entities, {
            particleType: ParticleType.SPARK,
            pos: startPos,
            vel: { x: -Math.cos(angle) * 30, y: -Math.sin(angle) * 30 }, 
            radius: 2,
            rotation: angle,
            color: '#ffffff',
            lifespan: 0.3,
        });
    }

    static spawnFlameParticle(entities: Entity[], pos: {x: number, y: number}, angle: number, shooter: Entity, statsAccessor: (key: any) => number) {
        const speed = statsAccessor('bulletSpd') * 45; 
        const life = 0.6 + Math.random() * 0.3;
        const radius = 10 + Math.random() * 5; 

        this.spawnParticle(entities, {
            particleType: ParticleType.FLAME,
            pos: { x: pos.x, y: pos.y },
            vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            radius: radius,
            rotation: angle,
            color: '#ff9900',
            lifespan: life,
            opacity: 0.8,
            ownerId: shooter.id,
            teamId: shooter.teamId,
        });
    }

    static spawnBeamEffect(entities: Entity[], start: Vector2, end: Vector2, color: string) {
        this.spawnParticle(entities, {
            particleType: ParticleType.BEAM,
            pos: start,
            targetPos: end,
            radius: 0,
            color: color,
            lifespan: 0.3,
            opacity: 1.0,
        });
    }

    static spawnSmokeTrail(entities: Entity[], pos: {x: number, y: number}, radius: number) {
        if (Math.random() > 0.3) return; 
        this.spawnParticle(entities, {
            particleType: ParticleType.SMOKE,
            pos: { x: pos.x, y: pos.y },
            vel: { x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10 },
            radius: radius * 0.6,
            rotation: Math.random() * Math.PI * 2,
            color: '#aaaaaa',
            lifespan: 0.5,
            opacity: 0.3
        });
    }

    static spawnGhostTrail(entities: Entity[], entity: Entity) {
        this.spawnParticle(entities, {
            particleType: ParticleType.GHOST,
            pos: { x: entity.pos.x, y: entity.pos.y },
            vel: { x: 0, y: 0 },
            radius: entity.radius,
            rotation: entity.rotation,
            color: entity.color,
            lifespan: 0.3, 
            opacity: 0.3
        });
    }

    static spawnShockwave(entities: Entity[], pos: Vector2, radius: number, color: string) {
        this.spawnParticle(entities, {
            particleType: ParticleType.SHOCKWAVE,
            pos: { ...pos },
            radius: 10,
            color: color,
            lifespan: 0.5,
            damage: radius // Store max radius in damage field
        });
    }

    static spawnTeleportFlash(entities: Entity[], pos: Vector2) {
        this.spawnParticle(entities, {
            particleType: ParticleType.TELEPORT_FLASH,
            pos: { ...pos },
            radius: 50,
            color: '#ffffff',
            lifespan: 0.2,
        });
    }

    static update(entities: Entity[], dt: number) {
        // Iterate only particles
        for (const ent of entities) {
            if (ent.type !== EntityType.PARTICLE || ent.isDead) continue;

            // Physics
            ent.pos.x += ent.vel.x * dt;
            ent.pos.y += ent.vel.y * dt;
            
            // Friction & Special Logic
            if (ent.particleType === ParticleType.DEBRIS) {
                ent.vel.x *= 0.92;
                ent.vel.y *= 0.92;
                ent.rotation += ent.vel.x * 0.05 * dt;
            } else if (ent.particleType === ParticleType.SPARK) {
                ent.vel.x *= 0.8;
                ent.vel.y *= 0.8;
            } else if (ent.particleType === ParticleType.SMOKE) {
                ent.vel.x *= 0.95;
                ent.vel.y *= 0.95;
                ent.radius += 10 * dt; 
            } else if (ent.particleType === ParticleType.FLAME) {
                ent.vel.x *= 0.95;
                ent.vel.y *= 0.95;
                ent.radius += 30 * dt; 
                if (ent.lifespan && ent.lifespan < 0.3) ent.color = '#333333'; 
                else if (ent.lifespan && ent.lifespan < 0.5) ent.color = '#cc3300'; 
            } else if (ent.particleType === ParticleType.CRYO) {
                ent.vel.x *= 0.96;
                ent.vel.y *= 0.96;
                ent.rotation += 5 * dt; 
            } else if (ent.particleType === ParticleType.SHOCKWAVE) {
                const targetRadius = ent.damage || 200;
                const growth = (targetRadius - ent.radius) * 10 * dt;
                ent.radius += growth;
            } else if (ent.particleType === ParticleType.TELEPORT_FLASH) {
                ent.radius *= 0.8; 
            }

            // Decay Logic
            if (ent.lifespan) {
                ent.lifespan -= dt;
                
                if (ent.particleType === ParticleType.BEAM) {
                    ent.opacity = Math.max(0, ent.lifespan / 0.3);
                } else {
                    ent.opacity = Math.max(0, ent.lifespan / (ent.particleType === ParticleType.SHOCKWAVE ? 0.5 : 1.0)); 
                }
                
                if (ent.lifespan <= 0) ent.isDead = true;
            }
        }
    }
}
