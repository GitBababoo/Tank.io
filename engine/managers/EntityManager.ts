import { Entity, EntityType, Vector2 } from '../../types';
import { WORLD_SIZE } from '../../constants';

export class EntityManager {
  entities: Entity[] = [];

  constructor() {}

  add(entity: Entity) {
    this.entities.push(entity);
  }

  cleanup() {
    this.entities = this.entities.filter(e => !e.isDead);
  }

  getSpawnPos(teamId?: string): Vector2 {
      const padding = 500;
      // Corrected spawn points to match base locations from WorldSystem.ts
      if (teamId === 'BLUE') return { x: padding, y: padding };
      if (teamId === 'RED') return { x: WORLD_SIZE - padding, y: WORLD_SIZE - padding };
      if (teamId === 'GREEN') return { x: padding, y: WORLD_SIZE - padding };
      if (teamId === 'PURPLE') return { x: WORLD_SIZE - padding, y: padding };
      
      let pos = { x: 0, y: 0 };
      let valid = false;
      let attempts = 0;
      while(!valid && attempts < 50) {
          pos = { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE };
          const hitWall = this.entities.some(e => {
              if (e.type !== EntityType.WALL) return false;
              // Simple AABB check for spawn safety
              const halfW = (e.width || 100) / 2;
              const halfH = (e.height || 100) / 2;
              return pos.x > e.pos.x - halfW && pos.x < e.pos.x + halfW &&
                     pos.y > e.pos.y - halfH && pos.y < e.pos.y + halfH;
          });
          if (!hitWall) valid = true;
          attempts++;
      }
      return pos;
  }
}