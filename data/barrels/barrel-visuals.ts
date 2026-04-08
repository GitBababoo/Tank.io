
import { BarrelVisual, BulletType } from "../../types";

export const BARREL_VISUAL_NAMES: Record<BarrelVisual, string> = {
    'STANDARD': 'Cannon',
    'SNIPER': 'Sniper',
    'MACHINE_GUN': 'Machine Gun',
    'TRAP': 'Trap Layer',
    'DRONE': 'Drone Bay',
    'RAILGUN': 'Railgun',
    'GATLING': 'Gatling',
    'TWIN_COIL': 'Twin Coil',
    'COIL': 'Coilgun',
    'FLAME': 'Flamethrower',
    'ICE': 'Cryo Beam',
    'FROST': 'Cryo Beam',
    'HIVE': 'Hive',
    'PLASMA': 'Plasma',
    'POISON': 'Poison',
    'LASER': 'Laser',
    'TESLA': 'Tesla',
    'THUNDER': 'Thunder',
    'HITSCAN': 'Hitscan Turret',
    'MISSILE': 'Missile Launcher',
};

export const BULLET_TYPE_NAMES: Record<BulletType, string> = {
    [BulletType.STANDARD]: 'Standard Shell',
    [BulletType.ARMOR_PIERCING]: 'AP Shell',
    [BulletType.HIGH_EXPLOSIVE]: 'HE Shell',
    [BulletType.INCENDIARY]: 'Incendiary',
    [BulletType.CRYO]: 'Cryo',
    [BulletType.NANO_SPLITTER]: 'Nano-Splitter',
};