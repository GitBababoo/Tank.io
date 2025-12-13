
import React, { useEffect, useRef } from 'react';
import { TankConfig, Entity, EntityType, BodyShape } from '../types';
import { RenderSystem } from '../engine/systems/RenderSystem';
import { COLORS } from '../constants';

interface TankPreviewProps {
    config: TankConfig;
    size?: number;
    className?: string;
}

export const TankPreview: React.FC<TankPreviewProps> = ({ config, size = 100, className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // High DPI scaling
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        
        // Context creation via RenderSystem (Transparent)
        const renderer = new RenderSystem(canvas, true);
        const ctx = renderer.ctx;
        ctx.scale(dpr, dpr);
        
        // Center the coordinate system
        ctx.translate(size/2, size/2);
        
        // --- Dynamic Scale Calculation ---
        const baseRadius = 20;
        let maxExtent = baseRadius;

        if (config.barrels) {
            config.barrels.forEach(b => {
                // Approximate max reach: Offset (center to mount) + Length
                // Using hypot for diagonal offsets
                const reach = Math.hypot(b.offset.x, b.offset.y) + b.length;
                if (reach > maxExtent) maxExtent = reach;
            });
        }

        // Add padding (10%)
        const padding = maxExtent * 0.1;
        const scale = (size / 2) / (maxExtent + padding);
        ctx.scale(scale, scale);
        
        // Determine Color
        let color = config.bodyColorOverride;
        if (!color) {
             const roleKey = `role${config.role.charAt(0) + config.role.slice(1).toLowerCase()}`;
             color = COLORS[roleKey as keyof typeof COLORS] || COLORS.player;
        }

        // Mock Entity for Preview
        const dummyEnt: Entity = {
            id: 'preview',
            type: EntityType.PLAYER,
            pos: { x: 0, y: 0 }, // Draw at (0,0) relative to the translated context
            vel: { x: 0, y: 0 },
            radius: baseRadius, // Base Radius is constant for drawing, context scale handles the visual size
            rotation: -Math.PI / 2, // Point Upwards
            color: color,
            health: 100, maxHealth: 100, damage: 0, isDead: false
        };

        // Render using actual game logic
        renderer.drawTankDynamic(dummyEnt, config, false);

    }, [config, size]);

    return <canvas ref={canvasRef} style={{ width: size, height: size }} className={className} />;
};
