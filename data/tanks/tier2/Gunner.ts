

import { TankConfig, TankRole, BodyShape } from '../../../types';
import { ACTIVE_SKILLS } from '../../skills';
import { Barrels } from '../../barrels/presets';

export const Gunner: TankConfig = {
  name: "Gunner", tier: 2, role: TankRole.MEDIUM, description: "High fire rate.", fovMult: 1.0,
  bodyShape: BodyShape.CIRCLE, hasTreads: false,
  activeSkill: ACTIVE_SKILLS.OVERCLOCK,
  statBonus: { reload: 0.5, bulletPen: 0.6, bulletDmg: 0.5 },
  barrels: [
    Barrels.Gatling({ width: 6, length: 50, offsetY: -8, offsetX: 2, dmg: 0.5 }),
    Barrels.Gatling({ width: 6, length: 50, offsetY: 8, offsetX: 2, delay: 0.5, dmg: 0.5 }),
    Barrels.Gatling({ width: 6, length: 50, offsetY: -3, dmg: 0.5, delay: 0.25 }),
    Barrels.Gatling({ width: 6, length: 50, offsetY: 3, dmg: 0.5, delay: 0.75 })
  ]
};