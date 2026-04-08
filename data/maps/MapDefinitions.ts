
import { MapConfig, GameMode } from '../../types';
import { WORLD_SIZE, SANDBOX_SIZE, TEAM_COLORS, COLORS } from '../../constants';

// =========================================================================
//  MAP CONFIGURATION REGISTRY
//  This file controls the layout of every game mode.
// =========================================================================

const BASE_PADDING = 600; // Distance from edge for 2-team bases
const CORNER_SIZE = 1000; // Size of corner bases for 4-teams

// --- STATIC MAZE GENERATION ---
// We generate a fixed set of walls so everyone sees the same map (No Desync)
const MAZE_WALLS = [
    // Center Box (The Nest protection)
    { x: WORLD_SIZE/2, y: WORLD_SIZE/2 - 800, width: 600, height: 50 },
    { x: WORLD_SIZE/2, y: WORLD_SIZE/2 + 800, width: 600, height: 50 },
    { x: WORLD_SIZE/2 - 800, y: WORLD_SIZE/2, width: 50, height: 600 },
    { x: WORLD_SIZE/2 + 800, y: WORLD_SIZE/2, width: 50, height: 600 },

    // L-Shapes Top Left
    { x: 1000, y: 1000, width: 50, height: 600 },
    { x: 1300, y: 700, width: 600, height: 50 },

    // L-Shapes Bottom Right
    { x: WORLD_SIZE - 1000, y: WORLD_SIZE - 1000, width: 50, height: 600 },
    { x: WORLD_SIZE - 1300, y: WORLD_SIZE - 700, width: 600, height: 50 },

    // Corridors
    { x: WORLD_SIZE/2, y: 1200, width: 50, height: 800 },
    { x: WORLD_SIZE/2, y: WORLD_SIZE - 1200, width: 50, height: 800 },
    { x: 1200, y: WORLD_SIZE/2, width: 800, height: 50 },
    { x: WORLD_SIZE - 1200, y: WORLD_SIZE/2, width: 800, height: 50 },
    
    // Random scattered blocks (Fixed positions)
    { x: 2500, y: 1500, width: 200, height: 200 },
    { x: 1500, y: 3500, width: 200, height: 200 },
    { x: 3500, y: 1500, width: 200, height: 200 },
    { x: 3500, y: 3500, width: 200, height: 200 },
];

export const MAP_DEFINITIONS: Record<GameMode, MapConfig> = {
    
    'FFA': {
        id: 'FFA',
        width: WORLD_SIZE,
        height: WORLD_SIZE,
        zones: [],
        walls: [],
        biomeType: 'DEFAULT'
    },

    'TEAMS_2': {
        id: 'TEAMS_2',
        width: WORLD_SIZE,
        height: WORLD_SIZE,
        zones: [
            { x: BASE_PADDING / 2, y: WORLD_SIZE / 2, width: BASE_PADDING, height: WORLD_SIZE, type: 'BASE', teamId: 'BLUE', color: TEAM_COLORS.BLUE },
            { x: WORLD_SIZE - (BASE_PADDING / 2), y: WORLD_SIZE / 2, width: BASE_PADDING, height: WORLD_SIZE, type: 'BASE', teamId: 'RED', color: TEAM_COLORS.RED }
        ],
        walls: [],
        biomeType: 'DEFAULT'
    },

    'TEAMS_4': {
        id: 'TEAMS_4',
        width: WORLD_SIZE,
        height: WORLD_SIZE,
        zones: [
            { x: CORNER_SIZE/2, y: CORNER_SIZE/2, width: CORNER_SIZE, height: CORNER_SIZE, type: 'BASE', teamId: 'BLUE', color: TEAM_COLORS.BLUE },
            { x: CORNER_SIZE/2, y: WORLD_SIZE - CORNER_SIZE/2, width: CORNER_SIZE, height: CORNER_SIZE, type: 'BASE', teamId: 'GREEN', color: TEAM_COLORS.GREEN },
            { x: WORLD_SIZE - CORNER_SIZE/2, y: CORNER_SIZE/2, width: CORNER_SIZE, height: CORNER_SIZE, type: 'BASE', teamId: 'PURPLE', color: TEAM_COLORS.PURPLE },
            { x: WORLD_SIZE - CORNER_SIZE/2, y: WORLD_SIZE - CORNER_SIZE/2, width: CORNER_SIZE, height: CORNER_SIZE, type: 'BASE', teamId: 'RED', color: TEAM_COLORS.RED },
        ],
        walls: [],
        biomeType: 'DEFAULT'
    },

    'MAZE': {
        id: 'MAZE',
        width: WORLD_SIZE,
        height: WORLD_SIZE,
        zones: [],
        walls: MAZE_WALLS, // Use Fixed Walls instead of procedural generation
        generateMaze: false, // Disable random generation
        biomeType: 'DEFAULT'
    },

    // --- SANDBOX MODE ---
    'SANDBOX': {
        id: 'SANDBOX',
        width: 6000, 
        height: 6000,
        zones: [
            { 
                x: 3000, 
                y: 3000, 
                width: 1500, 
                height: 1500, 
                type: 'SAFE', 
                color: '#1a1a24', 
                teamId: undefined 
            }
        ],
        walls: [
            { x: 500, y: 500, width: 200, height: 50 },
            { x: 1000, y: 500, width: 50, height: 200 },
            { x: 500, y: 1500, width: 200, height: 200 },
            { x: 2500, y: 1000, width: 50, height: 800 }
        ],
        biomeType: 'SANDBOX'
    }
};
