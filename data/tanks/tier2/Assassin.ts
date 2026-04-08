

import { TankConfig, TankRole, BodyShape } from '../../../types';
import { PASSIVE_SKILLS } from '../../skills';
import { Barrels } from '../../barrels/presets';

export const Assassin: TankConfig = {
  name: "Assassin", tier: 2, role: TankRole.ARTILLERY, description: "Extended range sniper.",
  bodyShape: BodyShape.CIRCLE, hasTreads: false, fovMult: 1.6, passiveSkill: PASSIVE_SKILLS.SNIPER_SCOPE,
  statBonus: { bulletSpd: 1.8, bulletDmg: 2.0, reload: 2.0 },
  barrels: [
      Barrels.Sniper({ width: 12, length: 50, dmg: 2, recoil: 4 })
  ]
};