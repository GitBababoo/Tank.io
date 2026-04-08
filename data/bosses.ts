
import { BossConfig, BossType } from '../types';
import { COLORS } from '../constants';

export const BOSS_DATA: Record<BossType, BossConfig> = {
  [BossType.GUARDIAN]: {
    type: BossType.GUARDIAN,
    name: 'Guardian',
    hp: 3000,
    damage: 60,
    radius: 55,
    xp: 30000,
    color: COLORS.bossGuardian,
    speed: 10,
    description: "A massive triangular overseer that commands a legion of crashers. Its single eye watches all.",
    difficulty: 'Hard'
  },
  [BossType.SUMMONER]: {
    type: BossType.SUMMONER,
    name: 'Summoner',
    hp: 3000,
    damage: 40,
    radius: 55,
    xp: 30000,
    color: COLORS.bossSummoner,
    speed: 8,
    description: "The Golden Queen of the Nest. She spawns relentless waves of defense drones.",
    difficulty: 'Hard'
  },
  [BossType.FALLEN_BOOSTER]: {
    type: BossType.FALLEN_BOOSTER,
    name: 'Fallen Booster',
    hp: 3000,
    damage: 80, // Ramming damage
    radius: 40,
    xp: 30000,
    color: COLORS.bossFallen,
    speed: 20, // Base speed, charges faster
    description: "A corrupted hero tank that has lost control. Extremely fast and aggressive rammer.",
    difficulty: 'Extreme'
  },
  [BossType.SENTINEL]: {
    type: BossType.SENTINEL,
    name: 'The Sentinel',
    hp: 2500, // Slightly less HP but much smarter
    damage: 50,
    radius: 45,
    xp: 40000,
    color: COLORS.bossSentinel,
    speed: 18, // Faster than standard bosses
    description: "An advanced AI stronghold with trap layers and auto-targeting turrets.",
    difficulty: 'Insane'
  }
};
