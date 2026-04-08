
import { Entity, StatusEffect, StatusEffectType, ParticleType } from '../../types';
import { ParticleSystem } from './ParticleSystem';

export class StatusEffectSystem {

    public apply(target: Entity, effect: StatusEffect) {
        if (!target.statusEffects) {
            target.statusEffects = [];
        }

        const existingEffect = target.statusEffects.find(e => e.type === effect.type && e.sourceId === effect.sourceId);

        if (existingEffect) {
            // Refresh duration of existing effect
            existingEffect.duration = Math.max(existingEffect.duration, effect.duration);
        } else {
            // Add new effect
            target.statusEffects.push(effect);
        }
    }

    public update(entities: Entity[], dt: number) {
        for (const entity of entities) {
            if (entity.isDead || !entity.statusEffects || entity.statusEffects.length === 0) {
                continue;
            }

            // Apply effects for this frame
            for (const effect of entity.statusEffects) {
                switch (effect.type) {
                    case StatusEffectType.BURN:
                        if (effect.damagePerSecond) {
                            entity.health -= effect.damagePerSecond * dt;
                            entity.lastDamageTime = Date.now();
                            
                            // --- VISUAL: Emit Fire/Smoke Particles ---
                            if (Math.random() < 0.3) {
                                ParticleSystem.spawnFlameParticle(entities, entity.pos, Math.random() * Math.PI * 2, entity, () => 1);
                            }
                        }
                        break;
                    case StatusEffectType.SLOW:
                        if (effect.slowFactor) {
                            entity.vel.x *= (1 - (effect.slowFactor * (dt * 60)));
                            entity.vel.y *= (1 - (effect.slowFactor * (dt * 60)));
                            
                            // --- VISUAL: Emit Ice Particles ---
                            if (Math.random() < 0.1) {
                                entities.push({
                                    id: `p_ice_${Math.random()}`,
                                    type: 'PARTICLE' as any,
                                    particleType: ParticleType.CRYO,
                                    pos: { x: entity.pos.x + (Math.random()-0.5)*entity.radius, y: entity.pos.y + (Math.random()-0.5)*entity.radius },
                                    vel: { x: (Math.random()-0.5)*20, y: (Math.random()-0.5)*20 },
                                    radius: 3,
                                    rotation: Math.random() * Math.PI,
                                    color: '#aaffff',
                                    health: 1, maxHealth: 1, damage: 0, isDead: false,
                                    lifespan: 0.5, opacity: 0.8
                                });
                            }
                        }
                        break;
                }
                // Tick down duration
                effect.duration -= dt;
            }
            
            // Remove expired effects
            entity.statusEffects = entity.statusEffects.filter(effect => effect.duration > 0);

            // Check for death from DoT
            if (entity.health <= 0 && !entity.isDead) {
                entity.isDead = true;
            }
        }
    }
}
