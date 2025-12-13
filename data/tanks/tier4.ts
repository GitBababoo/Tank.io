
import { TankRole, BodyShape, BulletType, WeaponBehavior } from '../../types';
import { ACTIVE_SKILLS, PASSIVE_SKILLS } from '../skills';
import { Barrels } from '../barrels/presets';
import { defineTank } from '../TankBuilder';

// =========================================================================
//  TIER 4: HERO CLASS (Lv 60)
// =========================================================================

export const Tier4Tanks = {
  // --- HEAVY ---
  titanbreaker: defineTank("Titanbreaker", 4, TankRole.HEAVY, [
      // Main Cannon: Massive Damage, Slow Fire
      Barrels.Plasma({ width: 50, length: 60, dmg: 8.0, recoil: 40 }), // Increased Recoil & Damage
      Barrels.Standard({ width: 60, length: 30, dmg: 0, delay: 0 }) 
  ], {
      description: "Siege breaker. Slow reload, massive impact.",
      // NERFED: Reload 3.5 -> 0.6 (Shoots 6x slower)
      // BUFFED: Damage 5.5 -> 8.0 (Hits harder)
      statBonus: { reload: 0.6, bulletDmg: 8.0, bulletPen: 6.0, moveSpd: 0.8, maxHp: 2.5, critChance: 0.3, critDamage: 2.5 },
      turretColor: '#660000',
      bodyColorOverride: '#2a0a0a',
      baseCritChance: 0.15
  }),

  iron_dreadnought: defineTank("Dreadnought", 4, TankRole.HEAVY, [
      Barrels.Standard({ width: 28, length: 55, offsetY: -16, dmg: 2.5, recoil: 8 }),
      Barrels.Standard({ width: 28, length: 55, offsetY: 16, delay: 0.5, dmg: 2.5, recoil: 8 }),
      // --- NEW: Smart Auto-Turrets ---
      { 
        ...Barrels.Gatling({ width: 8, length: 40, angle: Math.PI/2, dmg: 0.5 }), 
        isAutoTurret: true,
        autoTurretConfig: {
            range: 700,
            arc: Math.PI, // 180 degrees
            turnSpeed: Math.PI * 2, // 360 deg/sec
            fireRate: 5, // shots per sec
            targetingWeights: { proximity: 2, health: 1 }
        }
      }, 
      { 
        ...Barrels.Gatling({ width: 8, length: 40, angle: -Math.PI/2, delay: 0.25, dmg: 0.5 }), 
        isAutoTurret: true,
        autoTurretConfig: {
            range: 700,
            arc: Math.PI, // 180 degrees
            turnSpeed: Math.PI * 2,
            fireRate: 5,
            targetingWeights: { proximity: 2, health: 1 }
        }
      }
  ], {
      description: "A walking fortress with auto-turrets.",
      activeSkill: ACTIVE_SKILLS.FORTIFY,
      statBonus: { reload: 1.0, maxHp: 3.5, bodyDmg: 2.5 }, // Nerfed reload slightly
      bodyShape: BodyShape.OCTAGON,
      critResistance: 0.05 // 5% resistance to crits
  }),

  // --- LIGHT ---
  neon_viper: defineTank("Neon Viper", 4, TankRole.LIGHT, [
      Barrels.Railgun({ width: 10, length: 60, dmg: 1.2, behavior: WeaponBehavior.HITSCAN, bulletColor: '#00ffff' }),
      Barrels.Standard({ width: 12, length: 45, angle: Math.PI - 0.5, offsetX: -5, dmg: 0.5, recoil: 5.0 }),
      Barrels.Standard({ width: 12, length: 45, angle: Math.PI + 0.5, offsetX: -5, dmg: 0.5, recoil: 5.0 }),
      Barrels.Standard({ width: 14, length: 35, angle: Math.PI, offsetX: -10, dmg: 0.5, recoil: 5.0 })
  ], {
      description: "Cyberpunk speedster. Deadly hit-and-run tactics.",
      activeSkill: ACTIVE_SKILLS.DASH,
      statBonus: { moveSpd: 1.6, bodyDmg: 1.4, reload: 1.2 },
      turretColor: '#00ffff',
      bodyColorOverride: '#111',
      bodyShape: BodyShape.TRIANGLE
  }),

  hummingbird: defineTank("Hummingbird", 4, TankRole.LIGHT, [
      Barrels.DroneSpawner({ width: 14, length: 40 }),
      Barrels.Standard({ width: 8, length: 30, angle: Math.PI/2, recoil: 2.0 }),
      Barrels.Standard({ width: 8, length: 30, angle: -Math.PI/2, recoil: 2.0 }),
      Barrels.Standard({ width: 8, length: 30, angle: Math.PI, recoil: 2.0 })
  ], {
      description: "Agile drone fighter with teleport capabilities.",
      activeSkill: ACTIVE_SKILLS.TELEPORT,
      fovMult: 1.2,
      statBonus: { moveSpd: 1.5, reload: 1.4 }
  }),

  // --- MEDIUM ---
  vanguard_mk2: defineTank("Vanguard MK-II", 4, TankRole.MEDIUM, [
      Barrels.Standard({ width: 20, length: 60, dmg: 1.5 }),
      Barrels.Standard({ width: 10, length: 50, offsetY: 12, delay: 0.2, dmg: 0.8 }),
      Barrels.Standard({ width: 10, length: 50, offsetY: -12, delay: 0.2, dmg: 0.8 })
  ], {
      description: "Heavy assault unit with fortified armor.",
      activeSkill: ACTIVE_SKILLS.FORTIFY,
      statBonus: { bulletPen: 1.4, bulletDmg: 1.1, reload: 1.1 }
  }),

  storm_runner: defineTank("Storm Runner", 4, TankRole.MEDIUM, [
      Barrels.Gatling({ width: 10, length: 55, offsetY: -10, dmg: 0.7 }),
      Barrels.Gatling({ width: 10, length: 55, offsetY: 10, delay: 0.5, dmg: 0.7 }),
      Barrels.Gatling({ width: 12, length: 45, dmg: 0.7 }),
      Barrels.Standard({ width: 16, length: 40, angle: Math.PI, recoil: 4.0 })
  ], {
      description: "Unleashes a bullet hell storm.",
      activeSkill: ACTIVE_SKILLS.DASH,
      statBonus: { reload: 1.6, moveSpd: 1.1, bulletPen: 0.8 }
  }),

  // --- ARTILLERY ---
  starhammer: defineTank("Starhammer", 4, TankRole.ARTILLERY, [
      Barrels.Coil({ width: 24, length: 75, dmg: 3.5, recoil: 12, bulletType: BulletType.ARMOR_PIERCING, behavior: WeaponBehavior.HITSCAN }),
      Barrels.Standard({ width: 30, length: 30, dmg: 0 })
  ], {
      description: "Magnetic railgun with infinite pierce.",
      passiveSkill: PASSIVE_SKILLS.SNIPER_SCOPE,
      fovMult: 1.8,
      statBonus: { bulletSpd: 3.0, bulletDmg: 3.2, reload: 0.4, critChance: 0.15, critDamage: 1.8 },
      turretColor: '#3040ff',
      baseCritChance: 0.05 // 5% bonus base crit
  }),

  eclipse_mortar: defineTank("Eclipse Mortar", 4, TankRole.ARTILLERY, [
      Barrels.Standard({ width: 45, length: 40, dmg: 5.5, recoil: 20 }),
      Barrels.Standard({ width: 35, length: 45, dmg: 0 })
  ], {
      description: "Fires massive dark matter shells.",
      fovMult: 1.4,
      turretColor: '#220033',
      statBonus: { bulletDmg: 4.5, bulletPen: 2.5, bulletSpd: 0.6 }
  }),

  // --- STEALTH ---
  ghostline: defineTank("Ghostline", 4, TankRole.ARTILLERY, [
      Barrels.Railgun({ width: 8, length: 80, dmg: 3.0, recoil: 6, behavior: WeaponBehavior.HITSCAN, bulletColor: '#aaffff' })
  ], {
      description: "Perfect invisibility. The silent killer.",
      activeSkill: ACTIVE_SKILLS.INVISIBILITY,
      fovMult: 1.6,
      invisibility: { revealDelay: 0.8, fadeSpeed: 3.5 },
      turretColor: '#aaffff',
      bodyColorOverride: '#1a1a2e',
      statBonus: { reload: 1.2, bulletSpd: 2.5 }
  }),

  rail_specter: defineTank("Rail Specter", 4, TankRole.ARTILLERY, [
      Barrels.Coil({ width: 14, length: 70, dmg: 2.8, recoil: 5, behavior: WeaponBehavior.HITSCAN }),
      Barrels.Coil({ width: 8, length: 60, offsetY: 12, delay: 0.2, dmg: 1.4, behavior: WeaponBehavior.HITSCAN }),
      Barrels.Coil({ width: 8, length: 60, offsetY: -12, delay: 0.2, dmg: 1.4, behavior: WeaponBehavior.HITSCAN })
  ], {
      description: "Charged sniper with side rails.",
      fovMult: 1.6,
      statBonus: { bulletSpd: 2.4, reload: 0.9 }
  }),

  // --- SUPPORT ---
  cryomancer: defineTank("Cryomancer", 4, TankRole.SUPPORT, [
      Barrels.CryoBeam({ width: 24, length: 55, dmg: 1.0, behavior: WeaponBehavior.HITSCAN }),
      Barrels.CryoBeam({ width: 18, length: 50, angle: 0.3, delay: 0.3, dmg: 0.8, behavior: WeaponBehavior.HITSCAN }),
      Barrels.CryoBeam({ width: 18, length: 50, angle: -0.3, delay: 0.6, dmg: 0.8, behavior: WeaponBehavior.HITSCAN })
  ], {
      description: "Slows enemies with freezing shards.",
      activeSkill: ACTIVE_SKILLS.REPEL,
      turretColor: '#00ffff',
      statBonus: { reload: 0.8, bulletSpd: 1.2 },
      bodyShape: BodyShape.PENTAGON
  }),

  pyromancer: defineTank("Pyromancer", 4, TankRole.SUPPORT, [
      Barrels.Flamethrower({ width: 30, length: 60, dmg: 1.1 })
  ], {
      description: "Incinerator unit. High burn damage.",
      turretColor: '#ff4400',
      statBonus: { reload: 0.6, bulletDmg: 0.6, bulletPen: 1.8 },
      bodyShape: BodyShape.PENTAGON
  }),

  // --- HYBRID ---
  overseer_prime: defineTank("Overseer Prime", 4, TankRole.HYBRID, 
      [0, Math.PI/2, Math.PI, -Math.PI/2].map(a => 
          Barrels.DroneSpawner({ width: 18, length: 55, angle: a })
      ), 
  {
      description: "Commands a legion of advanced drones.",
      activeSkill: ACTIVE_SKILLS.REPEL,
      fovMult: 1.3,
      statBonus: { reload: 1.4, maxHp: 1.4, bulletSpd: 1.1 },
      bodyShape: BodyShape.SQUARE
  }),

  hive_architect: defineTank("Hive Architect", 4, TankRole.HYBRID, [
      Barrels.Hive({ width: 35, length: 60, dmg: 1.5 })
  ], {
      description: "Constructs a self-replicating swarm.",
      fovMult: 1.2,
      turretColor: '#ffaa00',
      bodyShape: BodyShape.HEXAGON,
      statBonus: { reload: 1.8 }
  })
};
