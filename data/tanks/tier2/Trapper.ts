

import { TankConfig, TankRole, BodyShape } from '../../../types';
import { Barrels } from '../../barrels/presets';

export const Trapper: TankConfig = {
  name: "Trapper", tier: 2, role: TankRole.SUPPORT, description: "Lays mines.", fovMult: 1.0,
  bodyShape: BodyShape.CIRCLE, hasTreads: false,
  statBonus: { reload: 0.8 },
  barrels: [
      Barrels.TrapLayer({ width: 16, length: 50 })
  ]
};