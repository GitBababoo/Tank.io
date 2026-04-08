

import { TankConfig, TankRole, BodyShape } from '../../../types';
import { PASSIVE_SKILLS } from '../../skills';
import { Barrels } from '../../barrels/presets';

export const Sniper: TankConfig = {
  name: "Sniper",
  tier: 1,
  role: TankRole.ARTILLERY,
  description: "Vision range increased.",
  bodyShape: BodyShape.CIRCLE, // Standard chassis with long gun
  hasTreads: false,
  fovMult: 1.3,
  passiveSkill: PASSIVE_SKILLS.SNIPER_SCOPE,
  statBonus: { bulletSpd: 1.5, bulletDmg: 1.4, reload: 1.5 },
  barrels: [
      Barrels.Sniper({ width: 10, length: 50, dmg: 1.4, recoil: 3 })
  ]
};