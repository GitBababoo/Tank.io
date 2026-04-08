

import { TankConfig, TankRole, BodyShape } from '../../../types';
import { Barrels } from '../../barrels/presets';

export const Destroyer: TankConfig = {
  name: "Destroyer", tier: 2, role: TankRole.HEAVY, description: "One shot, massive damage.", fovMult: 1.0,
  bodyShape: BodyShape.CIRCLE, hasTreads: false,
  // Slower reload (0.4), Higher Damage (5.0), Higher Recoil
  statBonus: { reload: 0.4, bulletDmg: 5.0, bulletPen: 3.0, moveSpd: 0.85 },
  barrels: [
      Barrels.Railgun({ width: 30, length: 50, dmg: 5.0, recoil: 30 })
  ]
};