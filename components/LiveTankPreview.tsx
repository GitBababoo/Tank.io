
import React, { useRef, useEffect, useState } from 'react';
import { TankConfig, Entity, EntityType, StatKey, ParticleType } from '../types';
import { RenderSystem } from '../engine/systems/RenderSystem';
import { WeaponSystem } from '../engine/systems/WeaponSystem';
import { ParticleSystem } from '../engine/systems/ParticleSystem';
import { PhysicsSystem } from '../engine/systems/PhysicsSystem'; // For movement
import { COLORS } from '../constants';

interface LiveTankPreviewProps {
    config: TankConfig;
    className?: string;
}

export const LiveTankPreview: React.FC<LiveTankPreviewProps> = ({ config, className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        // Setup resizing
        const resize = () => {
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const renderer = new RenderSystem(canvas);
        
        // --- MOCK ENTITIES ---
        const center = { x: canvas.width / 2, y: canvas.height / 2 };
        
        const tank: Entity = {
            id: 'preview_tank',
            type: EntityType.PLAYER,
            pos: { x: center.x, y: center.y },
            vel: { x: 0, y: 0 },
            radius: 24,
            rotation: -Math.PI / 2,
            color: config.bodyColorOverride || COLORS.player,
            health: 100, maxHealth: 100, damage: 10, isDead: false,
            // Important: attach config path so renderer knows how to draw body
            classPath: 'basic', // Will be overridden visually by passing config to render function
            barrelCooldowns: [],
            barrelRecoils: [],
            opacity: 1.0
        };

        // Dummy Target
        const target: Entity = {
            id: 'dummy_target',
            type: EntityType.ENEMY,
            pos: { x: center.x, y: center.y - 200 },
            vel: { x: 20, y: 0 }, // Moving target
            radius: 20,
            rotation: 0,
            color: '#ff4444',
            health: 10000, maxHealth: 10000, damage: 0, isDead: false
        };

        const entities: Entity[] = [target];
        let lastTime = performance.now();
        let animId: number;
        let skillTimer = 0;
        let skillActiveTimer = 0;

        // --- SIMULATION LOOP ---
        const loop = (time: number) => {
            const dt = Math.min((time - lastTime) / 1000, 0.1);
            lastTime = time;

            // 1. Update Tank Rotation (Aim at target)
            const dx = target.pos.x - tank.pos.x;
            const dy = target.pos.y - tank.pos.y;
            const targetAngle = Math.atan2(dy, dx);
            
            // Smooth rotation
            let angleDiff = targetAngle - tank.rotation;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            tank.rotation += angleDiff * 5 * dt;

            // 2. Update Target Movement (Orbit)
            const timeSec = time / 1000;
            target.pos.x = center.x + Math.sin(timeSec) * 150;
            target.pos.y = center.y - 150 + Math.cos(timeSec * 0.5) * 50;

            // 3. SKILL SIMULATION
            const skill = config.activeSkill;
            if (skill) {
                skillTimer += dt;
                
                // Trigger Skill every 3 seconds
                if (skillTimer > 3.0) {
                    skillTimer = 0;
                    skillActiveTimer = skill.duration || 0.5;
                    
                    // Visual cues for skills
                    if (skill.type === 'DASH') {
                        tank.vel.x += Math.cos(tank.rotation) * 400;
                        tank.vel.y += Math.sin(tank.rotation) * 400;
                        ParticleSystem.spawnGhostTrail(entities, tank);
                    } else if (skill.type === 'TELEPORT') {
                        ParticleSystem.spawnTeleportFlash(entities, tank.pos);
                        // Teleport forward slightly
                        tank.pos.x += Math.cos(tank.rotation) * 50;
                        tank.pos.y += Math.sin(tank.rotation) * 50;
                    } else if (skill.type === 'REPEL') {
                        ParticleSystem.spawnShockwave(entities, tank.pos, 150, '#00ffff');
                    }
                }

                // Sustain Effects
                if (skillActiveTimer > 0) {
                    skillActiveTimer -= dt;
                    if (skill.type === 'INVISIBILITY') {
                        tank.opacity = 0.2;
                    } else if (skill.type === 'FORTIFY') {
                        // Visual shield handled in renderer by checking stats/flags
                        // Here we just mock it for the renderer
                        if (!tank.statusEffects) tank.statusEffects = [];
                        // We need a way to tell renderer to draw shield without full game logic
                        // For preview, we can just let it be, or add a visual marker
                    }
                } else {
                    if (skill.type === 'INVISIBILITY') {
                        tank.opacity = Math.min(1, (tank.opacity || 0) + dt * 2);
                    }
                }
            }

            // 4. Update Physics (Friction)
            tank.pos.x += tank.vel.x * dt;
            tank.pos.y += tank.vel.y * dt;
            tank.vel.x *= 0.9;
            tank.vel.y *= 0.9;
            
            // Keep tank centered
            tank.pos.x += (center.x - tank.pos.x) * 2 * dt;
            tank.pos.y += (center.y - tank.pos.y) * 2 * dt;

            // 5. Weapon System
            // Mock stats accessor
            const getStat = (key: StatKey) => {
                const bonus = config.statBonus?.[key] || 1;
                if (key === 'reload') return 40 / bonus; // Frames
                if (key === 'bulletSpd') return 5 * bonus;
                if (key === 'bulletDmg') return 10 * bonus;
                if (key === 'bulletPen') return 10 * bonus;
                return 1;
            };

            // Fire!
            // Don't fire if invisible and hiding
            const isFiring = !(skill?.type === 'INVISIBILITY' && skillActiveTimer > 0);
            
            WeaponSystem.update(
                tank, 
                config, 
                dt, 
                isFiring, 
                false, 
                entities, 
                getStat, 
                // Hitscan Callback
                (start, angle, owner, barrel) => {
                    const end = { 
                        x: start.x + Math.cos(angle) * 800, 
                        y: start.y + Math.sin(angle) * 800 
                    };
                    ParticleSystem.spawnBeamEffect(entities, start, end, owner.color);
                    ParticleSystem.spawnHitEffect(entities, end, '#fff'); // Fake hit at end
                },
                0 // Ability Timer
            );

            // 6. Update Projectiles & Particles
            PhysicsSystem.updateMovement(entities, dt, { getEntityMass: () => 1 } as any, 9999, 9999);
            ParticleSystem.update(entities, dt);

            // Cleanup
            for (let i = entities.length - 1; i >= 0; i--) {
                const ent = entities[i];
                if (ent.isDead) entities.splice(i, 1);
                // Kill bullets that go off screen
                if (ent.type === EntityType.BULLET) {
                    const dist = Math.hypot(ent.pos.x - center.x, ent.pos.y - center.y);
                    if (dist > 600) ent.isDead = true;
                }
            }

            // 7. Render
            const ctx = renderer.ctx;
            // Clear with transparency
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.save();
            // Draw Grid (Optional)
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            const gridSize = 40;
            const offX = (time / 20) % gridSize;
            const offY = (time / 20) % gridSize;
            ctx.beginPath();
            for(let x=offX; x<canvas.width; x+=gridSize) { ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); }
            for(let y=offY; y<canvas.height; y+=gridSize) { ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); }
            ctx.stroke();

            // Draw Target
            renderer.drawEntity(target);

            // Draw Entities (Bullets, Particles)
            entities.forEach(e => {
                if (e.type === EntityType.BULLET) renderer.effectRenderer.drawBullet(e);
                if (e.type === EntityType.DRONE) renderer.effectRenderer.drawDrone(e);
                if (e.type === EntityType.TRAP) renderer.effectRenderer.drawTrap(e);
                if (e.type === EntityType.PARTICLE) renderer.effectRenderer.drawParticle(e);
            });

            // Draw Tank (Using the special logic to render config shapes)
            renderer.drawTankDynamic(tank, config, false);

            ctx.restore();

            animId = requestAnimationFrame(loop);
        };

        animId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, [config]);

    return (
        <div ref={containerRef} className={`relative overflow-hidden bg-slate-900/50 rounded-xl border border-slate-700 ${className}`}>
            <canvas ref={canvasRef} className="block w-full h-full" />
            
            {/* Overlay Labels */}
            <div className="absolute bottom-2 left-2 flex flex-col gap-1 pointer-events-none">
                <div className="text-[10px] font-bold text-slate-500 uppercase bg-black/40 px-2 py-1 rounded w-fit backdrop-blur-md">
                    Target Dummy (10k HP)
                </div>
                {config.activeSkill && (
                    <div className="flex items-center gap-2 animate-pulse">
                        <span className="text-yellow-400 text-xs">⚡</span>
                        <span className="text-[10px] font-bold text-yellow-100 uppercase bg-yellow-900/40 px-2 py-1 rounded w-fit border border-yellow-700/50 backdrop-blur-md">
                            Demo: {config.activeSkill.name}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
