
import { EvoRequirement } from '../types';

export interface EvoNode {
  target: string;
  requirements: EvoRequirement[];
}

// Helper: Level Requirement
const reqLv = (lv: number): EvoRequirement[] => [{ type: 'level', value: lv, description: `Reach Lv ${lv}` }];

export const EVOLUTION_TREE: Record<string, EvoNode[]> = {
  // TIER 0 -> TIER 1 (Lv 15)
  basic: [
    { target: 'twin', requirements: reqLv(15) },         
    { target: 'machine_gun', requirements: reqLv(15) },  
    { target: 'sniper', requirements: reqLv(15) },       
    { target: 'flank_guard', requirements: reqLv(15) },
    { target: 'director', requirements: reqLv(15) }, 
    { target: 'pounder', requirements: reqLv(15) }, 
    { target: 'smasher', requirements: reqLv(30) }, 
  ],
  
  // TIER 1 -> TIER 2 (Lv 30)
  twin: [
    { target: 'triple_shot', requirements: reqLv(30) },
    { target: 'quad_tank', requirements: reqLv(30) },
    { target: 'battleship', requirements: reqLv(30) }, 
  ],
  machine_gun: [
    { target: 'destroyer', requirements: reqLv(30) },
    { target: 'gunner', requirements: reqLv(30) },
    { target: 'sprayer', requirements: reqLv(30) },
  ],
  sniper: [
    { target: 'assassin', requirements: reqLv(30) },
    { target: 'hunter', requirements: reqLv(30) },
    { target: 'trapper', requirements: reqLv(30) },
    { target: 'overseer', requirements: reqLv(30) },
  ],
  flank_guard: [
    { target: 'tri_angle', requirements: reqLv(30) },
    { target: 'quad_tank', requirements: reqLv(30) },
    { target: 'ricochet', requirements: reqLv(30) },
  ],
  pounder: [
    { target: 'destroyer', requirements: reqLv(30) },
    { target: 'annihilator', requirements: reqLv(30) },
    { target: 'hybrid', requirements: reqLv(30) },
  ],
  director: [
    { target: 'overseer', requirements: reqLv(30) },
    { target: 'necromancer', requirements: reqLv(30) },
    { target: 'factory', requirements: reqLv(30) },
  ],
  
  // TIER 2 -> TIER 3 (Lv 45)
  triple_shot: [
      { target: 'triplet', requirements: reqLv(45) }, 
      { target: 'penta_shot', requirements: reqLv(45) },
      { target: 'spread_shot', requirements: reqLv(45) },
      { target: 'scattershot', requirements: reqLv(45) }
  ],
  quad_tank: [
      { target: 'octo_tank', requirements: reqLv(45) }, 
      { target: 'fighter', requirements: reqLv(45) }
  ],
  destroyer: [
      { target: 'annihilator', requirements: reqLv(45) }, 
      { target: 'hybrid', requirements: reqLv(45) },
      { target: 'rocketeer', requirements: reqLv(45) }
  ],
  gunner: [
      { target: 'sprayer', requirements: reqLv(45) }, 
      { target: 'streamliner', requirements: reqLv(45) }, 
      { target: 'fortress', requirements: reqLv(45) }
  ],
  assassin: [
      { target: 'ranger', requirements: reqLv(45) }, 
      { target: 'stalker', requirements: reqLv(45) }
  ],
  hunter: [
      { target: 'predator', requirements: reqLv(45) },
      { target: 'streamliner', requirements: reqLv(45) },
      { target: 'skyfall', requirements: reqLv(45) }
  ],
  tri_angle: [
      { target: 'booster', requirements: reqLv(45) }, 
      { target: 'fighter', requirements: reqLv(45) }
  ],
  ricochet: [
      { target: 'octo_tank', requirements: reqLv(45) },
      { target: 'skimmer', requirements: reqLv(45) }
  ],
  smasher: [
      { target: 'landmine', requirements: reqLv(45) }, 
      { target: 'spike', requirements: reqLv(45) }
  ],
  overseer: [
      { target: 'overlord', requirements: reqLv(45) },
      { target: 'necromancer', requirements: reqLv(45) },
      { target: 'factory', requirements: reqLv(45) },
      { target: 'battleship', requirements: reqLv(45) },
      { target: 'pulse_mage', requirements: reqLv(45) }
  ],
  trapper: [
      { target: 'mega_trapper', requirements: reqLv(45) },
      { target: 'auto_trapper', requirements: reqLv(45) },
      { target: 'nanobot', requirements: reqLv(45) },
      { target: 'fortress', requirements: reqLv(45) }
  ],

  // TIER 3 -> TIER 4 (HERO CLASS - Level 60)
  annihilator: [{ target: 'titanbreaker', requirements: reqLv(60) }],
  hybrid: [{ target: 'iron_dreadnought', requirements: reqLv(60) }],
  rocketeer: [{ target: 'titanbreaker', requirements: reqLv(60) }],
  triplet: [{ target: 'vanguard_mk2', requirements: reqLv(60) }],
  penta_shot: [{ target: 'storm_runner', requirements: reqLv(60) }],
  spread_shot: [{ target: 'storm_runner', requirements: reqLv(60) }],
  fighter: [{ target: 'neon_viper', requirements: reqLv(60) }],
  booster: [{ target: 'hummingbird', requirements: reqLv(60) }],
  ranger: [{ target: 'starhammer', requirements: reqLv(60) }],
  predator: [{ target: 'starhammer', requirements: reqLv(60) }],
  skyfall: [{ target: 'eclipse_mortar', requirements: reqLv(60) }],
  stalker: [{ target: 'ghostline', requirements: reqLv(60) }],
  streamliner: [{ target: 'rail_specter', requirements: reqLv(60) }],
  overlord: [{ target: 'overseer_prime', requirements: reqLv(60) }],
  necromancer: [{ target: 'hive_architect', requirements: reqLv(60) }], 
  factory: [{ target: 'hive_architect', requirements: reqLv(60) }],
  auto_trapper: [{ target: 'cryomancer', requirements: reqLv(60) }],
  sprayer: [{ target: 'pyromancer', requirements: reqLv(60) }],
  mega_trapper: [{ target: 'cryomancer', requirements: reqLv(60) }],
  skimmer: [{ target: 'storm_runner', requirements: reqLv(60) }],
  spike: [{ target: 'iron_dreadnought', requirements: reqLv(60) }],
  landmine: [{ target: 'neon_viper', requirements: reqLv(60) }],
  scattershot: [{ target: 'storm_runner', requirements: reqLv(60) }],
  fortress: [{ target: 'iron_dreadnought', requirements: reqLv(60) }],
  battleship: [{ target: 'hive_architect', requirements: reqLv(60) }],
  pulse_mage: [{ target: 'overseer_prime', requirements: reqLv(60) }],
  nanobot: [{ target: 'cryomancer', requirements: reqLv(60) }],
  
  // TIER 4 -> TIER 5 (GOD CLASS - Level 75)
  titanbreaker: [{ target: 'galaxy_breaker', requirements: reqLv(75) }],
  iron_dreadnought: [{ target: 'galaxy_breaker', requirements: reqLv(75) }],
  neon_viper: [{ target: 'cyber_wyvern', requirements: reqLv(75) }],
  hummingbird: [{ target: 'cyber_wyvern', requirements: reqLv(75) }],
  starhammer: [{ target: 'nova_cannon', requirements: reqLv(75) }],
  eclipse_mortar: [{ target: 'nova_cannon', requirements: reqLv(75) }],
  overseer_prime: [{ target: 'omnipotent', requirements: reqLv(75) }],
  hive_architect: [{ target: 'omnipotent', requirements: reqLv(75) }],
  vanguard_mk2: [{ target: 'galaxy_breaker', requirements: reqLv(75) }],
  storm_runner: [{ target: 'galaxy_breaker', requirements: reqLv(75) }],
  ghostline: [{ target: 'nova_cannon', requirements: reqLv(75) }],
  rail_specter: [
      { target: 'nova_cannon', requirements: reqLv(75) },
      { target: 'crimson_piercer', requirements: reqLv(75) } // New Path
  ],
  cryomancer: [{ target: 'omnipotent', requirements: reqLv(75) }],
  pyromancer: [{ target: 'omnipotent', requirements: reqLv(75) }],
  
  // Crimson Piercer is now Tier 5, so it evolves further to Tier 6
  crimson_piercer: [{ target: 'supernova_artillery', requirements: reqLv(90) }],

  // --- ENDGAME EVOLUTION TREE ---

  // TIER 5 (Lv 75) -> TIER 6 (Lv 90)
  galaxy_breaker: [{ target: 'cosmic_juggernaut', requirements: reqLv(90) }],
  cyber_wyvern: [{ target: 'quantum_striker', requirements: reqLv(90) }],
  nova_cannon: [{ target: 'supernova_artillery', requirements: reqLv(90) }],
  omnipotent: [{ target: 'archon_commander', requirements: reqLv(90) }],

  // TIER 6 (Lv 90) -> TIER 7 (Lv 105)
  cosmic_juggernaut: [{ target: 'aegis_citadel', requirements: reqLv(105) }],
  quantum_striker: [{ target: 'phase_phantom', requirements: reqLv(105) }],
  supernova_artillery: [{ target: 'void_lancer', requirements: reqLv(105) }],
  archon_commander: [{ target: 'genesis_core', requirements: reqLv(105) }],

  // TIER 7 (Lv 105) -> TIER 8 (Lv 120)
  aegis_citadel: [{ target: 'starforged_bastion', requirements: reqLv(120) }],
  phase_phantom: [{ target: 'superluminal_blade', requirements: reqLv(120) }],
  void_lancer: [{ target: 'dimension_ripper', requirements: reqLv(120) }],
  genesis_core: [{ target: 'nexus_overmind', requirements: reqLv(120) }],

  // TIER 8 (Lv 120) -> TIER 9 (Lv 135)
  starforged_bastion: [{ target: 'celestial_colossus', requirements: reqLv(135) }],
  superluminal_blade: [{ target: 'singularity_ghost', requirements: reqLv(135) }],
  dimension_ripper: [{ target: 'world_ender_railgun', requirements: reqLv(135) }],
  nexus_overmind: [{ target: 'celestial_swarmhost', requirements: reqLv(135) }],

  // TIER 9 (Lv 135) -> TIER 10 (Lv 150) - ULTIMATE CLASS
  celestial_colossus: [
    { target: 'titan_fortress', requirements: reqLv(150) },
    { target: 'world_crusher', requirements: reqLv(150) },
    { target: 'bunker_buster', requirements: reqLv(150) },
    { target: 'centurion_prime', requirements: reqLv(150) },
    { target: 'dragoon_x', requirements: reqLv(150) },
  ],
  singularity_ghost: [
    { target: 'warp_strider', requirements: reqLv(150) },
    { target: 'blitz_fang', requirements: reqLv(150) },
    { target: 'void_specter', requirements: reqLv(150) },
    { target: 'tempest_king', requirements: reqLv(150) },
    { target: 'apex_predator', requirements: reqLv(150) },
  ],
  world_ender_railgun: [
    { target: 'cataclysm_mortar', requirements: reqLv(150) },
    { target: 'omega_rail', requirements: reqLv(150) },
    { target: 'singularity', requirements: reqLv(150) },
    { target: 'event_horizon', requirements: reqLv(150) },
    { target: 'thor_hammer', requirements: reqLv(150) },
  ],
  celestial_swarmhost: [
    { target: 'omni_god', requirements: reqLv(150) },
    { target: 'titan_mech', requirements: reqLv(150) },
    { target: 'constructor_mk5', requirements: reqLv(150) },
    { target: 'saint_archon', requirements: reqLv(150) },
    { target: 'inferno_lord', requirements: reqLv(150) },
    { target: 'absolute_zero', requirements: reqLv(150) },
    { target: 'plague_bringer', requirements: reqLv(150) },
    { target: 'chaos_engine', requirements: reqLv(150) },
  ],
};
