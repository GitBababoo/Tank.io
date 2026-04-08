
import { TankConfig } from '../types';

// Import from the structured folders (The Correct Source)
import { Tier0Tanks } from './tanks/tier0/index';
import { Tier1Tanks } from './tanks/tier1/index';
import { Tier2Tanks } from './tanks/tier2/index';
import { Tier3Tanks } from './tanks/tier3';
import { Tier4Tanks } from './tanks/tier4';
import { GodTierTanks } from './tanks/god_tiers';
import { Tier6Tanks } from './tanks/tier6';
import { Tier7Tanks } from './tanks/tier7';
import { Tier8Tanks } from './tanks/tier8';
import { Tier9Tanks } from './tanks/tier9';
import { ExtendedMetaTanks } from './tanks/extended_meta';

// =========================================================================
//  TANK.IO NEXT GEN: MASTER TANK REGISTRY
//  Optimized and Consolidated
// =========================================================================

export const TANK_DEFINITIONS: Record<string, TankConfig> = {
    // Starters
    ...Tier0Tanks,
    
    // Core Progression
    ...Tier1Tanks,
    ...Tier2Tanks,
    ...Tier3Tanks,
    ...Tier4Tanks,
    
    // Prestige Classes
    ...GodTierTanks,
    ...Tier6Tanks,
    ...Tier7Tanks,
    ...Tier8Tanks,
    ...Tier9Tanks,
    
    // Ultimate / Admin
    ...ExtendedMetaTanks
};
