
export interface Vector2 {
  x: number;
  y: number;
}

export enum EntityType {
  PLAYER = 'PLAYER',
  ENEMY = 'ENEMY', // AI Tanks
  BULLET = 'BULLET',
  SHAPE = 'SHAPE',
  PARTICLE = 'PARTICLE',
  DRONE = 'DRONE',
  TRAP = 'TRAP',
  CRASHER = 'CRASHER',
  BOSS = 'BOSS',
  WALL = 'WALL',
  ZONE = 'ZONE',
  FLOATING_TEXT = 'FLOATING_TEXT' // NEW: RPG Damage Numbers
}

export type GameMode = 'FFA' | 'TEAMS_2' | 'TEAMS_4' | 'MAZE' | 'SANDBOX';

// --- SERVER & NETWORK TYPES ---
export interface ServerRegion {
    id: string;
    name: string;
    flag: string; // Emoji flag
    ping: number;
    occupancy: number; // 0-100%
    url: string; // WebSocket URL
    type: 'OFFICIAL' | 'COMMUNITY' | 'LOCAL';
}

export interface NetworkPacket {
    t: 'i' | 'u' | 'j' | 'l'; // Type: Input, Update, Join, Leave
    d: any; // Data
}

// Snapshot from Server (Compact for bandwidth)
export interface EntitySnapshot {
    id: string;
    type: EntityType;
    x: number;
    y: number;
    r: number; // Rotation
    hp: number; // Health % or value
    c?: string; // Color (Optional, mainly for init)
    s?: number; // Size/Radius (Optional)
    maxHp?: number;
    score?: number;
    classPath?: string;
}

export interface WorldSnapshot {
    time: number;
    entities: EntitySnapshot[];
}
// ------------------------------

// --- NEW MAP ARCHITECTURE TYPES ---
export interface MapZoneConfig {
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'SAFE' | 'BASE';
    teamId?: string;
    color: string;
}

export interface MapWallConfig {
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
}

export interface MapConfig {
    id: GameMode;
    width: number;
    height: number;
    zones: MapZoneConfig[];
    walls: MapWallConfig[]; // Static walls defined in config
    generateMaze?: boolean; // Flag to trigger procedural maze gen
    biomeType: 'DEFAULT' | 'SANDBOX';
}
// ----------------------------------

export enum ShapeType {
  SQUARE = 'SQUARE',
  TRIANGLE = 'TRIANGLE',
  PENTAGON = 'PENTAGON',
  ALPHA_PENTAGON = 'ALPHA_PENTAGON',
  HEXAGON = 'HEXAGON',
  HEART = 'HEART',
  CROSS = 'CROSS'
}

export enum ParticleType {
  SPARK = 'SPARK',
  DEBRIS = 'DEBRIS',
  SMOKE = 'SMOKE',
  TEXT = 'TEXT',
  RAIN = 'RAIN',
  SNOW = 'SNOW',
  FLAME = 'FLAME', // NEW for Flamethrower
  CRYO = 'CRYO', // NEW for Cryo Beam
  BEAM = 'BEAM', // NEW for Hitscan weapons
  GHOST = 'GHOST', // NEW: Dash trail
  SHOCKWAVE = 'SHOCKWAVE', // NEW: Repel effect
  TELEPORT_FLASH = 'TELEPORT_FLASH', // NEW: Teleport visual
  CHARGE_GLOW = 'CHARGE_GLOW' // NEW: Charging visual
}

export enum SoundType {
  SHOOT = 'SHOOT',
  HIT = 'HIT',
  DIE = 'DIE',
  EXPLOSION = 'EXPLOSION',
  LEVEL_UP = 'LEVEL_UP',
  EVOLVE = 'EVOLVE',
  POWERUP = 'POWERUP',
  CLICK = 'CLICK',
  BOSS_SPAWN = 'BOSS_SPAWN',
  ABILITY = 'ABILITY',
  REGEN = 'REGEN',
  AMBIENT_HUM = 'AMBIENT_HUM',
  ENGINE_HUM = 'ENGINE_HUM',
  CRIT = 'CRIT',
  CHARGE = 'CHARGE', // NEW: Charging Sound
  LASER_BLAST = 'LASER_BLAST' // NEW: Heavy Laser Sound
}

export enum BiomeType {
  PLAINS = 'PLAINS',
  NEST = 'NEST',
  ICE = 'ICE',
  BADLANDS = 'BADLANDS'
}

export enum WeatherType {
  CLEAR = 'CLEAR',
  RAIN = 'RAIN',
  STORM = 'STORM',
  FOG = 'FOG',
  SNOW = 'SNOW',
}

export enum BossType {
  GUARDIAN = 'GUARDIAN',
  SUMMONER = 'SUMMONER',
  FALLEN_BOOSTER = 'FALLEN_BOOSTER',
  SENTINEL = 'SENTINEL' // NEW SMART BOSS
}

// --- EXTENDED CLASS SYSTEM (24 Archetypes) ---
export enum TankRole {
  HEAVY = 'HEAVY',     
  MEDIUM = 'MEDIUM',   
  LIGHT = 'LIGHT',     
  ARTILLERY = 'ARTILLERY', 
  HYBRID = 'HYBRID',   
  SUPPORT = 'SUPPORT',
  
  // NEW SPECIALIZED ROLES
  STEALTH = 'STEALTH',
  FLAME = 'FLAME',
  FROST = 'FROST',
  THUNDER = 'THUNDER',
  POISON = 'POISON',
  QUANTUM = 'QUANTUM',
  GRAVITY = 'GRAVITY',
  WIND = 'WIND',
  BEAST = 'BEAST',
  CHAOS = 'CHAOS',
  SIEGE = 'SIEGE',
  ENGINEER = 'ENGINEER'
}

export enum BodyShape {
  CIRCLE = 'CIRCLE',
  SQUARE = 'SQUARE',
  TRIANGLE = 'TRIANGLE',
  PENTAGON = 'PENTAGON',
  HEXAGON = 'HEXAGON',
  OCTAGON = 'OCTAGON',
  STAR = 'STAR',
  U_SHAPE = 'U_SHAPE',
  X_SHAPE = 'X_SHAPE',
  DIAMOND = 'DIAMOND', // NEW
  SPIKED = 'SPIKED'    // NEW
}

// --- NEW: Factions System ---
export enum FactionType {
  IRON_LEGION = 'IRON_LEGION',       // Heavy Armor, Slow
  NEON_VANGUARD = 'NEON_VANGUARD',   // Fast, High Tech
  SHADOW_SYNDICATE = 'SHADOW_SYNDICATE', // Stealth, Crit
  SOLAR_DYNASTY = 'SOLAR_DYNASTY',   // Regen, Fire
  NONE = 'NONE'
}

// --- NEW: AI Personalities ---
export enum AIPersonality {
  BALANCED = 'BALANCED',
  RUSHER = 'RUSHER',       // Always charges
  SNIPER = 'SNIPER',       // Keeps max distance
  COWARD = 'COWARD',       // Runs when HP < 50%
  FLANKER = 'FLANKER',      // Circles around
  DUMMY = 'DUMMY'           // Sandbox Dummy (Does nothing)
}

export interface Stats {
  regen: number;
  maxHp: number;
  bodyDmg: number;
  bulletSpd: number;
  bulletPen: number;
  bulletDmg: number;
  reload: number;
  moveSpd: number;
  critChance: number; // NEW
  critDamage: number; // NEW
}

export type StatKey = keyof Stats;

export type ActiveSkillType = 'DASH' | 'FORTIFY' | 'REPEL' | 'OVERCLOCK' | 'TELEPORT' | 'INVISIBILITY' | 'NONE';
export type PassiveSkillType = 'THORNS' | 'LIFESTEAL' | 'SNIPER_SCOPE' | 'SPEED_BOOST_LOW_HP' | 'REGEN_AURA' | 'NONE';

export interface SkillConfig {
  type: ActiveSkillType | PassiveSkillType;
  name: string;
  cooldown?: number; // For active
  duration?: number; // For active
  description: string;
  value?: number; // For passive (e.g. % damage reflect)
}

export interface TankConfig {
  name: string;
  role: TankRole; // NEW: Determines base color theme/engine sound
  tier: number;
  barrels: Barrel[];
  fovMult: number;
  statBonus?: Partial<Stats>;
  description?: string;
  activeSkill?: SkillConfig;
  passiveSkill?: SkillConfig;
  
  // Advanced Visuals
  bodyShape?: BodyShape;
  hasTreads?: boolean; // Renders tank treads
  turretColor?: string; // Custom barrel color
  bodyColorOverride?: string; // Specific override

  statCap?: number; 
  hiddenStats?: StatKey[]; 
  invisibility?: {
    revealDelay: number; 
    fadeSpeed: number;   
  };

  // NEW: Critical Hit System Properties
  baseCritChance?: number; // Bonus base crit chance (0 to 1)
  baseCritMultiplier?: number; // Multiplier override (e.g. 1.2 for heavy)
  critResistance?: number; // Chance reduction (0 to 1)
}

// NEW: Visual Types for Next Gen Barrels
export type BarrelVisual = 
  'STANDARD' | 'SNIPER' | 'MACHINE_GUN' | 
  'TRAP' | 'DRONE' | 'RAILGUN' | 
  'GATLING' | 'TWIN_COIL' |
  'COIL' | 'FLAME' | 'ICE' | 'HIVE' | 'PLASMA' | 'POISON' | 'LASER' | 'TESLA' | 'THUNDER' | 'FROST' | 'HITSCAN' | 'MISSILE';

export type BarrelMaterial = 'STEEL' | 'TITANIUM' | 'OBSIDIUM'; // NEW
export type BarrelShape = 'CYLINDER' | 'CONE' | 'TAPERED' | 'HEXAGON' | 'SPIKED' | 'DIAMOND'; // NEW EXTENDED SHAPES

// --- NEW: Ammunition & Status Effects ---
export enum BulletType {
    STANDARD = 'STANDARD',
    ARMOR_PIERCING = 'ARMOR_PIERCING',
    HIGH_EXPLOSIVE = 'HIGH_EXPLOSIVE',
    INCENDIARY = 'INCENDIARY',
    CRYO = 'CRYO',
    NANO_SPLITTER = 'NANO_SPLITTER',
}

export interface BulletTrailConfig {
    type: ParticleType;
    color?: string;
    size?: number; // scale relative to bullet
    rate?: number; // probability per step (0-1)
}

export enum StatusEffectType {
    BURN = 'BURN',
    SLOW = 'SLOW',
    FORTIFY = 'FORTIFY',
    OVERCLOCK = 'OVERCLOCK',
    HASTE = 'HASTE', // NEW: Fixes "Stuck" bug on Dash
}

export interface StatusEffect {
    type: StatusEffectType;
    duration: number;
    sourceId: string; // Who applied it
    damagePerSecond?: number; // For DoT like burn
    slowFactor?: number; // For slow
    speedMultiplier?: number; // NEW: For Haste
    value?: number; // Generic value for multipliers, percentages, etc. (e.g. 0.6 for 60% DR)
}

// --- NEW: Future-Proof Weapon System ---
export enum WeaponBehavior {
    PROJECTILE = 'PROJECTILE', // Shells, rockets (have travel time)
    HITSCAN = 'HITSCAN',       // Lasers, beams (instant hit)
}


// NEW: Auto Turret Configuration
export interface AutoTurretConfig {
  range: number;
  arc: number; // in radians
  turnSpeed: number; // radians per second
  fireRate: number; // shots per second
  targetingWeights: {
    proximity: number;
    health: number; // Lower health = higher score
    threat?: number; // Placeholder for future
  };
}

export interface AutoTurretState {
  barrelIndex: number;
  state: 'IDLE' | 'SCANNING' | 'TRACKING';
  rotation: number; // Absolute world angle
  targetId: string | null;
  fireCooldown: number;
  scanDirection?: number;
}

export interface Barrel {
  offset: Vector2; // x is forward/back, y is left/right
  length: number;
  width: number;
  angle: number;   // Rotation offset in radians
  recoil: number;
  delay: number;   // Fire delay frame offset (0 to 1 relative to reload cycle)
  damageMult: number;
  spread: number;
  isDroneSpawner?: boolean;
  isTrapLayer?: boolean;
  isAutoTurret?: boolean;
  autoTurretConfig?: AutoTurretConfig;
  color?: string; // Specific barrel color
  visualType?: BarrelVisual;
  bulletType?: BulletType; 
  bulletColor?: string; // NEW: Explicit Bullet Color override (e.g. Red)
  behavior?: WeaponBehavior; // NEW: Projectile vs Hitscan
  material?: BarrelMaterial; // NEW
  shape?: BarrelShape; // NEW
  trailConfig?: BulletTrailConfig; // NEW: Custom bullet trails
  chargeTime?: number; // NEW: Seconds to charge before firing
}

export interface StatsTracker {
  damageDealt: number;
  shapesDestroyed: number;
  timeAlive: number;
  bossKills: number;
  playerKills: number;
}

export interface GameNotification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'boss';
  timestamp: number;
}

export interface DeathDetails {
  killerName: string;
  killerType: string; // 'tank', 'shape', 'boss', 'unknown'
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  tankClass: string;
  teamId?: string;
  isPlayer: boolean;
}

export interface PlayerState {
  level: number;
  xp: number;
  xpToNext: number;
  score: number;
  availablePoints: number;
  stats: Record<StatKey, number>;
  classPath: string;
  maxLevel: number;
  abilityCooldown: number;
  statsTracker: StatsTracker;
  notifications: GameNotification[];
  deathDetails?: DeathDetails;
  leaderboard: LeaderboardEntry[];
  leaderPos?: Vector2; // Position of the #1 player for the arrow
  faction: FactionType; // NEW
  godMode?: boolean; // Sandbox Feature
  nextBossTimer?: number; // NEW: Seconds until next boss
  health: number; // NEW: Current Health for HUD
  maxHealth: number; // NEW: Max Health for HUD
}

export interface Entity {
  id: string;
  name?: string; // Display name
  type: EntityType;
  pos: Vector2;
  prevPos?: Vector2; // NEW: For Raycast CCD
  // For Interpolation
  targetPos?: Vector2; 
  lerpFactor?: number;

  vel: Vector2;
  radius: number;
  rotation: number;
  color: string;
  health: number;
  maxHealth: number;
  damage: number;
  isDead: boolean;
  scoreValue?: number;
  ownerId?: string;
  teamId?: string; // For team modes
  creationTime?: number;
  lifespan?: number;
  
  // Physics Properties
  mass?: number; 
  
  // Variants include Fanon types
  variant?: 'DEFAULT' | 'GREEN' | 'EVIL' | 'TNT' | 'HEALER' | 'GOLDEN_HEART';
  shapeType?: ShapeType;
  bossType?: BossType;
  
  // New: Regen Logic & Invulnerability
  lastDamageTime?: number;
  isInvulnerable?: boolean;
  inSafeZone?: boolean; // NEW: Specifically for rendering the Base Shield

  // Invisibility Logic
  invisibleTimer?: number;
  isInvisible?: boolean;

  // Wall/Zone Specific
  width?: number;
  height?: number;

  // AI/Drone Specific
  aiState?: 'IDLE' | 'ATTACK' | 'RETURN' | 'FLEE' | 'CHARGE' | 'WANDER' | 'FARM' | 'CHASE';
  aiPersonality?: AIPersonality; // NEW
  attackCooldown?: number;
  classPath?: string; // For AI Tanks
  targetClassPath?: string; // NEW: The ultimate goal class for this bot
  evolutionPath?: string[]; // NEW: The steps to get there
  barrelCooldowns?: number[]; // NEW: Tracks cooldown for each barrel individually
  barrelCharges?: number[]; // NEW: Tracks current charge level (0 to chargeTime)
  barrelRecoils?: number[]; // NEW: Tracks visual recoil state (0 to 1)
  autoTurretStates?: AutoTurretState[]; // NEW
  aiTargetId?: string; // NEW: Tracks who this bot is chasing (for anti-mobbing)
  
  // NEW: Crit System State
  lastCritTime?: number;
  critCooldownStacks?: number;
  isCritical?: boolean; // NEW: Marks if a projectile is a critical hit

  // Visual Effects
  opacity?: number;
  particleType?: ParticleType; // For particle entities
  text?: string; // For floating text
  flashTimer?: number; // NEW: Hit Flash duration in seconds
  
  // --- NEW: Weapon System Properties ---
  bulletType?: BulletType;
  bulletVisual?: BarrelVisual;
  explosionRadius?: number; // For HE
  isSubmunition?: boolean; // For nano children
  trailConfig?: BulletTrailConfig; // NEW: Custom trail for projectile entities

  // NEW: Status Effects
  statusEffects?: StatusEffect[];

  // Render State (for treads animation)
  distanceTraveled?: number;
}

export interface BossConfig {
  type: BossType;
  name: string;
  hp: number;
  damage: number;
  radius: number;
  xp: number;
  color: string;
  speed: number;
  // NEW: UI Data
  description?: string;
  difficulty?: 'Hard' | 'Extreme' | 'Insane' | 'Godlike';
}

export interface EvoRequirement {
  type: 'level' | 'score' | 'kill_count' | 'damage_dealt' | 'time_alive' | 'shape_kills';
  value: number;
  description: string;
}

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  uiVolume: number;
  spatialAudio: boolean;
  soundTheme: 'retro' | 'soft';
}

export interface GameSettings {
  graphics: {
    quality: 'low' | 'medium' | 'high';
    particles: boolean;
    hudScale: number;
    fpsCap: number;
    resolutionScale: number; 
    showPerformance: boolean;
    postProcessing: boolean; // NEW: Enable/Disable heavy FX
  };
  audio: AudioSettings;
  gameplay: {
    infiniteLevel: boolean;
    xpScale: number;
    difficultyMode: 'easy' | 'normal' | 'hardcore';
    autoFire: boolean;
  };
  controls: {
    sensitivity: number;
    mouseAim: boolean;
  };
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  category: 'General' | 'Stats' | 'Classes';
}
