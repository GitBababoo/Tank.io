

import { Entity, StatKey, PlayerState, FactionType, EntityType, StatusEffectType, AIPersonality } from '../../types';
import { MAX_STAT_LEVEL, INFINITE_STAT_DIMINISHING_RETURN } from '../../constants';
import { TANK_CLASSES } from '../../data/tanks';

/**
 * NEW: StatManager (The "Middle-Man")
 * Centralizes all stat calculation logic for any entity.
 */
export class StatManager {

    public getStat(entity: Entity, key: StatKey, playerState?: PlayerState): number {
        let value = (entity.type === EntityType.PLAYER && playerState)
            ? this.calculatePlayerBaseValue(entity, playerState, key)
            : this.getBotStat(entity, key);

        if (entity.statusEffects) {
            for (const effect of entity.statusEffects) {
                switch (effect.type) {
                    case StatusEffectType.OVERCLOCK:
                        if (key === 'reload') value /= 2;
                        break;
                    case StatusEffectType.SLOW:
                        if (key === 'moveSpd' && effect.slowFactor) value *= (1 - effect.slowFactor);
                        break;
                    case StatusEffectType.HASTE:
                        if (key === 'moveSpd' && effect.speedMultiplier) value *= effect.speedMultiplier;
                        break;
                }
            }
        }
        return value;
    }

    public getDamageMultiplier(entity: Entity): number {
        let multiplier = 1.0;
        if (entity.statusEffects) {
            for (const effect of entity.statusEffects) {
                if (effect.type === StatusEffectType.FORTIFY && effect.value) {
                    multiplier *= (1 - effect.value);
                }
            }
        }
        return multiplier;
    }

    // STRICT MASS CALCULATION
    // This value directly divides Acceleration. 
    // Higher Mass = Slower Acceleration (Sluggishness) AND harder to push
    public getEntityMass(entity: Entity, playerState?: PlayerState): number {
        if (entity.type === EntityType.BOSS) return 200.0; // Bosses are extremely heavy
        if (entity.type === EntityType.SHAPE) return 0.5 + (entity.radius * 0.1);
        
        // --- NEW: Bullet Mass Logic ---
        // Big bullets (Destroyer/Annihilator) need MASSIVE mass to plow through small bullets
        if (entity.type === EntityType.BULLET) {
            // Mass proportional to size (radius). 
            // Normal bullet radius ~5-8 (Mass ~2-4)
            // Destroyer bullet radius ~20+ (Mass ~20+)
            const sizeFactor = entity.radius * 0.5;
            return Math.max(0.5, sizeFactor * sizeFactor * 0.2);
        }

        let level = 1;
        let tier = 0;

        if (entity.type === EntityType.PLAYER && playerState) {
            level = playerState.level;
            const config = TANK_CLASSES[playerState.classPath];
            tier = config ? config.tier : 0;
        } else {
            level = (entity as any).level || 1;
            const config = TANK_CLASSES[entity.classPath || 'basic'];
            tier = config ? config.tier : 0;
        }

        // Base Mass = 1.0 (Level 1)
        const mass = 1.0 + (level * 0.02) + (tier * 0.5);
        
        return Math.max(1.0, mass);
    }

    private calculatePlayerBaseValue(player: Entity, state: PlayerState, key: StatKey): number {
        let points = state.stats[key];
        
        if (state.faction === FactionType.IRON_LEGION && key === 'maxHp') points += 1;
        if (state.faction === FactionType.NEON_VANGUARD && (key === 'moveSpd' || key === 'reload')) points += 0.5;
        if (state.faction === FactionType.SHADOW_SYNDICATE && (key === 'bodyDmg' || key === 'critChance')) points += 1;
        if (state.faction === FactionType.SOLAR_DYNASTY && key === 'regen') points += 2;

        if (points > MAX_STAT_LEVEL) {
            const extra = points - MAX_STAT_LEVEL;
            points = MAX_STAT_LEVEL + (extra * INFINITE_STAT_DIMINISHING_RETURN);
        }
        
        const config = TANK_CLASSES[state.classPath];
        const bonus = config.statBonus?.[key] || 1;
        const level = state.level;

        switch (key) {
            case 'maxHp': 
                return (50 + (level - 1) * 2 + 20 * points) * bonus;
                
            case 'regen': 
                return player.maxHealth * (0.001 + points * 0.0005) * bonus;
                
            case 'bodyDmg': 
                return (20 + points * 6) * bonus;
                
            case 'bulletSpd': 
                return (5 + (points * 1.0)) * bonus;
                
            case 'bulletPen': 
                return (8 + points * 8) * bonus;
                
            case 'bulletDmg': 
                return (7 + points * 4) * bonus;
                
            case 'reload':
                let cooldown = 30 * Math.pow(0.85, points);
                return Math.max(3, cooldown / bonus);
                
            case 'moveSpd':
                const levelPenalty = 1.0 - (level * 0.002);
                const statBoost = 1.0 + (points * 0.12);
                let val = 10 * statBoost * levelPenalty * bonus;
                if (config.passiveSkill?.type === 'SPEED_BOOST_LOW_HP') {
                    if (player.health / player.maxHealth < 0.3) val *= 1.5;
                }
                return val;
                
            case 'critChance': return (0.03 + (config.baseCritChance || 0)) + points * 0.007;
            case 'critDamage': return (1.5 * (config.baseCritMultiplier || 1.0)) + points * 0.05;
            default: return points;
        }
    }

    private getBotStat(bot: Entity, key: StatKey): number {
        const level = (bot as any).level || 1;
        const config = TANK_CLASSES[bot.classPath || 'basic'];
        const bonus = config.statBonus?.[key] || 1;
        const personality = bot.aiPersonality || AIPersonality.BALANCED;

        let buildMult = 1.0;

        if (personality === AIPersonality.RUSHER) {
            if (key === 'moveSpd' || key === 'bodyDmg' || key === 'maxHp' || key === 'regen') buildMult = 1.5;
            if (key === 'bulletDmg' || key === 'bulletSpd') buildMult = 0.5;
        } else if (personality === AIPersonality.SNIPER) {
            if (key === 'bulletSpd' || key === 'bulletDmg') buildMult = 1.4;
            if (key === 'reload') buildMult = 0.8;
        } else if (personality === AIPersonality.FLANKER) {
            if (key === 'moveSpd') buildMult = 1.3;
            if (key === 'reload') buildMult = 1.2;
        }

        switch (key) {
            case 'maxHp': return (50 + (level - 1) * 10) * bonus * buildMult;
            case 'regen': return bot.maxHealth * 0.002 * buildMult;
            case 'bodyDmg': return (20 + level * 2) * bonus * buildMult;
            case 'bulletSpd': return (5 + level * 0.2) * bonus * buildMult;
            case 'bulletPen': return (10 + level * 1.5) * bonus * buildMult;
            case 'bulletDmg': return (7 + level * 0.5) * bonus * buildMult;
            case 'reload': 
                let baseReload = Math.max(5, (30 - level * 0.5));
                if (personality === AIPersonality.RUSHER) baseReload *= 1.5;
                else if (personality === AIPersonality.FLANKER) baseReload *= 0.8;
                return baseReload / bonus;
                
            case 'moveSpd': 
                const levelPenalty = 1.0 - (level * 0.002);
                return (8 + level * 0.05) * levelPenalty * bonus * buildMult;
            case 'critChance': return 0.05 + (config.baseCritChance || 0);
            case 'critDamage': return 1.5 * (config.baseCritMultiplier || 1.0);
            default: return 1;
        }
    }
}