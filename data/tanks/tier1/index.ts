
import { MachineGun } from './MachineGun';
import { Twin } from './Twin';
import { FlankGuard } from './FlankGuard';
import { Sniper } from './Sniper';

// Only export actual Tier 1 tanks
export const Tier1Tanks = {
  machine_gun: MachineGun,
  twin: Twin,
  flank_guard: FlankGuard,
  sniper: Sniper
};
