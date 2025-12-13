
import { TankConfig, TankRole, BodyShape, BulletType } from '../../types';
import { ACTIVE_SKILLS, PASSIVE_SKILLS } from '../skills';
import { Barrels } from '../barrels/presets';

export const Tier3Tanks: Record<string, TankConfig> = {
  // ================= HEAVY / DESTRUCTIVE =================
  annihilator: {
    name: "Annihilator", tier: 3, role: TankRole.HEAVY, description: "The largest caliber cannon.", fovMult: 1.0,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    statBonus: { reload: 0.25, bulletDmg: 12.0, bulletPen: 8.0, moveSpd: 0.7, critChance: 0.2, critDamage: 2.0 },
    baseCritChance: 0.1,
    barrels: [
        // Annihilator uses huge Kinetic round (Standard but huge)
        Barrels.Standard({ width: 75, length: 55, dmg: 12.0, recoil: 90 }) 
    ]
  },
  
  hybrid: {
    name: "Hybrid", tier: 3, role: TankRole.HEAVY, description: "Destroyer cannon + Drones.", fovMult: 1.0,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    statBonus: { reload: 0.4, bulletDmg: 5.0, bulletPen: 3.0 },
    barrels: [
        Barrels.Railgun({ width: 35, length: 50, dmg: 6.0, recoil: 40 }),
        Barrels.DroneSpawner({ width: 12, length: 50, angle: Math.PI })
    ]
  },

  sprayer: {
    name: "Sprayer", tier: 3, role: TankRole.HEAVY, description: "Machine gun on steroids.", fovMult: 1.0,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    statBonus: { reload: 0.4, bulletDmg: 0.4 },
    barrels: [
        Barrels.Standard({ width: 12, length: 55, dmg: 0.5 }),
        Barrels.MachineGun({ width: 22, length: 45, delay: 0.1, dmg: 0.1, spread: 0.35 })
    ]
  },

  rocketeer: {
    name: "Rocketeer", tier: 3, role: TankRole.HEAVY, description: "Fires High Explosive Rockets.", fovMult: 1.1,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    statBonus: { bulletSpd: 0.3, bulletDmg: 4.0, reload: 0.5 }, // Starts slow
    turretColor: '#444',
    barrels: [
        // EXPLICITLY USES ROCKET PRESET WITH HE
        Barrels.Rocket({ width: 24, length: 50, dmg: 6.0, recoil: 25 }), 
        Barrels.Standard({ width: 26, length: 40, angle: Math.PI, dmg: 0 }) // Exhaust visual
    ]
  },

  skimmer: {
    name: "Skimmer", tier: 3, role: TankRole.HEAVY, description: "Spinning bullet storm.", fovMult: 1.0,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    barrels: [
        Barrels.Standard({ width: 20, length: 40, dmg: 1.5 }),
        Barrels.Standard({ width: 8, length: 50, offsetY: 22, angle: 0, recoil: 0 }), // Side launchers
        Barrels.Standard({ width: 8, length: 50, offsetY: -22, angle: 0, recoil: 0 })
    ]
  },

  fortress: { 
    name: "Fortress", tier: 3, role: TankRole.HEAVY, description: "Mobile siege unit.", fovMult: 1.0,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    activeSkill: ACTIVE_SKILLS.FORTIFY,
    barrels: [
       Barrels.TrapLayer({ width: 16, length: 50 }),
       Barrels.Gatling({ width: 8, length: 50, offsetY: 16, delay: 0.2, dmg: 0.7 }),
       Barrels.Gatling({ width: 8, length: 50, offsetY: -16, delay: 0.4, dmg: 0.7 })
    ]
  },

  spike: {
    name: "Spike", tier: 3, role: TankRole.HEAVY, description: "Touch of death.", fovMult: 1.0,
    bodyShape: BodyShape.SPIKED, 
    bodyColorOverride: '#333333', // Dark metallic
    hasTreads: false, activeSkill: ACTIVE_SKILLS.FORTIFY,
    statBonus: { maxHp: 2.5, bodyDmg: 3.0, moveSpd: 1.3 }, barrels: [],
    statCap: 12, hiddenStats: ['bulletSpd', 'bulletPen', 'bulletDmg', 'reload']
  },

  // ================= LIGHT / SPEED =================
  booster: {
    name: "Booster", tier: 3, role: TankRole.LIGHT, description: "Maximum velocity.", fovMult: 1.0,
    bodyShape: BodyShape.CIRCLE, hasTreads: false, activeSkill: ACTIVE_SKILLS.DASH,
    statBonus: { moveSpd: 1.6, bodyDmg: 1.3, reload: 0.7 },
    barrels: [
      Barrels.Standard({ width: 12, length: 50, dmg: 0.6 }),
      // Rear Barrels with EXTREME Recoil for Propulsion
      Barrels.Standard({ width: 12, length: 45, angle: Math.PI - 0.4, offsetX: -4, dmg: 0.3, recoil: 8.0 }),
      Barrels.Standard({ width: 12, length: 45, angle: Math.PI + 0.4, offsetX: -4, dmg: 0.3, recoil: 8.0 }),
      Barrels.Standard({ width: 12, length: 40, angle: Math.PI - 0.6, offsetX: -8, dmg: 0.3, recoil: 8.0 }),
      Barrels.Standard({ width: 12, length: 40, angle: Math.PI + 0.6, offsetX: -8, dmg: 0.3, recoil: 8.0 })
    ]
  },

  fighter: {
    name: "Fighter", tier: 3, role: TankRole.LIGHT, description: "Side guns for dogfighting.", fovMult: 1.0,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    statBonus: { moveSpd: 1.4 },
    barrels: [
        Barrels.Standard({ width: 12, length: 50, dmg: 0.9 }),
        Barrels.Standard({ width: 10, length: 45, angle: Math.PI/2, offsetX: -4, dmg: 0.6 }), // Side
        Barrels.Standard({ width: 10, length: 45, angle: -Math.PI/2, offsetX: -4, dmg: 0.6 }), // Side
        Barrels.Standard({ width: 12, length: 40, angle: Math.PI - 0.5, offsetX: -4, dmg: 0.4, recoil: 6.0 }), // Rear High Recoil
        Barrels.Standard({ width: 12, length: 40, angle: Math.PI + 0.5, offsetX: -4, dmg: 0.4, recoil: 6.0 })  // Rear High Recoil
    ]
  },

  landmine: {
    name: "Landmine", tier: 3, role: TankRole.LIGHT, description: "Invisible rammer.", fovMult: 1.0,
    bodyShape: BodyShape.OCTAGON, 
    hasTreads: false,
    invisibility: { revealDelay: 5.0, fadeSpeed: 2.0 },
    statBonus: { maxHp: 2.2, bodyDmg: 2.2, moveSpd: 1.2 }, barrels: [],
    statCap: 12, hiddenStats: ['bulletSpd', 'bulletPen', 'bulletDmg', 'reload']
  },

  // ================= MEDIUM / BULLET SPAM =================
  triplet: {
    name: "Triplet", tier: 3, role: TankRole.MEDIUM, description: "Concentrated firepower.", fovMult: 1.0,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    statBonus: { bulletPen: 0.8 },
    barrels: [
        Barrels.Standard({ width: 12, length: 50, dmg: 0.7 }),
        Barrels.Standard({ width: 12, length: 45, offsetY: 10, delay: 0.5, dmg: 0.7 }),
        Barrels.Standard({ width: 12, length: 45, offsetY: -10, delay: 0.5, dmg: 0.7 })
    ]
  },

  penta_shot: {
    name: "Penta Shot", tier: 3, role: TankRole.MEDIUM, description: "Wide area denial.", fovMult: 1.0,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    statBonus: { reload: 0.9, bulletDmg: 0.6 },
    barrels: [0, 0.25, -0.25, 0.5, -0.5].map(a => 
        Barrels.Standard({ width: 12, length: 50 - Math.abs(a)*10, angle: a, offsetX: Math.abs(a)*5, dmg: 0.65, recoil: 2.0 })
    )
  },

  spread_shot: {
    name: "Spread Shot", tier: 3, role: TankRole.MEDIUM, description: "11-barrel wave cannon.", fovMult: 1.0,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    statBonus: { reload: 0.6, bulletDmg: 0.4 },
    barrels: [0, 0.15, -0.15, 0.3, -0.3, 0.45, -0.45, 0.6, -0.6, 0.75, -0.75].map((a, i) => 
        Barrels.Standard({ width: 6, length: 45 - Math.abs(a)*15, angle: a, delay: Math.abs(a), dmg: 0.4 })
    )
  },

  scattershot: {
    name: "Scattershot", tier: 3, role: TankRole.MEDIUM, description: "Fires splitting nano-rounds.", fovMult: 1.0,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    statBonus: { reload: 1.2, bulletDmg: 0.8 },
    barrels: [
        Barrels.Standard({ width: 18, length: 50, bulletType: BulletType.NANO_SPLITTER, dmg: 0.8 }),
        Barrels.Standard({ width: 14, length: 45, angle: 0.3, bulletType: BulletType.NANO_SPLITTER, dmg: 0.8, delay: 0.5 }),
        Barrels.Standard({ width: 14, length: 45, angle: -0.3, bulletType: BulletType.NANO_SPLITTER, dmg: 0.8, delay: 0.5 }),
    ]
  },

  octo_tank: {
    name: "Octo Tank", tier: 3, role: TankRole.MEDIUM, description: "The hurricane.", fovMult: 1.0,
    bodyShape: BodyShape.CIRCLE, hasTreads: false, activeSkill: ACTIVE_SKILLS.FORTIFY,
    barrels: [0, 45, 90, 135, 180, 225, 270, 315].map(deg => 
        Barrels.Standard({ width: 10, length: 50, angle: deg * (Math.PI/180), dmg: 0.7 })
    )
  },

  streamliner: {
    name: "Streamliner", tier: 3, role: TankRole.MEDIUM, description: "5 stacked barrels.", fovMult: 1.4,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    statBonus: { reload: 0.7, bulletDmg: 0.6 },
    barrels: [0, 1, 2, 3, 4].map(i => 
        Barrels.Standard({ width: 12 - i, length: 50 + i*8, delay: i * 0.2, dmg: 0.6, recoil: 0.5 })
    )
  },

  // ================= ARTILLERY / SNIPER =================
  ranger: {
    name: "Ranger", tier: 3, role: TankRole.ARTILLERY, description: "Maximum vision range.",
    bodyShape: BodyShape.CIRCLE, hasTreads: false, fovMult: 2.2, passiveSkill: PASSIVE_SKILLS.SNIPER_SCOPE,
    statBonus: { bulletSpd: 2.5, bulletDmg: 3.0, reload: 2.5, critChance: 0.15, critDamage: 1.8 },
    baseCritChance: 0.05,
    barrels: [
        Barrels.Sniper({ width: 14, length: 70, dmg: 2.2, recoil: 6 })
    ]
  },
  
  predator: {
    name: "Predator", tier: 3, role: TankRole.ARTILLERY, description: "Triple zoom stack.", fovMult: 1.8,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    statBonus: { bulletSpd: 2.0, reload: 1.5 },
    barrels: [
        Barrels.Sniper({ width: 18, length: 50, dmg: 1.5 }),
        Barrels.Sniper({ width: 14, length: 60, delay: 0.1, dmg: 1.2 }),
        Barrels.Sniper({ width: 10, length: 70, delay: 0.2, dmg: 1.0 })
    ]
  },

  stalker: {
    name: "Stalker", tier: 3, role: TankRole.ARTILLERY, description: "Invisible sniper.",
    bodyShape: BodyShape.CIRCLE, hasTreads: false, fovMult: 1.6,
    invisibility: { revealDelay: 2.0, fadeSpeed: 2.0 },
    barrels: [
        Barrels.Sniper({ width: 14, length: 55, dmg: 2, recoil: 4 })
    ]
  },
  
  skyfall: {
    name: "Skyfall", tier: 3, role: TankRole.ARTILLERY, description: "Orbital strike.", fovMult: 1.5,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    statBonus: { bulletSpd: 0.8, bulletDmg: 4.0, reload: 3.5 },
    turretColor: '#222',
    barrels: [
        // Heavy mortar shell
        Barrels.Railgun({ width: 35, length: 50, dmg: 4.5, recoil: 12, bulletType: BulletType.HIGH_EXPLOSIVE }) 
    ]
  },

  // ================= HYBRID / DRONE =================
  overlord: {
    name: "Overlord", tier: 3, role: TankRole.HYBRID, description: "Controls 8 drones.", fovMult: 1.2,
    bodyShape: BodyShape.CIRCLE, hasTreads: false, activeSkill: ACTIVE_SKILLS.REPEL, passiveSkill: PASSIVE_SKILLS.REGEN_AURA,
    statBonus: { reload: 1.2 },
    barrels: [Math.PI/2, -Math.PI/2, 0, Math.PI].map(a => 
        Barrels.DroneSpawner({ width: 14, length: 50, angle: a, offsetY: a===0||a===Math.PI?0:12 * (a>0?-1:1) })
    )
  },
  
  necromancer: {
    name: "Necromancer", tier: 3, role: TankRole.HYBRID, description: "Commands square legions.", fovMult: 1.2,
    bodyShape: BodyShape.SQUARE, hasTreads: false, 
    turretColor: '#ffcc00', // Unique drone color
    statBonus: { reload: 0.8, maxHp: 0.8 }, // Fragile but swarmy
    barrels: [
        // Visual spawners
        Barrels.DroneSpawner({ width: 16, length: 40, angle: 0.4 }),
        Barrels.DroneSpawner({ width: 16, length: 40, angle: -0.4 })
    ]
  },

  battleship: {
    name: "Battleship", tier: 3, role: TankRole.HYBRID, description: "Swarm of tiny drones.", fovMult: 1.1,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    statBonus: { reload: 0.2, bulletDmg: 0.3 }, // Rapid fire weak drones
    barrels: [
        Barrels.DroneSpawner({ width: 6, length: 40, angle: Math.PI/2, offsetY: 5 }),
        Barrels.DroneSpawner({ width: 6, length: 40, angle: Math.PI/2, offsetY: -5, delay: 0.5 }),
        Barrels.DroneSpawner({ width: 6, length: 40, angle: -Math.PI/2, offsetY: 5 }),
        Barrels.DroneSpawner({ width: 6, length: 40, angle: -Math.PI/2, offsetY: -5, delay: 0.5 })
    ]
  },

  factory: {
    name: "Factory", tier: 3, role: TankRole.HYBRID, description: "Spawns mini-tanks.", fovMult: 1.1,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    barrels: [
        Barrels.DroneSpawner({ width: 22, length: 50, dmg: 2.0 })
    ]
  },
  
  pulse_mage: { 
    name: "Pulse Mage", tier: 3, role: TankRole.HYBRID, description: "Energy wave emitter.", fovMult: 1.0,
    bodyShape: BodyShape.CIRCLE, hasTreads: false, activeSkill: ACTIVE_SKILLS.REPEL,
    turretColor: '#00ffff',
    barrels: [
        Barrels.Standard({ width: 22, length: 50, dmg: 0.6, spread: 0.4 }),
        Barrels.Standard({ width: 22, length: 50, angle: Math.PI/3, delay: 0.1, dmg: 0.6, spread: 0.4 }),
        Barrels.Standard({ width: 22, length: 50, angle: -Math.PI/3, delay: 0.1, dmg: 0.6, spread: 0.4 })
    ]
  },

  // ================= SUPPORT =================
  mega_trapper: {
    name: "Mega Trapper", tier: 3, role: TankRole.SUPPORT, description: "Huge defensive traps.", fovMult: 1.0,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    statBonus: { bulletDmg: 2.0 },
    barrels: [
        Barrels.TrapLayer({ width: 35, length: 50, dmg: 3.0 })
    ]
  },
  
  auto_trapper: {
    name: "Auto Trapper", tier: 3, role: TankRole.SUPPORT, description: "Traps + Auto Turret.", fovMult: 1.0,
    bodyShape: BodyShape.CIRCLE, hasTreads: false,
    barrels: [
        Barrels.TrapLayer({ width: 18, length: 50 }),
        { ...Barrels.Standard({ width: 8, length: 50, dmg: 0.5 }), isAutoTurret: true }
    ]
  },
  
  nanobot: {
    name: "Nanobot", tier: 3, role: TankRole.SUPPORT, description: "Healer unit.", fovMult: 1.0,
    bodyShape: BodyShape.CIRCLE, hasTreads: false, passiveSkill: PASSIVE_SKILLS.REGEN_AURA,
    statBonus: { regen: 4.0 },
    turretColor: '#00ff00',
    barrels: [
        Barrels.Standard({ width: 10, length: 50, dmg: 0.8 }),
        Barrels.TrapLayer({ width: 18, length: 50, angle: Math.PI })
    ]
  }
};
