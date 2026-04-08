
import { Entity, EntityType, GameMode } from '../../types';
import { WORLD_SIZE, SANDBOX_SIZE, COLORS, TEAM_COLORS } from '../../constants';

export class MinimapSystem {
    ctx: CanvasRenderingContext2D | null = null;
    canvas: HTMLCanvasElement | null = null;
    size: number = 150;

    constructor() {}

    setCanvas(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Handle high DPI rendering for crisp lines
        const dpr = window.devicePixelRatio || 1;
        
        // Ensure internal resolution matches display size * dpr
        canvas.width = this.size * dpr;
        canvas.height = this.size * dpr;
        
        this.ctx?.scale(dpr, dpr);
    }

    update(
        entities: Entity[], 
        player: Entity, 
        camera: { pos: {x: number, y: number}, zoom: number, canvasWidth: number, canvasHeight: number }, 
        gameMode: GameMode,
        nextBossTimer: number
    ) {
        if (!this.ctx || !this.canvas) return;
        
        const ctx = this.ctx;
        const mapSize = this.size;
        
        // 1. Clear with semi-transparent background
        ctx.fillStyle = '#0a0a10'; // Dark background for the map
        ctx.fillRect(0, 0, mapSize, mapSize);
        
        // 2. Logic: Coordinate Mapping
        const currentWorldSize = gameMode === 'SANDBOX' ? SANDBOX_SIZE * 1.5 : WORLD_SIZE;
        const scale = mapSize / currentWorldSize;
        const w2m = (val: number) => val * scale;

        // --- LAYER 1: ZONES & WALLS (Static Geometry) ---
        // We filter these first so they are drawn *under* the dots
        
        // Draw Zones (Bases)
        entities.forEach(e => {
            if (e.type === EntityType.ZONE) {
                const x = w2m(e.pos.x);
                const y = w2m(e.pos.y);
                const w = w2m(e.width || 0);
                const h = w2m(e.height || 0);
                
                ctx.fillStyle = e.color;
                ctx.globalAlpha = 0.3; // Transparent fill
                ctx.fillRect(x - w/2, y - h/2, w, h);
                
                ctx.globalAlpha = 0.8;
                ctx.strokeStyle = e.color;
                ctx.lineWidth = 1;
                ctx.strokeRect(x - w/2, y - h/2, w, h);
                ctx.globalAlpha = 1.0;
            }
        });

        // Draw Walls
        ctx.fillStyle = '#555';
        entities.forEach(e => {
            if (e.type === EntityType.WALL) {
                const x = w2m(e.pos.x);
                const y = w2m(e.pos.y);
                const w = w2m(e.width || 0);
                const h = w2m(e.height || 0);
                ctx.fillRect(x - w/2, y - h/2, w, h);
            }
        });

        // Map Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, mapSize, mapSize);

        // --- LAYER 2: DYNAMIC ENTITIES ---
        let bossAlive = false;

        entities.forEach(e => {
            if (e.isDead || e.type === EntityType.ZONE || e.type === EntityType.WALL) return;
            
            let color = null;
            let radius = 2; 

            if (e.type === EntityType.BOSS) {
                bossAlive = true;
                const x = w2m(e.pos.x);
                const y = w2m(e.pos.y);
                
                // Pulsing Boss Indicator with Glow
                ctx.save();
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 15; // Glow effect
                ctx.fillStyle = 'rgba(255, 50, 50, 0.9)';
                
                const pulse = 6 + Math.sin(Date.now() / 200) * 3; // More aggressive pulse
                ctx.beginPath(); 
                ctx.arc(x, y, pulse, 0, Math.PI*2); 
                ctx.fill();
                ctx.restore();

                ctx.save();
                ctx.translate(x, y);
                ctx.fillStyle = COLORS.notifyBoss;
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('☠️', 0, 0); 
                ctx.restore();
                return;
            } 
            else if (e.type === EntityType.PLAYER) {
                if (e.id === player.id) return; // Self is drawn last
                
                // Show teammates or everyone in Sandbox
                if (gameMode === 'TEAMS_2' || gameMode === 'TEAMS_4') {
                    if (e.teamId === player.teamId) {
                        color = e.color; // Teammate color
                        radius = 2.5;
                    }
                } else if (gameMode === 'SANDBOX') {
                    color = e.color;
                    radius = 2.5;
                }
            }
            else if (e.type === EntityType.ENEMY && e.teamId === 'ARENA_CLOSER') {
                color = COLORS.arenaCloser;
                radius = 4;
            }
            // Optional: Draw large shapes (Alpha Pentagons) as dots?
            else if (e.type === EntityType.SHAPE && e.radius > 30) {
                color = e.color;
                radius = 1.5;
            }

            if (color) {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(w2m(e.pos.x), w2m(e.pos.y), radius, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // --- LAYER 3: PLAYER & CAMERA ---
        const focusPos = player.isDead ? camera.pos : player.pos;
        const px = w2m(focusPos.x);
        const py = w2m(focusPos.y);

        // Viewport Box
        const viewW = w2m(camera.canvasWidth / camera.zoom);
        const viewH = w2m(camera.canvasHeight / camera.zoom);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px - viewW/2, py - viewH/2, viewW, viewH);

        // Player Arrow
        ctx.save();
        ctx.translate(px, py);

        if (!player.isDead) {
            ctx.rotate(player.rotation); 
            // Outline
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-4, 4); ctx.lineTo(-2, 0); ctx.lineTo(-4, -4); ctx.closePath(); ctx.stroke();
            // Fill
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        } else {
            // Dead X
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(3, 3); ctx.moveTo(3, -3); ctx.lineTo(-3, 3); ctx.stroke();
        }
        ctx.restore();

        // --- LAYER 4: BOSS TIMER OVERLAY ---
        if (!bossAlive && nextBossTimer > 0) {
            const mins = Math.floor(nextBossTimer / 60);
            const secs = Math.floor(nextBossTimer % 60);
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(2, 2, 45, 16);
            ctx.fillStyle = '#ff5555';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`${mins}:${secs < 10 ? '0' : ''}${secs}`, 5, 4);
        }
    }
}
