
import { TankConfig, TankRole, BodyShape } from '../../../types';
import { Barrels } from '../../barrels/presets';

export const MachineGun: TankConfig = {
  name: "Machine Gun",
  tier: 1,
  role: TankRole.HEAVY,
  description: "Suppressing fire.",
  fovMult: 1.0,
  bodyShape: BodyShape.CIRCLE,
  hasTreads: false,
  statBonus: { reload: 0.6, bulletDmg: 0.7, maxHp: 1.1 },
  barrels: [
      // Used 'TAPERED' shape to look like a proper Machine Gun funnel
      { 
          ...Barrels.MachineGun({ width: 24, length: 55, spread: 0.4, dmg: 0.7 }),
          shape: 'TAPERED' 
      }
  ]
};
