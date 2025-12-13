

import { PlayerState, Entity, StatKey, TankConfig, EntityType, SoundType, TankRole, FactionType, StatusEffectType, ParticleType } from '../../types';
import { BASE_STATS, MAX_STAT_LEVEL, INFINITE_STAT_DIMINISHING_RETURN, SKILL_POINTS_AT_LEVEL, MAX_XP_GAIN, WORLD_SIZE, TEAM_COLORS, COLORS } from '../../constants';
import { TANK_CLASSES } from '../../data/tanks';
import { AudioManager } from './AudioManager';
import { StatManager } from './StatManager';
import { StatusEffectSystem } from '../systems/StatusEffectSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { EntityManager } from './EntityManager';

export class PlayerManager {
  state: PlayerState;
  entity: Entity;
  onUpdateStats: (stats: PlayerState) => void;
  onLevelUp?: (pos: {x: number, y: number}) => void;
  audioManager: AudioManager;
  statManager!: StatManager;
  statusEffectSystem: StatusEffectSystem;
  entityManager?: EntityManager; // Added for Repel logic
  
  activeAbilityTimer: number = 0;
  abilityCooldownTimer: number = 0;

  constructor(
      playerName: string, 
      teamId: string | undefined, 
      onUpdateStats: (stats: PlayerState) => void, 
      audioManager: AudioManager,
      statusEffectSystem: StatusEffectSystem,
      onLevelUp?: (pos: {x: number, y: number}) => void
  ) {
    this.onUpdateStats = onUpdateStats;
    this.audioManager = audioManager;
    this.statusEffectSystem = statusEffectSystem;
    this.onLevelUp = onLevelUp;
    
    this.state = {
      level: 1, xp: 0, xpToNext: this.calcXpNeeded(1), score: 0, availablePoints: 0,
      classPath: 'basic',
      stats: { regen: 0, maxHp: 0, bodyDmg: 0, bulletSpd: 0, bulletPen: 0, bulletDmg: 0, reload: 0, moveSpd: 0, critChance: 0, critDamage: 0 },
      maxLevel: 1, abilityCooldown: 0,
      statsTracker: { damageDealt: 0, shapesDestroyed: 0, timeAlive: 0, bossKills: 0, playerKills: 0 },
      notifications: [],
      leaderboard: [],
      faction: FactionType.NONE,
      nextBossTimer: 0,
      health: BASE_STATS.maxHp,
      maxHealth: BASE_STATS.maxHp
    };

    this.entity = {
      id: 'player', name: playerName, type: EntityType.PLAYER, pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
      radius: 20, rotation: 0, color: teamId ? TEAM_COLORS[teamId as keyof typeof TEAM_COLORS] : COLORS.player,
      health: BASE_STATS.maxHp, maxHealth: BASE_STATS.maxHp, damage: BASE_STATS.bodyDmg, isDead: false, teamId: teamId,
      lastDamageTime: 0, isInvulnerable: true, creationTime: Date.now(),
      opacity: 1.0, invisibleTimer: 0, isInvisible: false, barrelCooldowns: [],
      lastCritTime: 0, critCooldownStacks: 0, statusEffects: [],
      // CRITICAL FIX: Initialize classPath on the entity so Renderer knows what to draw immediately
      classPath: 'basic'
    };
  }

  setStatManager(manager: StatManager) {
      this.statManager = manager;
  }

  setEntityManager(manager: EntityManager) {
      this.entityManager = manager;
  }
  
  setFaction(faction: FactionType) {
      this.state.faction = faction;
      if (faction !== FactionType.NONE) {
          this.entity.color = COLORS[faction];
      }
      this.emitUpdate();
  }

  update(dt: number) {
    if (this.entity.isDead) return;

    this.state.statsTracker.timeAlive += dt;
    this.entity.scoreValue = this.state.score;

    if (this.activeAbilityTimer > 0) this.activeAbilityTimer -= dt;
    if (this.abilityCooldownTimer > 0) {
        this.abilityCooldownTimer -= dt;
        if (Math.ceil(this.abilityCooldownTimer) !== Math.ceil(this.abilityCooldownTimer + dt)) {
             this.emitUpdate();
        }
    }

    if (this.entity.lastCritTime && Date.now() - this.entity.lastCritTime > 3000) {
        if (this.entity.critCooldownStacks && this.entity.critCooldownStacks > 0) {
            this.entity.critCooldownStacks = 0;
        }
    }

    this.updateRegen(dt);
    this.updateInvisibility(dt);
    
    // Sync Health for UI if changed significantly
    if (Math.abs(this.state.health - this.entity.health) > 1 || this.state.maxHealth !== this.entity.maxHealth) {
        this.emitUpdate();
    }
  }

  reset(spawnPos: {x: number, y: number}) {
      let newLevel = this.state.level;
      if (newLevel < 12) newLevel = Math.max(1, newLevel - 1);
      else newLevel = Math.floor(newLevel / 2);

      this.state.level = newLevel; 
      this.state.xp = 0;
      this.state.xpToNext = this.calcXpNeeded(newLevel);
      
      let totalPoints = 0;
      for (let i = 1; i < newLevel; i++) {
          if (SKILL_POINTS_AT_LEVEL[i]) totalPoints++;
      }
      
      this.state.availablePoints = totalPoints;
      const stats: Record<StatKey, number> = { regen: 0, maxHp: 0, bodyDmg: 0, bulletSpd: 0, bulletPen: 0, bulletDmg: 0, reload: 0, moveSpd: 0, critChance: 0, critDamage: 0 };
      this.state.stats = stats;

      this.state.score = Math.floor(this.state.score / 2);
      this.state.classPath = 'basic'; 
      this.state.deathDetails = undefined;
      
      this.entity.isDead = false; 
      this.entity.maxHealth = this.getStatValue('maxHp');
      this.entity.health = this.entity.maxHealth;
      this.entity.pos = { ...spawnPos }; 
      this.entity.vel = { x: 0, y: 0 };
      this.entity.lastDamageTime = 0;
      this.entity.isInvulnerable = true;
      this.entity.creationTime = Date.now();
      this.entity.opacity = 1.0;
      this.entity.invisibleTimer = 0;
      this.entity.isInvisible = false;
      this.entity.barrelCooldowns = [];
      this.entity.lastCritTime = 0;
      this.entity.critCooldownStacks = 0;
      this.entity.statusEffects = [];
      
      // CRITICAL FIX: Reset entity classPath to match state
      this.entity.classPath = 'basic';
      
      this.activeAbilityTimer = 0;
      this.abilityCooldownTimer = 0;

      if (this.state.faction !== FactionType.NONE) {
          this.entity.color = COLORS[this.state.faction];
      }

      this.state.notifications = [{
          id: Math.random().toString(),
          message: "Spawn Protection Active! Move to safety.",
          type: 'success',
          timestamp: Date.now()
      }];

      this.emitUpdate();
  }

  calcXpNeeded(level: number): number { 
      if (level <= 15) return Math.floor(10 * Math.pow(level, 1.05));
      if (level <= 30) return Math.floor(20 * Math.pow(level, 1.1));
      return Math.floor(30 * Math.pow(level, 1.2) + level * 50);
  }

  gainXp(amount: number, xpScale: number) {
    const adjustedXp = amount * xpScale;
    this.state.xp += adjustedXp; 
    this.state.score += adjustedXp;
    
    let leveledUp = false;
    while (this.state.xp >= this.state.xpToNext) {
      if (true) { // Infinite levels allowed
        this.state.level++;
        this.state.maxLevel = Math.max(this.state.level, this.state.maxLevel);
        this.state.xp -= this.state.xpToNext;
        this.state.xpToNext = this.calcXpNeeded(this.state.level);
        
        if (SKILL_POINTS_AT_LEVEL[this.state.level] || this.state.level > 45) {
             this.state.availablePoints++;
        }

        const baseRadius = 20;
        this.entity.radius = baseRadius * Math.pow(1.01, this.state.level - 1);
        
        const oldMax = this.entity.maxHealth;
        const newMax = this.getStatValue('maxHp');
        this.entity.maxHealth = newMax;
        this.entity.health += (newMax - oldMax);
        leveledUp = true;
        
        this.audioManager.play(SoundType.LEVEL_UP, this.entity.pos, this.entity.pos);
        if (this.onLevelUp) this.onLevelUp(this.entity.pos);

      } else {
          this.state.xp = this.state.xpToNext; 
          break;
      }
    }
    this.emitUpdate();
  }

  // NEW: Directly Set Level (Sandbox Tool)
  setLevel(targetLevel: number) {
      if (targetLevel < 1) targetLevel = 1;
      
      this.state.level = targetLevel;
      this.state.maxLevel = Math.max(this.state.level, this.state.maxLevel);
      this.state.xp = 0;
      this.state.xpToNext = this.calcXpNeeded(this.state.level);
      
      // Calculate total points expected at this level
      let totalPointsShouldBe = 0;
      for (let i = 1; i < targetLevel; i++) {
          if (SKILL_POINTS_AT_LEVEL[i] || i > 45) totalPointsShouldBe++;
      }
      
      // Calculate currently spent points
      const spentPoints = Object.values(this.state.stats).reduce((a, b) => a + b, 0);
      
      if (spentPoints > totalPointsShouldBe) {
          // If we have too many points (levelled down), reset stats
          const stats: Record<StatKey, number> = { regen: 0, maxHp: 0, bodyDmg: 0, bulletSpd: 0, bulletPen: 0, bulletDmg: 0, reload: 0, moveSpd: 0, critChance: 0, critDamage: 0 };
          this.state.stats = stats;
          this.state.availablePoints = totalPointsShouldBe;
      } else {
          this.state.availablePoints = totalPointsShouldBe - spentPoints;
      }

      // Update Entity Properties
      const baseRadius = 20;
      this.entity.radius = baseRadius * Math.pow(1.01, this.state.level - 1);
      
      // Update HP
      const newMax = this.getStatValue('maxHp');
      this.entity.maxHealth = newMax;
      this.entity.health = newMax; // Full heal on level set

      this.audioManager.play(SoundType.LEVEL_UP, this.entity.pos, this.entity.pos);
      if (this.onLevelUp) this.onLevelUp(this.entity.pos);
      this.emitUpdate();
  }

  upgradeStat(key: StatKey) {
    if (this.state.availablePoints > 0) {
      this.state.stats[key]++; 
      this.state.availablePoints--;
      
      if (key === 'maxHp') {
          const oldMax = this.entity.maxHealth;
          const newMax = this.getStatValue('maxHp');
          this.entity.maxHealth = newMax;
          this.entity.health += (newMax - oldMax);
      } else { 
          this.entity.maxHealth = this.getStatValue('maxHp'); 
      }
      this.audioManager.play(SoundType.CLICK, this.entity.pos, this.entity.pos);
      this.emitUpdate();
    }
  }

  evolve(className: string) {
    this.state.classPath = className;
    // CRITICAL FIX: Sync the entity's classPath with the state
    // The RenderSystem reads entity.classPath, not state.classPath
    this.entity.classPath = className;
    
    this.entity.invisibleTimer = 0;
    this.entity.opacity = 1.0;
    this.entity.isInvisible = false;
    this.entity.barrelCooldowns = [];
    this.audioManager.play(SoundType.EVOLVE, this.entity.pos, this.entity.pos);
    this.emitUpdate();
  }

  activateAbility(): boolean {
      if (this.abilityCooldownTimer > 0) return false;
      const config = TANK_CLASSES[this.state.classPath];
      const skill = config.activeSkill;
      if (!skill) return false;
      
      // Handle Ability Types
      if (skill.type === 'DASH') {
          // DASH: Apply both status effect AND physics impulse
          // Physics impulse provides the "Snap", Haste provides the "Sustain"
          this.statusEffectSystem.apply(this.entity, {
              type: StatusEffectType.HASTE,
              duration: 0.3, 
              speedMultiplier: 3.5, 
              sourceId: this.entity.id
          });
          
          // Instant Velocity boost in facing direction
          const boostForce = 800; // Increased force
          // If moving, boost in movement direction, else rotation
          const speed = Math.hypot(this.entity.vel.x, this.entity.vel.y);
          if (speed > 10) {
              const dirX = this.entity.vel.x / speed;
              const dirY = this.entity.vel.y / speed;
              this.entity.vel.x += dirX * boostForce;
              this.entity.vel.y += dirY * boostForce;
          } else {
              this.entity.vel.x += Math.cos(this.entity.rotation) * boostForce;
              this.entity.vel.y += Math.sin(this.entity.rotation) * boostForce;
          }
      } 
      else if (skill.type === 'TELEPORT') {
          // Teleport Visuals
          if (this.entityManager) {
              ParticleSystem.spawnTeleportFlash(this.entityManager.entities, this.entity.pos);
          }

          const angle = this.entity.rotation;
          const distance = 400; // Increased distance
          this.entity.pos.x += Math.cos(angle) * distance; 
          this.entity.pos.y += Math.sin(angle) * distance;
          
          // Safety Clamping for World Bounds
          this.entity.pos.x = Math.max(50, Math.min(WORLD_SIZE - 50, this.entity.pos.x));
          this.entity.pos.y = Math.max(50, Math.min(WORLD_SIZE - 50, this.entity.pos.y));
          
          this.entity.vel = { x: 0, y: 0 };
          
          if (this.entityManager) {
              ParticleSystem.spawnTeleportFlash(this.entityManager.entities, this.entity.pos);
          }
      } 
      else if (skill.type === 'REPEL') {
          // REPEL: Push nearby enemies away
          if (this.entityManager) {
              const radius = 600;
              const force = 3000;
              const targets = this.entityManager.entities;
              
              // Visual Shockwave
              ParticleSystem.spawnShockwave(targets, this.entity.pos, radius, '#00ffff');

              targets.forEach(ent => {
                  if (ent.id === this.entity.id || ent.isDead || ent.teamId === this.entity.teamId) return;
                  const dx = ent.pos.x - this.entity.pos.x;
                  const dy = ent.pos.y - this.entity.pos.y;
                  const dist = Math.hypot(dx, dy);
                  
                  if (dist < radius && dist > 0) {
                      const pushX = dx / dist;
                      const pushY = dy / dist;
                      const strength = (1 - dist / radius) * force;
                      
                      ent.vel.x += pushX * strength;
                      ent.vel.y += pushY * strength;
                  }
              });
          }
      }
      
      // Handle duration-based effects via StatusEffectSystem
      if (skill.type === 'FORTIFY') {
          this.statusEffectSystem.apply(this.entity, {
              type: StatusEffectType.FORTIFY,
              duration: skill.duration || 5,
              value: skill.value, // e.g., 0.6 for 60% damage reduction
              sourceId: this.entity.id,
          });
      } else if (skill.type === 'OVERCLOCK') {
          this.statusEffectSystem.apply(this.entity, {
              type: StatusEffectType.OVERCLOCK,
              duration: skill.duration || 4,
              sourceId: this.entity.id,
          });
      }

      // Set cooldowns and UI timer
      this.activeAbilityTimer = skill.duration || 1; // For UI rendering
      this.abilityCooldownTimer = skill.cooldown || 10;
      
      this.emitUpdate();
      return true;
  }

  getStatValue(key: StatKey): number {
    return this.statManager.getStat(this.entity, key, this.state);
  }

  // UPDATED: Sync boss timer from external source
  public setNextBossTimer(seconds: number) {
      // Only update and emit if it changes the integer second to avoid spam
      if (Math.floor(this.state.nextBossTimer || 0) !== Math.floor(seconds)) {
          this.state.nextBossTimer = seconds;
          this.emitUpdate();
      }
  }

  private updateRegen(dt: number) {
      const maxHp = this.getStatValue('maxHp');
      if (this.entity.health < maxHp) {
          const timeSinceDamage = Date.now() - (this.entity.lastDamageTime || 0);
          let regenRate = this.getStatValue('regen');
          if (timeSinceDamage > 30000) regenRate *= 10;
          this.entity.health += regenRate * (dt * 60);
          if (this.entity.health > maxHp) this.entity.health = maxHp;
      }
  }

  private updateInvisibility(dt: number) {
      const config = TANK_CLASSES[this.state.classPath];
      const invisConfig = config.invisibility;

      if (!invisConfig) {
          this.entity.opacity = 1.0;
          this.entity.isInvisible = false;
          return;
      }
      
      const speed = Math.hypot(this.entity.vel.x, this.entity.vel.y);
      const isMoving = speed > 0.5;
      const timeSinceDamage = Date.now() - (this.entity.lastDamageTime || 0);
      let isRevealingAction = isMoving || timeSinceDamage < 500;

      if (isRevealingAction) {
          this.entity.invisibleTimer = 0;
          this.entity.opacity = Math.min(1.0, (this.entity.opacity || 1.0) + dt * 5); 
      } else {
          this.entity.invisibleTimer = (this.entity.invisibleTimer || 0) + dt;
          if (this.entity.invisibleTimer > invisConfig.revealDelay) {
              this.entity.opacity = Math.max(0.01, (this.entity.opacity || 1.0) - dt * invisConfig.fadeSpeed);
          }
      }
      this.entity.isInvisible = (this.entity.opacity || 1.0) < 0.2;
  }

  reveal() {
      this.entity.invisibleTimer = 0;
      this.entity.opacity = Math.min(1.0, (this.entity.opacity || 1.0) + 0.5);
  }

  public emitUpdate() {
      // Sync basic health props to state for HUD
      this.state.health = this.entity.health;
      this.state.maxHealth = this.entity.maxHealth;
      this.onUpdateStats({ ...this.state, abilityCooldown: this.abilityCooldownTimer });
  }
}
