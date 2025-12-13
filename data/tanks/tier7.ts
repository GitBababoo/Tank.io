
import { TankRole, BodyShape, WeaponBehavior } from '../../types';
import { ACTIVE_SKILLS } from '../skills';
import { Barrels } from '../barrels/presets';
import { defineTank } from '../TankBuilder';

// =========================================================================
//  TIER 7: MYTHIC CORE (Lv 105)
// =========================================================================

export const Tier7Tanks = {
    aegis_citadel: defineTank("Aegis Citadel", 7, TankRole.HEAVY, [
        Barrels.Plasma({ width: 50, length: 80, dmg: 9.0, recoil: 35 }),
        Barrels.Gatling({ width: 10, length: 60, angle: 0.8, delay: 0.2, dmg: 1.0 }),
        Barrels.Gatling({ width: 10, length: 60, angle: -0.8, delay: 0.2, dmg: 1.0 }),
        Barrels.TrapLayer({ width: 25, length: 40, angle: Math.PI, recoil: 0 }),
    ], {
        description: "A mobile fortress that combines immense firepower with defensive traps.",
        activeSkill: ACTIVE_SKILLS.FORTIFY,
        profile: { FIREPOWER: 100, ROF: 25, DURABILITY: 110, MOBILITY: 25 },
        bodyShape: BodyShape.OCTAGON,
    }),

    phase_phantom: defineTank("Phase Phantom", 7, TankRole.LIGHT, [
        Barrels.Railgun({ width: 16, length: 80, dmg: 2.5, recoil: 15 }),
        // Phasing Vents (Visual)
        Barrels.Standard({ width: 10, length: 20, angle: 2.0, recoil: 0 }),
        Barrels.Standard({ width: 10, length: 20, angle: -2.0, recoil: 0 }),
    ], {
        description: "A master of surprise attacks, capable of short-range phasing.",
        activeSkill: ACTIVE_SKILLS.TELEPORT, // Represents the 'phase'
        profile: { FIREPOWER: 70, ROF: 40, DURABILITY: 30, MOBILITY: 140 },
        bodyShape: BodyShape.DIAMOND,
        invisibility: { revealDelay: 1.0, fadeSpeed: 4.0 },
    }),

    void_lancer: defineTank("Void Lancer", 7, TankRole.ARTILLERY, [
        Barrels.Coil({ width: 40, length: 100, dmg: 6.0, recoil: 25, behavior: WeaponBehavior.HITSCAN }),
        // Stabilizers
        Barrels.Standard({ width: 8, length: 60, angle: Math.PI / 2, recoil: 0 }),
        Barrels.Standard({ width: 8, length: 60, angle: -Math.PI / 2, recoil: 0 }),
    ], {
        description: "Its beam pierces through the void, hitting targets across the map.",
        fovMult: 2.8,
        profile: { FIREPOWER: 130, ROF: 15, DURABILITY: 35, MOBILITY: 35 },
        bodyShape: BodyShape.X_SHAPE,
        turretColor: '#8a2be2'
    }),

    genesis_core: defineTank("Genesis Core", 7, TankRole.HYBRID,
        [0, Math.PI].map(a => Barrels.Hive({ width: 25, length: 70, angle: a, dmg: 2.0 })),
    {
        description: "Spawns a diverse army of smaller, specialized minions.",
        activeSkill: ACTIVE_SKILLS.REPEL,
        fovMult: 1.7,
        profile: { FIREPOWER: 90, ROF: 50, DURABILITY: 85, MOBILITY: 45 },
        bodyShape: BodyShape.HEXAGON,
    }),
};
