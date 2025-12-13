
import { Entity, EntityType, GameMode, Vector2, AIPersonality } from '../../types';
import { COLORS, TEAM_COLORS, WORLD_SIZE } from '../../constants';
import { BOSS_DATA } from '../../data/bosses';
import { TANK_CLASSES } from '../../data/tanks';
import { BossType, ShapeType } from '../../types';
import { Barrels } from '../../data/barrels/presets';

// --- NEW: Bot Build Paths ---
// Defines complete evolution lines so bots don't just spawn randomly
const BOT_BUILDS = [
    { name: "Drone Lord", path: ['basic', 'sniper', 'overseer', 'overlord', 'overseer_prime', 'omnipotent'] },
    { name: "Bullet Hell", path: ['basic', 'machine_gun', 'gunner', 'streamliner', 'rail_specter', 'nova_cannon'] },
    { name: "Rammer", path: ['basic', 'flank_guard', 'tri_angle', 'booster', 'hummingbird', 'cyber_wyvern'] },
    { name: "Sniper", path: ['basic', 'sniper', 'assassin', 'ranger', 'starhammer', 'nova_cannon'] },
    { name: "Destroyer", path: ['basic', 'machine_gun', 'destroyer', 'annihilator', 'titanbreaker', 'galaxy_breaker'] },
    { name: "Trapper", path: ['basic', 'sniper', 'trapper', 'mega_trapper', 'cryomancer', 'omnipotent'] },
    { name: "Spammer", path: ['basic', 'twin', 'triple_shot', 'penta_shot', 'storm_runner', 'galaxy_breaker'] },
];

export class AISystem {
  
  // Track boss targets to provide persistence (Hysteresis)
  private static bossTargetMap = new Map<string, string>();

  static spawnBots(entities: Entity[], count: number, gameMode: GameMode, getSpawnPos: (teamId?: string) => Vector2) {
      const botNames = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Hunter", "Killer", "Pro_Gamer", "NoobSlayer", "Shadow", "Viper", "Ghost", "Tanker", "Snipey", "Zoomer"];
      const personalities = [
          AIPersonality.BALANCED, AIPersonality.BALANCED, // Common
          AIPersonality.RUSHER, AIPersonality.RUSHER, 
          AIPersonality.SNIPER, 
          AIPersonality.FLANKER, AIPersonality.FLANKER,
          AIPersonality.COWARD
      ];
      
      for(let i=0; i<count; i++) {
          let teamId = undefined;
          let color = COLORS.enemy;

          // FIXED: Safe ID
          const safeId = Math.random().toString(36).slice(2);

          if (gameMode === 'TEAMS_2') {
             teamId = Math.random() < 0.5 ? 'BLUE' : 'RED';
          } else if (gameMode === 'TEAMS_4') {
             const rand = Math.random();
             if (rand < 0.25) teamId = 'BLUE';
             else if (rand < 0.5) teamId = 'RED';
             else if (rand < 0.75) teamId = 'GREEN';
             else teamId = 'PURPLE';
          } else if (gameMode === 'FFA' || gameMode === 'MAZE') {
             teamId = `BOT_${safeId}`; 
             color = COLORS.enemy;
          }

          if (teamId && !teamId.startsWith('BOT')) {
              color = TEAM_COLORS[teamId as keyof typeof TEAM_COLORS];
          }

          const name = Math.random() < 0.3 ? undefined : botNames[Math.floor(Math.random() * botNames.length)];
          const personality = personalities[Math.floor(Math.random() * personalities.length)];
          
          // --- NEW: Smart Build Selection ---
          const build = BOT_BUILDS[Math.floor(Math.random() * BOT_BUILDS.length)];
          
          // Weighted Level Generation (Simulate a real server)
          // 40% Tier 1 (Lvl 1-15), 30% Tier 2 (Lvl 15-30), 20% Tier 3 (Lvl 30-45), 10% High Tier
          const roll = Math.random();
          let level = 1;
          let tierIndex = 0;

          if (roll < 0.4) {
              level = Math.floor(Math.random() * 14) + 1;
              tierIndex = 0;
          } else if (roll < 0.7) {
              level = Math.floor(Math.random() * 15) + 15;
              tierIndex = 1;
          } else if (roll < 0.9) {
              level = Math.floor(Math.random() * 15) + 30;
              tierIndex = 2;
          } else {
              level = Math.floor(Math.random() * 30) + 45;
              tierIndex = 3;
          }

          // Ensure valid tier index for the build
          tierIndex = Math.min(tierIndex, build.path.length - 1);
          const currentClass = build.path[tierIndex];

          entities.push({
              id: `bot_${safeId}`,
              name: name,
              type: EntityType.ENEMY,
              pos: getSpawnPos(teamId && !teamId.startsWith('BOT') ? teamId : undefined),
              vel: { x: 0, y: 0 },
              radius: 20 * Math.pow(1.01, level - 1), 
              rotation: Math.random() * Math.PI * 2,
              color: color,
              health: 50 + (level * 5),
              maxHealth: 50 + (level * 5),
              damage: 10,
              isDead: false,
              teamId: teamId,
              aiState: 'WANDER',
              aiPersonality: personality,
              
              // Evolution Logic Data
              classPath: currentClass,
              targetClassPath: build.path[build.path.length - 1], // Goal
              evolutionPath: build.path, // Full path
              
              scoreValue: level * 500,
              // Inject level for StatManager to read
              // @ts-ignore
              level: level 
          });
      }
  }

  // --- SMART BOSS AI ---
  static updateBosses(entities: Entity[], player: Entity, dt: number) {
      entities.forEach(boss => {
          if (boss.type !== EntityType.BOSS || !boss.bossType) return;
          if (boss.bossType === BossType.SENTINEL) return; // Handled by AIController

          const config = BOSS_DATA[boss.bossType];
          
          // 1. Target Selection with Hysteresis
          // We stick to the current target unless a new one is significantly closer
          let currentTargetId = this.bossTargetMap.get(boss.id);
          const targetEntity = this.findBossTarget(boss, entities, player, currentTargetId);
          
          if (targetEntity) {
              this.bossTargetMap.set(boss.id, targetEntity.id);
              boss.targetPos = targetEntity.pos;
          } else {
              this.bossTargetMap.delete(boss.id);
              // Wander logic
              if (!boss.targetPos || Math.random() < 0.01) {
                  boss.targetPos = {
                      x: boss.pos.x + (Math.random() - 0.5) * 500,
                      y: boss.pos.y + (Math.random() - 0.5) * 500
                  };
              }
          }

          // 2. Behavior based on Type
          const distToTarget = targetEntity ? Math.hypot(targetEntity.pos.x - boss.pos.x, targetEntity.pos.y - boss.pos.y) : 0;
          let moveSpeed = config.speed;
          let desiredAngle = boss.rotation;

          if (boss.bossType === BossType.FALLEN_BOOSTER) {
              // --- RAMMER AI ---
              if (targetEntity) {
                  // Predict interception point
                  const t = distToTarget / 300; // Estimated time to impact
                  const predX = targetEntity.pos.x + targetEntity.vel.x * t;
                  const predY = targetEntity.pos.y + targetEntity.vel.y * t;
                  desiredAngle = Math.atan2(predY - boss.pos.y, predX - boss.pos.x);
                  
                  if (distToTarget < 1000) {
                      boss.aiState = 'CHARGE';
                      moveSpeed *= 2.5; // Ram speed
                  } else {
                      boss.aiState = 'IDLE';
                  }
              } else {
                  desiredAngle = Math.atan2(boss.targetPos!.y - boss.pos.y, boss.targetPos!.x - boss.pos.x);
              }
          } 
          else if (boss.bossType === BossType.GUARDIAN || boss.bossType === BossType.SUMMONER) {
              // --- KITER / SUMMONER AI ---
              // Attempt to maintain distance (600 - 800 units)
              const IDEAL_DIST = 600;
              const FLEE_DIST = 400;
              
              if (targetEntity) {
                  const angleToTarget = Math.atan2(targetEntity.pos.y - boss.pos.y, targetEntity.pos.x - boss.pos.x);
                  
                  if (distToTarget < FLEE_DIST) {
                      // Too close! Back away fast
                      desiredAngle = angleToTarget + Math.PI; 
                      moveSpeed *= 1.2;
                  } else if (distToTarget > IDEAL_DIST + 100) {
                      // Too far, chase
                      desiredAngle = angleToTarget;
                  } else {
                      // In sweet spot, orbit / strafe
                      // Alternate direction occasionally
                      const orbitDir = (Math.floor(Date.now() / 3000) % 2 === 0) ? 1 : -1;
                      desiredAngle = angleToTarget + (Math.PI / 2 * orbitDir);
                      moveSpeed *= 0.6;
                  }
                  
                  // Spawn Minions
                  boss.attackCooldown = (boss.attackCooldown || 0) - dt;
                  if ((boss.attackCooldown || 0) <= 0 && distToTarget < 1500) {
                       // Drones need to target the enemy immediately
                       AISystem.spawnBossMinion(entities, boss, targetEntity); 
                       boss.attackCooldown = boss.bossType === BossType.GUARDIAN ? 2.5 : 1.5;
                  }
              } else {
                  // Wander slowly
                  desiredAngle = Math.atan2(boss.targetPos!.y - boss.pos.y, boss.targetPos!.x - boss.pos.x);
                  moveSpeed *= 0.5;
              }
          }

          // 3. Apply Movement (Smooth Turn)
          let angleDiff = desiredAngle - boss.rotation;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          
          const turnSpeed = boss.bossType === BossType.FALLEN_BOOSTER ? 3.0 : 1.5;
          boss.rotation += angleDiff * turnSpeed * dt;

          boss.vel.x += Math.cos(boss.rotation) * moveSpeed;
          boss.vel.y += Math.sin(boss.rotation) * moveSpeed;
          boss.vel.x *= 0.95; 
          boss.vel.y *= 0.95;
      });
  }

  // --- NEUTRAL TARGETING LOGIC WITH PERSISTENCE ---
  private static findBossTarget(boss: Entity, entities: Entity[], player: Entity, currentTargetId?: string): Entity | null {
      let closest: Entity | null = null;
      let minDist = 2000; // Max view range

      // Check Player
      if (!player.isDead && !player.isInvisible && !player.isInvulnerable) {
          const d = Math.hypot(player.pos.x - boss.pos.x, player.pos.y - boss.pos.y);
          // Bias: If this is the current target, treat it as closer (sticky target)
          const effectiveDist = (player.id === currentTargetId) ? d - 200 : d;
          
          if (effectiveDist < minDist) {
              minDist = effectiveDist;
              closest = player;
          }
      }

      // Check Bots
      for (const ent of entities) {
          if (ent.type === EntityType.ENEMY && !ent.isDead && ent.id !== boss.id) {
              // Bosses don't attack each other or Arena Closers
              if (ent.teamId === 'BOSS' || ent.teamId === 'ARENA_CLOSER') continue;
              
              const d = Math.hypot(ent.pos.x - boss.pos.x, ent.pos.y - boss.pos.y);
              // Bias: If this is the current target, treat it as closer
              const effectiveDist = (ent.id === currentTargetId) ? d - 200 : d;

              if (effectiveDist < minDist) {
                  minDist = effectiveDist;
                  closest = ent;
              }
          }
      }

      return closest;
  }

  static spawnBossMinion(entities: Entity[], boss: Entity, target: Entity | null) {
      const type = boss.bossType === BossType.GUARDIAN ? EntityType.CRASHER : EntityType.DRONE;
      const count = boss.bossType === BossType.GUARDIAN ? 1 : 2;
      
      for(let i=0; i<count; i++) {
          const angle = boss.rotation + (Math.random() - 0.5);
          const vel = { x: Math.cos(angle) * 150, y: Math.sin(angle) * 150 };
          const safeId = Math.random().toString(36).slice(2);

          if (type === EntityType.CRASHER) {
              entities.push({
                id: `minion_${safeId}`,
                type: EntityType.CRASHER,
                pos: { x: boss.pos.x, y: boss.pos.y },
                vel: vel,
                rotation: angle,
                radius: 10,
                color: COLORS.crasher,
                health: 40,
                maxHealth: 40,
                damage: 20,
                scoreValue: 50,
                isDead: false,
                variant: 'DEFAULT',
                ownerId: boss.id,
                teamId: boss.teamId,
                // Inherit target state via AIController usually, but here we can hint
                aiState: 'ATTACK' 
             });
          } else {
             entities.push({
                id: `minion_${safeId}`,
                type: EntityType.DRONE,
                pos: { x: boss.pos.x, y: boss.pos.y },
                vel: vel,
                rotation: angle,
                radius: 12,
                color: COLORS.shapeSquare,
                health: 30,
                maxHealth: 30,
                damage: 15,
                scoreValue: 20,
                isDead: false,
                ownerId: boss.id, // Important: Boss ID links minion to boss logic in DroneSystem
                shapeType: ShapeType.SQUARE,
                teamId: boss.teamId,
                targetPos: target ? target.pos : undefined // Hint for drone system
             });
          }
      }
  }
}
