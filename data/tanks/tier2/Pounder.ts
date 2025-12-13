

import { TankConfig, TankRole, BodyShape } from '../../../types';
import { Barrels } from '../../barrels/presets';

export const Pounder: TankConfig = {
  name: "Pounder",
  tier: 2,
  role: TankRole.HEAVY,
  description: "Heavy artillery cannon.",
  fovMult: 1.0,
  bodyShape: BodyShape.CIRCLE,
  hasTreads: false,
  // Reduced reload from 2.0 to 0.6 (slower fire rate)
  // Increased Damage massively to compensate
  statBonus: { reload: 0.6, bulletDmg: 3.0, bulletPen: 2.0, moveSpd: 0.9 },
  barrels: [
      Barrels.Standard({ width: 24, length: 50, dmg: 3.0, recoil: 12 })
  ]
};