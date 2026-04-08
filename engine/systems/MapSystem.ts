
import { Entity, EntityType, GameMode } from '../../types';
import { MAP_DEFINITIONS } from '../../data/maps/MapDefinitions';
import { COLORS } from '../../constants';

/**
 * MAP SYSTEM (THE BUILDER)
 * Responsible for constructing the world based on the MapConfig.
 * It strictly handles Creation (Wall/Zone entities), NOT runtime logic.
 */
export class MapSystem {

    static generateMap(entities: Entity[], gameMode: GameMode) {
        const config = MAP_DEFINITIONS[gameMode];
        if (!config) {
            console.error(`Map config not found for mode: ${gameMode}`);
            return;
        }

        console.log(`Generating Map: ${config.id} (${config.width}x${config.height})`);

        // 1. Generate Zones (Bases/Safe Zones)
        config.zones.forEach((zone, idx) => {
            entities.push({
                id: `zone_${config.id}_${idx}`,
                type: EntityType.ZONE,
                pos: { x: zone.x, y: zone.y },
                vel: { x: 0, y: 0 },
                radius: 0, // Rectangular zones use width/height
                width: zone.width,
                height: zone.height,
                rotation: 0,
                color: zone.color,
                health: 99999,
                maxHealth: 99999,
                damage: 0,
                isDead: false,
                teamId: zone.teamId
            });
        });

        // 2. Generate Static Walls (from Config)
        config.walls.forEach((wall, idx) => {
            entities.push({
                id: `wall_static_${idx}`,
                type: EntityType.WALL,
                pos: { x: wall.x, y: wall.y },
                vel: { x: 0, y: 0 },
                radius: 0,
                width: wall.width,
                height: wall.height,
                rotation: 0,
                color: wall.color || COLORS.wall,
                health: 99999,
                maxHealth: 99999,
                damage: 0,
                isDead: false
            });
        });

        // 3. Generate Procedural Maze (if enabled)
        if (config.generateMaze) {
            this.generateProceduralMaze(entities, config.width, config.height);
        }

        // 4. Generate Sandbox Borders (Special Case)
        if (gameMode === 'SANDBOX') {
            this.generateSandboxBorders(entities, config.width, config.height);
        }
    }

    private static generateProceduralMaze(entities: Entity[], worldWidth: number, worldHeight: number) {
        // Algorithm moved from WorldSystem
        const count = 40;
        const centerSafeRadius = 1200;
        const edgePadding = 300;

        for (let i = 0; i < count; i++) {
            const w = 100 + Math.random() * 400;
            const h = 50 + Math.random() * 50;
            const x = Math.random() * worldWidth;
            const y = Math.random() * worldHeight;

            // Safety Checks
            const distToCenter = Math.hypot(x - worldWidth / 2, y - worldHeight / 2);
            if (distToCenter < centerSafeRadius) continue; // Keep center clear (Nest)
            if (x < edgePadding || y < edgePadding || x > worldWidth - edgePadding || y > worldHeight - edgePadding) continue;

            entities.push({
                id: `wall_maze_${i}`,
                type: EntityType.WALL,
                pos: { x, y },
                vel: { x: 0, y: 0 },
                radius: 0,
                width: Math.random() < 0.5 ? w : h,
                height: Math.random() < 0.5 ? h : w,
                rotation: 0,
                color: COLORS.wall,
                health: 99999,
                maxHealth: 99999,
                damage: 0,
                isDead: false
            });
        }
    }

    private static generateSandboxBorders(entities: Entity[], size: number, sizeH: number) {
        const wallThick = 500;
        const centerX = size / 2;
        const centerY = sizeH / 2;

        // North
        entities.push({ id: 'wall_n', type: EntityType.WALL, pos: { x: centerX, y: -wallThick / 2 }, vel: { x: 0, y: 0 }, radius: 0, width: size + wallThick * 2, height: wallThick, rotation: 0, color: COLORS.wall, health: 99999, maxHealth: 99999, damage: 0, isDead: false });
        // South
        entities.push({ id: 'wall_s', type: EntityType.WALL, pos: { x: centerX, y: size + wallThick / 2 }, vel: { x: 0, y: 0 }, radius: 0, width: size + wallThick * 2, height: wallThick, rotation: 0, color: COLORS.wall, health: 99999, maxHealth: 99999, damage: 0, isDead: false });
        // West
        entities.push({ id: 'wall_w', type: EntityType.WALL, pos: { x: -wallThick / 2, y: centerY }, vel: { x: 0, y: 0 }, radius: 0, width: wallThick, height: size + wallThick * 2, rotation: 0, color: COLORS.wall, health: 99999, maxHealth: 99999, damage: 0, isDead: false });
        // East
        entities.push({ id: 'wall_e', type: EntityType.WALL, pos: { x: size + wallThick / 2, y: centerY }, vel: { x: 0, y: 0 }, radius: 0, width: wallThick, height: size + wallThick * 2, rotation: 0, color: COLORS.wall, health: 99999, maxHealth: 99999, damage: 0, isDead: false });
    }
}
