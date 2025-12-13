

import { TankConfig, TankRole, BodyShape } from '../../../types';
import { ACTIVE_SKILLS } from '../../skills';
import { Barrels } from '../../barrels/presets';

export const TriAngle: TankConfig = {
  name: "Tri-Angle", tier: 2, role: TankRole.LIGHT, description: "High mobility fighter.", fovMult: 1.0,
  bodyShape: BodyShape.CIRCLE, hasTreads: false, activeSkill: ACTIVE_SKILLS.DASH,
  statBonus: { moveSpd: 1.3, bodyDmg: 1.2, reload: 0.8 },
  barrels: [
    Barrels.Standard({ width: 12, length: 50, dmg: 0.8 }), // Main gun
    // Buffed Recoil: 2.5 -> 7.0 for real speed
    Barrels.Standard({ width: 12, length: 50, angle: Math.PI - 0.35, offsetX: -4, dmg: 0.4, recoil: 7.0 }), // Thruster L
    Barrels.Standard({ width: 12, length: 50, angle: Math.PI + 0.35, offsetX: -4, dmg: 0.4, recoil: 7.0 })  // Thruster R
  ]
};
