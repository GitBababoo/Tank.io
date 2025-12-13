
import { Entity, EntityType, BossType, Vector2 } from '../../../types';
import { COLORS } from '../../../constants';

export class UIRenderer {
    ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    public drawEntityUI(entity: Entity) {
        // Skip dead things or particles
        if (entity.isDead || entity.type === EntityType.PARTICLE || entity.type === EntityType.BULLET || entity.type === EntityType.DRONE || entity.type === EntityType.TRAP) return;

        // Skip invisible entities (unless it's the player's own view, handled elsewhere, or partially revealed)
        if (entity.opacity !== undefined && entity.opacity < 0.2) return;

        this.ctx.save();
        this.ctx.translate(entity.pos.x, entity.pos.y);

        // 1. Draw Name (If exists)
        if (entity.name && entity.type !== EntityType.SHAPE) {
            this.drawName(entity.name, -entity.radius - 12);
        }

        // 2. Draw Health Bar
        // Logic: Show if damaged OR if it's a Player/Boss (Always show for significant entities)
        const isDamaged = entity.health < entity.maxHealth;
        const isImportant = entity.type === EntityType.PLAYER || entity.type === EntityType.BOSS || entity.type === EntityType.ENEMY;
        
        if (isDamaged || (isImportant && entity.type !== EntityType.ENEMY)) {
            // Bosses get bigger bars
            if (entity.type === EntityType.BOSS) {
                this.drawBossHealthBar(entity);
            } else {
                this.drawStandardHealthBar(entity);
            }
        }
        
        this.ctx.restore();
    }

    public drawFloatingText(entity: Entity) {
        if (entity.type !== EntityType.FLOATING_TEXT) return;
        
        this.ctx.save();
        this.ctx.translate(entity.pos.x, entity.pos.y);
        
        // --- JUICIER ANIMATION ---
        const maxLife = 0.8;
        const life = entity.lifespan || 0;
        const progress = 1 - (life / maxLife); // 0 (start) to 1 (end)
        
        // Scale: Pop up then shrink
        // Crit (isCritical) pops bigger
        const baseScale = entity.isCritical ? 1.5 : 1.0;
        let scale = baseScale;
        
        if (progress < 0.2) {
            // EaseOutBack for "Pop" effect
            const p = progress / 0.2;
            scale = baseScale * (1 + Math.sin(p * Math.PI) * 0.5); 
        } else {
            scale = baseScale * (1.0 - (progress - 0.2) * 0.2); // Slowly shrink
        }
        
        // Fade out at end
        this.ctx.globalAlpha = Math.max(0, Math.min(1, (life * 2)));
        
        // Draw Text
        this.ctx.scale(scale, scale);
        
        // Font Selection
        if (entity.isCritical) {
            this.ctx.font = '900 18px "Arial Black", sans-serif';
        } else {
            this.ctx.font = 'bold 14px Arial, sans-serif';
        }
        
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Thick Outline for readability
        this.ctx.lineWidth = entity.isCritical ? 4 : 3;
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeText(entity.text || '', 0, 0);
        
        // Fill
        this.ctx.fillStyle = entity.color;
        this.ctx.fillText(entity.text || '', 0, 0);
        
        this.ctx.restore();
    }

    public drawLeaderArrow(playerPos: Vector2, leaderPos: Vector2) {
        const angle = Math.atan2(leaderPos.y - playerPos.y, leaderPos.x - playerPos.x);
        const dist = 150;
        this.ctx.save();
        this.ctx.translate(playerPos.x, playerPos.y);
        this.ctx.rotate(angle);
        this.ctx.translate(dist, 0);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.lineTo(-20, -10); this.ctx.lineTo(-20, 10); this.ctx.fill();
        this.ctx.fillStyle = '#00ff00';
        this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.lineTo(-15, -7); this.ctx.lineTo(-15, 7); this.ctx.fill();
        this.ctx.restore();
    }

    // --- Helpers ---

    private drawName(name: string, yOffset: number) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px Ubuntu, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        this.ctx.strokeText(name, 0, yOffset);
        this.ctx.fillText(name, 0, yOffset);
    }

    private drawStandardHealthBar(entity: Entity) {
        const yOffset = entity.radius + 15;
        const width = entity.radius * 2;
        const height = 4;

        // Background
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(-width/2, yOffset, width, height); 
        
        // Foreground
        const pct = Math.max(0, Math.min(1, entity.health / entity.maxHealth));
        
        let color = '#8eff8e'; // Green
        if (pct < 0.5) color = '#ffe552'; // Yellow
        if (pct < 0.25) color = '#ff5252'; // Red

        this.ctx.fillStyle = color;
        this.ctx.fillRect(-width/2, yOffset, width * pct, height);

        // Border
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(-width/2 - 0.5, yOffset - 0.5, width + 1, height + 1);
    }

    private drawBossHealthBar(entity: Entity) {
        // Boss bars are larger
        const width = entity.radius * 2.5;
        const height = 8;
        const yOffset = entity.radius + 25;

        // Background
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(-width/2, yOffset, width, height);

        // Foreground
        const pct = Math.max(0, Math.min(1, entity.health / entity.maxHealth));
        
        const grad = this.ctx.createLinearGradient(-width/2, 0, width/2, 0);
        grad.addColorStop(0, '#ff0000'); 
        grad.addColorStop(1, '#ffff00'); 

        this.ctx.fillStyle = grad;
        this.ctx.fillRect(-width/2, yOffset, width * pct, height);

        // Border
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-width/2, yOffset, width, height);
    }
}
