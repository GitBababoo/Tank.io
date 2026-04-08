

import { TankConfig, TankRole, BodyShape } from '../../../types';
import { ACTIVE_SKILLS } from '../../skills';
import { Barrels } from '../../barrels/presets';

export const Overseer: TankConfig = {
  name: "Overseer", tier: 2, role: TankRole.HYBRID, description: "Controls 4 drones.", fovMult: 1.2,
  bodyShape: BodyShape.CIRCLE, hasTreads: false, activeSkill: ACTIVE_SKILLS.REPEL,
  statBonus: { reload: 1.1 },
  barrels: [
     Barrels.DroneSpawner({ width: 14, length: 50, angle: Math.PI/2, offsetY: -8 }),
     Barrels.DroneSpawner({ width: 14, length: 50, angle: -Math.PI/2, offsetY: 8 })
  ]
};