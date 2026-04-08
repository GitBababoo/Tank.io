

import { TankConfig, TankRole, BodyShape } from '../../../types';
import { ACTIVE_SKILLS } from '../../skills';

export const Smasher: TankConfig = {
  name: "Smasher", tier: 2, role: TankRole.HEAVY, description: "Kinetic ramming engine.", fovMult: 1.0,
  // Changed to HEXAGON to trigger the new Armor Plate rendering in TankRenderer
  bodyShape: BodyShape.HEXAGON, 
  hasTreads: false, activeSkill: ACTIVE_SKILLS.DASH,
  statBonus: { maxHp: 1.8, bodyDmg: 1.8, moveSpd: 1.25, regen: 1.5 }, 
  barrels: [], // No guns = Armor Visuals enabled automatically
  statCap: 10, hiddenStats: ['bulletSpd', 'bulletPen', 'bulletDmg', 'reload']
};