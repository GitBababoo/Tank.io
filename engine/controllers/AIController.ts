
import { Entity, EntityType, Vector2, AIPersonality, StatKey, Barrel, BossType, StatusEffectType } from '../../types';
import { WORLD_SIZE, ACCELERATION, GAME_RULES } from '../../constants';
import { AISystem } from '../systems/AISystem';
import { WeaponSystem } from '../systems/WeaponSystem';
import { TANK_CLASSES } from '../../data/tanks';
import { AudioManager } from '../managers/AudioManager';
import { StatManager } from '../managers/StatManager';
import { CameraManager } from '../managers/CameraManager';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { StatusEffectSystem } from '../systems/StatusEffectSystem'; // NEW IMPORT
import { BOSS_DATA } from '../../data/bosses';
import { Barrels } from '../../data/barrels/presets';

// --- AI Tuning Constants ---
const AI_VIEW_RANGE = GAME_RULES.AI_VIEW_DISTANCE || 1200; 
const WALL_AVOID_DISTANCE = 300; // Increased for safer turns
const BULLET_DODGE_DISTANCE = 300;

const SENTINEL_CONFIG = {
    name: "The Sentinel",
    tier: 10,
    role: "SIEGE" as any,
    description: "Smart AI Boss",
    fovMult: 1.0,
    barrels: [
        Barrels.Standard({ width: 30, length: 60, dmg: 3.0, recoil: 5 }), 
        Barrels.Sniper({ width: 12, length: 80, dmg: 2.5, recoil: 10, delay: 0.5 }), 
        Barrels.Gatling({ width: 10, length: 40, angle: Math.PI/2, dmg: 0.5 }), 
        Barrels.Gatling({ width: 10, length: 40, angle: -Math.PI/2, dmg: 0.5 }),
        Barrels.TrapLayer({ width: 20, length: 40, angle: Math.PI }) 
    ]
};

interface AIInternalState {
    stuckTimer: number;
    lastPos: Vector2;
    changeDirTimer: number;
    wanderTarget: Vector2 | null;
    evoTimer: number;
    targetRotation: number; 
    stateTimer: number; 
    orbitDir: number;
    skillCooldown: number; // NEW: Track ability usage
    activeSkillTimer: number; // NEW: Track active duration
}

export class AIController {
  
  private botStates: Map<string, AIInternalState> = new Map();

  constructor(
    private audioManager?: AudioManager,
    private statManager?: StatManager,
    private statusEffectSystem?: StatusEffectSystem // NEW: Need this to apply skills
  ) {}

  update(dt: number, entities: Entity[], player: Entity, cameraManager: CameraManager, onDeath: (v: Entity, k: Entity) => void) {
    AISystem.updateBosses(entities, player, dt);
    this.updateAggressiveEntities(entities, player, dt);
    this.updateAiTanks(dt, entities, player, onDeath, cameraManager);
  }

  private lerpAngle(start: number, end: number, amount: number): number {
    let difference = end - start;
    while (difference < -Math.PI) difference += Math.PI * 2;
    while (difference > Math.PI) difference -= Math.PI * 2;
    return start + difference * amount;
  }

  // --- SMART MOVEMENT & LOGIC ENGINE ---
  private updateAiTanks(dt: number, entities: Entity[], player: Entity, onDeath: (v: Entity, k: Entity) => void, cameraManager: CameraManager) {
    if (!this.statManager) return;

    const onHitscan = (start: Vector2, angle: number, owner: Entity, barrel: Barrel) =>
        PhysicsSystem.processHitscan(start, angle, owner, barrel, entities, player, onDeath, cameraManager, this.statManager!, this.statusEffectSystem!, this.audioManager);
    
    const intelligentEntities = entities.filter(e => 
        (e.type === EntityType.ENEMY && e.classPath) || 
        (e.type === EntityType.BOSS && e.bossType === BossType.SENTINEL) ||
        (e.type === EntityType.PLAYER && e.id !== 'player') // NEW: Add remote players to AI control
    );

    const walls = entities.filter(e => e.type === EntityType.WALL);
    const bullets = entities.filter(e => e.type === EntityType.BULLET);

    // Reset chaser counts locally for this frame if needed, but we do it dynamically
    // A more performant way is to map chasers per target once per frame, but O(N^2) is acceptable for < 50 bots.

    for (const bot of intelligentEntities) {
        if (!this.botStates.has(bot.id)) {
            this.botStates.set(bot.id, { 
                stuckTimer: 0, 
                lastPos: { ...bot.pos }, 
                changeDirTimer: 0,
                wanderTarget: this.getRandomMapPoint(),
                evoTimer: Math.random() * 5,
                targetRotation: bot.rotation,
                stateTimer: 0,
                orbitDir: Math.random() < 0.5 ? 1 : -1,
                skillCooldown: 0,
                activeSkillTimer: 0
            });
        }
        const mem = this.botStates.get(bot.id)!;

        // --- Cooldown Management ---
        if (mem.skillCooldown > 0) mem.skillCooldown -= dt;
        if (mem.activeSkillTimer > 0) mem.activeSkillTimer -= dt;

        // --- Evolution Check ---
        mem.evoTimer -= dt;
        if (mem.evoTimer <= 0) {
            mem.evoTimer = 5;
            this.processBotEvolution(bot);
        }

        // --- Decision Making (Weighted Targeting) ---
        mem.stateTimer -= dt;
        
        // FIND BEST TARGET (With Anti-Mobbing and LOS)
        const attackTarget = this.findBestAttackTarget(bot, player, entities, walls);
        
        // Update who I am chasing
        bot.aiTargetId = attackTarget ? attackTarget.id : undefined;

        const farmTarget = this.findBestFarmTarget(bot, entities);
        const isLowHp = (bot.health / bot.maxHealth) < 0.3;

        // State Transition Logic (Centralized)
        if (mem.stateTimer <= 0 || (isLowHp && bot.aiState !== 'FLEE')) {
             const { newState } = this.determineAIState(bot, attackTarget, farmTarget, walls);
             if (newState !== bot.aiState) {
                 bot.aiState = newState;
                 // Add hysteresis to prevent rapid state flipping
                 mem.stateTimer = 0.5 + Math.random() * 0.5;
             }
        }

        let primaryTarget = null;
        if (bot.aiState === 'FLEE') primaryTarget = attackTarget;
        else if (bot.aiState === 'ATTACK' || bot.aiState === 'CHASE') primaryTarget = attackTarget;
        else if (bot.aiState === 'FARM') primaryTarget = farmTarget;

        // --- SKILL USAGE LOGIC ---
        this.handleBotSkills(bot, mem, primaryTarget, isLowHp);

        // --- Movement Calculation ---
        const moveInput = { x: 0, y: 0 };

        if (bot.aiState === 'WANDER') {
            mem.changeDirTimer -= dt;
            const distToWander = Math.hypot(mem.wanderTarget!.x - bot.pos.x, mem.wanderTarget!.y - bot.pos.y);
            if (distToWander < 100 || mem.changeDirTimer <= 0) {
                mem.wanderTarget = this.getRandomMapPoint();
                mem.changeDirTimer = 5 + Math.random() * 5;
            }
            this.addSeek(moveInput, bot.pos, mem.wanderTarget!, 0.5); 
        } 
        else if (primaryTarget) {
            const dist = Math.hypot(primaryTarget.pos.x - bot.pos.x, primaryTarget.pos.y - bot.pos.y);
            
            if (bot.aiState === 'FLEE') {
                this.addFlee(moveInput, bot.pos, primaryTarget.pos, 1.0);
            } else if (bot.aiState === 'FARM') {
                this.addSeek(moveInput, bot.pos, primaryTarget.pos, 1.0);
            } else {
                // ATTACK / CHASE LOGIC
                let desiredDist = 300; 
                if (primaryTarget.type === EntityType.BOSS) desiredDist = primaryTarget.radius + 450; 
                else {
                    if (bot.aiPersonality === AIPersonality.SNIPER) desiredDist = 650;
                    if (bot.aiPersonality === AIPersonality.RUSHER) desiredDist = 0;
                    if (bot.aiPersonality === AIPersonality.FLANKER) desiredDist = 400;
                }

                if (bot.aiState === 'CHASE') {
                    // Just get closer
                    this.addSeek(moveInput, bot.pos, primaryTarget.pos, 1.0);
                } else if (bot.aiState === 'ATTACK') {
                    // UPDATE: Periodic Strafing Logic
                    // Reuse changeDirTimer for strafe intervals during attack
                    mem.changeDirTimer -= dt;
                    if (mem.changeDirTimer <= 0) {
                        mem.orbitDir *= -1; // Flip strafe direction
                        mem.changeDirTimer = 1.0 + Math.random() * 2.0; // Change every 1-3 seconds
                    }

                    // Maintain optimal distance and orbit
                    if (dist > desiredDist + 100) {
                        this.addSeek(moveInput, bot.pos, primaryTarget.pos, 1.0);
                    } else if (dist < desiredDist - 50) {
                        this.addFlee(moveInput, bot.pos, primaryTarget.pos, 0.9);
                    } else {
                        // Orbit/Strafe
                        const angleTo = Math.atan2(primaryTarget.pos.y - bot.pos.y, primaryTarget.pos.x - bot.pos.x);
                        const strafeAngle = angleTo + (Math.PI / 2 * mem.orbitDir); 
                        moveInput.x += Math.cos(strafeAngle);
                        moveInput.y += Math.sin(strafeAngle);
                    }
                }
            }
        }

        // --- IMPROVED STEERING BEHAVIORS ---
        this.applyWallAvoidance(moveInput, bot, walls);
        this.applyBorderAvoidance(moveInput, bot.pos);
        if (bot.aiPersonality !== AIPersonality.RUSHER) {
            this.applyBulletDodging(moveInput, bot, bullets);
        }
        this.applySeparation(moveInput, bot, intelligentEntities);

        // --- Apply Physics ---
        const inputLen = Math.hypot(moveInput.x, moveInput.y);
        if (inputLen > 1) { moveInput.x /= inputLen; moveInput.y /= inputLen; }

        const moveSpeedStat = this.statManager.getStat(bot, 'moveSpd');
        const maxSpeed = moveSpeedStat * 60; 
        const mass = this.statManager.getEntityMass(bot);
        bot.mass = mass;

        const accel = (ACCELERATION * 400) / mass;
        const currentSpeed = Math.hypot(bot.vel.x, bot.vel.y);
        let accelFactor = 1.0;
        if (currentSpeed > maxSpeed) accelFactor = 0.1;

        if (inputLen > 0.1) {
            bot.vel.x += moveInput.x * accel * accelFactor * dt;
            bot.vel.y += moveInput.y * accel * accelFactor * dt;
        }

        // --- Anti-Stuck ---
        const actualSpeed = Math.hypot(bot.vel.x, bot.vel.y);
        if (inputLen > 0.1 && actualSpeed < 10) mem.stuckTimer += dt;
        else mem.stuckTimer = Math.max(0, mem.stuckTimer - dt);

        if (mem.stuckTimer > 1.5) {
            const randAngle = Math.random() * Math.PI * 2;
            const pushSpeed = maxSpeed * 2; 
            bot.vel.x += Math.cos(randAngle) * pushSpeed; 
            bot.vel.y += Math.sin(randAngle) * pushSpeed;
            mem.stuckTimer = 0;
            mem.wanderTarget = this.getRandomMapPoint(); 
        }

        this.handleCombat(bot, mem, primaryTarget, dt, entities, onHitscan);
    }
  }

  // --- NEW: INTELLIGENT SKILL USAGE ---
  private handleBotSkills(bot: Entity, mem: AIInternalState, target: Entity | null, isLowHp: boolean) {
      if (!this.statusEffectSystem || !bot.classPath) return;
      
      const config = TANK_CLASSES[bot.classPath];
      if (!config || !config.activeSkill || mem.skillCooldown > 0) return;

      const skill = config.activeSkill;
      let shouldActivate = false;
      const dist = target ? Math.hypot(target.pos.x - bot.pos.x, target.pos.y - bot.pos.y) : 9999;

      // Logic based on Skill Type
      switch (skill.type) {
          case 'DASH':
              if (bot.aiState === 'FLEE' && isLowHp) shouldActivate = true;
              if (bot.aiState === 'CHASE' && dist > 400 && target) shouldActivate = true;
              if (bot.aiPersonality === AIPersonality.RUSHER && target && dist > 200) shouldActivate = true;
              break;
          case 'FORTIFY':
              if (isLowHp || (bot.health < bot.maxHealth * 0.8 && target && dist < 500)) shouldActivate = true;
              break;
          case 'REPEL':
              if (target && dist < 250) shouldActivate = true;
              break;
          case 'OVERCLOCK':
              if (target && dist < 600 && bot.aiState === 'ATTACK') shouldActivate = true;
              break;
          case 'TELEPORT':
              if (isLowHp) shouldActivate = true; // Escape
              if (bot.aiPersonality === AIPersonality.RUSHER && target && dist > 300 && dist < 600) shouldActivate = true; // Engage
              break;
          case 'INVISIBILITY':
              if (bot.aiState === 'WANDER' || bot.aiState === 'CHASE') shouldActivate = true;
              break;
      }

      if (shouldActivate) {
          mem.skillCooldown = skill.cooldown || 10;
          mem.activeSkillTimer = skill.duration || 1;

          if (skill.type === 'DASH') {
              this.statusEffectSystem.apply(bot, { type: StatusEffectType.HASTE, duration: 0.3, speedMultiplier: 3.5, sourceId: bot.id });
          } else if (skill.type === 'TELEPORT') {
              const angle = bot.rotation;
              bot.pos.x += Math.cos(angle) * 300; 
              bot.pos.y += Math.sin(angle) * 300;
              bot.pos.x = Math.max(50, Math.min(WORLD_SIZE - 50, bot.pos.x));
              bot.pos.y = Math.max(50, Math.min(WORLD_SIZE - 50, bot.pos.y));
          } else if (skill.type === 'FORTIFY') {
              this.statusEffectSystem.apply(bot, { type: StatusEffectType.FORTIFY, duration: skill.duration || 5, value: skill.value, sourceId: bot.id });
          } else if (skill.type === 'OVERCLOCK') {
              this.statusEffectSystem.apply(bot, { type: StatusEffectType.OVERCLOCK, duration: skill.duration || 4, sourceId: bot.id });
          }
      }
  }

  // --- HELPER METHODS ---

  private processBotEvolution(bot: Entity) {
      if (!bot.evolutionPath || !bot.targetClassPath) return;
      if (!bot.classPath) return;
      const currentTierIndex = bot.evolutionPath.indexOf(bot.classPath);
      if (currentTierIndex === -1 || currentTierIndex >= bot.evolutionPath.length - 1) return;
      const nextClass = bot.evolutionPath[currentTierIndex + 1];
      const botLevel = (bot as any).level || 1;
      const T1_REQ = 15; const T2_REQ = 30; const T3_REQ = 45; const T4_REQ = 60; const T5_REQ = 75;
      let canEvolve = false;
      if (currentTierIndex === 0 && botLevel >= T1_REQ) canEvolve = true;
      else if (currentTierIndex === 1 && botLevel >= T2_REQ) canEvolve = true;
      else if (currentTierIndex === 2 && botLevel >= T3_REQ) canEvolve = true;
      else if (currentTierIndex === 3 && botLevel >= T4_REQ) canEvolve = true;
      else if (currentTierIndex === 4 && botLevel >= T5_REQ) canEvolve = true;
      if (canEvolve) {
          bot.classPath = nextClass;
          bot.radius *= 1.1;
      }
  }

  private addSeek(input: Vector2, current: Vector2, target: Vector2, weight: number) {
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) { input.x += (dx / dist) * weight; input.y += (dy / dist) * weight; }
  }
  private addFlee(input: Vector2, current: Vector2, target: Vector2, weight: number) {
      const dx = current.x - target.x;
      const dy = current.y - target.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) { input.x += (dx / dist) * weight; input.y += (dy / dist) * weight; }
  }

  // --- IMPROVED WALL AVOIDANCE (Predictive Feeler) ---
  private applyWallAvoidance(input: Vector2, bot: Entity, walls: Entity[]) {
      const feelerLen = WALL_AVOID_DISTANCE;
      
      // Calculate future position
      const futureX = bot.pos.x + bot.vel.x * 0.5;
      const futureY = bot.pos.y + bot.vel.y * 0.5;

      for (const wall of walls) {
          if (!wall.width || !wall.height) continue;
          
          const halfW = wall.width / 2;
          const halfH = wall.height / 2;
          
          // Clamp point on wall AABB closest to future position
          const clampX = Math.max(wall.pos.x - halfW, Math.min(futureX, wall.pos.x + halfW));
          const clampY = Math.max(wall.pos.y - halfH, Math.min(futureY, wall.pos.y + halfH));
          
          const dx = futureX - clampX;
          const dy = futureY - clampY;
          const dist = Math.hypot(dx, dy);

          // If we are heading into the wall or very close
          if (dist < feelerLen) {
              const strength = (feelerLen - dist) / feelerLen;
              if (dist === 0) {
                  // Inside wall? Emergency push
                  input.x += Math.random() - 0.5;
                  input.y += Math.random() - 0.5;
              } else {
                  // Strong avoidance force away from the wall point
                  input.x += (dx / dist) * strength * 10.0; 
                  input.y += (dy / dist) * strength * 10.0;
              }
          }
      }
  }

  private applyBorderAvoidance(input: Vector2, pos: Vector2) {
      const margin = 200; const force = 3.0;
      if (pos.x < margin) input.x += force;
      if (pos.y < margin) input.y += force;
      if (pos.x > WORLD_SIZE - margin) input.x -= force;
      if (pos.y > WORLD_SIZE - margin) input.y -= force;
  }

  private applyBulletDodging(input: Vector2, bot: Entity, bullets: Entity[]) {
      for (const b of bullets) {
          if (b.ownerId === bot.id || (b.teamId && b.teamId === bot.teamId)) continue;
          const dx = b.pos.x - bot.pos.x;
          const dy = b.pos.y - bot.pos.y;
          const dist = Math.hypot(dx, dy);
          if (dist < BULLET_DODGE_DISTANCE) {
              const dot = dx * b.vel.x + dy * b.vel.y;
              if (dot < 0) { 
                  const bSpeed = Math.hypot(b.vel.x, b.vel.y);
                  if (bSpeed > 0) {
                      const perpX = -b.vel.y / bSpeed;
                      const perpY = b.vel.x / bSpeed;
                      input.x += perpX * 3.0;
                      input.y += perpY * 3.0;
                  }
              }
          }
      }
  }

  // --- IMPROVED SEPARATION (Soft Jitter) ---
  private applySeparation(input: Vector2, bot: Entity, friends: Entity[]) {
      const radius = 120; 
      for (const friend of friends) {
          if (friend.id === bot.id) continue;
          const dx = bot.pos.x - friend.pos.x;
          const dy = bot.pos.y - friend.pos.y;
          const dist = Math.hypot(dx, dy);
          
          if (dist < radius && dist > 0) {
              const force = (radius - dist) / dist; 
              // Add slight jitter to prevent perfect stacking
              const jitterX = (Math.random() - 0.5) * 0.2;
              const jitterY = (Math.random() - 0.5) * 0.2;
              
              input.x += (dx * force + jitterX) * 2.0;
              input.y += (dy * force + jitterY) * 2.0;
          }
      }
  }

  private checkLineOfSight(start: Vector2, end: Vector2, walls: Entity[]): boolean {
      for (const wall of walls) {
          if (PhysicsSystem.intersectLineRect(start, end, wall)) {
              return false;
          }
      }
      return true;
  }

  private handleCombat(bot: Entity, mem: AIInternalState, primaryTarget: Entity | null, dt: number, entities: Entity[], onHitscan: any) {
        let isShooting = false;
        let desiredAngle = bot.rotation;

        if (primaryTarget) {
            // Predictive Aiming
            const bulletSpeed = bot.type === EntityType.BOSS ? 300 : this.statManager!.getStat(bot, 'bulletSpd') * 60;
            const dist = Math.hypot(primaryTarget.pos.x - bot.pos.x, primaryTarget.pos.y - bot.pos.y);
            const timeToImpact = dist / (bulletSpeed || 1);
            
            const predictedX = primaryTarget.pos.x + primaryTarget.vel.x * timeToImpact;
            const predictedY = primaryTarget.pos.y + primaryTarget.vel.y * timeToImpact;

            desiredAngle = Math.atan2(predictedY - bot.pos.y, predictedX - bot.pos.x);
            
            // Inaccuracy
            const inaccuracy = (Math.random() - 0.5) * (dist > 500 ? 0.1 : 0.05); 
            desiredAngle += inaccuracy;

            const angleDiff = Math.abs(this.lerpAngle(bot.rotation, desiredAngle, 1) - bot.rotation);
            if (angleDiff < 0.6) { 
                isShooting = true;
            }
        } else if (bot.aiState === 'WANDER') {
            const speed = Math.hypot(bot.vel.x, bot.vel.y);
            if (speed > 10) {
                desiredAngle = Math.atan2(bot.vel.y, bot.vel.x);
            } else {
                desiredAngle += dt * 0.5;
            }
        }

        const turnSpeed = bot.type === EntityType.BOSS ? 2.0 : 6.0; 
        bot.rotation = this.lerpAngle(bot.rotation, desiredAngle, turnSpeed * dt);

        if (isShooting) {
            const config = bot.type === EntityType.BOSS ? SENTINEL_CONFIG : TANK_CLASSES[bot.classPath || 'basic'];
            if (config) {
                WeaponSystem.update(
                    bot, config as any, dt, true, false, entities,
                    (key: StatKey) => {
                        if (bot.type === EntityType.BOSS) {
                            if (key === 'bulletSpd') return 6;
                            if (key === 'bulletDmg') return 5;
                            if (key === 'reload') return 2;
                            if (key === 'bulletPen') return 5;
                            return 1;
                        }
                        return this.statManager!.getStat(bot, key);
                    },
                    onHitscan, 0, this.audioManager, bot.pos
                );
            }
        }
  }

  private getRandomMapPoint(): Vector2 {
      return { x: Math.random() * (WORLD_SIZE - 400) + 200, y: Math.random() * (WORLD_SIZE - 400) + 200 };
  }

  // --- NEW: WEIGHTED TARGETING SYSTEM WITH ANTI-MOBBING & LINE OF SIGHT ---
  private findBestAttackTarget(bot: Entity, player: Entity, allEntities: Entity[], walls: Entity[]): Entity | null {
      let best: Entity | null = null;
      let highestScore = -Infinity;

      const evaluate = (target: Entity) => {
          if (target.isDead || target.isInvisible) return;
          if (target.teamId && target.teamId === bot.teamId) return; 
          if (target.id === bot.id) return;

          const chaserCount = allEntities.filter(e => e.type === EntityType.ENEMY && e.id !== bot.id && e.aiTargetId === target.id).length;
          if (chaserCount >= GAME_RULES.AI_MAX_CHASERS) {
              return; 
          }

          const dist = Math.hypot(target.pos.x - bot.pos.x, target.pos.y - bot.pos.y);
          if (dist > AI_VIEW_RANGE) return; 

          let score = 0;

          if (target.type === EntityType.BOSS) score += 5000; 
          else if (target.type === EntityType.PLAYER) score += 1500; 
          else if (target.type === EntityType.ENEMY) score += 500; 

          score -= dist * 2; 

          const hpPct = target.health / target.maxHealth;
          if (hpPct < 0.3) score += 1000; 

          // --- Line of Sight Penalty ---
          if (!this.checkLineOfSight(bot.pos, target.pos, walls)) {
              score -= 3000; 
          }

          if (score > highestScore) {
              highestScore = score;
              best = target;
          }
      };

      if (!player.isDead) evaluate(player);

      for (const e of allEntities) {
          if ((e.type === EntityType.ENEMY || e.type === EntityType.BOSS || (e.type === EntityType.PLAYER && e.id !== 'player')) && !e.isDead) {
              evaluate(e);
          }
      }

      return best;
  }

  private findBestFarmTarget(bot: Entity, allEntities: Entity[]): Entity | null {
    let best: Entity | null = null;
    let maxScore = -Infinity;
    const shapes = allEntities.filter(e => (e.type === EntityType.SHAPE || e.type === EntityType.CRASHER) && !e.isDead);
    
    for (const s of shapes) {
        const dist = Math.hypot(s.pos.x - bot.pos.x, s.pos.y - bot.pos.y);
        if (dist > 800) continue; 
        
        let score = (s.scoreValue || 10) / (dist + 50); 
        if (s.variant === 'GREEN') score *= 10;
        
        if (score > maxScore) { maxScore = score; best = s; }
    }
    return best;
  }

  private determineAIState(bot: Entity, attackTarget: Entity | null, farmTarget: Entity | null, walls: Entity[]): { newState: Entity['aiState'], primaryTarget: Entity | null } {
    const hp = bot.health / bot.maxHealth;
    const isRusher = bot.aiPersonality === AIPersonality.RUSHER;
    const isCoward = bot.aiPersonality === AIPersonality.COWARD;

    if (attackTarget && attackTarget.type !== EntityType.BOSS) {
        if (isCoward && hp < 0.6) return { newState: 'FLEE', primaryTarget: attackTarget };
        if (!isRusher && hp < 0.3) return { newState: 'FLEE', primaryTarget: attackTarget };
    }

    if (attackTarget) {
        const dist = Math.hypot(attackTarget.pos.x - bot.pos.x, attackTarget.pos.y - bot.pos.y);
        
        if (farmTarget && farmTarget.scoreValue! > 2000 && dist > 500 && !isRusher) {
             return { newState: 'FARM', primaryTarget: farmTarget };
        }

        if (attackTarget.type === EntityType.BOSS && bot.aiPersonality !== AIPersonality.RUSHER) {
            return { newState: 'ATTACK', primaryTarget: attackTarget };
        }

        if (bot.aiPersonality === AIPersonality.SNIPER) {
            if (dist < 400) return { newState: 'FLEE', primaryTarget: attackTarget };
            if (dist < 700) return { newState: 'ATTACK', primaryTarget: attackTarget };
            return { newState: 'CHASE', primaryTarget: attackTarget };
        }

        const hasLOS = this.checkLineOfSight(bot.pos, attackTarget.pos, walls);

        if (dist <= 600) {
             if (hasLOS) return { newState: 'ATTACK', primaryTarget: attackTarget };
             return { newState: 'CHASE', primaryTarget: attackTarget }; 
        }
        return { newState: 'CHASE', primaryTarget: attackTarget };
    }

    if (farmTarget) { return { newState: 'FARM', primaryTarget: farmTarget }; }
    
    return { newState: 'WANDER', primaryTarget: null };
  }

  private updateAggressiveEntities(entities: Entity[], player: Entity, dt: number) {
    const NEST_CENTER = { x: WORLD_SIZE/2, y: WORLD_SIZE/2 };
    entities.forEach(ent => {
        const isAggressive = ent.type === EntityType.CRASHER || (ent.type === EntityType.SHAPE && ent.aiState !== undefined && ent.variant === 'EVIL');
        if (!isAggressive || ent.isDead) return;
        
        let target = ent.pos;
        let targetEnt = player;
        let minDist = 99999;
        
        const candidates = [player, ...entities.filter(e => e.type === EntityType.ENEMY || (e.type === EntityType.PLAYER && e.id !== 'player'))];
        
        for (const c of candidates) {
            if (c.isDead || c.isInvisible) continue;
            const d = Math.hypot(c.pos.x - ent.pos.x, c.pos.y - ent.pos.y);
            if (d < minDist) { minDist = d; targetEnt = c; }
        }
        
        const distToCenter = Math.hypot(NEST_CENTER.x - ent.pos.x, NEST_CENTER.y - ent.pos.y);
        const agroRange = ent.ownerId ? 800 : 400;

        if (minDist < agroRange) { target = targetEnt.pos; } 
        else if (distToCenter > 1000 && ent.type === EntityType.CRASHER) { target = NEST_CENTER; }

        if (target !== ent.pos) {
            const angle = Math.atan2(target.y - ent.pos.y, target.x - ent.pos.x);
            let speed = ent.ownerId ? 25 : 22; 
            if (ent.variant === 'EVIL') speed *= 0.8;
            
            ent.vel.x += Math.cos(angle) * speed; 
            ent.vel.y += Math.sin(angle) * speed;
            ent.rotation = this.lerpAngle(ent.rotation, angle, 5 * dt);
        }
        ent.vel.x *= 0.95; 
        ent.vel.y *= 0.95;
    });
  }
}
