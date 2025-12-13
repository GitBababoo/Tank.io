

import { TankConfig, TankRole, BodyShape } from '../../../types';
import { Barrels } from '../../barrels/presets';

export const TripleShot: TankConfig = {
  name: "Triple Shot", tier: 2, role: TankRole.MEDIUM, description: "Wide coverage.", fovMult: 1.0,
  bodyShape: BodyShape.CIRCLE, hasTreads: false,
  statBonus: { reload: 1.1 },
  barrels: [
    Barrels.Standard({ width: 10, length: 50, dmg: 0.8 }),
    Barrels.Standard({ width: 10, length: 50, angle: -0.4, offsetX: 2, dmg: 0.8 }),
    Barrels.Standard({ width: 10, length: 50, angle: 0.4, offsetX: 2, dmg: 0.8 })
  ]
};