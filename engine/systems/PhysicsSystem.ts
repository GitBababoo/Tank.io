
import { Entity, EntityType, BiomeType, Vector2, SoundType, Barrel, BulletType, StatusEffectType } from '../../types';
import { FRICTION, GAME_RULES, WORLD_SIZE } from '../../constants';
import { WorldSystem } from './WorldSystem';
import { ParticleSystem } from './ParticleSystem';
import { StatManager } from '../managers/StatManager';
import { CameraManager } from '../managers/CameraManager';
import { AudioManager } from '../managers/AudioManager';
import { StatusEffectSystem } from './StatusEffectSystem';

// --- SPATIAL GRID CLASS ---
// Divides the world into cells. We only check collisions between entities in the same or neighboring cells.
// This is the "Industry Standard" optimization for 2D collision.
class SpatialGrid {
    private cellSize: number;
    private cells: Map<string, Entity[]>;

    constructor(cellSize: number = 200) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    clear() {
        this.cells.clear();
    }

    insert(entity: Entity) {
        const key = this.getKey(entity.pos);
        if (!this.cells.has(key)) {
            this.cells.set(key, []);
        }
        this.cells.get(key)!.push(entity);
        
        // Handle entities spanning multiple cells (basic approximation by radius)
        // If entity is big, we might add it to neighbors too, but usually simple center point is enough 
        // if we check 3x3 neighbors during query.
    }

    // Returns entities in the same cell AND surrounding 8 cells
    query(pos: Vector2): Entity[] {
        const results: Entity[] = [];
        const cx = Math.floor(pos.x / this.cellSize);
        const cy = Math.floor(pos.y / this.cellSize);

        for (let x = cx - 1; x <= cx + 1; x++) {
            for (let y = cy - 1; y <= cy + 1; y++) {
                const key = `${x}_${y}`;
                const cellEntities = this.cells.get(key);
                if (cellEntities) {
                    for (const ent of cellEntities) {
                        results.push(ent);
                    }
                }
            }
        }
        return results;
    }

    private getKey(pos: Vector2): string {
        return `${Math.floor(pos.x / this.cellSize)}_${Math.floor(pos.y / this.cellSize)}`;
    }
}

export class PhysicsSystem {
  
  // Reusable Grid Instance
  private static grid = new SpatialGrid(250);

  static updateMovement(entities: Entity[], dt: number, statManager: StatManager, mapWidth: number, mapHeight: number) {
      entities.forEach(ent => {
          if (ent.isDead) return;

          if (ent.flashTimer && ent.flashTimer > 0) {
              ent.flashTimer -= dt;
          }

          ent.prevPos = { ...ent.pos };

          const mass = statManager.getEntityMass(ent);
          ent.mass = mass;

          let friction = FRICTION;
          const biome = WorldSystem.getBiome(ent.pos);
          if (biome === BiomeType.ICE) friction = 0.98;

          const frictionFactor = Math.pow(friction, dt * 60);
          
          if (ent.type === EntityType.PLAYER || ent.type === EntityType.ENEMY || ent.type === EntityType.BOSS) {
              ent.vel.x *= frictionFactor;
              ent.vel.y *= frictionFactor;
              
              const speed = Math.hypot(ent.vel.x, ent.vel.y);
              if (speed > 500 && Math.random() < 0.3) {
                  ParticleSystem.spawnGhostTrail(entities, ent);
              }
          } else if (ent.type === EntityType.SHAPE || ent.type === EntityType.CRASHER) {
              ent.vel.x *= 0.95; 
              ent.vel.y *= 0.95;
          }

          ent.pos.x += ent.vel.x * dt;
          ent.pos.y += ent.vel.y * dt;

          if (ent.type === EntityType.PLAYER || ent.type === EntityType.ENEMY || ent.type === EntityType.BOSS) {
              ent.pos.x = Math.max(0, Math.min(mapWidth, ent.pos.x));
              ent.pos.y = Math.max(0, Math.min(mapHeight, ent.pos.y));
              
              if (ent.pos.x <= 0 || ent.pos.x >= mapWidth) ent.vel.x = 0;
              if (ent.pos.y <= 0 || ent.pos.y >= mapHeight) ent.vel.y = 0;

              const speed = Math.hypot(ent.vel.x, ent.vel.y);
              if (speed > 1) {
                  const forwardX = Math.cos(ent.rotation);
                  const forwardY = Math.sin(ent.rotation);
                  const dot = forwardX * ent.vel.x + forwardY * ent.vel.y;
                  const direction = dot < -0.1 ? -1 : 1;
                  ent.distanceTraveled = (ent.distanceTraveled || 0) + speed * dt * direction;
              }
          }
          else if (ent.type === EntityType.SHAPE) {
              if (ent.pos.x < 0) { ent.pos.x = 0; ent.vel.x *= -1; }
              if (ent.pos.x > mapWidth) { ent.pos.x = mapWidth; ent.vel.x *= -1; }
              if (ent.pos.y < 0) { ent.pos.y = 0; ent.vel.y *= -1; }
              if (ent.pos.y > mapHeight) { ent.pos.y = mapHeight; ent.vel.y *= -1; }
              ent.rotation += dt * 0.5;
          }
          else if (ent.type === EntityType.BULLET || ent.type === EntityType.TRAP || ent.type === EntityType.DRONE) {
              if (ent.type === EntityType.TRAP) { ent.vel.x *= 0.9; ent.vel.y *= 0.9; }
              if (ent.type === EntityType.DRONE) { ent.vel.x *= 0.95; ent.vel.y *= 0.95; }
              
              if (ent.type === EntityType.BULLET && ent.bulletVisual === 'MISSILE') {
                  const speed = Math.hypot(ent.vel.x, ent.vel.y);
                  const maxSpeed = 1200;
                  if (speed < maxSpeed) {
                      const accel = 1500 * dt;
                      ent.vel.x += Math.cos(ent.rotation) * accel;
                      ent.vel.y += Math.sin(ent.rotation) * accel;
                  }
                  if (Math.random() < 0.1) {
                      ent.rotation += (Math.random() - 0.5) * 0.1;
                  }
              }

              if (ent.pos.x < 0 || ent.pos.x > mapWidth || ent.pos.y < 0 || ent.pos.y > mapHeight) {
                  ent.isDead = true;
              }
              
              if (typeof ent.lifespan === 'number') {
                  ent.lifespan -= dt;
                  if (ent.lifespan <= 0) ent.isDead = true;
              }

              if (ent.type === EntityType.BULLET && !ent.isDead) {
                  const speed = Math.hypot(ent.vel.x, ent.vel.y);
                  const radius = ent.radius;
                  const distTraveled = speed * dt;
                  const steps = Math.ceil(distTraveled / (radius * 0.8));
                  const normalizedSpeed = Math.min(speed / 1500, 1.0);
                  const spawnChance = 0.2 + (normalizedSpeed * 0.8);

                  for (let i = 0; i < steps; i++) {
                      const config = ent.trailConfig;
                      const customRate = config ? (config.rate ?? 0.5) : spawnChance;
                      
                      if (Math.random() > customRate) continue;

                      const t = i / steps;
                      const tx = ent.pos.x - (ent.vel.x * dt * t);
                      const ty = ent.pos.y - (ent.vel.y * dt * t);
                      const particleSize = radius * (1.0 - (normalizedSpeed * 0.4) + Math.random() * 0.3);
                      
                      const trailPos = { 
                           x: tx + (Math.random() - 0.5) * 4, 
                           y: ty + (Math.random() - 0.5) * 4 
                      };

                      if (config) {
                           entities.push({
                               id: `p_trail_${Math.random()}`,
                               type: EntityType.PARTICLE,
                               particleType: config.type,
                               pos: trailPos,
                               vel: { x: (Math.random()-0.5)*20, y: (Math.random()-0.5)*20 },
                               radius: particleSize * (config.size ?? 1.0),
                               rotation: Math.random() * Math.PI * 2,
                               color: config.color || ent.color,
                               health: 1, maxHealth: 1, damage: 0, isDead: false,
                               lifespan: 0.4,
                               opacity: 0.6
                           });
                      } else {
                           ParticleSystem.spawnSmokeTrail(entities, trailPos, particleSize);
                       }
                       if (!ent.bulletVisual && !config && i > 2) break; 
                  }
              }
          }

          if (ent.barrelRecoils) {
              for(let i=0; i<ent.barrelRecoils.length; i++) {
                  if (ent.barrelRecoils[i] > 0.001) {
                      const decaySpeed = 12.0; 
                      ent.barrelRecoils[i] += (0 - ent.barrelRecoils[i]) * decaySpeed * dt;
                  } else {
                      ent.barrelRecoils[i] = 0;
                  }
              }
          }
          
          if (ent.type === EntityType.FLOATING_TEXT) {
              ent.pos.x += ent.vel.x * dt;
              ent.pos.y += ent.vel.y * dt;
              ent.vel.x *= 0.95;
              ent.vel.y += 300 * dt;
              
              const life = typeof ent.lifespan === 'number' ? ent.lifespan : 0;
              ent.opacity = Math.max(0, life / 0.8);
              
              if (typeof ent.lifespan === 'number') {
                  ent.lifespan -= dt;
                  if (ent.lifespan <= 0) ent.isDead = true;
              }
          }
      });
  }

  public static intersectLineCircle(p1: Vector2, p2: Vector2, circle: Entity): Vector2 | null {
      const { pos, radius } = circle;
      const d = { x: p2.x - p1.x, y: p2.y - p1.y };
      const f = { x: p1.x - pos.x, y: p1.y - pos.y };
      const a = d.x * d.x + d.y * d.y;
      const b = 2 * (f.x * d.x + f.y * d.y);
      const c = f.x * f.x + f.y * f.y - radius * radius;
      let discriminant = b * b - 4 * a * c;
      if (discriminant < 0) return null;
      discriminant = Math.sqrt(discriminant);
      const t1 = (-b - discriminant) / (2 * a);
      const t2 = (-b + discriminant) / (2 * a);
      if (t1 >= 0 && t1 <= 1) return { x: p1.x + d.x * t1, y: p1.y + d.y * t1 };
      if (t2 >= 0 && t2 <= 1) return { x: p1.x + d.x * t2, y: p1.y + d.y * t2 };
      return null;
  }
  public static intersectLineLine(p1: Vector2, p2: Vector2, p3: Vector2, p4: Vector2): Vector2 | null {
      const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
      if (d === 0) return null; 
      const t = ((p1.x - p3.x) * (p4.y - p3.y) - (p1.y - p3.y) * (p4.x - p3.x)) / d;
      const u = -((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / d;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
      return null;
  }
  public static intersectLineRect(p1: Vector2, p2: Vector2, rect: Entity): Vector2 | null {
      const { pos, width, height } = rect;
      if (!width || !height) return null;
      const minX = rect.pos.x - rect.width! / 2;
      const maxX = rect.pos.x + rect.width! / 2;
      const minY = rect.pos.y - rect.height! / 2;
      const maxY = rect.pos.y + rect.height! / 2;
      const segments = [ [{x: minX, y: minY}, {x: maxX, y: minY}], [{x: maxX, y: minY}, {x: maxX, y: maxY}], [{x: maxX, y: maxY}, {x: minX, y: maxY}], [{x: minX, y: maxY}, {x: minX, y: minY}] ];
      let closestHit: Vector2 | null = null;
      let minHitDistSq = Infinity;
      for (const seg of segments) {
          const hit = this.intersectLineLine(p1, p2, seg[0], seg[1]);
          if (hit) {
              const distSq = (hit.x - p1.x) ** 2 + (hit.y - p1.y) ** 2;
              if (distSq < minHitDistSq) { minHitDistSq = distSq; closestHit = hit; }
          }
      }
      return closestHit;
  }
  public static isPointInRect(p: Vector2, rect: Entity): boolean {
      if (!rect.width || !rect.height) return false;
      const minX = rect.pos.x - rect.width! / 2;
      const maxX = rect.pos.x + rect.width! / 2;
      const minY = rect.pos.y - rect.height! / 2;
      const maxY = rect.pos.y + rect.height! / 2;
      return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
  }

  // --- NEW: Improved Collision Detection for Bullets (Circle vs Rectangle) ---
  public static checkCircleRectCollision(circle: Entity, rect: Entity): boolean {
      if (!rect.width || !rect.height) return false;
      
      const halfW = rect.width / 2;
      const halfH = rect.height / 2;

      // Calculate distance between circle center and rect center
      const distX = Math.abs(circle.pos.x - rect.pos.x);
      const distY = Math.abs(circle.pos.y - rect.pos.y);

      // If distance is greater than half rect + radius, they are too far apart
      if (distX > (halfW + circle.radius)) return false;
      if (distY > (halfH + circle.radius)) return false;

      // If distance is less than half rect, the center is inside
      if (distX <= halfW) return true;
      if (distY <= halfH) return true;

      // Corner case (pythagorean theorem)
      const dx = distX - halfW;
      const dy = distY - halfH;
      return (dx * dx + dy * dy <= (circle.radius * circle.radius));
  }

  static handleCollisions(
      entities: Entity[], 
      player: Entity, 
      activeAbilityTimer: number, 
      playerClass: string, 
      onDeath: (victim: Entity, killer: Entity) => void, 
      cameraManager: CameraManager, 
      statManager: StatManager, 
      statusEffectSystem: StatusEffectSystem, 
      audioManager?: AudioManager
  ) {
    const allEntities = [...entities, player];

    // 1. POPULATE SPATIAL GRID
    this.grid.clear();
    const walls: Entity[] = [];
    
    for (const ent of allEntities) {
        if (ent.isDead || ent.type === EntityType.PARTICLE || ent.type === EntityType.FLOATING_TEXT) continue;
        
        if (ent.type === EntityType.WALL) {
            walls.push(ent); // Keep walls separate for global check or special grid logic
        } else {
            this.grid.insert(ent);
        }
    }

    // 2. CHECK COLLISIONS (Optimized)
    for (let i = 0; i < allEntities.length; i++) {
        const entA = allEntities[i];
        if (entA.isDead || entA.type === EntityType.PARTICLE || entA.type === EntityType.FLOATING_TEXT || entA.type === EntityType.WALL) continue;
        
        // Bullet vs Walls (Global check for walls is okay as there are few walls usually, or we could add walls to grid)
        // CHANGED: Uses checkCircleRectCollision for accurate hit detection
        if (entA.type === EntityType.BULLET) {
            for (const wall of walls) {
                if (this.checkCircleRectCollision(entA, wall)) {
                    entA.health = 0; 
                    ParticleSystem.spawnHitEffect(allEntities, entA.pos, '#888');
                    entA.isDead = true; 
                    break; 
                }
            }
        }
        if (entA.isDead) continue;

        // Circle vs Wall Resolution
        for (const wall of walls) {
            if (!wall.width || !wall.height) continue;
            const circle = entA;
            const rect = wall;
            const closestX = Math.max(rect.pos.x - rect.width!/2, Math.min(circle.pos.x, rect.pos.x + rect.width!/2));
            const closestY = Math.max(rect.pos.y - rect.height!/2, Math.min(circle.pos.y, rect.pos.y + rect.height!/2));
            const dx = circle.pos.x - closestX;
            const dy = circle.pos.y - closestY;
            const distance = Math.hypot(dx, dy);
            if (distance < circle.radius) {
                const overlap = circle.radius - distance;
                if (distance === 0) { circle.pos.y += circle.radius; continue; }
                const normalX = dx / distance;
                const normalY = dy / distance;
                circle.pos.x += normalX * overlap;
                circle.pos.y += normalY * overlap;
                
                const dot = circle.vel.x * normalX + circle.vel.y * normalY;
                if (dot < 0) {
                    circle.vel.x -= dot * normalX;
                    circle.vel.y -= dot * normalY;
                }
            }
        }

        // Entity vs Entity (Using Grid)
        const neighbors = this.grid.query(entA.pos);
        
        for (const entB of neighbors) {
            if (entA === entB) continue; // Skip self
            // Avoid duplicate checks? (i < j logic is hard with grid, so we might double check, but it's cheap)
            // Or we can rely on ID check if needed, but double collision resolution usually stabilizes better.
            
            if (entB.isDead) continue;
            
            if (entA.ownerId && entB.ownerId && entA.ownerId === entB.ownerId) {
                if (entA.type === EntityType.BULLET && entB.type === EntityType.BULLET) continue;
                if (entA.type === EntityType.DRONE && entB.type === EntityType.DRONE) {
                    const dist = Math.hypot(entA.pos.x - entB.pos.x, entA.pos.y - entB.pos.y);
                    if (dist < entA.radius + entB.radius) {
                        const overlap = entA.radius + entB.radius - dist;
                        const dx = (entA.pos.x - entB.pos.x) / dist;
                        const dy = (entA.pos.y - entB.pos.y) / dist;
                        const force = 0.5; 
                        entA.pos.x += dx * overlap * force; entA.pos.y += dy * overlap * force;
                        entB.pos.x -= dx * overlap * force; entB.pos.y -= dy * overlap * force;
                    }
                    continue; 
                }
                continue;
            }

            if (entA.id === entB.id || entA.ownerId === entB.id || entB.ownerId === entA.id) continue;
            
            if (entA.teamId && entB.teamId && entA.teamId === entB.teamId) {
                const isProjectileA = entA.type === EntityType.BULLET || entA.type === EntityType.DRONE || entA.type === EntityType.TRAP;
                const isProjectileB = entB.type === EntityType.BULLET || entB.type === EntityType.DRONE || entB.type === EntityType.TRAP;
                if (isProjectileA || isProjectileB) continue; 
            }

            if (entA.type === EntityType.BULLET && entB.type === EntityType.BULLET) {
                if (!GAME_RULES.BULLET_TO_BULLET_COLLISION) continue; 
            }

            const dist = Math.hypot(entA.pos.x - entB.pos.x, entA.pos.y - entB.pos.y);
            if (dist < entA.radius + entB.radius) {
                this.processCollision(entA, entB, allEntities, player, activeAbilityTimer, onDeath, cameraManager, statManager, statusEffectSystem, audioManager);
            }
        }
    }
    
    // 3. CCD for Fast Bullets (Hitscan-like projectile check)
    // Grid optimization for Raycast is harder, sticking to linear loop for bullets only (fewer entities usually)
    for (const bullet of entities) {
        if (bullet.type !== EntityType.BULLET || bullet.isDead || !bullet.prevPos) continue;
        
        let firstHit: { entity: Entity, hitPos: Vector2 } | null = null;
        let minHitDistSq = Infinity;
        for (const target of allEntities) {
            if (target.isDead || target.id === bullet.id || target.id === bullet.ownerId) continue;
            if (target.ownerId && bullet.ownerId && target.ownerId === bullet.ownerId) continue;
            if (target.type === EntityType.BULLET && !GAME_RULES.BULLET_TO_BULLET_COLLISION) continue;
            if (target.teamId && bullet.teamId && target.teamId === bullet.teamId) continue;
            if (target.type === EntityType.PARTICLE || target.type === EntityType.FLOATING_TEXT || target.type === EntityType.ZONE) continue;
            
            let hitPos: Vector2 | null = null;
            if (target.type === EntityType.WALL) hitPos = this.intersectLineRect(bullet.prevPos, bullet.pos, target);
            else hitPos = this.intersectLineCircle(bullet.prevPos, bullet.pos, target);
            
            if (hitPos) {
                const distSq = (hitPos.x - bullet.prevPos.x) ** 2 + (hitPos.y - bullet.prevPos.y) ** 2;
                if (distSq < minHitDistSq) { minHitDistSq = distSq; firstHit = { entity: target, hitPos }; }
            }
        }
        if (firstHit) {
            bullet.pos = firstHit.hitPos;
            this.processCollision(bullet, firstHit.entity, allEntities, player, activeAbilityTimer, onDeath, cameraManager, statManager, statusEffectSystem, audioManager);
        }
    }
  }

  private static applyBulletEffects(bullet: Entity, target: Entity, statusEffectSystem: StatusEffectSystem) {
      if (bullet.bulletType === BulletType.INCENDIARY) {
          statusEffectSystem.apply(target, {
              type: StatusEffectType.BURN,
              duration: 3.0,
              damagePerSecond: 5,
              sourceId: bullet.ownerId || bullet.id
          });
      } else if (bullet.bulletType === BulletType.CRYO) {
          statusEffectSystem.apply(target, {
              type: StatusEffectType.SLOW,
              duration: 2.0,
              slowFactor: 0.4,
              sourceId: bullet.ownerId || bullet.id
          });
      }
  }

  private static processCollision(entA: Entity, entB: Entity, allEntities: Entity[], player: Entity, activeAbilityTimer: number, onDeath: any, cameraManager: CameraManager, statManager: StatManager, statusEffectSystem: StatusEffectSystem, audioManager?: AudioManager) {
        if (!entA.mass) entA.mass = statManager.getEntityMass(entA);
        if (!entB.mass) entB.mass = statManager.getEntityMass(entB);
        
        const isFriendly = entA.teamId && entB.teamId && entA.teamId === entB.teamId;

        let dmgA = isFriendly ? 0 : entA.damage;
        let dmgB = isFriendly ? 0 : entB.damage;

        if (entA.isInvulnerable) dmgB = 0;
        if (entB.isInvulnerable) dmgA = 0;

        const isCritA = entA.isCritical && entA.type === EntityType.BULLET;
        const isCritB = entB.isCritical && entB.type === EntityType.BULLET;

        if (isCritA && !isFriendly) {
            if (audioManager) audioManager.play(SoundType.CRIT, entB.pos, player.pos);
            ParticleSystem.spawnCritHitEffect(allEntities, entB.pos, '#ffd700');
            PhysicsSystem.spawnFloatingText(allEntities, entB.pos, "CRIT!", "#ffd700", true);
            dmgA *= 1.5; 
        }
        if (isCritB && !isFriendly) {
            if (audioManager) audioManager.play(SoundType.CRIT, entA.pos, player.pos);
            ParticleSystem.spawnCritHitEffect(allEntities, entA.pos, '#ffd700');
            PhysicsSystem.spawnFloatingText(allEntities, entA.pos, "CRIT!", "#ffd700", true);
            dmgB *= 1.5; 
        }

        if (dmgB > 0) {
            entA.health -= dmgB;
            entA.flashTimer = 0.1;
            const isPlayerHit = entA.id === 'player';
            const color = isPlayerHit ? '#ff3333' : (isCritB ? '#ffd700' : '#ffffff');
            PhysicsSystem.spawnFloatingText(allEntities, entA.pos, Math.round(dmgB).toString(), color, isCritB);
        }
        if (dmgA > 0) {
            entB.health -= dmgA;
            entB.flashTimer = 0.1;
            const isPlayerHit = entB.id === 'player';
            const color = isPlayerHit ? '#ff3333' : (isCritA ? '#ffd700' : '#ffffff');
            PhysicsSystem.spawnFloatingText(allEntities, entB.pos, Math.round(dmgA).toString(), color, isCritA);
        }
        
        if (!isFriendly) {
            if (entA.type === EntityType.BULLET && entB.type !== EntityType.WALL) {
                this.applyBulletEffects(entA, entB, statusEffectSystem);
            }
            if (entB.type === EntityType.BULLET && entA.type !== EntityType.WALL) {
                this.applyBulletEffects(entB, entA, statusEffectSystem);
            }
        }

        const handleExplosion = (source: Entity, center: Vector2) => {
            if (source.bulletType === BulletType.HIGH_EXPLOSIVE && source.explosionRadius) {
                ParticleSystem.spawnExplosion(allEntities, center, source.color, source.explosionRadius);
                if (audioManager) audioManager.play(SoundType.EXPLOSION, center, player.pos);
                
                allEntities.forEach(target => {
                    if (target.isDead || target.id === source.id || target.id === source.ownerId || target.type === EntityType.PARTICLE) return;
                    if (target.teamId && source.teamId && target.teamId === source.teamId) return;

                    const dist = Math.hypot(target.pos.x - center.x, target.pos.y - center.y);
                    if (dist < source.explosionRadius!) {
                        const falloff = 1 - (dist / source.explosionRadius!);
                        const aoeDmg = source.damage * 0.5 * falloff;
                        target.health -= aoeDmg;
                        target.flashTimer = 0.1;
                        PhysicsSystem.spawnFloatingText(allEntities, target.pos, Math.round(aoeDmg).toString(), '#ffaa00', false);
                        
                        if (target.health <= 0 && !target.isDead) {
                            target.isDead = true;
                            onDeath(target, source);
                        }
                    }
                });
            }
        };

        if (entA.health <= 0 && entA.type === EntityType.BULLET) handleExplosion(entA, entA.pos);
        if (entB.health <= 0 && entB.type === EntityType.BULLET) handleExplosion(entB, entB.pos);

        const dist = Math.hypot(entA.pos.x - entB.pos.x, entA.pos.y - entB.pos.y) || 1;
        const overlap = entA.radius + entB.radius - dist;
        const dx = (entA.pos.x - entB.pos.x) / dist;
        const dy = (entA.pos.y - entB.pos.y) / dist;
        
        if (overlap > 0) {
            const isBulletCollision = entA.type === EntityType.BULLET && entB.type === EntityType.BULLET;
            const isAnyBullet = entA.type === EntityType.BULLET || entB.type === EntityType.BULLET;

            if (isBulletCollision) {
                ParticleSystem.spawnHitEffect(allEntities, { x: (entA.pos.x + entB.pos.x)/2, y: (entA.pos.y + entB.pos.y)/2 }, '#fff');
            } else if (!isAnyBullet) {
                const totalMass = entA.mass + entB.mass;
                const rA = entB.mass / totalMass;
                const rB = entA.mass / totalMass;
                
                if (entA.type !== EntityType.WALL) { entA.pos.x += dx * overlap * rA; entA.pos.y += dy * overlap * rA; }
                if (entB.type !== EntityType.WALL) { entB.pos.x -= dx * overlap * rB; entB.pos.y -= dy * overlap * rB; }
                
                if (GAME_RULES.ENABLE_KNOCKBACK) {
                    const dvx = entA.vel.x - entB.vel.x;
                    const dvy = entA.vel.y - entB.vel.y;
                    const velAlongNormal = dvx * dx + dvy * dy;

                    if (velAlongNormal < 0) {
                        const restitution = 0.2; 
                        let j = -(1 + restitution) * velAlongNormal;
                        j /= (1 / entA.mass + 1 / entB.mass);
                        const impulseX = j * dx;
                        const impulseY = j * dy;
                        if (entA.type !== EntityType.WALL) { entA.vel.x += impulseX / entA.mass; entA.vel.y += impulseY / entA.mass; }
                        if (entB.type !== EntityType.WALL) { entB.vel.x -= impulseX / entB.mass; entB.vel.y -= impulseY / entB.mass; }
                    }
                }
            }
        }
        
        if (entA.health <= 0) { entA.isDead = true; onDeath(entA, entB); }
        if (entB.health <= 0) { entB.isDead = true; onDeath(entB, entA); }
  }

  static spawnFloatingText(entities: Entity[], pos: Vector2, text: string, color: string, isBig: boolean = false) {
      const spreadX = (Math.random() - 0.5) * 40;
      const spreadY = (Math.random() - 0.5) * 20;
      
      entities.push({
          id: `text_${Math.random()}`,
          type: EntityType.FLOATING_TEXT,
          pos: { x: pos.x + spreadX, y: pos.y - 20 + spreadY },
          vel: { x: spreadX * 0.5, y: -150 },
          radius: 0,
          rotation: 0,
          color: color,
          text: text,
          health: 1, maxHealth: 1, damage: 0, isDead: false,
          lifespan: 0.8,
          opacity: 1.0,
          isCritical: isBig
      });
  }
  
  static processHitscan(
      start: Vector2, 
      angle: number, 
      owner: Entity, 
      barrel: Barrel, 
      entities: Entity[], 
      player: Entity, 
      onDeath: any, 
      cameraManager: CameraManager, 
      statManager: StatManager, 
      statusEffectSystem: StatusEffectSystem, 
      audioManager?: AudioManager
  ) {
      const bulletSpeedStat = statManager.getStat(owner, 'bulletSpd');
      const baseRange = 350; 
      const rangePerStat = 70;
      const maxDist = Math.max(200, baseRange + (bulletSpeedStat * rangePerStat));
      
      let actualEndPoint = { x: start.x + Math.cos(angle) * maxDist, y: start.y + Math.sin(angle) * maxDist };
      
      const allEntities = [...entities, player];
      let closestHit: { entity: Entity | null, pos: Vector2, distSq: number, isWall: boolean } | null = null;
      let minHitDistSq = maxDist * maxDist;

      for (const target of allEntities) {
          if (target.isDead || target.id === owner.id || target.id === owner.ownerId) continue;
          if (target.teamId && owner.teamId && target.teamId === owner.teamId) continue; 
          if (target.type === EntityType.PARTICLE || target.type === EntityType.FLOATING_TEXT || target.type === EntityType.ZONE) continue;
          
          let hitPos: Vector2 | null = null;
          if (target.type === EntityType.WALL) hitPos = this.intersectLineRect(start, actualEndPoint, target);
          else hitPos = this.intersectLineCircle(start, actualEndPoint, target);
          
          if (hitPos) {
              const distSq = (hitPos.x - start.x) ** 2 + (hitPos.y - start.y) ** 2;
              if (distSq < minHitDistSq) { 
                  minHitDistSq = distSq; 
                  closestHit = { 
                      entity: target.type === EntityType.WALL ? null : target, 
                      pos: hitPos,
                      distSq: distSq,
                      isWall: target.type === EntityType.WALL
                  }; 
              }
          }
      }

      if (closestHit) {
          actualEndPoint = closestHit.pos; 
          
          if (!closestHit.isWall && closestHit.entity) {
              const target = closestHit.entity;
              if (!target.isInvulnerable) {
                  const baseDmg = (owner.id === 'player' ? statManager.getStat(owner, 'bulletDmg') : 10) * barrel.damageMult;
                  let finalDmg = baseDmg;
                  
                  const critChance = statManager.getStat(owner, 'critChance');
                  const isCrit = Math.random() < critChance;
                  if (isCrit) {
                      const critMult = statManager.getStat(owner, 'critDamage') || 1.5;
                      finalDmg *= critMult;
                      if (audioManager) audioManager.play(SoundType.CRIT, target.pos, player.pos);
                      PhysicsSystem.spawnFloatingText(allEntities, target.pos, "CRIT!", "#ffd700", true);
                  }

                  target.health -= finalDmg;
                  target.lastDamageTime = Date.now();
                  target.flashTimer = 0.1; 
                  
                  const color = target.id === 'player' ? '#ff3333' : (isCrit ? '#ffd700' : '#ffffff');
                  PhysicsSystem.spawnFloatingText(allEntities, target.pos, Math.round(finalDmg).toString(), color, isCrit);

                  if (barrel.bulletType === BulletType.INCENDIARY) {
                      statusEffectSystem.apply(target, { type: StatusEffectType.BURN, duration: 3.0, damagePerSecond: 5, sourceId: owner.id });
                  } else if (barrel.bulletType === BulletType.CRYO) {
                      statusEffectSystem.apply(target, { type: StatusEffectType.SLOW, duration: 2.0, slowFactor: 0.4, sourceId: owner.id });
                  }

                  if (target.health <= 0) {
                      target.isDead = true;
                      onDeath(target, owner);
                  }
              }
          }
          ParticleSystem.spawnHitEffect(entities, closestHit.pos, closestHit.isWall ? '#888' : (closestHit.entity?.color || '#fff'));
      }

      const beamColor = barrel.bulletColor || owner.color;
      ParticleSystem.spawnBeamEffect(entities, start, actualEndPoint, beamColor);
  }
}
