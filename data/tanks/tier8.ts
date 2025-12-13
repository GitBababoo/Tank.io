
import { TankRole, BodyShape, WeaponBehavior } from '../../types';
import { Barrels } from '../barrels/presets';
import { defineTank } from '../TankBuilder';

// =========================================================================
//  TIER 8: CELESTIAL ASCENDANCE (Lv 120)
// =========================================================================

export const Tier8Tanks = {
    starforged_bastion: defineTank("Starforged Bastion", 8, TankRole.HEAVY, [
        Barrels.Plasma({ width: 40, length: 85, dmg: 10.0, recoil: 40, offsetY: 20 }),
        Barrels.Plasma({ width: 40, length: 85, dmg: 10.0, recoil: 40, offsetY: -20, delay: 0.5 }),
        { ...Barrels.Coil({ width: 12, length: 70, angle: 0 }), isAutoTurret: true },
    ], {
        description: "A celestial warship with twin plasma cannons and an automated railgun.",
        profile: { FIREPOWER: 120, ROF: 30, DURABILITY: 130, MOBILITY: 20 },
        bodyShape: BodyShape.OCTAGON,
        bodyColorOverride: '#4c516d',
        turretColor: '#f0e68c'
    }),

    superluminal_blade: defineTank("Superluminal Blade", 8, TankRole.LIGHT, [
        Barrels.Railgun({ width: 18, length: 85, dmg: 3.0, recoil: 5 }),
        Barrels.Standard({ width: 8, length: 20, angle: 0.5, recoil: 0 }), // Wings
        Barrels.Standard({ width: 8, length: 20, angle: -0.5, recoil: 0 }),
    ], {
        description: "Moves faster than light, cutting down enemies with a precise energy blade.",
        profile: { FIREPOWER: 80, ROF: 60, DURABILITY: 25, MOBILITY: 160 },
        bodyShape: BodyShape.DIAMOND,
        statBonus: { bodyDmg: 3.0 }, // Add blade damage
    }),

    dimension_ripper: defineTank("Dimension Ripper", 8, TankRole.ARTILLERY, [
        Barrels.Coil({ width: 45, length: 110, dmg: 7.0, recoil: 30, behavior: WeaponBehavior.HITSCAN }),
    ], {
        description: "Fires a beam that rips through spacetime, leaving a damaging rift.",
        fovMult: 3.0,
        profile: { FIREPOWER: 150, ROF: 10, DURABILITY: 30, MOBILITY: 30 },
        bodyShape: BodyShape.STAR,
        turretColor: '#ff00ff'
    }),

    nexus_overmind: defineTank("Nexus Overmind", 8, TankRole.HYBRID,
        [0, Math.PI/2, Math.PI, -Math.PI/2].map(a => Barrels.Hive({ width: 28, length: 75, angle: a, dmg: 2.5 })),
    {
        description: "The central nexus of a galaxy-spanning swarm.",
        fovMult: 1.8,
        profile: { FIREPOWER: 100, ROF: 60, DURABILITY: 90, MOBILITY: 40 },
        bodyShape: BodyShape.SQUARE,
    }),
};
