

import { TankConfig, TankRole, BodyShape, Barrel, Stats } from '../types';

interface StatProfile {
    FIREPOWER: number; // % (0-100+)
    ROF: number;       // %
    DURABILITY: number; // %
    MOBILITY: number;   // %
}

interface TankOptions extends Partial<Omit<TankConfig, 'name' | 'tier' | 'role' | 'barrels'>> {
    description?: string;
    profile?: StatProfile; // Optional: Auto-calculate stats from profile
}

/**
 * TANK BUILDER: The core factory pattern.
 * Reduces boilerplate by providing smart defaults and auto-balancing.
 */
export const defineTank = (
    name: string,
    tier: number,
    role: TankRole,
    barrels: Barrel[],
    options: TankOptions = {}
): TankConfig => {
    
    let stats: Partial<Stats> = options.statBonus || {};

    // Auto-calculate stats based on percentages if profile is provided
    if (options.profile) {
        const p = options.profile;
        stats = {
            bulletDmg: 1.0 + (p.FIREPOWER / 100) * 1.5, // Base 1.0, max ~2.5+
            bulletPen: 1.0 + (p.FIREPOWER / 100) * 1.0,
            reload: 1.0 / (0.5 + (p.ROF / 100)), // Inverse: High ROF = Low reload time
            maxHp: 1.0 + (p.DURABILITY / 100) * 2.0,
            bodyDmg: 1.0 + (p.DURABILITY / 100) * 1.5,
            moveSpd: 0.8 + (p.MOBILITY / 100) * 0.8,
            regen: 1.0 + (p.DURABILITY / 200) // Slight regen boost with durability
        };
    }

    return {
        name,
        tier,
        role,
        barrels,
        description: options.description || "A highly advanced tank chassis.",
        fovMult: options.fovMult ?? 1.0,
        bodyShape: options.bodyShape || BodyShape.CIRCLE,
        hasTreads: options.hasTreads ?? false,
        turretColor: options.turretColor,
        bodyColorOverride: options.bodyColorOverride,
        
        // Use calculated or provided stats
        statBonus: stats,
        
        // Skills
        activeSkill: options.activeSkill,
        passiveSkill: options.passiveSkill,
        
        // Advanced
        invisibility: options.invisibility,
        statCap: options.statCap,
        hiddenStats: options.hiddenStats
    };
};