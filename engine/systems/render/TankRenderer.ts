
import { Entity, TankConfig, Barrel, BodyShape, BarrelShape, BossType, BarrelMaterial, StatusEffectType, TankRole } from '../../../types';
import { TANK_CLASSES } from '../../../data/tanks';
import { COLORS } from '../../../constants';

export class TankRenderer {
    ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    // --- MAIN DRAW METHODS ---

    public drawTank(entity: Entity, debugMode: boolean = false) {
        const config = entity.classPath ? TANK_CLASSES[entity.classPath] : TANK_CLASSES['basic'];
        if (!config) return;

        this.ctx.save();
        this.ctx.translate(entity.pos.x, entity.pos.y);
        
        // 1. External Auras (Shields/Glows)
        if (entity.inSafeZone) {
            this.drawSafeZoneShield(entity.radius, entity.color);
        }

        if (entity.statusEffects) {
            entity.statusEffects.forEach(effect => {
                if (effect.type === StatusEffectType.FORTIFY) {
                    this.drawFortifyShield(entity.radius);
                } else if (effect.type === StatusEffectType.OVERCLOCK) {
                    this.drawOverclockGlow(entity.radius);
                } else if (effect.type === StatusEffectType.HASTE) {
                    this.drawHasteTrail(entity.radius);
                }
            });
        }

        this.ctx.rotate(entity.rotation);

        this.drawTankBody(entity, config, entity.distanceTraveled || 0, entity.barrelCharges || []);

        // 2. Status Effect Overlays (On top of body)
        if (entity.statusEffects) {
            entity.statusEffects.forEach(effect => {
                if (effect.type === StatusEffectType.BURN) {
                    this.drawBurnOverlay(entity.radius, config.bodyShape || BodyShape.CIRCLE);
                } else if (effect.type === StatusEffectType.SLOW) {
                    this.drawFreezeOverlay(entity.radius, config.bodyShape || BodyShape.CIRCLE);
                }
            });
        }

        // 3. DAMAGE FLASH (New)
        if (entity.flashTimer && entity.flashTimer > 0) {
            this.drawDamageFlash(entity.radius, config.bodyShape || BodyShape.CIRCLE);
        }

        if (debugMode) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'red';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    public drawTankWithConfig(entity: Entity, config: TankConfig, debugMode: boolean = false) {
        this.ctx.save();
        this.ctx.translate(entity.pos.x, entity.pos.y);
        this.ctx.rotate(entity.rotation);

        this.drawTankBody(entity, config, 0, []);

        if (debugMode) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'red';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    public drawBoss(boss: Entity) {
        this.ctx.save();
        this.ctx.translate(boss.pos.x, boss.pos.y);
        this.ctx.rotate(boss.rotation);

        const r = boss.radius;

        if (boss.bossType === BossType.SUMMONER) {
            this.drawSummoner(boss, r);
        } else if (boss.bossType === BossType.GUARDIAN) {
            this.drawGuardian(boss, r);
        } else if (boss.bossType === BossType.FALLEN_BOOSTER) {
            this.drawFallenBooster(boss, r);
        } else if (boss.bossType === BossType.SENTINEL) {
            this.drawSentinel(boss, r);
        } else {
            this.ctx.fillStyle = boss.color;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }

        // BOSS DAMAGE FLASH
        if (boss.flashTimer && boss.flashTimer > 0) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'source-atop'; // Only draw on top of existing pixels
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            
            // Re-draw the shape mask logic (simplified for bosses: just fill current path or circle)
            // Note: Since we are in the same context state, drawing over again with source-atop works
            // best if we kept the path. For bosses with complex paths, a simple circle overlay usually suffices.
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        this.ctx.restore();
    }

    // --- INTERNAL LOGIC ---

    private drawSummoner(boss: Entity, r: number) {
        // Draw Barrels (4 Spawners)
        const barrelSize = r * 0.8;
        this.ctx.fillStyle = '#999999';
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;

        for(let i=0; i<4; i++) {
            this.ctx.save();
            this.ctx.rotate(i * Math.PI / 2);
            // Draw barrel
            this.ctx.fillRect(r * 0.6, -barrelSize/2, r * 0.8, barrelSize);
            this.ctx.strokeRect(r * 0.6, -barrelSize/2, r * 0.8, barrelSize);
            this.ctx.restore();
        }

        // Body (Square)
        this.ctx.fillStyle = boss.color;
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.rect(-r, -r, r * 2, r * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Inner square detail
        this.ctx.beginPath();
        this.ctx.rect(-r*0.4, -r*0.4, r*0.8, r*0.8);
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        this.ctx.fill();
        this.ctx.stroke();
    }

    private drawGuardian(boss: Entity, r: number) {
        // Body (Triangle)
        this.ctx.fillStyle = boss.color;
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 4;
        
        this.ctx.beginPath();
        this.traceBodyShape(BodyShape.TRIANGLE, r);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Single Big Eye
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r * 0.35, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(r * 0.15, 0, r * 0.12, 0, Math.PI*2);
        this.ctx.fill();
    }

    private drawFallenBooster(boss: Entity, r: number) {
        // 5 Barrels
        // Front
        this.drawSimpleBarrel(r * 1.6, r * 0.4, 0);
        // Rear Thrusters (High angle)
        this.drawSimpleBarrel(r * 1.4, r * 0.35, Math.PI - 0.5);
        this.drawSimpleBarrel(r * 1.4, r * 0.35, Math.PI + 0.5);
        this.drawSimpleBarrel(r * 1.2, r * 0.35, Math.PI - 0.8);
        this.drawSimpleBarrel(r * 1.2, r * 0.35, Math.PI + 0.8);

        // Body (Circle)
        this.ctx.fillStyle = boss.color; // Should be grey/fallen color
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 4;
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, r, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.stroke();
    }

    private drawSentinel(boss: Entity, r: number) {
        // Sentinel Barrels (As per AIController config)
        this.drawSimpleBarrel(r * 1.8, r * 0.5, 0); 
        this.drawSimpleBarrel(r * 2.2, r * 0.25, 0); // Sniper
        
        this.drawSimpleBarrel(r * 1.2, r * 0.2, Math.PI/2);
        this.drawSimpleBarrel(r * 1.2, r * 0.2, -Math.PI/2);
        
        this.drawSimpleBarrel(r * 1.0, r * 0.6, Math.PI); // Rear Trap

        // Body (Pentagon)
        this.ctx.fillStyle = boss.color;
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 4;
        
        this.ctx.beginPath();
        this.traceBodyShape(BodyShape.PENTAGON, r);
        this.ctx.fill();
        this.ctx.stroke();
    }

    private drawSimpleBarrel(length: number, width: number, angle: number) {
        this.ctx.save();
        this.ctx.rotate(angle);
        this.ctx.fillStyle = '#999';
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(0, -width/2, length, width);
        this.ctx.strokeRect(0, -width/2, length, width);
        this.ctx.restore();
    }

    private drawSafeZoneShield(radius: number, color: string) {
        const pulse = 1.0 + Math.sin(Date.now() / 200) * 0.1;
        const shieldRadius = radius * 1.5 * pulse;

        this.ctx.beginPath();
        this.ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = 0.2;
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.globalAlpha = 0.5;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.globalAlpha = 1.0;
    }

    private drawFortifyShield(radius: number) {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 1.6, 0, Math.PI * 2);
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.globalAlpha = 0.6;
        this.ctx.stroke();
        this.ctx.globalAlpha = 0.2;
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;
        
        // Internal Hex Pattern
        this.ctx.beginPath();
        const sides = 6;
        for(let i=0; i<=sides; i++) {
            const angle = i * Math.PI * 2 / sides;
            const r = radius * 1.3;
            this.ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        this.ctx.closePath();
        this.ctx.strokeStyle = '#88ff88';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    private drawOverclockGlow(radius: number) {
        const pulse = 1.2 + Math.sin(Date.now() / 50) * 0.1;
        this.ctx.save();
        this.ctx.shadowColor = '#ff4400';
        this.ctx.shadowBlur = 20;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * pulse, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 68, 0, 0.3)';
        this.ctx.fill();
        this.ctx.restore();
    }

    private drawHasteTrail(radius: number) {
        this.ctx.beginPath();
        this.ctx.moveTo(-radius * 1.5, -radius);
        this.ctx.lineTo(-radius * 2.5, 0);
        this.ctx.lineTo(-radius * 1.5, radius);
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    // --- NEW: Status Effect Overlays ---
    private drawBurnOverlay(radius: number, shape: BodyShape) {
        this.ctx.save();
        this.ctx.beginPath();
        this.traceBodyShape(shape, radius);
        this.ctx.fillStyle = 'rgba(255, 69, 0, 0.5)'; // Orange-Red transparent
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffcc00';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();
    }

    private drawFreezeOverlay(radius: number, shape: BodyShape) {
        this.ctx.save();
        this.ctx.beginPath();
        this.traceBodyShape(shape, radius);
        this.ctx.fillStyle = 'rgba(0, 255, 255, 0.4)'; // Cyan transparent
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();
    }

    // --- NEW: DAMAGE FLASH ---
    private drawDamageFlash(radius: number, shape: BodyShape) {
        this.ctx.save();
        
        // Re-trace the body path
        this.ctx.beginPath();
        this.traceBodyShape(shape, radius);
        
        // This magic composition mode draws ONLY where existing pixels are (the tank body)
        // Effectively recoloring the tank white
        this.ctx.globalCompositeOperation = 'source-atop';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fill();
        
        this.ctx.restore();
    }

    private drawTankBody(entity: Entity, config: TankConfig, distTraveled: number, barrelCharges: number[]) {
        const radius = entity.radius;

        // 1. Draw Barrels (Under Body)
        config.barrels.forEach((b, i) => {
            this.ctx.save();
            const scale = radius / 20;
            this.ctx.rotate(b.angle);
            this.ctx.translate(b.offset.x * scale, b.offset.y * scale);
            const recoilValue = entity.barrelRecoils ? entity.barrelRecoils[i] : 0;
            const chargeValue = (barrelCharges[i] || 0) / (b.chargeTime || 1); // 0 to 1
            this.drawBarrel(b, config.turretColor, recoilValue, scale, entity.color, chargeValue);
            this.ctx.restore();
        });

        // 2. Treads (If Enabled)
        if (config.hasTreads) {
            this.ctx.fillStyle = '#111';
            const w = radius * 2.4;
            const h = radius * 2.2;
            this.ctx.fillRect(-w/2, -h/2, w, h);
            
            const offset = (distTraveled % 20);
            this.ctx.fillStyle = '#333';
            for(let i = -h/2 - 20 + offset; i < h/2; i+=10) {
                if (i > -h/2 && i < h/2 - 5) {
                    this.ctx.fillRect(-w/2 - 2, i, 6, 5);
                    this.ctx.fillRect(w/2 - 4, i, 6, 5);
                }
            }
        }

        // 3. Draw Body
        const bodyColor = config.bodyColorOverride || entity.color;
        
        // Shadow
        this.ctx.beginPath();
        this.traceBodyShape(config.bodyShape || BodyShape.CIRCLE, radius);
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.save();
        this.ctx.translate(5, 5);
        this.ctx.fill();
        this.ctx.restore();

        // Main Shape
        this.ctx.beginPath();
        this.traceBodyShape(config.bodyShape || BodyShape.CIRCLE, radius);
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = '#333'; 
        this.ctx.stroke();
        
        const gradient = this.ctx.createLinearGradient(-radius, -radius, radius, radius);
        gradient.addColorStop(0, this.adjustColor(bodyColor, 40)); 
        gradient.addColorStop(0.5, bodyColor);
        gradient.addColorStop(1, this.adjustColor(bodyColor, -40));
        this.ctx.fillStyle = gradient;
        
        this.ctx.fill();

        // 4. --- SPECIAL VISUALS FOR HEAVY / SPIKED TANKS ---
        const isRammer = (config.barrels.length === 0 || config.role === TankRole.HEAVY) && config.role !== TankRole.ARTILLERY;
        
        if (config.bodyShape === BodyShape.SPIKED) {
            // Sawblade Inner Ring
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius * 0.6, 0, Math.PI*2);
            this.ctx.fillStyle = '#555';
            this.ctx.fill();
            this.ctx.strokeStyle = '#222';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Spinning bolt visual
            this.ctx.save();
            // Counter-rotate the inner bolt to look like it's the axle
            this.ctx.rotate(-entity.rotation * 2); 
            this.ctx.fillStyle = '#888';
            this.ctx.beginPath();
            this.ctx.rect(-radius*0.15, -radius*0.15, radius*0.3, radius*0.3);
            this.ctx.fill();
            this.ctx.restore();

        } else if (isRammer && (config.bodyShape === BodyShape.HEXAGON || config.bodyShape === BodyShape.OCTAGON || config.name === 'Smasher')) {
            // ARMOR PLATING LOOK
            this.ctx.save();
            const sides = config.bodyShape === BodyShape.HEXAGON ? 6 : 8;
            const step = (Math.PI * 2) / sides;
            
            // Draw Rivets at corners
            this.ctx.fillStyle = '#222';
            for (let i = 0; i < sides; i++) {
                const angle = i * step + (sides % 2 !== 0 ? -Math.PI/2 : -Math.PI/sides);
                const rx = Math.cos(angle) * (radius * 0.85);
                const ry = Math.sin(angle) * (radius * 0.85);
                
                this.ctx.beginPath();
                this.ctx.arc(rx, ry, radius * 0.08, 0, Math.PI*2);
                this.ctx.fill();
            }

            // Draw Inner "Plate" Line
            this.ctx.beginPath();
            this.traceBodyShape(config.bodyShape || BodyShape.HEXAGON, radius * 0.7);
            this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.restore();
        } else {
            // Standard Inner Shine
            this.ctx.beginPath();
            this.traceBodyShape(config.bodyShape || BodyShape.CIRCLE, radius * 0.75); 
            this.ctx.fillStyle = 'rgba(0,0,0,0.1)'; 
            this.ctx.fill();
            
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = 'rgba(255,255,255,0.15)'; 
            this.ctx.stroke();
        }
    }

    private drawBarrel(b: Barrel, color: string | undefined, recoilValue: number, scale: number, tankColor: string, charge: number) {
        const w = b.width * scale;
        const l = b.length * scale;
        
        const maxVisualRecoil = l * 0.35; 
        const currentRecoil = Math.min(recoilValue * 20 * scale, maxVisualRecoil); 
        
        this.ctx.translate(-currentRecoil, 0);
        
        if (recoilValue > 0.5) {
            this.ctx.scale(1.05, 0.95);
        }

        let baseColor = '#999999';
        if (b.material === 'TITANIUM') baseColor = '#cfdee3';
        else if (b.material === 'OBSIDIUM') baseColor = '#221122';
        if (color && !b.material) baseColor = color;

        const grad = this.ctx.createLinearGradient(0, -w/2, 0, w/2);
        grad.addColorStop(0, '#555'); 
        grad.addColorStop(0.2, baseColor); 
        grad.addColorStop(0.5, '#eee'); 
        grad.addColorStop(0.8, baseColor); 
        grad.addColorStop(1, '#444'); 
        
        this.ctx.fillStyle = grad;
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        if (b.shape === 'CONE') {
            this.ctx.moveTo(0, -w * 0.3); this.ctx.lineTo(l, -w * 0.5); this.ctx.lineTo(l, w * 0.5); this.ctx.lineTo(0, w * 0.3);
        } else if (b.shape === 'TAPERED' || b.visualType === 'FLAME') {
            this.ctx.moveTo(0, -w/2); this.ctx.lineTo(l, -w * 0.8); this.ctx.lineTo(l, w * 0.8); this.ctx.lineTo(0, w/2);
        } else {
            this.ctx.rect(0, -w/2, l, w);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // --- CHARGE EFFECT ---
        if (charge > 0.05) {
            const glowSize = (w/2) * (charge * 2.0); 
            const glowColor = b.bulletColor || tankColor; 
            
            this.ctx.save();
            this.ctx.translate(l, 0); 
            
            this.ctx.beginPath();
            this.ctx.arc(0, 0, glowSize * 0.5, 0, Math.PI*2);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(0, 0, glowSize, 0, Math.PI*2);
            this.ctx.fillStyle = glowColor;
            this.ctx.globalAlpha = charge * 0.6;
            this.ctx.fill();
            this.ctx.restore();
        }

        // Standard Muzzle Ring
        if (b.visualType !== 'TRAP' && b.visualType !== 'DRONE' && b.visualType !== 'SNIPER' && b.visualType !== 'MACHINE_GUN') {
            this.ctx.fillStyle = '#222';
            this.ctx.fillRect(l - 2, -w/2, 2, w); 
        }
    }

    private traceBodyShape(shape: BodyShape, radius: number) {
        const ctx = this.ctx;
        if (shape === BodyShape.CIRCLE) {
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
        } else if (shape === BodyShape.SQUARE) {
            ctx.rect(-radius, -radius, radius * 2, radius * 2);
        } else if (shape === BodyShape.DIAMOND) {
            ctx.moveTo(0, -radius * 1.3); ctx.lineTo(radius * 0.9, 0); ctx.lineTo(0, radius * 1.3); ctx.lineTo(-radius * 0.9, 0);
        } else if (shape === BodyShape.SPIKED) {
            // SAWBLADE EFFECT
            const spikes = 16; // More spikes for saw look
            const outer = radius; 
            const inner = radius * 0.75;
            const step = (Math.PI * 2) / spikes;
            
            // Curved saw teeth
            ctx.moveTo(Math.cos(0) * outer, Math.sin(0) * outer);
            for (let i = 1; i <= spikes; i++) {
                const angle = i * step;
                const prevAngle = (i - 1) * step;
                
                // Curve inward to base
                const midAngle = prevAngle + step * 0.5;
                
                // Sharp tooth point
                ctx.lineTo(Math.cos(midAngle) * inner, Math.sin(midAngle) * inner);
                ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
            }
        } else {
            let sides = 3;
            if (shape === BodyShape.PENTAGON) sides = 5;
            else if (shape === BodyShape.HEXAGON) sides = 6;
            else if (shape === BodyShape.OCTAGON) sides = 8;
            else if (shape === BodyShape.STAR) sides = 5; 
            
            if (shape === BodyShape.STAR) {
                // Star is unique
                const outer = radius;
                const inner = radius * 0.5;
                const step = Math.PI / sides;
                ctx.moveTo(0, -outer);
                for(let i=0; i<sides*2; i++) {
                    const r = (i % 2 === 0) ? outer : inner;
                    const a = i * step - Math.PI/2;
                    ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
                }
            } else {
                const step = (Math.PI * 2) / sides;
                const startAngle = (sides % 2 !== 0) ? -Math.PI/2 : -Math.PI/sides;
                ctx.moveTo(Math.cos(startAngle) * radius, Math.sin(startAngle) * radius);
                for (let i = 1; i <= sides; i++) {
                    ctx.lineTo(Math.cos(startAngle + step * i) * radius, Math.sin(startAngle + step * i) * radius);
                }
            }
        }
        ctx.closePath();
    }

    private adjustColor(color: string, amount: number): string {
        if (color.startsWith('#') && color.length === 7) {
            const num = parseInt(color.slice(1), 16);
            let r = (num >> 16) + amount;
            let g = ((num >> 8) & 0x00FF) + amount;
            let b = (num & 0x0000FF) + amount;
            r = Math.max(Math.min(255, r), 0);
            g = Math.max(Math.min(255, g), 0);
            b = Math.max(Math.min(255, b), 0);
            return '#' + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
        }
        return color;
    }
}
