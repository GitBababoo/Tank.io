
import { TankRole, BodyShape, BulletType } from '../../types';
import { ACTIVE_SKILLS, PASSIVE_SKILLS } from '../skills';
import { Barrels } from '../barrels/presets';
import { defineTank } from '../TankBuilder';

// =========================================================================
//  EXTENDED CLASS SYSTEM: THE 24 ARCHETYPES (ULTIMATE TIER 10 VERSIONS)
//  Balanced using the new Percentage Profile System.
// =========================================================================

export const ExtendedMetaTanks = {
    
    // 1. HEAVY FORTRESS (Immortal Wall)
    titan_fortress: defineTank("Titan Fortress", 10, TankRole.HEAVY, [
        Barrels.TrapLayer({ width: 40, length: 60 }),
        Barrels.Gatling({ width: 10, length: 50, offsetY: 20, delay: 0.5 }),
        Barrels.Gatling({ width: 10, length: 50, offsetY: -20, delay: 0 }),
        Barrels.Standard({ width: 30, length: 40, angle: Math.PI, dmg: 2.0 }) // Rear Guard
    ], {
        profile: { FIREPOWER: 60, ROF: 40, DURABILITY: 120, MOBILITY: 20 },
        bodyShape: BodyShape.OCTAGON,
        activeSkill: ACTIVE_SKILLS.FORTIFY,
        description: "The ultimate defensive wall. Nearly indestructible."
    }),

    // 2. HEAVY CRUSHER (Melee Destroyer)
    world_crusher: defineTank("World Crusher", 10, TankRole.HEAVY, [
        // Spikes are now rendered by BodyShape.SPIKED, but we keep invisible thrusters for effect
        Barrels.Standard({ width: 2, length: 1, angle: 0, recoil: 5, dmg: 0 }), 
        Barrels.Standard({ width: 2, length: 1, angle: Math.PI/2, recoil: 5, dmg: 0 }),
        Barrels.Standard({ width: 2, length: 1, angle: Math.PI, recoil: 5, dmg: 0 }),
        Barrels.Standard({ width: 2, length: 1, angle: -Math.PI/2, recoil: 5, dmg: 0 }),
    ], {
        profile: { FIREPOWER: 20, ROF: 20, DURABILITY: 110, MOBILITY: 80 }, 
        bodyShape: BodyShape.SPIKED, // Use improved sawblade rendering
        bodyColorOverride: '#111111', // Pure black metal
        activeSkill: ACTIVE_SKILLS.DASH,
        description: "A massive, rotating sawblade that grinds enemies to dust.",
        statBonus: { bodyDmg: 6.0 } 
    }),

    // 3. MEDIUM ASSAULT (Balanced God)
    centurion_prime: defineTank("Centurion Prime", 10, TankRole.MEDIUM, [
        Barrels.Standard({ width: 25, length: 65, dmg: 1.5 }),
        Barrels.Standard({ width: 15, length: 55, offsetY: 15, delay: 0.2 }),
        Barrels.Standard({ width: 15, length: 55, offsetY: -15, delay: 0.2 }),
    ], {
        profile: { FIREPOWER: 80, ROF: 70, DURABILITY: 70, MOBILITY: 70 },
        bodyShape: BodyShape.CIRCLE,
        description: "The perfect balance of offense and defense."
    }),

    // 4. MEDIUM CAVALRY (Flanker)
    dragoon_x: defineTank("Dragoon X", 10, TankRole.MEDIUM, [
        Barrels.Gatling({ width: 12, length: 60, dmg: 0.8 }),
        Barrels.Standard({ width: 12, length: 40, angle: Math.PI - 0.5, recoil: 4 }),
        Barrels.Standard({ width: 12, length: 40, angle: Math.PI + 0.5, recoil: 4 }),
    ], {
        profile: { FIREPOWER: 70, ROF: 80, DURABILITY: 50, MOBILITY: 90 },
        bodyShape: BodyShape.TRIANGLE,
        activeSkill: ACTIVE_SKILLS.DASH,
        description: "Hit and run specialist."
    }),

    // 5. LIGHT SCOUT (Speed Demon)
    warp_strider: defineTank("Warp Strider", 10, TankRole.LIGHT, [
        Barrels.Sniper({ width: 8, length: 60, recoil: 10 }), // Recoil helps movement
        Barrels.Standard({ width: 10, length: 30, angle: Math.PI, recoil: 8 })
    ], {
        profile: { FIREPOWER: 40, ROF: 30, DURABILITY: 20, MOBILITY: 150 },
        bodyShape: BodyShape.TRIANGLE,
        activeSkill: ACTIVE_SKILLS.TELEPORT,
        description: "Impossible to catch."
    }),

    // 6. LIGHT SKIRMISHER (Burst Assassin)
    blitz_fang: defineTank("Blitz Fang", 10, TankRole.LIGHT, [
        Barrels.MachineGun({ width: 10, length: 40, spread: 0.1, delay: 0 }),
        Barrels.MachineGun({ width: 10, length: 40, spread: 0.1, delay: 0.1 }),
        Barrels.MachineGun({ width: 10, length: 40, spread: 0.1, delay: 0.2 }),
    ], {
        profile: { FIREPOWER: 90, ROF: 100, DURABILITY: 30, MOBILITY: 90 },
        bodyShape: BodyShape.HEXAGON,
        activeSkill: ACTIVE_SKILLS.OVERCLOCK,
        description: "Unloads clips instantly."
    }),

    // 7. ARTILLERY MORTAR (AOE)
    cataclysm_mortar: defineTank("Cataclysm", 10, TankRole.ARTILLERY, [
        // Huge single shot explosion
        Barrels.Rocket({ width: 50, length: 60, dmg: 10.0, recoil: 20 })
    ], {
        profile: { FIREPOWER: 120, ROF: 10, DURABILITY: 50, MOBILITY: 40 },
        bodyShape: BodyShape.SQUARE,
        description: "Fires massive shells that decimate areas."
    }),

    // 8. ARTILLERY RAILGUN (Pierce)
    omega_rail: defineTank("Omega Rail", 10, TankRole.ARTILLERY, [
        Barrels.Railgun({ width: 10, length: 90, dmg: 8.0, recoil: 10 })
    ], {
        profile: { FIREPOWER: 110, ROF: 20, DURABILITY: 40, MOBILITY: 50 },
        passiveSkill: PASSIVE_SKILLS.SNIPER_SCOPE,
        description: "Infinite penetration beam."
    }),

    // 9. SUPPORT ENGINEER (Builder)
    constructor_mk5: defineTank("Constructor MK-V", 10, TankRole.ENGINEER, [
        Barrels.TrapLayer({ width: 30, length: 50 }),
        Barrels.TrapLayer({ width: 30, length: 50, angle: Math.PI }),
        { ...Barrels.Gatling({ width: 10, length: 40, angle: Math.PI/2 }), isAutoTurret: true },
        { ...Barrels.Gatling({ width: 10, length: 40, angle: -Math.PI/2 }), isAutoTurret: true },
    ], {
        profile: { FIREPOWER: 50, ROF: 60, DURABILITY: 80, MOBILITY: 50 },
        bodyShape: BodyShape.SQUARE,
        description: "Dominates territory with traps and turrets."
    }),

    // 10. SUPPORT MEDIC (Healer)
    saint_archon: defineTank("Saint Archon", 10, TankRole.SUPPORT, [
        Barrels.Standard({ width: 15, length: 50, dmg: 1.0 }), // Healing Bullet logic needed in engine
        Barrels.DroneSpawner({ width: 20, length: 40, angle: Math.PI })
    ], {
        profile: { FIREPOWER: 30, ROF: 50, DURABILITY: 100, MOBILITY: 60 },
        passiveSkill: PASSIVE_SKILLS.REGEN_AURA,
        turretColor: '#00ff00',
        description: "Keeps the team alive."
    }),

    // 11. FLAME TANK (DoT Control)
    inferno_lord: defineTank("Inferno Lord", 10, TankRole.FLAME, [
        Barrels.Flamethrower({ width: 40, length: 60, spread: 0.5, dmg: 0.5 }),
        Barrels.Flamethrower({ width: 20, length: 50, angle: 0.5, spread: 0.3, dmg: 0.5 }),
        Barrels.Flamethrower({ width: 20, length: 50, angle: -0.5, spread: 0.3, dmg: 0.5 }),
    ], {
        profile: { FIREPOWER: 80, ROF: 90, DURABILITY: 60, MOBILITY: 50 },
        bodyShape: BodyShape.PENTAGON,
        description: "Burns everything in a wide cone.",
        bodyColorOverride: '#aa2200'
    }),

    // 12. FROST TANK (Slow)
    absolute_zero: defineTank("Absolute Zero", 10, TankRole.FROST, [
        Barrels.CryoBeam({ width: 30, length: 70, dmg: 2.0 }),
        Barrels.CryoBeam({ width: 15, length: 60, angle: Math.PI/2 }),
        Barrels.CryoBeam({ width: 15, length: 60, angle: -Math.PI/2 }),
        Barrels.CryoBeam({ width: 15, length: 60, angle: Math.PI }),
    ], {
        profile: { FIREPOWER: 60, ROF: 50, DURABILITY: 80, MOBILITY: 40 },
        bodyShape: BodyShape.DIAMOND,
        description: "Freezes enemies, slowing them down.",
        bodyColorOverride: '#88ccff'
    }),

    // 13. THUNDER TANK (Chain)
    thor_hammer: defineTank("Thor's Hammer", 10, TankRole.THUNDER, [
        Barrels.Coil({ width: 20, length: 60, dmg: 3.0 }),
        Barrels.Coil({ width: 10, length: 50, angle: 0.2 }),
        Barrels.Coil({ width: 10, length: 50, angle: -0.2 }),
    ], {
        profile: { FIREPOWER: 90, ROF: 60, DURABILITY: 50, MOBILITY: 70 },
        turretColor: '#f1c40f',
        activeSkill: ACTIVE_SKILLS.OVERCLOCK,
        description: "High voltage destruction."
    }),

    // 14. STEALTH PHANTOM (Assassin)
    void_specter: defineTank("Void Specter", 10, TankRole.STEALTH, [
        Barrels.Sniper({ width: 12, length: 80, dmg: 4.0, recoil: 5 })
    ], {
        profile: { FIREPOWER: 100, ROF: 10, DURABILITY: 30, MOBILITY: 80 },
        activeSkill: ACTIVE_SKILLS.INVISIBILITY,
        invisibility: { revealDelay: 0.5, fadeSpeed: 5.0 },
        description: "Now you see me, now you're dead."
    }),

    // 15. POISON TANK (Bio)
    plague_bringer: defineTank("Plague Bringer", 10, TankRole.POISON, [
        // Standard barrel but with POISON type/visual
        { ...Barrels.Standard({ width: 35, length: 50, dmg: 1.0 }), visualType: 'POISON', bulletType: BulletType.INCENDIARY }, // Using Incendiary as DoT logic base
    ], {
        profile: { FIREPOWER: 70, ROF: 40, DURABILITY: 90, MOBILITY: 40 },
        turretColor: '#8e44ad',
        description: "Spreads toxic clouds."
    }),

    // 16. HYBRID OMNI (Jack of all trades)
    omni_god: defineTank("Omni God", 10, TankRole.HYBRID, [
        Barrels.Standard({ width: 20, length: 60 }), // Main
        Barrels.DroneSpawner({ width: 15, length: 40, angle: Math.PI/2 }), // Drone
        Barrels.TrapLayer({ width: 20, length: 40, angle: Math.PI }), // Trap
        Barrels.Sniper({ width: 10, length: 50, angle: -Math.PI/2 }), // Sniper
    ], {
        profile: { FIREPOWER: 60, ROF: 60, DURABILITY: 60, MOBILITY: 60 },
        bodyShape: BodyShape.CIRCLE,
        description: "Master of all, specialist of none."
    }),

    // 17. HYBRID MECHA (Drone Heavy)
    titan_mech: defineTank("Titan Mech", 10, TankRole.HYBRID, [
        Barrels.DroneSpawner({ width: 30, length: 50 }),
        Barrels.Standard({ width: 10, length: 40, angle: 0.5 }), // Arms
        Barrels.Standard({ width: 10, length: 40, angle: -0.5 }),
    ], {
        profile: { FIREPOWER: 70, ROF: 50, DURABILITY: 80, MOBILITY: 40 },
        activeSkill: ACTIVE_SKILLS.REPEL,
        description: "A walking factory of drones."
    }),

    // 18. QUANTUM SCI-FI (Warp)
    singularity: defineTank("Singularity", 10, TankRole.QUANTUM, [
        Barrels.Plasma({ width: 20, length: 60, dmg: 2.0 }),
        Barrels.Plasma({ width: 10, length: 50, angle: Math.PI }),
    ], {
        profile: { FIREPOWER: 80, ROF: 50, DURABILITY: 40, MOBILITY: 100 },
        activeSkill: ACTIVE_SKILLS.TELEPORT,
        bodyShape: BodyShape.STAR,
        description: "Manipulates space-time."
    }),

    // 19. GRAVITY TANK (Control)
    event_horizon: defineTank("Event Horizon", 10, TankRole.GRAVITY, [
        Barrels.Standard({ width: 40, length: 40, visualType: 'PLASMA', dmg: 0.5 }), // Pull logic needed
        Barrels.TrapLayer({ width: 20, length: 50, angle: Math.PI })
    ], {
        profile: { FIREPOWER: 40, ROF: 40, DURABILITY: 100, MOBILITY: 50 },
        turretColor: '#2d3436',
        description: "Pulls enemies into their doom."
    }),

    // 20. WIND CYCLONE (Push)
    tempest_king: defineTank("Tempest King", 10, TankRole.WIND, [
        Barrels.MachineGun({ width: 25, length: 50, spread: 0.5, dmg: 0.2 }),
        Barrels.Standard({ width: 15, length: 40, angle: Math.PI, recoil: 15 })
    ], {
        profile: { FIREPOWER: 50, ROF: 100, DURABILITY: 50, MOBILITY: 100 },
        bodyShape: BodyShape.TRIANGLE,
        description: " Blows enemies away with massive force."
    }),

    // 21. BEAST MORPH (Wild)
    apex_predator: defineTank("Apex Predator", 10, TankRole.BEAST, [
        Barrels.Standard({ width: 5, length: 1, angle: 0, recoil: 0 }),
    ], {
        profile: { FIREPOWER: 60, ROF: 80, DURABILITY: 60, MOBILITY: 90 },
        bodyShape: BodyShape.SPIKED,
        activeSkill: ACTIVE_SKILLS.DASH,
        turretColor: '#d63031',
        description: "Ferocious close-range combatant. Tares enemies apart.",
        statBonus: { bodyDmg: 5.0 }
    }),

    // 22. SIEGE BREAKER (Structure Dmg)
    bunker_buster: defineTank("Bunker Buster", 10, TankRole.SIEGE, [
        // BIG Rocket
        Barrels.Rocket({ width: 40, length: 70, dmg: 10.0, recoil: 30 }) 
    ], {
        profile: { FIREPOWER: 150, ROF: 5, DURABILITY: 60, MOBILITY: 30 },
        bodyShape: BodyShape.U_SHAPE,
        description: "Designed to crack heavy armor with explosive rounds."
    }),

    // 23. CHAOS EXPERIMENTAL (Random)
    chaos_engine: defineTank("Chaos Engine", 10, TankRole.CHAOS, [
        Barrels.Standard({ width: 15, length: 50, angle: 0 }),
        Barrels.Gatling({ width: 10, length: 40, angle: 2.0 }),
        Barrels.Sniper({ width: 8, length: 60, angle: 4.0 }),
    ], {
        profile: { FIREPOWER: 80, ROF: 80, DURABILITY: 80, MOBILITY: 80 }, // Unstable
        bodyShape: BodyShape.STAR,
        turretColor: '#fdcb6e',
        description: "Unpredictable weaponry."
    }),

    // 24. LEGENDARY (The End)
    developer_god: defineTank("THE DEVELOPER", 10, TankRole.HYBRID, [
        Barrels.Standard({ width: 50, length: 100, dmg: 100 }),
    ], {
        profile: { FIREPOWER: 200, ROF: 100, DURABILITY: 200, MOBILITY: 100 },
        bodyShape: BodyShape.CIRCLE,
        activeSkill: ACTIVE_SKILLS.TELEPORT,
        description: "Only for testing. Do not use in production.",
        bodyColorOverride: '#ffffff'
    })
};
