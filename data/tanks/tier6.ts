
import { TankRole, BodyShape, WeaponBehavior } from '../../types';
import { ACTIVE_SKILLS, PASSIVE_SKILLS } from '../skills';
import { Barrels } from '../barrels/presets';
import { defineTank } from '../TankBuilder';

// =========================================================================
//  TIER 6: ELITE SPECIALIZATION (Lv 90)
// =========================================================================

export const Tier6Tanks = {
    cosmic_juggernaut: defineTank("Cosmic Juggernaut", 6, TankRole.HEAVY, [
        Barrels.Plasma({ width: 60, length: 75, dmg: 8.5, recoil: 32 }),
        Barrels.Standard({ width: 70, length: 40, dmg: 0 }),
        Barrels.Gatling({ width: 8, length: 50, angle: 0.5, delay: 0.5, dmg: 0.8 }),
        Barrels.Gatling({ width: 8, length: 50, angle: -0.5, delay: 0.5, dmg: 0.8 }),
    ], {
        description: "A refined Galaxy Breaker with added point-defense cannons.",
        profile: { FIREPOWER: 90, ROF: 20, DURABILITY: 95, MOBILITY: 30 },
        bodyShape: BodyShape.STAR,
        bodyColorOverride: '#111',
        turretColor: '#ff4444'
    }),

    quantum_striker: defineTank("Quantum Striker", 6, TankRole.LIGHT, [
        Barrels.Railgun({ width: 14, length: 75, dmg: 2.0, recoil: 12 }),
        Barrels.Standard({ width: 18, length: 60, angle: Math.PI - 0.3, recoil: 10.0 }),
        Barrels.Standard({ width: 18, length: 60, angle: Math.PI + 0.3, recoil: 10.0 }),
    ], {
        description: "An evolution of the Wyvern, built for even more extreme speeds.",
        activeSkill: ACTIVE_SKILLS.TELEPORT,
        profile: { FIREPOWER: 60, ROF: 50, DURABILITY: 35, MOBILITY: 125 },
        bodyShape: BodyShape.TRIANGLE,
        turretColor: '#00ffee'
    }),

    supernova_artillery: defineTank("Supernova Artillery", 6, TankRole.ARTILLERY, [
        Barrels.Coil({ width: 35, length: 95, dmg: 5.5, recoil: 22, behavior: WeaponBehavior.HITSCAN }),
        Barrels.Standard({ width: 15, length: 85, offsetY: 25, dmg: 0 }),
        Barrels.Standard({ width: 15, length: 85, offsetY: -25, dmg: 0 }),
    ], {
        description: "The Nova Cannon, refined for faster charge and higher penetration.",
        passiveSkill: PASSIVE_SKILLS.SNIPER_SCOPE,
        fovMult: 2.6,
        profile: { FIREPOWER: 110, ROF: 18, DURABILITY: 40, MOBILITY: 40 },
        bodyShape: BodyShape.X_SHAPE,
    }),

    archon_commander: defineTank("Archon Commander", 6, TankRole.HYBRID,
        [0, Math.PI/2, Math.PI, -Math.PI/2].map(a =>
            Barrels.DroneSpawner({ width: 22, length: 65, angle: a })
        ),
    {
        description: "Commands larger, more powerful drone swarms with enhanced AI.",
        activeSkill: ACTIVE_SKILLS.REPEL,
        passiveSkill: PASSIVE_SKILLS.REGEN_AURA,
        fovMult: 1.6,
        profile: { FIREPOWER: 80, ROF: 40, DURABILITY: 80, MOBILITY: 50 },
        bodyShape: BodyShape.SQUARE,
    }),
};
