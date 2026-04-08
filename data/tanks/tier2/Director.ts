
import { TankConfig, TankRole, BodyShape } from '../../../types';
import { ACTIVE_SKILLS } from '../../skills';
import { Barrels } from '../../barrels/presets';

export const Director: TankConfig = {
  name: "Director",
  tier: 2,
  role: TankRole.HYBRID,
  description: "Advanced drone control.",
  fovMult: 1.1,
  bodyShape: BodyShape.CIRCLE,
  hasTreads: false,
  activeSkill: ACTIVE_SKILLS.REPEL,
  barrels: [
      Barrels.DroneSpawner({ width: 16, length: 50 })
  ]
};
