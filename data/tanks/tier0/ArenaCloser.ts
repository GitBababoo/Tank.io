
import { TankRole } from '../../../types';
import { Barrels } from '../../barrels/presets';
import { defineTank } from '../../TankBuilder';

export const ArenaCloser = defineTank("Arena Closer", 0, TankRole.HEAVY, [
    Barrels.Standard({ width: 16, length: 50 })
], {
    description: "The end of the world.",
    bodyColorOverride: '#ffe869',
    turretColor: '#333333',
    statBonus: { reload: 5.0, bulletDmg: 1000, bulletSpd: 2.5, moveSpd: 2.2, maxHp: 50000, bodyDmg: 5000 }
});
