
import { RenderSystem } from '../systems/RenderSystem';
import { GameSettings, BossType } from '../../types';

export class CommandManager {
    renderSystem: RenderSystem;
    settings: GameSettings;
    spawnBoss: (type?: BossType) => void;
    closeArena: () => void;

    constructor(
        renderSystem: RenderSystem, 
        settings: GameSettings, 
        spawnBoss: (type?: BossType) => void, 
        closeArena: () => void
    ) {
        this.renderSystem = renderSystem;
        this.settings = settings;
        this.spawnBoss = spawnBoss;
        this.closeArena = closeArena;
    }

    execute(commandInput: string): string {
        const parts = commandInput.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (cmd === 'help') return "Available commands: help, ren_background_color [hex], ren_grid_color [hex], ui_scale [val], f_spawn_boss [type], f_close_arena, clear";

        if (cmd === 'ren_background_color') {
            if (!args[0]) return "Usage: ren_background_color [hex]";
            this.renderSystem.colors.background = args[0].startsWith('0x') ? '#' + args[0].substring(2) : args[0];
            return `Background color set to ${args[0]}`;
        }

        if (cmd === 'ren_grid_color') {
            if (!args[0]) return "Usage: ren_grid_color [hex]";
            this.renderSystem.colors.grid = args[0].startsWith('0x') ? '#' + args[0].substring(2) : args[0];
            return `Grid color set to ${args[0]}`;
        }

        if (cmd === 'ui_scale') {
            const val = parseFloat(args[0]);
            if (isNaN(val) || val < 0.1 || val > 3) return "Usage: ui_scale [0.1-3.0]";
            this.settings.graphics.hudScale = val;
            return `UI scale set to ${val}`;
        }

        if (cmd === 'f_spawn_boss') {
            this.spawnBoss(args[0] ? args[0].toUpperCase() as BossType : undefined);
            return "Boss Spawned.";
        }

        if (cmd === 'f_close_arena') {
            this.closeArena();
            return "Arena Closing...";
        }

        return `Unknown command: ${cmd}`;
    }
}