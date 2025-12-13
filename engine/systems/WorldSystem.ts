
import { Entity, EntityType, ShapeType, BiomeType, GameMode } from '../../types';
import { WORLD_SIZE, SHAPE_CONFIGS, COLORS, SANDBOX_SIZE } from '../../constants';
import { MAP_DEFINITIONS } from '../../data/maps/MapDefinitions';

export class WorldSystem {
  
  static getBiome(pos: {x: number, y: number}): BiomeType {
      // Logic could be moved to MapDefinitions in future for custom biomes per map
      // For now, standard map uses this layout
      const dist = Math.hypot(pos.x - WORLD_SIZE/2, pos.y - WORLD_SIZE/2);
      if (dist < 800) return BiomeType.NEST;
      if (pos.x < 1000 && pos.y < 1000) return BiomeType.ICE;
      if (pos.x > WORLD_SIZE - 1000 && pos.y > WORLD_SIZE - 1000) return BiomeType.BADLANDS;
      return BiomeType.PLAINS;
  }

  // --- ENTITY SPAWNING (Runtime) ---
  
  static spawnShapes(entities: Entity[], count: number, gameMode: GameMode) {
    // Determine world boundaries from Config
    const config = MAP_DEFINITIONS[gameMode];
    const maxSizeW = config ? config.width : WORLD_SIZE;
    const maxSizeH = config ? config.height : WORLD_SIZE;
    const isSandbox = gameMode === 'SANDBOX';

    for(let i=0; i<count; i++) {
        const pos = { x: Math.random() * maxSizeW, y: Math.random() * maxSizeH };
        const biome = isSandbox ? BiomeType.PLAINS : this.getBiome(pos);
        
        // Prevent spawning in walls (Important for Maze)
        if (config.generateMaze) {
            const inWall = entities.some(e => 
                e.type === EntityType.WALL && 
                pos.x > e.pos.x - e.width!/2 && pos.x < e.pos.x + e.width!/2 &&
                pos.y > e.pos.y - e.height!/2 && pos.y < e.pos.y + e.height!/2
            );
            if (inWall) continue;
        }

        let type = ShapeType.SQUARE;
        let isCrasher = false;
        let variant: 'DEFAULT' | 'GREEN' | 'EVIL' | 'TNT' | 'HEALER' | 'GOLDEN_HEART' = 'DEFAULT';

        // Fanon Polygon Rolls
        const fanonRoll = Math.random();
        if (fanonRoll < 0.02) {
             const specialRoll = Math.random();
             if (specialRoll < 0.3) variant = 'TNT'; 
             else if (specialRoll < 0.6) variant = 'EVIL';
             else if (specialRoll < 0.9) variant = 'HEALER';
             else variant = 'GOLDEN_HEART';
             
             if (variant === 'HEALER') type = ShapeType.CROSS;
             if (variant === 'GOLDEN_HEART') type = ShapeType.HEART;
        }

        if (variant === 'DEFAULT' || variant === 'EVIL' || variant === 'TNT') {
            if (biome === BiomeType.NEST) {
                 const rand = Math.random();
                 if (rand < 0.45) type = ShapeType.PENTAGON;
                 else if (rand < 0.50) type = ShapeType.ALPHA_PENTAGON;
                 else isCrasher = true; 
            } else if (biome === BiomeType.BADLANDS) {
                 const rand = Math.random();
                 if (rand < 0.3) type = ShapeType.TRIANGLE;
                 else if (rand < 0.6) type = ShapeType.SQUARE;
                 else type = ShapeType.HEXAGON;
            } else {
                 const rand = Math.random();
                 if (rand < 0.5) type = ShapeType.SQUARE;
                 else if (rand < 0.9) type = ShapeType.TRIANGLE;
                 else type = ShapeType.PENTAGON;
            }
        }

        const isGreen = Math.random() < 0.005;
        if (isGreen) variant = 'GREEN';

        // FIXED: Use toString(36).slice(2) to generate clean IDs without dots
        const safeId = Math.random().toString(36).slice(2);

        if (isCrasher) {
             entities.push({
                id: `crasher_${safeId}`,
                type: EntityType.CRASHER,
                pos: pos,
                vel: { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 },
                rotation: 0,
                radius: 12,
                color: isGreen ? COLORS.rareGreen : COLORS.crasher,
                health: (isGreen ? 300 : 30),
                maxHealth: (isGreen ? 300 : 30),
                damage: 25,
                scoreValue: (isGreen ? 2500 : 25),
                isDead: false,
                variant: isGreen ? 'GREEN' : 'DEFAULT',
                aiState: 'IDLE'
             });
        } else {
            const config = SHAPE_CONFIGS[type];
            let hp = config.hp;
            let score = config.score;
            let dmg = config.damage;
            let aiState: any = undefined;

            if (variant === 'GREEN') { hp *= 10; score *= 100; }
            if (variant === 'EVIL') { hp *= 2; score *= 2; aiState = 'IDLE'; }
            if (variant === 'TNT') { score *= 2; }
            if (variant === 'HEALER') { score = 15; }
            if (variant === 'GOLDEN_HEART') { score = 90; }

            entities.push({
                id: `shape_${safeId}`,
                type: EntityType.SHAPE,
                pos: pos,
                vel: { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 },
                rotation: Math.random() * Math.PI * 2,
                radius: config.radius,
                color: config.color,
                health: hp,
                maxHealth: hp,
                damage: dmg,
                scoreValue: score,
                isDead: false,
                variant: variant,
                shapeType: type,
                aiState: aiState
            });
        }
    }
  }
}
