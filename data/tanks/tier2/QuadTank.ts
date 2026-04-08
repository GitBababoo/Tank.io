

import { TankConfig, TankRole, BodyShape } from '../../../types';
import { Barrels } from '../../barrels/presets';

export const QuadTank: TankConfig = {
  name: "Quad Tank", tier: 2, role: TankRole.MEDIUM, description: "Omni-directional fire.", fovMult: 1.0,
  bodyShape: BodyShape.CIRCLE, hasTreads: false,
  barrels: [0, Math.PI/2, Math.PI, -Math.PI/2].map(a => 
      Barrels.Standard({ width: 10, length: 50, angle: a, dmg: 0.8 })
  )
};