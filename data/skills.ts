
import { SkillConfig } from '../types';

export const ACTIVE_SKILLS: Record<string, SkillConfig> = {
  DASH: { type: 'DASH', name: 'Dash', cooldown: 5, duration: 0.2, description: 'Quick burst of speed' },
  OVERCLOCK: { type: 'OVERCLOCK', name: 'Overclock', cooldown: 12, duration: 4, description: 'Doubles fire rate temporarily' },
  FORTIFY: { type: 'FORTIFY', name: 'Fortify', cooldown: 15, duration: 5, description: 'Reduces incoming damage by 60%', value: 0.6 },
  REPEL: { type: 'REPEL', name: 'Repel', cooldown: 6, duration: 1, description: 'Pushes nearby enemies away' },
  TELEPORT: { type: 'TELEPORT', name: 'Warp', cooldown: 10, duration: 0.1, description: 'Instant short-range teleport' },
  INVISIBILITY: { type: 'INVISIBILITY', name: 'Stealth', cooldown: 20, duration: 8, description: 'Become invisible until shooting' },
};

export const PASSIVE_SKILLS: Record<string, SkillConfig> = {
  THORNS: { type: 'THORNS', name: 'Spiked Armor', description: 'Reflects 30% of body damage taken', value: 0.3 },
  LIFESTEAL: { type: 'LIFESTEAL', name: 'Vampirism', description: 'Heal for 10% of damage dealt', value: 0.1 },
  SNIPER_SCOPE: { type: 'SNIPER_SCOPE', name: 'Eagle Eye', description: 'Increases FOV by 25%', value: 1.25 },
  SPEED_BOOST_LOW_HP: { type: 'SPEED_BOOST_LOW_HP', name: 'Adrenaline', description: 'Move faster when HP < 30%', value: 1.5 },
  REGEN_AURA: { type: 'REGEN_AURA', name: 'Nanobots', description: 'Doubles natural regeneration', value: 2.0 },
};