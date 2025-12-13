
import { Entity, EntityType, TankConfig, PlayerState, GameMode, Vector2, GameSettings } from '../../types';
import { COLORS } from '../../constants';
import { TankRenderer } from './render/TankRenderer';
import { WorldRenderer } from './render/WorldRenderer';
import { EffectRenderer } from './render/EffectRenderer';
import { UIRenderer } from './render/UIRenderer';

export class RenderSystem {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  colors: { background: string, grid: string };
  
  tankRenderer: TankRenderer;
  worldRenderer: WorldRenderer;
  effectRenderer: EffectRenderer;
  uiRenderer: UIRenderer;

  // FPS Stats
  lastFrameTime: number = 0;
  frameCount: number = 0;
  currentFps: number = 60;
  frameTimer: number = 0;

  constructor(canvas: HTMLCanvasElement, transparent: boolean = false) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: transparent }) as CanvasRenderingContext2D;
    this.colors = { background: COLORS.background, grid: COLORS.grid };

    this.tankRenderer = new TankRenderer(this.ctx);
    this.worldRenderer = new WorldRenderer(this.ctx);
    this.effectRenderer = new EffectRenderer(this.ctx);
    this.uiRenderer = new UIRenderer(this.ctx);
  }

  draw(
    entities: Entity[], 
    player: Entity, 
    playerState: PlayerState, 
    activeAbilityTimer: number,
    camera: { pos: Vector2, zoom: number, shake: Vector2 },
    gameMode: GameMode,
    settings?: GameSettings
  ) {
    const { width, height } = this.canvas;
    const isHighQuality = settings?.graphics.quality === 'high';
    
    // 1. Clear
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.save();
    
    // 2. Camera Transform
    this.ctx.translate(width / 2 + camera.shake.x, height / 2 + camera.shake.y);
    this.ctx.scale(camera.zoom, camera.zoom);
    this.ctx.translate(-camera.pos.x, -camera.pos.y);

    // 3. Grid & Borders
    this.worldRenderer.drawGrid(gameMode, this.colors, { pos: camera.pos, zoom: camera.zoom, canvasWidth: width, canvasHeight: height });

    // 4. Entity Rendering (Order Matters)
    // Zones -> Walls -> Shapes -> Tanks -> Bullets -> UI
    
    entities.forEach(e => { if(e.type === EntityType.ZONE) this.worldRenderer.drawZone(e); });
    entities.forEach(e => { if(e.type === EntityType.WALL) this.worldRenderer.drawWall(e); });
    
    entities.forEach(e => { 
        if(e.type === EntityType.SHAPE) this.worldRenderer.drawShape(e);
        if(e.type === EntityType.CRASHER) this.worldRenderer.drawCrasher(e);
        if(e.type === EntityType.TRAP) this.effectRenderer.drawTrap(e);
    });

    // Shadow Pass (High Quality Only)
    if (isHighQuality) {
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = 'rgba(0,0,0,0.4)';
    }

    const tanks = entities.filter(e => e.type === EntityType.PLAYER || e.type === EntityType.ENEMY || e.type === EntityType.BOSS);
    tanks.forEach(e => {
        if(e.type === EntityType.BOSS) this.tankRenderer.drawBoss(e);
        else this.tankRenderer.drawTank(e);
    });
    if(!player.isDead) this.tankRenderer.drawTank(player);

    this.ctx.shadowBlur = 0; // Reset Shadow

    // Bloom Pass (Projectiles & Particles)
    if (settings?.graphics.postProcessing) {
        this.ctx.globalCompositeOperation = 'lighter'; // Additive blending for neon effect
    }

    entities.forEach(e => {
        if(e.type === EntityType.BULLET) this.effectRenderer.drawBullet(e);
        if(e.type === EntityType.DRONE) this.effectRenderer.drawDrone(e);
    });

    if (settings?.graphics.particles) {
        entities.forEach(e => { if(e.type === EntityType.PARTICLE) this.effectRenderer.drawParticle(e); });
    }

    this.ctx.globalCompositeOperation = 'source-over'; // Reset blending

    // UI Pass
    [...entities, player].forEach(e => {
        if (e.type === EntityType.FLOATING_TEXT) this.uiRenderer.drawFloatingText(e);
        else this.uiRenderer.drawEntityUI(e);
    });

    if(playerState.leaderPos && !player.isDead) {
        this.uiRenderer.drawLeaderArrow(player.pos, playerState.leaderPos);
    }

    this.ctx.restore();

    // Stats
    if (settings?.graphics.showPerformance) {
        this.calculateFPS();
        this.ctx.fillStyle = '#0f0';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`FPS: ${this.currentFps}`, width - 60, 20);
    }
  }

  private calculateFPS() {
      const now = performance.now();
      const delta = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.frameCount++;
      this.frameTimer += delta;
      if (this.frameTimer >= 1000) {
          this.currentFps = this.frameCount;
          this.frameCount = 0;
          this.frameTimer = 0;
      }
  }

  public drawTankDynamic(entity: Entity, config: TankConfig, debugMode: boolean) {
      this.tankRenderer.drawTankWithConfig(entity, config, debugMode);
  }
  
  public drawEntity(entity: Entity) { /* for gallery */
      if(entity.type === EntityType.BOSS) this.tankRenderer.drawBoss(entity);
      else if(entity.type === EntityType.PLAYER) this.tankRenderer.drawTank(entity);
  }
}
