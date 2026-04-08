
import { GameSettings, GlossaryEntry, ShapeType, GameMode, FactionType } from './types';

// --- ADMIN CONFIGURATION ---
// ใส่ UID ของคุณที่ได้จาก Firebase Authentication ที่นี่
// คุณดู UID ได้ในหน้า console.firebase.google.com -> Authentication -> Users
export const ADMIN_UIDS = [
    "YOUR_ADMIN_UID_HERE", 
    "สำรอง_UID_เผื่อมีหลายไอดี",
    "GUEST_ADMIN" // สำหรับทดสอบระบบ Guest
];

// --- NEW: CENTRAL GAME RULES CONFIGURATION ---
// ปรับแต่งกติกาฟิสิกส์และ AI ได้ที่นี่โดยไม่ต้องแก้โค้ดลึกๆ
export const GAME_RULES = {
    // PHYSICS
    ENABLE_KNOCKBACK: false, // ยังคงปิดแรงผลักระหว่าง Tank กับ Bullet เพื่อความนิ่ง
    BULLET_TO_BULLET_COLLISION: true, // FIXED: เปิดการชนกันของกระสุน เพื่อให้เกิดการวัดค่าเจาะเกราะ (Penetration War)
    
    // AI BEHAVIOR
    AI_MAX_CHASERS: 3, // จำนวนบอทสูงสุดที่จะไล่ล่าเป้าหมายเดียวกัน (กันโดนรุม)
    AI_VIEW_DISTANCE: 1200, // ระยะมองเห็นของบอท
};

// Colors - GOD TIER SCI-FI THEME
export const COLORS = {
  background: '#050508', // Deep Void
  grid: '#151520', // Cyber Grid
  player: '#00ccff', // Neon Cyan
  
  // Mechanical / Tech Colors
  barrelDark: '#505060', 
  barrelMetallic: '#e0e0f0', 
  barrelHighlight: '#ffffff', 
  barrelCoil: '#00ffff', 
  
  armorDark: '#121216',
  armorLight: '#2a2a35',
  armorHighlight: '#404050',
  
  coreGlow: '#00ffff',
  ventDark: '#000000',
  
  playerBarrel: '#999999', 
  enemy: '#ff3344', 
  
  // Neon Shapes
  shapeSquare: '#ffd700', 
  shapeTriangle: '#ff4444', 
  shapePentagon: '#4488ff', 
  shapeAlpha: '#4488ff',
  shapeHexagon: '#aa44ff', 
  
  text: '#ffffff',
  uiBg: 'rgba(0, 0, 0, 0.6)',
  uiPanel: 'rgba(5, 10, 20, 0.95)', 
  
  drone: '#ff6666',
  trap: '#66ff66',
  crasher: '#ff66aa', 
  rareGreen: '#00ff41', 
  wall: '#333344', 

  // NEW: Bullet Type Colors
  bulletFlame: '#ff9900',
  bulletCryo: '#aaffff',
  
  // Role Colors (Vibrant & Distinct)
  roleHeavy: '#607d8b',
  roleMedium: '#00b2e1',
  roleLight: '#00e676',
  roleArtillery: '#ff9100',
  roleHybrid: '#7c4dff',
  roleSupport: '#e91e63',
  roleStealth: '#2c3e50',
  roleFlame: '#d35400',
  roleFrost: '#81ecec',
  roleThunder: '#f1c40f',
  rolePoison: '#8e44ad',
  roleQuantum: '#a29bfe',
  roleGravity: '#2d3436',
  roleWind: '#74b9ff',
  roleBeast: '#d63031',
  roleChaos: '#fdcb6e',
  roleSiege: '#636e72',
  roleEngineer: '#e17055',

  // Fanon
  evilPolygon: '#8a2323',
  tnt: '#d35400',
  healer: '#ffffff',
  goldHeart: '#ffd700',

  // Base Objects
  baseDrone: '#f14e54',
  
  // Boss Colors
  bossGuardian: '#ff3344',
  bossSummoner: '#ffd700',
  bossFallen: '#cccccc',
  bossSentinel: '#00ffaa', // NEW: The Sentinel Color

  arenaCloser: '#ffe869',

  // Biome Colors
  biomeNest: '#0a080c',
  biomeIce: '#0f1820',
  biomeBadlands: '#1a1010',
  biomeSandbox: '#080808',

  // Notifications
  notifyInfo: '#00ccff',
  notifyWarn: '#ff3344',
  notifySuccess: '#00ff66',
  notifyBoss: '#aa44ff',

  // Faction Colors
  [FactionType.IRON_LEGION]: '#90a4ae',
  [FactionType.NEON_VANGUARD]: '#00ffff',
  [FactionType.SHADOW_SYNDICATE]: '#d500f9',
  [FactionType.SOLAR_DYNASTY]: '#ffea00',
  [FactionType.NONE]: '#00ccff'
};

export const TEAM_COLORS = {
  BLUE: '#00ccff',
  RED: '#ff3344',
  GREEN: '#00ff66',
  PURPLE: '#aa44ff',
};

// --- BALANCED PHYSICS CONSTANTS ---
export const WORLD_SIZE = 5000;
export const SANDBOX_SIZE = 3000;

// Friction: 
// Adjusted to 0.90 for a "heavier" tank feel. Less drift, more precision.
export const FRICTION = 0.90; 

// Acceleration: Base Engine Power
// Adjusted to match new friction.
export const ACCELERATION = 3.0; 

// Stat Caps & Base Values
export const MAX_STAT_LEVEL = 7; 
export const INFINITE_STAT_DIMINISHING_RETURN = 0.85;

// Based on Wiki Data
export const BASE_STATS = {
  regen: 0.001,
  maxHp: 50,
  bodyDmg: 20,
  bulletSpd: 5,
  bulletPen: 10,
  bulletDmg: 7,
  reload: 30,
  moveSpd: 8, // Reduced base speed from 14 to 8
  critChance: 0, 
  critDamage: 0, 
};

// Shape Configurations
export const SHAPE_CONFIGS: Record<ShapeType, { radius: number, color: string, hp: number, damage: number, score: number }> = {
  [ShapeType.SQUARE]: {
    radius: 12,
    color: COLORS.shapeSquare,
    hp: 10,
    damage: 8,
    score: 10
  },
  [ShapeType.TRIANGLE]: {
    radius: 16,
    color: COLORS.shapeTriangle,
    hp: 30,
    damage: 8,
    score: 25
  },
  [ShapeType.PENTAGON]: {
    radius: 24,
    color: COLORS.shapePentagon,
    hp: 100,
    damage: 12,
    score: 130
  },
  [ShapeType.ALPHA_PENTAGON]: {
    radius: 65,
    color: COLORS.shapeAlpha,
    hp: 3000,
    damage: 20,
    score: 3000
  },
  [ShapeType.HEXAGON]: {
    radius: 32,
    color: COLORS.shapeHexagon,
    hp: 400,
    damage: 15,
    score: 500
  },
  [ShapeType.CROSS]: {
    radius: 14,
    color: COLORS.healer,
    hp: 45,
    damage: 0,
    score: 15
  },
  [ShapeType.HEART]: {
    radius: 16,
    color: COLORS.goldHeart,
    hp: 90,
    damage: 0,
    score: 90
  }
};

// --- SETTINGS DEFAULTS ---
export const DEFAULT_SETTINGS: GameSettings = {
  graphics: {
    quality: 'high',
    particles: true,
    hudScale: 1.0,
    fpsCap: 60,
    resolutionScale: 1.0, // Default 1.0 (Native)
    showPerformance: false, // Default off
    postProcessing: true, // NEW: Default on for high end feel
  },
  audio: {
    masterVolume: 0.5,
    sfxVolume: 0.8,
    musicVolume: 0.4,
    uiVolume: 1.0,
    spatialAudio: true,
    soundTheme: 'soft',
  },
  gameplay: {
    infiniteLevel: true,
    xpScale: 1.0,
    difficultyMode: 'normal',
    autoFire: false,
  },
  controls: {
    sensitivity: 1.0,
    mouseAim: true,
  }
};

export const GAME_MODES: { id: GameMode; name: string; description: string; color: string }[] = [
  { id: 'FFA', name: 'FFA', description: 'Free For All. Survival of the fittest.', color: '#00ccff' },
  { id: 'TEAMS_2', name: '2 Teams', description: 'Red vs Blue. Epic Warfare.', color: '#ff3344' },
  { id: 'TEAMS_4', name: '4 Teams', description: 'Chaotic 4-way battle.', color: '#aa44ff' },
  { id: 'MAZE', name: 'Maze', description: 'Claustrophobic tactical combat.', color: '#999999' },
  { id: 'SANDBOX', name: 'Sandbox', description: 'GOD MODE enabled. Test everything.', color: '#ffd700' },
];

export const FACTIONS = [
  { id: FactionType.IRON_LEGION, name: "Iron Legion", desc: "Heavy Armor +10%, Reduced Knockback", color: COLORS[FactionType.IRON_LEGION] },
  { id: FactionType.NEON_VANGUARD, name: "Neon Vanguard", desc: "Speed +10%, Fire Rate +5%", color: COLORS[FactionType.NEON_VANGUARD] },
  { id: FactionType.SHADOW_SYNDICATE, name: "Shadow Syndicate", desc: "Crit Chance +15%, Stealth +10%", color: COLORS[FactionType.SHADOW_SYNDICATE] },
  { id: FactionType.SOLAR_DYNASTY, name: "Solar Dynasty", desc: "Regen +20%, Bullet Health +10%", color: COLORS[FactionType.SOLAR_DYNASTY] },
];

export const GLOSSARY_DATA: GlossaryEntry[] = [
  { category: 'General', term: 'Biomes', definition: 'Different areas of the map have different effects. Center is dangerous, Edges are barren.' },
  { category: 'General', term: 'Evolution', definition: 'Transforming your tank into a stronger class. Requires Level 15, 30, and 45.' },
  { category: 'General', term: 'Nest', definition: 'The center of the map. Contains high-XP Pentagons but is guarded by Crashers.' },
  { category: 'General', term: 'Bosses', definition: 'Powerful enemies like the Guardian and Summoner spawn every few minutes. They drop massive XP.' },
  { category: 'General', term: 'Fanon Polygons', definition: 'Rare shapes with special effects. White Crosses heal, TNT Squares explode, and Evil Polygons fight back!' },
  { category: 'General', term: 'Skills', definition: 'Tanks now have Active (F) and Passive abilities.' },
  { category: 'General', term: 'Weak Points', definition: 'Hitting a tank in the rear deals 1.5x Damage. Position matters!' },
  { category: 'Classes', term: 'Heavy', definition: 'Square/Octagon shape. Slow, tanky, hard hitting.' },
  { category: 'Classes', term: 'Light', definition: 'Triangle shape. Very fast, high damage, fragile.' },
  { category: 'Classes', term: 'Hybrid', definition: 'Star/Complex shape. Uses drones and guns mixed.' },
];

export const SKILL_POINTS_AT_LEVEL: Record<number, boolean> = {};
for (let i = 2; i <= 28; i++) SKILL_POINTS_AT_LEVEL[i] = true;
[30, 33, 36, 39, 42, 45].forEach(i => SKILL_POINTS_AT_LEVEL[i] = true);

export const MAX_XP_GAIN = 100000;
