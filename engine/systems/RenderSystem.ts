
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
  transparent: boolean;

  // Sub-Systems
  tankRenderer: TankRenderer;
  worldRenderer: WorldRenderer;
  effectRenderer: EffectRenderer;
  uiRenderer: UIRenderer;

  // Performance Monitoring
  lastFrameTime: number = 0;
  frameCount: number = 0;
  currentFps: number = 60;
  frameTimer: number = 0;

  // Post-Processing
  offscreenCanvas: HTMLCanvasElement;
  offscreenCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement, transparent: boolean = false) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: transparent }) as CanvasRenderingContext2D;
    this.transparent = transparent;
    this.colors = {
      background: COLORS.background,
      grid: COLORS.grid
    };

    // Initialize Sub-Renderers with the shared Context
    this.tankRenderer = new TankRenderer(this.ctx);
    this.worldRenderer = new WorldRenderer(this.ctx);
    this.effectRenderer = new EffectRenderer(this.ctx);
    this.uiRenderer = new UIRenderer(this.ctx);

    // Setup Offscreen Buffer for Post-Processing
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d') as CanvasRenderingContext2D;
  }

  draw(
    entities: Entity[], 
    player: Entity, 
    playerState: PlayerState, 
    activeAbilityTimer: number,
    camera: { pos: Vector2, zoom: number, shake: Vector2 },
    gameMode: GameMode,
    settings?: GameSettings // Pass settings for performance tuning
  ) {
    const { width, height } = this.canvas;
    const isLowQuality = settings?.graphics.quality === 'low';
    const enablePostProcessing = settings?.graphics.postProcessing && !isLowQuality;

    // --- RENDER PASS 1: Main Game ---
    // If post-processing is on, we draw to the offscreen canvas first, but for simplicity/performance in JS Canvas,
    // we usually draw to main canvas then manipulate it, OR simply apply effects on top.
    // However, Chromatic Aberration requires reading pixels.
    // OPTIMIZATION: We will fake "Shockwave" distortion by shifting the camera slightly during the draw pass instead of pixel manipulation.
    // Real pixel shaders require WebGL. Here we simulate "Glitch" by drawing channels offset.

    // 1. Clear Screen
    if (this.transparent) {
        this.ctx.clearRect(0, 0, width, height);
    } else {
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, width, height);
    }

    this.ctx.save();
    
    // 2. Camera Transform
    // Camera Shake is applied here
    const shakeX = camera.shake.x;
    const shakeY = camera.shake.y;

    this.ctx.translate(width / 2, height / 2);
    this.ctx.translate(shakeX, shakeY);
    this.ctx.scale(camera.zoom, camera.zoom);
    this.ctx.translate(-camera.pos.x, -camera.pos.y);

    // 3. World Layers (Background)
    this.worldRenderer.drawGrid(gameMode, this.colors, {
        pos: camera.pos,
        zoom: camera.zoom,
        canvasWidth: width,
        canvasHeight: height
    });

    // Layer 1: Floor Zones & Walls
    entities.forEach(e => {
        if (e.type === EntityType.ZONE) this.worldRenderer.drawZone(e);
        if (e.type === EntityType.WALL) this.worldRenderer.drawWall(e);
    });

    // Layer 2: Shapes & Traps
    entities.forEach(e => {
        if (e.type === EntityType.SHAPE) this.worldRenderer.drawShape(e);
        if (e.type === EntityType.CRASHER) this.worldRenderer.drawCrasher(e);
        if (e.type === EntityType.TRAP) this.effectRenderer.drawTrap(e);
    });

    // Layer 3: Tanks & Bosses
    const tanks = entities.filter(e => e.type === EntityType.PLAYER || e.type === EntityType.ENEMY || e.type === EntityType.BOSS);
    
    // Optimization: Don't use fancy shadows on Low Quality
    if (!isLowQuality) {
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
    }

    tanks.forEach(e => {
        if (e.type === EntityType.BOSS) this.tankRenderer.drawBoss(e);
        else this.tankRenderer.drawTank(e);
    });
    
    // Draw Player explicitly if not in the list
    if (!player.isDead) this.tankRenderer.drawTank(player);

    this.ctx.shadowBlur = 0; // Reset Shadow

    // Layer 4: Projectiles & Particles (NEON BLOOM MODE)
    // We enable additive blending here to make overlapping bullets/particles glow intensely
    // Disabled on Low Quality for performance
    if (!isLowQuality) {
        this.ctx.globalCompositeOperation = 'lighter';
    }
    
    entities.forEach(e => {
        if (e.type === EntityType.BULLET) this.effectRenderer.drawBullet(e);
        if (e.type === EntityType.DRONE) this.effectRenderer.drawDrone(e);
    });

    if (settings?.graphics.particles) {
        entities.forEach(e => {
            if (e.type === EntityType.PARTICLE) this.effectRenderer.drawParticle(e);
        });
    }
    
    // Restore normal blending for UI
    this.ctx.globalCompositeOperation = 'source-over';

    // Layer 6: UI OVERLAYS (Health Bars, Names, Damage Numbers)
    [...entities, player].forEach(e => {
        if (e.type === EntityType.FLOATING_TEXT) {
            this.uiRenderer.drawFloatingText(e);
        } else {
            this.uiRenderer.drawEntityUI(e);
        }
    });

    if (playerState.leaderPos && !player.isDead) {
        this.uiRenderer.drawLeaderArrow(player.pos, playerState.leaderPos);
    }

    this.ctx.restore();

    // --- POST PROCESSING (Simulated) ---
    // If there is heavy shake (explosion), simulate Chromatic Aberration by drawing the canvas over itself
    // with offsets and color masking (Composite operations).
    if (enablePostProcessing && (Math.abs(shakeX) > 2 || Math.abs(shakeY) > 2)) {
        this.applyChromaticAberration(width, height, Math.max(Math.abs(shakeX), Math.abs(shakeY)) * 2);
    }

    // --- Post-Processing: Damage Vignette ---
    if (!player.isDead && playerState.health < playerState.maxHealth * 0.4 && !isLowQuality) {
        this.drawDamageVignette(width, height, playerState.health / playerState.maxHealth);
    }

    // --- Performance Stats Overlay ---
    if (settings?.graphics.showPerformance) {
        this.calculateFPS();
        this.drawPerformanceStats(width);
    }
  }

  // NEW: Fast Chromatic Aberration simulation using composite operations
  // This avoids expensive getImageData/putImageData
  private applyChromaticAberration(w: number, h: number, intensity: number) {
      // 1. Copy current screen to offscreen buffer
      if (this.offscreenCanvas.width !== w || this.offscreenCanvas.height !== h) {
          this.offscreenCanvas.width = w;
          this.offscreenCanvas.height = h;
      }
      this.offscreenCtx.clearRect(0, 0, w, h);
      this.offscreenCtx.drawImage(this.canvas, 0, 0);

      // 2. Draw Red Channel Offset
      this.ctx.globalCompositeOperation = 'multiply';
      this.ctx.fillStyle = '#FF0000'; 
      this.ctx.fillRect(0, 0, w, h); // Tint current screen Red-ish (subtractive)
      
      this.ctx.globalCompositeOperation = 'screen';
      // Draw Green/Blue channel from buffer slightly offset
      this.ctx.drawImage(this.offscreenCanvas, -intensity, 0); 
      
      this.ctx.globalCompositeOperation = 'source-over';
  }

  private drawDamageVignette(width: number, height: number, healthPct: number) {
      // 0.4 (40%) -> Intensity 0
      // 0.0 (0%) -> Intensity 1
      const intensity = 1 - (healthPct / 0.4); 
      const pulse = 0.8 + Math.sin(Date.now() / 200) * 0.2; // Heartbeat pulse

      const gradient = this.ctx.createRadialGradient(width/2, height/2, height/3, width/2, height/2, height);
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
      gradient.addColorStop(1, `rgba(255, 0, 0, ${0.4 * intensity * pulse})`);

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, width, height);
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

  private drawPerformanceStats(screenWidth: number) {
      this.ctx.save();
      this.ctx.font = 'bold 12px monospace';
      this.ctx.textAlign = 'right';
      this.ctx.textBaseline = 'top';
      
      const x = screenWidth - 10;
      const y = 50; 

      // FPS
      this.ctx.fillStyle = this.currentFps > 50 ? '#00ff00' : (this.currentFps > 30 ? '#ffff00' : '#ff0000');
      this.ctx.fillText(`FPS: ${this.currentFps}`, x, y);

      // Simulated Ping
      const ping = Math.floor(15 + Math.random() * 5); 
      this.ctx.fillStyle = '#00ffff';
      this.ctx.fillText(`MS: ${ping}`, x, y + 14);

      this.ctx.restore();
  }

  public drawTankDynamic(entity: Entity, config: TankConfig, debugMode: boolean) {
      this.tankRenderer.drawTankWithConfig(entity, config, debugMode);
  }

  public drawEntity(entity: Entity) {
      if (entity.type === EntityType.BOSS) {
          this.tankRenderer.drawBoss(entity);
          this.uiRenderer.drawEntityUI(entity);
      } else if (entity.type === EntityType.PLAYER || entity.type === EntityType.ENEMY) {
          this.tankRenderer.drawTank(entity);
      } else if (entity.type === EntityType.SHAPE) {
          this.worldRenderer.drawShape(entity);
          this.uiRenderer.drawEntityUI(entity);
      }
  }
}
