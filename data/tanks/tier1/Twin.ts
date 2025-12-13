
import { TankConfig, TankRole, BodyShape } from '../../../types';
import { Barrels } from '../../barrels/presets';

export const Twin: TankConfig = {
  name: "Twin",
  tier: 1,
  role: TankRole.MEDIUM,
  description: "Double the trouble.",
  fovMult: 1.0,
  bodyShape: BodyShape.CIRCLE,
  hasTreads: false,
  statBonus: { reload: 0.9, bulletPen: 0.9 },
  barrels: [
    // Adjusted offsets: 6 pixels apart is tighter and looks more "Dual"
    Barrels.Standard({ width: 14, length: 55, offsetY: -10, dmg: 0.75, recoil: 1.2 }),
    Barrels.Standard({ width: 14, length: 55, offsetY: 10, delay: 0.5, dmg: 0.75, recoil: 1.2 })
  ]
};
