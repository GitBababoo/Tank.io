
// ... imports ...
import { Vector2, Entity, StatKey, PlayerState, GameSettings, BossType, GameMode, FactionType, EntityType, AIPersonality, Barrel, WorldSnapshot } from '../types';
import { RenderSystem } from './systems/RenderSystem';
import { AISystem } from './systems/AISystem';
import { WorldSystem } from './systems/WorldSystem';
import { MapSystem } from './systems/MapSystem'; 
import { ParticleSystem } from './systems/ParticleSystem';
import { PhysicsSystem } from './systems/PhysicsSystem'; 
import { COLORS, TEAM_COLORS } from '../constants';
import { InputManager } from './managers/InputManager';
import { PlayerManager } from './managers/PlayerManager';
import { NotificationManager } from './managers/NotificationManager';
import { LeaderboardManager } from './managers/LeaderboardManager';
import { SpawnManager } from './managers/SpawnManager';
import { CameraManager } from './managers/CameraManager';
import { CommandManager } from './managers/CommandManager';
import { EntityManager } from './managers/EntityManager';
import { DeathManager } from './managers/DeathManager';
import { LoopManager } from './managers/LoopManager';
import { AudioManager } from './managers/AudioManager';
import { ChatManager } from './managers/ChatManager';
import { NetworkManager } from './managers/NetworkManager';
import { PlayerController } from './controllers/PlayerController';
import { AIController } from './controllers/AIController';
import { WorldController } from './controllers/WorldController';
import { StatManager } from './managers/StatManager';
import { StatusEffectSystem } from './systems/StatusEffectSystem';
import { MinimapSystem } from './systems/MinimapSystem'; 

// --- API DEFINITION ---
declare global {
    interface Window {
        tankAPI: any;
    }
}

export class GameEngine {
  // ... properties ...
  canvas: HTMLCanvasElement;
  settings: GameSettings;
  gameMode: GameMode;
  
  renderSystem: RenderSystem;
  minimapSystem: MinimapSystem; 
  inputManager: InputManager;
  loopManager: LoopManager;
  statusEffectSystem: StatusEffectSystem;
  
  playerManager: PlayerManager;
  notificationManager: NotificationManager;
  leaderboardManager: LeaderboardManager;
  spawnManager: SpawnManager;
  cameraManager: CameraManager;
  commandManager: CommandManager;
  entityManager: EntityManager;
  deathManager: DeathManager;
  audioManager: AudioManager;
  statManager: StatManager;
  chatManager: ChatManager;
  networkManager: NetworkManager;
  
  playerController: PlayerController;
  aiController: AIController;
  worldController: WorldController;
  
  onUpdateStats: (stats: PlayerState) => void;
  isDestroyed: boolean = false;

  constructor(
      canvas: HTMLCanvasElement, 
      settings: GameSettings, 
      gameMode: GameMode, 
      playerName: string, 
      faction: FactionType,
      initialClass: string,
      onUpdateStats: (stats: PlayerState) => void,
      minimapCanvas: HTMLCanvasElement | null 
    ) {
    // ... init ...
    this.canvas = canvas;
    this.settings = settings;
    this.gameMode = gameMode;
    this.onUpdateStats = onUpdateStats;
    
    this.renderSystem = new RenderSystem(canvas);
    this.minimapSystem = new MinimapSystem(); 
    if (minimapCanvas) this.minimapSystem.setCanvas(minimapCanvas);

    this.inputManager = new InputManager(canvas, settings);
    this.audioManager = new AudioManager(settings.audio);
    this.statusEffectSystem = new StatusEffectSystem();
    
    this.notificationManager = new NotificationManager();
    this.leaderboardManager = new LeaderboardManager();
    this.spawnManager = new SpawnManager();
    this.cameraManager = new CameraManager();
    this.entityManager = new EntityManager();
    this.statManager = new StatManager();
    this.networkManager = new NetworkManager();

    this.chatManager = new ChatManager(
        () => {}, 
        (msg) => this.networkManager.sendChat(msg, playerName)
    );

    let playerTeam = undefined;
    if (this.gameMode === 'TEAMS_2' || this.gameMode === 'TEAMS_4') playerTeam = 'BLUE';

    this.playerManager = new PlayerManager(
        playerName, 
        playerTeam, 
        onUpdateStats, 
        this.audioManager,
        this.statusEffectSystem,
        (pos) => {
            PhysicsSystem.spawnFloatingText(this.entityManager.entities, pos, "LEVEL UP!", "#ffd700", true);
            ParticleSystem.spawnLevelUpEffect(this.entityManager.entities, pos, "#ffd700");
        }
    );
    this.playerManager.setStatManager(this.statManager);
    this.playerManager.setFaction(faction);
    if (initialClass && initialClass !== 'basic') {
        this.playerManager.evolve(initialClass);
    }
    
    MapSystem.generateMap(this.entityManager.entities, this.gameMode);
    
    this.playerManager.entity.pos = this.entityManager.getSpawnPos(playerTeam);

    this.deathManager = new DeathManager(
        this.playerManager, 
        this.notificationManager, 
        this.cameraManager, 
        this.audioManager,
        this.settings
    );

    this.playerController = new PlayerController(this.inputManager, this.playerManager, this.settings, this.canvas, this.audioManager, this.cameraManager); 
    this.aiController = new AIController(this.audioManager, this.statManager, this.statusEffectSystem);
    this.worldController = new WorldController(
        this.entityManager,
        this.playerManager,
        this.deathManager,
        this.inputManager,
        this.canvas,
        this.settings,
        this.audioManager,
        this.statManager,
        this.statusEffectSystem,
        this.spawnManager,
        this.gameMode 
    );

    this.commandManager = new CommandManager(
        this.renderSystem, 
        this.settings, 
        this.spawnBoss.bind(this), 
        this.closeArena.bind(this)
    );

    this.loopManager = new LoopManager(
        (dt) => this.update(dt),
        () => this.render()
    );

    this.bindExtraEvents();
    this.bindNetworkEvents();
    this.exposeGlobalAPI(); // NEW: Expose API
    this.loopManager.start();
  }

  // --- API EXPOSURE FOR SCRIPTS ---
  exposeGlobalAPI() {
      window.tankAPI = {
          game: {
              get entities() { return this.engine.entityManager.entities; },
              on: (event: string, handler: any) => { /* Placeholder for event system */ },
              engine: this
          },
          player: {
              get data() { return this.engine.playerManager.entity; },
              get stats() { return this.engine.playerManager.state; },
              get position() { return this.engine.playerManager.entity.pos; },
              
              move: (x: number, y: number) => {
                  // Override input manager
                  const dx = x - this.playerManager.entity.pos.x;
                  const dy = y - this.playerManager.entity.pos.y;
                  const dist = Math.hypot(dx, dy);
                  if (dist > 10) {
                      this.inputManager.overrideMove({ x: dx/dist, y: dy/dist });
                  } else {
                      this.inputManager.overrideMove({ x: 0, y: 0 });
                  }
              },
              
              aim: (x: number, y: number) => {
                  const dx = x - this.playerManager.entity.pos.x;
                  const dy = y - this.playerManager.entity.pos.y;
                  const dist = Math.hypot(dx, dy);
                  if (dist > 0) {
                      this.inputManager.overrideAim({ x: dx/dist, y: dy/dist });
                  }
              },
              
              fire: (active: boolean) => {
                  this.inputManager.overrideFire(active);
              },
              
              upgrade: (stat: string) => this.upgradeStat(stat as StatKey),
              evolve: (className: string) => this.evolve(className),
              engine: this
          }
      };
      
      console.log("%c [Tank.io API] Ready! Access via window.tankAPI", "color: #00ff00; background: #000; font-size: 12px; padding: 4px;");
  }

  destroy() {
    this.isDestroyed = true;
    this.loopManager.stop();
    this.inputManager.destroy();
    this.networkManager.disconnect();
    window.removeEventListener('keydown', this.handleKeyDown);
    delete window.tankAPI; // Cleanup
  }

  bindNetworkEvents() {
    // 1. JOIN EVENT
    this.networkManager.on('player_joined', (data) => {
        if (this.isDestroyed) return;
        if (this.entityManager.entities.some(e => e.id === data.id)) return; // Already exists

        const newPlayer: Entity = {
            id: data.id,
            name: data.name,
            type: EntityType.PLAYER,
            pos: data.x ? {x: data.x, y: data.y} : {x:0, y:0},
            targetPos: data.x ? {x: data.x, y: data.y} : undefined,
            vel: { x: 0, y: 0 }, 
            radius: 20,
            rotation: 0,
            color: data.color || COLORS.enemy,
            health: 100,
            maxHealth: 100,
            damage: 20,
            isDead: false,
            teamId: data.teamId,
            classPath: data.classPath || 'basic',
            scoreValue: data.score || 0
        };
        this.entityManager.add(newPlayer);
        this.notificationManager.push(`${data.name} joined.`, 'info');
    });

    this.networkManager.on('teleport', (pos) => {
        this.playerManager.entity.pos.x = pos.x;
        this.playerManager.entity.pos.y = pos.y;
    });

    // 2. LEAVE EVENT
    this.networkManager.on('player_left', (data) => {
        if (this.isDestroyed) return;
        const idx = this.entityManager.entities.findIndex(e => e.id === data.id);
        if (idx !== -1) {
            const name = this.entityManager.entities[idx].name;
            this.entityManager.entities.splice(idx, 1);
            this.notificationManager.push(`${name} left.`, 'warning');
        }
    });

    // 3. CHAT EVENT
    this.networkManager.on('chat_message', (data) => {
        if (this.isDestroyed) return;
        this.chatManager.addMessage(data.sender, data.content);
        const sender = this.entityManager.entities.find(e => e.name === data.sender) || (this.playerManager.entity.name === data.sender ? this.playerManager.entity : null);
        if (sender) {
            PhysicsSystem.spawnFloatingText(this.entityManager.entities, sender.pos, data.content, '#fff', false);
        }
    });
  }

  update(dt: number) {
    if (this.isDestroyed) return;
    const entities = this.entityManager.entities;
    const player = this.playerManager.entity;

    this.chatManager.update(dt, entities);

    // --- NETWORKING (SEND INPUT) ---
    if (!player.isDead) {
        this.networkManager.syncPlayerState(player.pos, player.vel, player.rotation);
        this.networkManager.syncPlayerDetails(player.health, player.maxHealth, this.playerManager.state.score, this.playerManager.state.classPath);
    }

    // --- NETWORKING (APPLY INTERPOLATION) ---
    this.networkManager.processInterpolation(entities);

    const handleDeath = (v: Entity, k: Entity) => {
        this.deathManager.handleDeath(v, k, this.entityManager.entities);
    };

    const handleHitscan = (start: Vector2, angle: number, owner: Entity, barrel: Barrel) => 
        PhysicsSystem.processHitscan(start, angle, owner, barrel, entities, player, handleDeath, this.cameraManager, this.statManager, this.statusEffectSystem, this.audioManager);

    if (this.notificationManager.update()) {
        this.playerManager.state.notifications = this.notificationManager.notifications;
    }
    
    // Standard Local Updates
    this.playerManager.update(dt);
    this.playerController.update(dt, entities, this.pushNotification.bind(this));
    if (!player.isDead) {
        this.playerController.handleFiring(dt, entities, handleHitscan);
    }
    
    this.aiController.update(dt, entities, player, this.cameraManager, handleDeath);
    this.worldController.update(dt, this.playerController.autoSpin, this.cameraManager, handleDeath);
    
    ParticleSystem.update(entities, dt);
    
    if (this.leaderboardManager.shouldUpdate()) {
        this.leaderboardManager.update(entities, player, this.playerManager.state);
        this.playerManager.emitUpdate();
    }
  }

  render() {
    const cameraConfig = this.cameraManager.getCameraTarget(this.playerManager.entity, this.entityManager.entities);
    
    this.renderSystem.draw(
        this.entityManager.entities, 
        this.playerManager.entity, 
        this.playerManager.state, 
        this.playerManager.activeAbilityTimer, 
        cameraConfig, 
        this.gameMode,
        this.settings
    );

    this.minimapSystem.update(
        this.entityManager.entities,
        this.playerManager.entity,
        { 
            pos: cameraConfig.pos, 
            zoom: cameraConfig.zoom,
            canvasWidth: this.canvas.width,
            canvasHeight: this.canvas.height
        },
        this.gameMode,
        this.spawnManager.getNextBossTime() 
    );
  }
  
  private handleKeyDown = (e: KeyboardEvent) => {
      if (this.playerManager.entity.isDead && (e.code === 'Enter')) this.respawn();
      const handleDeath = (v: Entity, k: Entity) => {
        this.deathManager.handleDeath(v, k, this.entityManager.entities);
      };
      this.playerController.handleKeyDown(e, this.pushNotification.bind(this), handleDeath);
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'].includes(e.code)) {
          const map: Record<string, StatKey> = {
              'Digit1': 'regen', 'Digit2': 'maxHp', 'Digit3': 'bodyDmg',
              'Digit4': 'bulletSpd', 'Digit5': 'bulletPen', 'Digit6': 'bulletDmg',
              'Digit7': 'reload', 'Digit8': 'moveSpd'
          };
          this.upgradeStat(map[e.code]);
      }
  };

  bindExtraEvents() { window.addEventListener('keydown', this.handleKeyDown); }
  spawnBoss(forcedType?: BossType) { if(this.networkManager.isHost) this.spawnManager.spawnBoss(this.entityManager.entities, this.playerManager.entity, this.pushNotification.bind(this), forcedType); }
  closeArena() { if(this.networkManager.isHost) this.spawnManager.closeArena(this.pushNotification.bind(this)); }
  respawn() { 
      if (this.spawnManager.isArenaClosing) { alert("Arena Closed."); return; }
      if (!this.playerManager.entity.isDead) return;
      const spawnPos = this.entityManager.getSpawnPos(this.playerManager.entity.teamId);
      this.playerManager.reset(spawnPos);
  }
  upgradeStat(key: StatKey) { this.playerManager.upgradeStat(key); }
  evolve(className: string) { this.playerManager.evolve(className); }
  pushNotification(message: string, type: 'info' | 'warning' | 'success' | 'boss' = 'info') { this.notificationManager.push(message, type); }
  executeCommand(cmd: string): string { return this.commandManager.execute(cmd); }
  cheatLevelUp() { this.playerManager.gainXp(9999999, 1.0); }
  cheatSetLevel(lvl: number) { this.playerManager.setLevel(lvl); }
  cheatMaxStats() { this.playerManager.state.availablePoints += 33; (Object.keys(this.playerManager.state.stats) as StatKey[]).forEach(k => { if(k !== 'critChance' && k !== 'critDamage') this.playerManager.state.stats[k] = 7; }); this.playerManager.emitUpdate(); }
  cheatToggleGodMode() { this.playerManager.state.godMode = !this.playerManager.state.godMode; this.pushNotification(`God Mode ${this.playerManager.state.godMode ? 'ON' : 'OFF'}`); }
  cheatSpawnDummy() { if(this.networkManager.isHost) AISystem.spawnBots(this.entityManager.entities, 1, 'SANDBOX', () => ({x: 1500, y: 1500})); }
  cheatSpawnBoss() { if(this.networkManager.isHost) this.spawnManager.spawnBoss(this.entityManager.entities, this.playerManager.entity, this.pushNotification.bind(this)); }
  cheatClassSwitch(id: string) { this.playerManager.evolve(id); }
  cheatSuicide() { this.deathManager.handleDeath(this.playerManager.entity, this.playerManager.entity, this.entityManager.entities); }
  
  updateSettings(newSettings: GameSettings) {
    this.settings = newSettings;
    this.audioManager.updateSettings(newSettings.audio);
    this.deathManager.updateSettings(newSettings);
    this.worldController.updateSettings(newSettings);
  }
}
