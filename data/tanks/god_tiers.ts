
import { TankRole, BodyShape, WeaponBehavior, BulletType } from '../../types';
import { ACTIVE_SKILLS, PASSIVE_SKILLS } from '../skills';
import { Barrels } from '../barrels/presets';
import { defineTank } from '../TankBuilder';

// =========================================================================
//  TIER 5: COSMIC CLASS (Lv 75+)
//  These are the "God Tiers" requested.
// =========================================================================

export const GodTierTanks = {
    // Evolves from Titanbreaker
    galaxy_breaker: defineTank("Galaxy Breaker", 5, TankRole.HEAVY, [
        Barrels.Plasma({ width: 70, length: 70, dmg: 10.0, recoil: 50 }),
        Barrels.Standard({ width: 80, length: 35, dmg: 0 }),
        // Stabilization Thrusters
        Barrels.Standard({ width: 20, length: 40, angle: 2.5, recoil: 5 }),
        Barrels.Standard({ width: 20, length: 40, angle: -2.5, recoil: 5 })
    ], {
        description: "Fires rounds that can shatter reality.",
        // NERFED: Reload 4.0 -> 0.7 (Very slow fire rate)
        // BUFFED: Damage 7.0 -> 10.0 (Massive single shot)
        statBonus: { reload: 0.7, bulletDmg: 10.0, bulletPen: 8.0, moveSpd: 0.6, maxHp: 4.0, critChance: 0.2, critDamage: 2.5 },
        turretColor: '#aa0000',
        bodyColorOverride: '#000000',
        bodyShape: BodyShape.STAR,
        baseCritChance: 0.1 // 10% base crit
    }),

    // Evolves from Neon Viper
    // UPDATED: Now uses Hitscan (Instant Laser) instead of Projectile
    cyber_wyvern: defineTank("Cyber Wyvern", 5, TankRole.LIGHT, [
        Barrels.Railgun({ width: 12, length: 70, dmg: 2.0, behavior: WeaponBehavior.HITSCAN, bulletColor: '#00ffaa' }),
        Barrels.Railgun({ width: 8, length: 60, offsetY: 10, dmg: 1.5, behavior: WeaponBehavior.HITSCAN, bulletColor: '#00ffaa' }),
        Barrels.Railgun({ width: 8, length: 60, offsetY: -10, dmg: 1.5, behavior: WeaponBehavior.HITSCAN, bulletColor: '#00ffaa' }),
        // Massive Engine Array
        Barrels.Standard({ width: 16, length: 55, angle: Math.PI - 0.4, recoil: 8.0 }),
        Barrels.Standard({ width: 16, length: 55, angle: Math.PI + 0.4, recoil: 8.0 }),
        Barrels.Standard({ width: 20, length: 45, angle: Math.PI, recoil: 10.0 })
    ], {
        description: "Faster than the speed of sound. Fires instant laser beams.",
        activeSkill: ACTIVE_SKILLS.TELEPORT,
        statBonus: { moveSpd: 2.0, bodyDmg: 2.0, reload: 1.5 },
        turretColor: '#00ffaa',
        bodyShape: BodyShape.TRIANGLE
    }),

    // Evolves from Starhammer
    nova_cannon: defineTank("Nova Cannon", 5, TankRole.ARTILLERY, [
        Barrels.Coil({ width: 30, length: 90, dmg: 5.0, recoil: 20, behavior: WeaponBehavior.HITSCAN }),
        // Charging Rails
        Barrels.Coil({ width: 10, length: 80, offsetY: 20, dmg: 0 }),
        Barrels.Coil({ width: 10, length: 80, offsetY: -20, dmg: 0 })
    ], {
        description: "Sniper capable of cross-map destruction.",
        passiveSkill: PASSIVE_SKILLS.SNIPER_SCOPE,
        fovMult: 2.5,
        statBonus: { bulletSpd: 4.0, bulletDmg: 5.0, reload: 0.3, critChance: 0.3, critDamage: 2.5 },
        turretColor: '#4050ff',
        bodyShape: BodyShape.X_SHAPE,
        baseCritChance: 0.2
    }),

    // NEW GOD TIER: CRIMSON PIERCER (Upgraded & Rebalanced)
    // Evolves from Rail Specter
    crimson_piercer: defineTank("Crimson Piercer", 5, TankRole.ARTILLERY, [
        // Left Heavy Rail - Massive Cooldown, Instant Hit
        Barrels.Coil({ 
            width: 28, length: 110, // Longer and wider barrels
            offsetX: -24, 
            dmg: 15.0, // Massive single shot damage (was 5.0)
            recoil: 60, // Huge recoil kick
            bulletColor: '#ff0000', 
            bulletType: BulletType.ARMOR_PIERCING,
            visualType: 'COIL',
            behavior: WeaponBehavior.HITSCAN,
            delay: 0 // Simultaneous fire
        }),
        // Right Heavy Rail
        Barrels.Coil({ 
            width: 28, length: 110, 
            offsetX: 24, 
            dmg: 15.0, 
            recoil: 60, 
            bulletColor: '#ff0000', 
            bulletType: BulletType.ARMOR_PIERCING,
            visualType: 'COIL',
            behavior: WeaponBehavior.HITSCAN,
            delay: 0
        })
    ], {
        description: "Twin Railguns. Long cooldown, instant annihilation.",
        // reload: 0.2 means VERY slow reload (since higher is faster in this engine's stat bonus logic, 
        // usually 1.0 is standard. 0.2 makes it 5x slower).
        statBonus: { reload: 0.2, bulletSpd: 20.0, bulletPen: 10.0, bulletDmg: 5.0, critChance: 0.5, critDamage: 3.0 },
        turretColor: '#800000', 
        bodyColorOverride: '#220000',
        passiveSkill: PASSIVE_SKILLS.SNIPER_SCOPE,
        fovMult: 2.4, // Zoom out more to see the snipe
        baseCritChance: 0.25
    }),

    // Evolves from Overseer Prime
    omnipotent: defineTank("Omnipotent", 5, TankRole.HYBRID, 
        [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, -3*Math.PI/4, -Math.PI/2, -Math.PI/4].map(a => 
            Barrels.DroneSpawner({ width: 20, length: 60, angle: a })
        ), 
    {
        description: "Controls the battlefield with 8-way drone swarms.",
        activeSkill: ACTIVE_SKILLS.REPEL,
        passiveSkill: PASSIVE_SKILLS.REGEN_AURA,
        fovMult: 1.5,
        statBonus: { reload: 2.0, maxHp: 2.0 },
        bodyShape: BodyShape.OCTAGON
    })
};
