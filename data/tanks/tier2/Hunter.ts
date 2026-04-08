

import { TankConfig, TankRole, BodyShape } from '../../../types';
import { Barrels } from '../../barrels/presets';

export const Hunter: TankConfig = {
  name: "Hunter", tier: 2, role: TankRole.ARTILLERY, description: "Consecutive shots.",
  bodyShape: BodyShape.CIRCLE, hasTreads: false, fovMult: 1.4,
  barrels: [
      Barrels.Sniper({ width: 9, length: 50, dmg: 0.9, recoil: 1 }),
      Barrels.Sniper({ width: 14, length: 50, delay: 0.1, dmg: 0.9, recoil: 3 })
  ]
};