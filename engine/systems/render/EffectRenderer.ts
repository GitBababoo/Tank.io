
import { Entity, ParticleType, Vector2, BulletType } from '../../../types';

export class EffectRenderer {
    ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    public drawBullet(bullet: Entity) {
        this.ctx.save();
        this.ctx.translate(bullet.pos.x, bullet.pos.y);
        this.ctx.rotate(bullet.rotation); // Important: Rotate so shapes face direction of travel
        
        const r = bullet.radius;
        
        // --- VISUAL SETUP ---
        this.ctx.fillStyle = bullet.color;
        this.ctx.lineWidth = 2;
        
        // Add Glow Effect to ALL bullets for better visibility on dark background
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = bullet.color;

        this.ctx.beginPath();

        // --- UNIQUE BULLET MODELS BASED ON TYPE & VISUAL ---
        const visual = bullet.bulletVisual;
        const type = bullet.bulletType;

        if (visual === 'MISSILE') {
            // === REALISTIC ROCKET/MISSILE RENDER ===
            // This is complex: Warhead, Body, Fins, Engine
            const length = r * 3.5;
            const width = r * 1.0;
            const finSize = r * 1.4;

            // 1. Rear Engine Glow
            this.ctx.save();
            this.ctx.translate(-length * 0.4, 0);
            const flicker = Math.random() * 0.3 + 0.7;
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.shadowColor = '#ff4400';
            this.ctx.shadowBlur = 20;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -width * 0.4);
            this.ctx.lineTo(-length * 0.6 * flicker, 0); // Flame Tail
            this.ctx.lineTo(0, width * 0.4);
            this.ctx.fill();
            this.ctx.restore();

            // 2. Missile Body (Cylindrical)
            this.ctx.fillStyle = '#eeeeee'; // White body usually
            this.ctx.beginPath();
            this.ctx.rect(-length * 0.4, -width/2, length * 0.7, width);
            this.ctx.fill();
            this.ctx.stroke();

            // 3. Warhead (Cone - Colored by Team/Type)
            this.ctx.fillStyle = bullet.color; // The danger part
            this.ctx.beginPath();
            this.ctx.moveTo(length * 0.3, -width/2);
            this.ctx.lineTo(length * 0.8, 0); // Sharp tip
            this.ctx.lineTo(length * 0.3, width/2);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            // 4. Rear Fins (Stabilizers)
            this.ctx.fillStyle = '#888888';
            this.ctx.beginPath();
            this.ctx.moveTo(-length * 0.4, 0);
            this.ctx.lineTo(-length * 0.6, -finSize); // Top fin
            this.ctx.lineTo(-length * 0.2, -width/2);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(-length * 0.4, 0);
            this.ctx.lineTo(-length * 0.6, finSize); // Bottom fin
            this.ctx.lineTo(-length * 0.2, width/2);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

        } else if (visual === 'PLASMA') {
            // === ELECTRIC PLASMA ORB ===
            const pulse = 1.0 + Math.sin(Date.now() / 50) * 0.2; // Fast unstable pulse
            
            // Core (White Hot)
            this.ctx.shadowBlur = 30;
            this.ctx.shadowColor = bullet.color;
            this.ctx.fillStyle = '#ffffff'; 
            this.ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Outer Energy Shell
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
            this.ctx.strokeStyle = bullet.color;
            this.ctx.lineWidth = 4;
            this.ctx.stroke();

            // Electricity Arcs
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            for(let i=0; i<3; i++) {
                const angle = Math.random() * Math.PI * 2;
                this.ctx.moveTo(Math.cos(angle)*r*0.5, Math.sin(angle)*r*0.5);
                this.ctx.lineTo(Math.cos(angle)*r*1.5, Math.sin(angle)*r*1.5);
            }
            this.ctx.stroke();
            
        } else if (type === BulletType.ARMOR_PIERCING) {
            // === SABOT DART (Kinetic Penetrator) ===
            // Long, thin, heavy metal
            const length = r * 3.0;
            const width = r * 0.6;
            
            this.ctx.fillStyle = '#dddddd'; // Metallic
            this.ctx.shadowColor = '#ffffff'; // Air friction glow
            
            this.ctx.beginPath();
            this.ctx.moveTo(length * 0.6, 0); // Tip
            this.ctx.lineTo(-length * 0.4, width); // Base Top
            this.ctx.lineTo(-length * 0.4, -width); // Base Bottom
            this.ctx.closePath();
            this.ctx.fill();
            
            // Core Line
            this.ctx.strokeStyle = bullet.color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(-length * 0.4, 0);
            this.ctx.lineTo(length * 0.4, 0);
            this.ctx.stroke();

        } else if (type === BulletType.HIGH_EXPLOSIVE) {
            // === HE SHELL (Round, Heavy, Pulsing) ===
            // Looks like a cannonball about to burst
            this.ctx.fillStyle = '#333'; // Steel casing
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            
            // Glowing Cracks (Unstable explosive filler)
            this.ctx.fillStyle = Date.now() % 400 < 200 ? '#ff4400' : '#ffff00'; 
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
            this.ctx.fill();

        } else if (type === BulletType.CRYO || visual === 'ICE') {
            // SHAPE: Crystal Shard / Snowflake
            const points = 6;
            this.ctx.moveTo(r, 0);
            for (let i = 1; i < points * 2; i++) {
                const angle = (Math.PI * i) / points;
                const rad = i % 2 === 0 ? r : r * 0.5;
                this.ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.strokeStyle = '#ffffff'; // White shiny edge
            this.ctx.stroke();

        } else if (type === BulletType.INCENDIARY || visual === 'FLAME') {
            // SHAPE: Teardrop Flame
            this.ctx.arc(0, 0, r, 0.5, -0.5, true); // Round head
            this.ctx.lineTo(-r * 1.8, 0); // Long tail
            this.ctx.closePath();
            
            // Gradient Fill
            const grad = this.ctx.createRadialGradient(-r/2, 0, 0, 0, 0, r);
            grad.addColorStop(0, '#ffff00');
            grad.addColorStop(1, bullet.color);
            this.ctx.fillStyle = grad;
            this.ctx.fill();

        } else if (type === BulletType.NANO_SPLITTER) {
            // SHAPE: Cluster
            this.ctx.arc(0, 0, r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.moveTo(-r, -r); this.ctx.lineTo(r, r);
            this.ctx.moveTo(r, -r); this.ctx.lineTo(-r, r);
            this.ctx.strokeStyle = '#000';
            this.ctx.stroke();

        } else {
            // STANDARD: Clean Circle with Rim
            this.ctx.arc(0, 0, r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#222'; // Dark rim
            this.ctx.stroke();
            
            // Gloss shine
            this.ctx.beginPath();
            this.ctx.arc(-r*0.3, -r*0.3, r*0.3, 0, Math.PI*2);
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.fill();
        }
        
        // --- VISUAL GLOW/SHINE (Based on Crit) ---
        if (bullet.isCritical) {
            this.ctx.shadowColor = '#ffd700';
            this.ctx.shadowBlur = 20;
            this.ctx.strokeStyle = '#ffd700';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    public drawDrone(drone: Entity) {
        this.ctx.save();
        this.ctx.translate(drone.pos.x, drone.pos.y);
        this.ctx.rotate(drone.rotation);

        this.ctx.fillStyle = drone.color;
        this.ctx.strokeStyle = '#222';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        const sides = 3;
        const step = (Math.PI * 2) / sides;
        for (let i = 0; i < sides; i++) {
            this.ctx.lineTo(Math.cos(step * i) * drone.radius, Math.sin(step * i) * drone.radius);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
    }

    public drawTrap(trap: Entity) {
        this.ctx.save();
        this.ctx.translate(trap.pos.x, trap.pos.y);
        this.ctx.rotate(trap.rotation);

        this.ctx.fillStyle = trap.color;
        this.ctx.strokeStyle = '#222';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        const r = trap.radius;
        // Inverted Triangle / Spiked shape
        this.ctx.moveTo(r, 0);
        this.ctx.lineTo(r * 0.5, r * 0.866);
        this.ctx.lineTo(-r * 0.5, r * 0.866);
        this.ctx.lineTo(-r, 0);
        this.ctx.lineTo(-r * 0.5, -r * 0.866);
        this.ctx.lineTo(r * 0.5, -r * 0.866);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
    }

    public drawParticle(p: Entity) {
        this.ctx.save();
        this.ctx.translate(p.pos.x, p.pos.y);
        
        if (p.opacity !== undefined) this.ctx.globalAlpha = p.opacity;
        
        if (p.particleType !== ParticleType.SHOCKWAVE) {
            this.ctx.rotate(p.rotation);
        }
        
        this.ctx.fillStyle = p.color;

        if (p.particleType === ParticleType.SMOKE) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            this.ctx.fill();
        } else if (p.particleType === ParticleType.SPARK || p.particleType === ParticleType.DEBRIS) {
            this.ctx.fillRect(-p.radius, -p.radius, p.radius*2, p.radius*2);
        } else if (p.particleType === ParticleType.BEAM && p.targetPos) {
            // --- HIGH QUALITY LASER RENDERING ---
            const relX = p.targetPos.x - p.pos.x;
            const relY = p.targetPos.y - p.pos.y;
            
            // Enable Additive Blending for "Light" effect
            this.ctx.globalCompositeOperation = 'lighter';
            
            const fadeFactor = p.opacity || 1.0;
            const dist = Math.hypot(relX, relY);

            this.ctx.lineCap = 'round';

            // 1. Outer Glow (Colored)
            this.ctx.shadowBlur = 15 * fadeFactor;
            this.ctx.shadowColor = p.color;
            this.ctx.strokeStyle = p.color;
            
            // Make the beam slightly wide at start and end
            this.ctx.lineWidth = 14 * fadeFactor; 
            this.ctx.globalAlpha = 0.6 * fadeFactor;
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(relX, relY);
            this.ctx.stroke();
            
            // 2. Inner Core (White hot)
            this.ctx.shadowBlur = 0; 
            this.ctx.strokeStyle = '#ffffff'; 
            this.ctx.globalAlpha = 0.9 * fadeFactor;
            this.ctx.lineWidth = 4 * fadeFactor; 
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(relX, relY);
            this.ctx.stroke();
            
            // 3. Impact Flare (At end point)
            this.ctx.translate(relX, relY);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 10 * fadeFactor, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Reset Blend Mode
            this.ctx.globalCompositeOperation = 'source-over';
            
        } else if (p.particleType === ParticleType.FLAME) {
             // Realistic Flame Expansion
             const grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius);
             grad.addColorStop(0, 'rgba(255, 255, 200, 0.8)'); // Hot core
             grad.addColorStop(0.4, p.color); // Orange/Red
             grad.addColorStop(1, 'rgba(50, 50, 50, 0)'); // Smoke edge
             
             this.ctx.fillStyle = grad;
             this.ctx.beginPath();
             this.ctx.arc(0, 0, p.radius, 0, Math.PI*2);
             this.ctx.fill();

        } else if (p.particleType === ParticleType.CRYO || p.particleType === ParticleType.SNOW) {
             // Hexagonal Snow/Ice
             this.ctx.fillStyle = p.color;
             this.ctx.beginPath();
             const sides = 6;
             for(let i=0; i<sides; i++) {
                 const a = i * Math.PI * 2 / sides;
                 this.ctx.lineTo(Math.cos(a)*p.radius, Math.sin(a)*p.radius);
             }
             this.ctx.fill();
             // Shine
             this.ctx.strokeStyle = '#fff';
             this.ctx.lineWidth = 1;
             this.ctx.stroke();

        } else if (p.particleType === ParticleType.RAIN) {
             this.ctx.fillRect(-1, -p.radius, 2, p.radius*2);
        } else if (p.particleType === ParticleType.GHOST) {
             this.ctx.beginPath();
             this.ctx.arc(0, 0, p.radius, 0, Math.PI*2);
             this.ctx.fillStyle = p.color;
             this.ctx.fill();
        } else if (p.particleType === ParticleType.SHOCKWAVE) {
             this.ctx.beginPath();
             this.ctx.arc(0, 0, p.radius, 0, Math.PI*2);
             this.ctx.strokeStyle = p.color;
             this.ctx.lineWidth = 10 * (p.opacity || 1);
             this.ctx.stroke();
        } else if (p.particleType === ParticleType.TELEPORT_FLASH) {
             this.ctx.shadowColor = p.color;
             this.ctx.shadowBlur = 30;
             this.ctx.fillStyle = '#ffffff';
             this.ctx.beginPath();
             this.ctx.arc(0, 0, p.radius, 0, Math.PI*2);
             this.ctx.fill();
        }

        this.ctx.restore();
    }
}
