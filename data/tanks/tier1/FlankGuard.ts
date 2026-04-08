

import { TankConfig, TankRole, BodyShape } from '../../../types';
import { ACTIVE_SKILLS } from '../../skills';
import { Barrels } from '../../barrels/presets';

export const FlankGuard: TankConfig = {
  name: "Flank Guard",
  tier: 1,
  role: TankRole.LIGHT,
  description: "Watch your back.",
  fovMult: 1.0,
  bodyShape: BodyShape.CIRCLE,
  hasTreads: false,
  activeSkill: ACTIVE_SKILLS.DASH,
  statBonus: { moveSpd: 1.15, bodyDmg: 0.8 },
  barrels: [
    Barrels.Standard({ width: 12, length: 50 }), // Front
    Barrels.Standard({ width: 12, length: 50, angle: Math.PI, recoil: 1.5 }) // Rear Thruster
  ]
};