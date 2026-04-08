
import { Entity, EntityType, GameSettings, ShapeType, SoundType } from '../../types';
import { TANK_CLASSES } from '../../data/tanks';
import { MAX_XP_GAIN, COLORS } from '../../constants';
import { SkillSystem } from '../systems/SkillSystem';
import { PlayerManager } from './PlayerManager';
import { NotificationManager } from './NotificationManager';
import { CameraManager } from './CameraManager';
import { AudioManager } from './AudioManager';

export class DeathManager {
  constructor(
    private playerManager: PlayerManager,
    private notificationManager: NotificationManager,
    private cameraManager: CameraManager,
    private audioManager: AudioManager,
    private settings: GameSettings
  ) {}

  updateSettings(settings: GameSettings) {
      this.settings = settings;
  }

  handleDeath(victim: Entity, killer: Entity, entities: Entity[]) {
      const listenerPos = this.playerManager.entity.pos;

      // --- Handle Fanon Polygon Death Effects ---
      if (victim.type === EntityType.SHAPE) {
          if (victim.variant === 'TNT') {
              this.createExplosion(victim, entities);
          } else if (killer.id === 'player') {
              if (victim.variant === 'HEALER' || victim.shapeType === ShapeType.CROSS) {
                  this.playerManager.entity.health = Math.min(this.playerManager.entity.maxHealth, this.playerManager.entity.health + this.playerManager.entity.maxHealth * 0.25);
                  this.pushNotification("Healed by White Cross!", 'success');
              } else if (victim.variant === 'GOLDEN_HEART' || victim.shapeType === ShapeType.HEART) {
                  this.playerManager.entity.health = this.playerManager.entity.maxHealth;
                  this.pushNotification("Fully Restored by Golden Heart!", 'success');
              }
          }
      }

      if (victim.id === 'player') {
          const player = this.playerManager.entity;
          player.isDead = true;
          
          this.audioManager.play(SoundType.DIE, victim.pos, victim.pos);

          const details = this.cameraManager.handleDeath('player', killer, player, entities);
          if (details) {
             this.playerManager.state.deathDetails = { killerName: details.name, killerType: details.type };
          }

          this.playerManager.emitUpdate();
          return;
      }
      
      // Explosion/Death Sound
      if (victim.type === EntityType.BOSS || victim.type === EntityType.PLAYER || victim.type === EntityType.ENEMY || victim.variant === 'TNT') {
          this.audioManager.play(SoundType.EXPLOSION, victim.pos, listenerPos);
      } else {
          this.audioManager.play(SoundType.HIT, victim.pos, listenerPos); // Pop sound for shapes
      }

      const isPlayerKill = killer.id === 'player' || killer.ownerId === 'player';
      if (isPlayerKill) {
          let xp = victim.scoreValue || 10;
          if (xp > MAX_XP_GAIN) xp = MAX_XP_GAIN;

          this.playerManager.gainXp(xp, this.settings.gameplay.xpScale);

          if (victim.type === EntityType.BOSS) {
              this.playerManager.state.statsTracker.bossKills++;
              this.pushNotification(`${(victim as any).bossType || 'Boss'} Defeated!`, 'success');
          } else if (victim.type === EntityType.ENEMY) {
              this.playerManager.state.statsTracker.playerKills++;
              this.pushNotification(`Killed a Tank!`, 'info');
          } else {
              this.playerManager.state.statsTracker.shapesDestroyed++;
          }
          SkillSystem.onHit(this.playerManager.entity, victim, TANK_CLASSES[this.playerManager.state.classPath]);
      }
  }

  private createExplosion(center: Entity, entities: Entity[]) {
      const radius = 250;
      const damage = 60;
      
      entities.forEach(ent => {
          if (ent.isDead || ent.id === center.id) return;
          const dist = Math.hypot(ent.pos.x - center.pos.x, ent.pos.y - center.pos.y);
          if (dist < radius) {
              ent.health -= damage;
              ent.vel.x += (ent.pos.x - center.pos.x) / dist * 50;
              ent.vel.y += (ent.pos.y - center.pos.y) / dist * 50;
              
              if (ent.id === 'player') {
                  this.playerManager.emitUpdate();
              }
          }
      });
      
      const player = this.playerManager.entity;
      const dist = Math.hypot(player.pos.x - center.pos.x, player.pos.y - center.pos.y);
      if (!player.isDead && dist < radius) {
          player.health -= damage;
          player.vel.x += (player.pos.x - center.pos.x) / dist * 50;
          player.vel.y += (player.pos.y - center.pos.y) / dist * 50;
          if (player.health <= 0) {
              player.health = 0;
              this.handleDeath(player, center, entities); 
          }
      }
  }

  private pushNotification(message: string, type: 'info' | 'warning' | 'success' | 'boss' = 'info') {
      this.notificationManager.push(message, type);
      this.playerManager.state.notifications = this.notificationManager.notifications;
      this.playerManager.emitUpdate();
  }
}
