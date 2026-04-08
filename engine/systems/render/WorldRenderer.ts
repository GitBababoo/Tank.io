
import { Entity, GameMode, ShapeType } from '../../../types';
import { COLORS, WORLD_SIZE, SANDBOX_SIZE } from '../../../constants';

export class WorldRenderer {
    ctx: CanvasRenderingContext2D;
    
    // Cache for patterns
    private patterns: Record<string, CanvasPattern> = {};

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    private getStripedPattern(color: string): CanvasPattern | null {
        if (this.patterns[color]) return this.patterns[color];

        const pCanvas = document.createElement('canvas');
        pCanvas.width = 20;
        pCanvas.height = 20;
        const pCtx = pCanvas.getContext('2d');
        if (!pCtx) return null;

        // Draw background (transparent color)
        pCtx.fillStyle = color + '22'; // 13% opacity hex
        pCtx.fillRect(0, 0, 20, 20);

        // Draw diagonal line
        pCtx.strokeStyle = color + '66'; // 40% opacity
        pCtx.lineWidth = 2;
        pCtx.beginPath();
        pCtx.moveTo(0, 20);
        pCtx.lineTo(20, 0);
        pCtx.stroke();

        const pattern = this.ctx.createPattern(pCanvas, 'repeat');
        if (pattern) this.patterns[color] = pattern;
        return pattern;
    }

    public drawGrid(
        gameMode: GameMode, 
        colors: { grid: string }, 
        camera: { pos: { x: number, y: number }, zoom: number, canvasWidth: number, canvasHeight: number }
    ) {
        const worldSize = gameMode === 'SANDBOX' ? SANDBOX_SIZE : WORLD_SIZE;
        const gridSize = 40;

        // --- OPTIMIZATION: View Culling ---
        // Only draw grid lines that are currently visible on screen
        const halfWidth = (camera.canvasWidth / 2) / camera.zoom;
        const halfHeight = (camera.canvasHeight / 2) / camera.zoom;
        
        const viewLeft = camera.pos.x - halfWidth;
        const viewRight = camera.pos.x + halfWidth;
        const viewTop = camera.pos.y - halfHeight;
        const viewBottom = camera.pos.y + halfHeight;

        // Clamp to world bounds and snap to grid
        // We add a buffer of 1 grid size to ensure lines don't pop out at edges
        const startX = Math.max(0, Math.floor(viewLeft / gridSize) * gridSize);
        const endX = Math.min(worldSize, Math.ceil(viewRight / gridSize) * gridSize);
        const startY = Math.max(0, Math.floor(viewTop / gridSize) * gridSize);
        const endY = Math.min(worldSize, Math.ceil(viewBottom / gridSize) * gridSize);

        // 1. Draw Inner Grid
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = colors.grid;
        
        this.ctx.beginPath();
        
        // Vertical Lines
        for (let x = startX; x <= endX; x += gridSize) {
            this.ctx.moveTo(x, Math.max(0, viewTop));
            this.ctx.lineTo(x, Math.min(worldSize, viewBottom));
        }
        
        // Horizontal Lines
        for (let y = startY; y <= endY; y += gridSize) {
            this.ctx.moveTo(Math.max(0, viewLeft), y);
            this.ctx.lineTo(Math.min(worldSize, viewRight), y);
        }
        this.ctx.stroke();

        // 2. Draw World Border (Only if near edge)
        // Check if viewport intersects with world boundaries
        if (viewLeft < 0 || viewRight > worldSize || viewTop < 0 || viewBottom > worldSize) {
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#000';
            this.ctx.strokeStyle = '#444';
            this.ctx.lineWidth = 500; // Fake "Outside" darkness
            this.ctx.strokeRect(-250, -250, worldSize + 500, worldSize + 500);
            this.ctx.shadowBlur = 0;

            // Active Border Line
            this.ctx.lineWidth = 4;
            this.ctx.strokeStyle = '#555';
            this.ctx.strokeRect(0, 0, worldSize, worldSize);
        }
    }

    public drawWall(wall: Entity) {
        this.ctx.save();
        this.ctx.translate(wall.pos.x, wall.pos.y);
        
        const w = wall.width!;
        const h = wall.height!;
        const hw = w / 2;
        const hh = h / 2;

        // 3D Block Effect
        this.ctx.fillStyle = '#222'; // Top face (dark)
        this.ctx.fillRect(-hw, -hh, w, h);

        // Bevel / Highlight
        this.ctx.lineWidth = 4;
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#4a4a5a'; // Lighter edge
        this.ctx.strokeRect(-hw, -hh, w, h);

        // Inner detail to make it look solid
        this.ctx.fillStyle = '#2a2a35';
        this.ctx.fillRect(-hw + 4, -hh + 4, w - 8, h - 8);

        this.ctx.restore();
    }

    public drawZone(zone: Entity) {
        this.ctx.save();
        this.ctx.translate(zone.pos.x, zone.pos.y);
        
        const w = zone.width!;
        const h = zone.height!;
        
        // Use Striped Pattern for Team Bases
        const pattern = this.getStripedPattern(zone.color);
        if (pattern) {
            this.ctx.fillStyle = pattern;
            this.ctx.fillRect(-w/2, -h/2, w, h);
        } else {
            this.ctx.fillStyle = zone.color;
            this.ctx.globalAlpha = 0.15;
            this.ctx.fillRect(-w/2, -h/2, w, h);
        }

        this.ctx.globalAlpha = 1.0;
        
        // Pulsing Border
        const pulse = (Math.sin(Date.now() / 500) + 1) * 0.5; // 0 to 1
        this.ctx.lineWidth = 2 + pulse * 2;
        this.ctx.strokeStyle = zone.color;
        this.ctx.strokeRect(-w/2, -h/2, w, h);
        
        this.ctx.restore();
    }

    public drawShape(shape: Entity) {
        this.ctx.save();
        this.ctx.translate(shape.pos.x, shape.pos.y);
        this.ctx.rotate(shape.rotation);

        this.ctx.fillStyle = shape.color;
        const r = shape.radius;
        
        // Enhanced Gradient for Shapes
        const grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, '#ffffff'); // Shiny center
        grad.addColorStop(0.4, shape.color);
        grad.addColorStop(1, this.darkenColor(shape.color, 40)); // Darker edge
        this.ctx.fillStyle = grad;

        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#333';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        let sides = 4;
        if (shape.shapeType === ShapeType.TRIANGLE) sides = 3;
        else if (shape.shapeType === ShapeType.PENTAGON || shape.shapeType === ShapeType.ALPHA_PENTAGON) sides = 5;
        else if (shape.shapeType === ShapeType.HEXAGON) sides = 6;
        else if (shape.shapeType === ShapeType.SQUARE) sides = 4;

        if (shape.shapeType === ShapeType.CROSS) {
            const w = r / 2.5;
            this.ctx.moveTo(-w, -r); this.ctx.lineTo(w, -r); this.ctx.lineTo(w, -w);
            this.ctx.lineTo(r, -w); this.ctx.lineTo(r, w); this.ctx.lineTo(w, w);
            this.ctx.lineTo(w, r); this.ctx.lineTo(-w, r); this.ctx.lineTo(-w, w);
            this.ctx.lineTo(-r, w); this.ctx.lineTo(-r, -w); this.ctx.lineTo(-w, -w);
        } else if (shape.shapeType === ShapeType.HEART) {
            this.ctx.moveTo(0, -r/2);
            this.ctx.bezierCurveTo(r/2, -r, r, -r/2, 0, r);
            this.ctx.bezierCurveTo(-r, -r/2, -r/2, -r, 0, -r/2);
        } else {
            const step = (Math.PI * 2) / sides;
            for (let i = 0; i < sides; i++) {
                this.ctx.lineTo(Math.cos(step * i) * r, Math.sin(step * i) * r);
            }
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Inner Shine (Glassy look)
        this.ctx.beginPath();
        if (sides > 0) {
             const step = (Math.PI * 2) / sides;
             const innerR = r * 0.6;
             for (let i = 0; i < sides; i++) {
                this.ctx.lineTo(Math.cos(step * i) * innerR, Math.sin(step * i) * innerR);
             }
        }
        this.ctx.closePath();
        this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.restore();
    }

    public drawCrasher(crasher: Entity) {
        this.ctx.save();
        this.ctx.translate(crasher.pos.x, crasher.pos.y);
        this.ctx.rotate(crasher.rotation);

        this.ctx.fillStyle = crasher.color;
        this.ctx.strokeStyle = '#222';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        const sides = 3;
        const step = (Math.PI * 2) / sides;
        for (let i = 0; i < sides; i++) {
            this.ctx.lineTo(Math.cos(step * i) * crasher.radius, Math.sin(step * i) * crasher.radius);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
    }

    private darkenColor(color: string, amount: number): string {
        // Simple hex darkening placeholder
        return color;
    }
}
