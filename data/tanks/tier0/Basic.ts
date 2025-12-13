
import { TankRole } from '../../../types';
import { Barrels } from '../../barrels/presets';
import { defineTank } from '../../TankBuilder';

export const Basic = defineTank("Basic", 0, TankRole.MEDIUM, [
    Barrels.Standard({ width: 12, length: 50 })
], {
    description: "The starter tank. Balanced and reliable."
});
