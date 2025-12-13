
import { TankConfig, TankRole, BodyShape } from '../../../types';
import { Barrels } from '../../barrels/presets';

export const Ricochet: TankConfig = {
  name: "Ricochet",
  tier: 2,
  role: TankRole.ARTILLERY,
  description: "Bouncing bullets.",
  fovMult: 1.0,
  bodyShape: BodyShape.CIRCLE,
  hasTreads: false,
  statBonus: { bulletSpd: 1.2, bulletPen: 1.2 },
  barrels: [
      Barrels.Standard({ width: 12, length: 55, dmg: 1.0 }),
      Barrels.Standard({ width: 14, length: 30, angle: 0.1, dmg: 0.0, delay: 0 }), // Visual decoration
      Barrels.Standard({ width: 14, length: 30, angle: -0.1, dmg: 0.0, delay: 0 })
  ]
};
