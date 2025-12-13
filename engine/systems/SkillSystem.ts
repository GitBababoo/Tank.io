
import { PlayerState, TankConfig, Entity } from '../../types';

export class SkillSystem {
  static applyPassive(player: Entity, config: TankConfig, key: string, baseValue: number): number {
    const passive = config.passiveSkill;
    if (!passive) return baseValue;

    if (passive.type === 'SNIPER_SCOPE' && key === 'fov') {
        return baseValue * (passive.value || 1.25);
    }
    if (passive.type === 'REGEN_AURA' && key === 'regen') {
        return baseValue * (passive.value || 2.0);
    }
    if (passive.type === 'SPEED_BOOST_LOW_HP' && key === 'moveSpd') {
        const hpPct = player.health / player.maxHealth;
        if (hpPct < 0.3) return baseValue * (passive.value || 1.5);
    }
    return baseValue;
  }

  static onHit(attacker: Entity, defender: Entity, config: TankConfig) {
      const passive = config.passiveSkill;
      if (!passive) return;

      if (passive.type === 'LIFESTEAL' && attacker.id === 'player') {
         attacker.health = Math.min(attacker.maxHealth, attacker.health + (attacker.damage * (passive.value || 0.1)));
      }
  }

  static onDefend(attacker: Entity, defender: Entity, config: TankConfig) {
      const passive = config.passiveSkill;
      if (!passive) return;

      if (passive.type === 'THORNS' && defender.id === 'player') {
          attacker.health -= defender.damage * (passive.value || 0.3);
      }
  }
}