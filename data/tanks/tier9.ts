
import { TankRole, BodyShape, WeaponBehavior, BulletType } from '../../types';
import { Barrels } from '../barrels/presets';
import { defineTank } from '../TankBuilder';

// =========================================================================
//  TIER 9: APEX SINGULARITY (Lv 135)
// =========================================================================

export const Tier9Tanks = {
    celestial_colossus: defineTank("Celestial Colossus", 9, TankRole.HEAVY, [
        Barrels.Plasma({ width: 50, length: 90, dmg: 12.0, recoil: 45, offsetY: 0 }),
        { ...Barrels.Coil({ width: 15, length: 80, angle: 0.3 }), isAutoTurret: true },
        { ...Barrels.Coil({ width: 15, length: 80, angle: -0.3 }), isAutoTurret: true },
    ], {
        description: "The pinnacle of heavy tank design, a walking apocalypse.",
        profile: { FIREPOWER: 140, ROF: 25, DURABILITY: 150, MOBILITY: 15 },
        bodyShape: BodyShape.SPIKED,
        bodyColorOverride: '#000',
        turretColor: '#fff'
    }),

    singularity_ghost: defineTank("Singularity Ghost", 9, TankRole.LIGHT, [
        Barrels.Railgun({ width: 20, length: 90, dmg: 4.0, recoil: 1 }),
    ], {
        description: "A phantom that exists in multiple places at once. Untouchable.",
        profile: { FIREPOWER: 90, ROF: 50, DURABILITY: 20, MOBILITY: 180 },
        bodyShape: BodyShape.DIAMOND,
        invisibility: { revealDelay: 0.1, fadeSpeed: 10.0 },
    }),

    world_ender_railgun: defineTank("World Ender", 9, TankRole.ARTILLERY, [
        // Added BulletType.ARMOR_PIERCING for explicit UI indication
        Barrels.Coil({ width: 50, length: 120, dmg: 8.0, recoil: 35, behavior: WeaponBehavior.HITSCAN, bulletType: BulletType.ARMOR_PIERCING }),
    ], {
        description: "A weapon platform so powerful it can crack planets.",
        fovMult: 3.5,
        profile: { FIREPOWER: 180, ROF: 5, DURABILITY: 25, MOBILITY: 25 },
        bodyShape: BodyShape.STAR,
    }),

    celestial_swarmhost: defineTank("Celestial Swarmhost", 9, TankRole.HYBRID,
        [0, Math.PI/2, Math.PI, -Math.PI/2].map(a => Barrels.Hive({ width: 30, length: 80, angle: a, dmg: 3.0 })),
    {
        description: "Birthing swarms that blot out the stars.",
        fovMult: 2.0,
        profile: { FIREPOWER: 120, ROF: 70, DURABILITY: 100, MOBILITY: 35 },
        bodyShape: BodyShape.HEXAGON,
    }),
};
