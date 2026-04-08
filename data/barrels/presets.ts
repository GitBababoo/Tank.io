
import { Barrel, BarrelVisual, BulletType, WeaponBehavior, BarrelMaterial, BarrelShape, BulletTrailConfig, ParticleType } from '../../types';

// =========================================================================
//  BARREL FACTORY: Standardized Gun Components
//  Separates the visual/functional logic of guns from the tank models.
// =========================================================================

interface BarrelOptions {
  width: number;
  length: number;
  recoil?: number;
  delay?: number;
  dmg?: number;
  spread?: number;
  angle?: number;
  offsetX?: number; // Forward/Back
  offsetY?: number; // Left/Right
  visualType?: BarrelVisual; // Override visual style
  bulletType?: BulletType; // NEW: Define bullet behavior
  bulletColor?: string; // NEW: Override bullet color
  behavior?: WeaponBehavior;
  material?: BarrelMaterial; 
  shape?: BarrelShape;       
  trail?: BulletTrailConfig; // NEW: Optional bullet trail
  chargeTime?: number; // NEW: Charging mechanic
}

export class Barrels {
  
  static Standard(opts: BarrelOptions): Barrel {
    return {
      offset: { x: opts.offsetX || 0, y: opts.offsetY || 0 },
      length: opts.length,
      width: opts.width,
      angle: opts.angle || 0,
      recoil: opts.recoil ?? 1,
      delay: opts.delay || 0,
      damageMult: opts.dmg ?? 1,
      spread: opts.spread || 0,
      visualType: opts.visualType || 'STANDARD',
      bulletType: opts.bulletType || BulletType.STANDARD,
      bulletColor: opts.bulletColor,
      behavior: opts.behavior || WeaponBehavior.PROJECTILE,
      material: opts.material || 'STEEL',
      shape: opts.shape || 'CYLINDER',
      trailConfig: opts.trail, // Pass trail config
      chargeTime: opts.chargeTime || 0
    };
  }

  static Sniper(opts: BarrelOptions): Barrel {
    return {
      ...Barrels.Standard(opts),
      visualType: opts.visualType || 'SNIPER',
      recoil: (opts.recoil ?? 1) * 2,
      bulletType: BulletType.ARMOR_PIERCING, // Snipers penetrate armor better visually
      material: 'TITANIUM'
    };
  }

  static MachineGun(opts: BarrelOptions): Barrel {
    return {
      ...Barrels.Standard(opts),
      visualType: opts.visualType || 'MACHINE_GUN',
      spread: opts.spread || 0.3,
      width: opts.width * 1.2, // MG barrels look wider at base
      shape: opts.shape || 'TAPERED' // Default MG shape
    };
  }

  static Railgun(opts: BarrelOptions): Barrel {
    return {
      ...Barrels.Standard(opts),
      visualType: opts.visualType || 'RAILGUN',
      damageMult: (opts.dmg ?? 1) * 1.2,
      chargeTime: opts.chargeTime ?? 0.6,
      bulletType: BulletType.ARMOR_PIERCING, // Railguns pierce
      behavior: WeaponBehavior.HITSCAN, // UPDATED: Now Hitscan
      trailConfig: { type: ParticleType.BEAM, size: 0.8, color: '#00ffff' }
    };
  }

  static TrapLayer(opts: BarrelOptions): Barrel {
    return {
      ...Barrels.Standard(opts),
      visualType: opts.visualType || 'TRAP',
      length: opts.length * 0.7, // Traps are shorter
      isTrapLayer: true
    };
  }

  static DroneSpawner(opts: BarrelOptions): Barrel {
    return {
      ...Barrels.Standard(opts),
      visualType: opts.visualType || 'DRONE',
      isDroneSpawner: true,
      recoil: 0.1,
      shape: opts.shape || 'CONE' // Drones look better with cone launchers
    };
  }

  static Gatling(opts: BarrelOptions): Barrel {
    return {
      ...Barrels.Standard(opts),
      visualType: opts.visualType || 'GATLING',
      spread: 0.1
    };
  }

  // --- NEW SPECIAL BARRELS ---
  static Coil(opts: BarrelOptions): Barrel {
    return {
        ...Barrels.Standard(opts),
        visualType: opts.visualType || 'COIL',
        damageMult: (opts.dmg ?? 1) * 1.3,
        chargeTime: opts.chargeTime ?? 0.4,
        bulletType: BulletType.ARMOR_PIERCING
    };
  }
  
  static Plasma(opts: BarrelOptions): Barrel {
    return {
        ...Barrels.Standard(opts),
        visualType: opts.visualType || 'PLASMA',
        damageMult: (opts.dmg ?? 1) * 1.5,
        chargeTime: opts.chargeTime ?? 0.5,
        bulletType: BulletType.HIGH_EXPLOSIVE, // Plasma explodes
        bulletColor: '#aa00ff'
    };
  }

  static Flamethrower(opts: BarrelOptions): Barrel {
    return {
        ...Barrels.Standard(opts),
        visualType: 'FLAME',
        bulletType: BulletType.INCENDIARY, // Forces Burn Effect
        bulletColor: '#ff6600', // Fiery Orange
        spread: opts.spread ?? 0.4,
        damageMult: (opts.dmg ?? 1) * 0.4,
        recoil: 0.1,
        shape: 'CONE'
    };
  }

  static CryoBeam(opts: BarrelOptions): Barrel {
      return {
          ...Barrels.Standard(opts),
          visualType: 'ICE',
          bulletType: BulletType.CRYO, // Forces Slow Effect
          bulletColor: '#00ffff', // Cyan
          damageMult: (opts.dmg ?? 1) * 0.8,
          recoil: 0.1,
          shape: 'HEXAGON'
      };
  }

  static Hive(opts: BarrelOptions): Barrel {
      return {
          ...Barrels.Standard(opts),
          visualType: opts.visualType || 'HIVE',
          isDroneSpawner: true,
          shape: 'HEXAGON'
      };
  }

  static Rocket(opts: BarrelOptions): Barrel {
      return {
          ...Barrels.Standard(opts),
          visualType: 'MISSILE', // Uses dedicated missile visual
          width: opts.width * 1.5, // Fatter
          damageMult: (opts.dmg ?? 1) * 2.0,
          bulletType: BulletType.HIGH_EXPLOSIVE, // CRITICAL: Enables Explosion Logic
          bulletColor: '#ffaa00',
          trailConfig: { type: ParticleType.SMOKE, size: 1.5, rate: 0.8, color: '#aaaaaa' } // Thick, heavy smoke
      };
  }
}
