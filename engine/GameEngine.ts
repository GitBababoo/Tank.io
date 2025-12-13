
// ... imports (Keep existing imports) ...
import { Vector2, Entity, StatKey, PlayerState, GameSettings, BossType, GameMode, FactionType, EntityType, AIPersonality, Barrel, WorldSnapshot } from '../types';
import { RenderSystem } from './systems/RenderSystem';
import { AISystem } from './systems/AISystem';
import { WorldSystem } from './systems/WorldSystem';
import { MapSystem } from './systems/MapSystem'; 
import { ParticleSystem } from './systems/ParticleSystem';
import { PhysicsSystem } from './systems/PhysicsSystem'; 
import { COLORS, TEAM_COLORS, WORLD_SIZE } from '../constants';
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

declare global {
    interface Window {
        tankAPI: any;
    }
}

export class GameEngine {
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
  onDebugUpdate: (stats: any) => void; // NEW: Debug Callback
  isDestroyed: boolean = false;
  isDebugMode: boolean = false; // NEW: Toggle state

  // Interpolation & Prediction
  private serverReconciliationPosition: Vector2 | null = null;

  constructor(
      canvas: HTMLCanvasElement, 
      settings: GameSettings, 
      gameMode: GameMode, 
      playerName: string, 
      faction: FactionType,
      initialClass: string,
      onUpdateStats: (stats: PlayerState) => void,
      onDebugUpdate: (stats: any) => void,
      minimapCanvas: HTMLCanvasElement | null 
    ) {
    this.canvas = canvas;
    this.settings = settings;
    this.gameMode = gameMode;
    this.onUpdateStats = onUpdateStats;
    this.onDebugUpdate = onDebugUpdate;
    
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
    this.exposeGlobalAPI();
    this.loopManager.start();
  }

  exposeGlobalAPI() {
      window.tankAPI = {
          game: {
              get entities() { return this.engine.entityManager.entities; },
              on: (event: string, handler: any) => { },
              engine: this
          }
      };
  }

  destroy() {
    this.isDestroyed = true;
    this.loopManager.stop();
    this.inputManager.destroy();
    this.networkManager.disconnect();
    window.removeEventListener('keydown', this.handleKeyDown);
    delete window.tankAPI;
  }

  bindNetworkEvents() {
    // --- HOST LOGIC ---
    this.networkManager.on('player_joined', (data) => {
        if (this.isDestroyed || !this.networkManager.isHost) return;
        
        console.log(`[NET] Player Joined: ${data.name}`);
        const spawnPos = this.entityManager.getSpawnPos();

        const newPlayer: Entity = {
            id: data.id,
            name: data.name,
            type: EntityType.PLAYER,
            pos: spawnPos,
            vel: { x: 0, y: 0 }, 
            radius: 20,
            rotation: 0,
            color: COLORS.enemy,
            health: 100, maxHealth: 100, damage: 20, isDead: false,
            teamId: undefined, 
            classPath: data.tank || 'basic',
            scoreValue: 0,
            // @ts-ignore
            remoteInput: { x: 0, y: 0, fire: false, r: 0 } 
        };
        this.entityManager.add(newPlayer);
        this.notificationManager.push(`${data.name} joined.`, 'info');
        
        // Initial Sync
        this.leaderboardManager.update(this.entityManager.entities, this.playerManager.entity, this.playerManager.state);
        this.networkManager.broadcastLeaderboard(this.leaderboardManager.getLatest());
    });

    this.networkManager.on('remote_input', (data) => {
        if (!this.networkManager.isHost) return;
        const entity = this.entityManager.entities.find(e => e.id === data.id);
        if (entity && !entity.isDead) {
            (entity as any).remoteInput = data;
        }
    });

    // --- CLIENT LOGIC ---
    this.networkManager.on('world_update', (snapshot: any[]) => {
        if (this.networkManager.isHost) return;

        const serverIds = new Set<string>();

        snapshot.forEach(remote => {
            serverIds.add(remote.id);

            if (remote.id === this.networkManager.myId) {
                // Client-Side Prediction Reconciliation
                // If local position drifts too far from server, snap or lerp back
                this.serverReconciliationPosition = { x: remote.x, y: remote.y };
                
                // Sync Vital Stats
                this.playerManager.entity.health = remote.h;
                this.playerManager.state.score = remote.s || 0;
            } else {
                // Smooth Interpolation for Remote Entities
                let ent = this.entityManager.entities.find(e => e.id === remote.id);
                if (!ent) {
                    ent = {
                        id: remote.id,
                        type: remote.t,
                        pos: { x: remote.x, y: remote.y },
                        vel: { x: 0, y: 0 },
                        radius: 20, 
                        rotation: remote.r,
                        color: remote.c || '#fff',
                        health: remote.h,
                        maxHealth: remote.m,
                        damage: 0,
                        isDead: false,
                        name: remote.n,
                        classPath: remote.cp,
                        teamId: remote.ti,
                        targetPos: { x: remote.x, y: remote.y }
                    };
                    this.entityManager.add(ent);
                } else {
                    ent.targetPos = { x: remote.x, y: remote.y };
                    
                    // Smooth Rotation
                    let diff = remote.r - ent.rotation;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    ent.rotation += diff * 0.5;

                    ent.health = remote.h;
                    ent.classPath = remote.cp;
                }
            }
        });
        
        // Cleanup ghosts
        this.entityManager.entities = this.entityManager.entities.filter(e => {
            if (e.type === EntityType.PARTICLE || e.type === EntityType.FLOATING_TEXT) return true;
            if (e.type === EntityType.WALL || e.type === EntityType.ZONE) return true;
            return serverIds.has(e.id);
        });
    });

    // CRITICAL: Leaderboard Sync
    this.networkManager.on('leaderboard_update', (data) => {
        if (!this.networkManager.isHost) {
            this.playerManager.state.leaderboard = data;
            
            if (data.length > 0 && !data[0].isPlayer) {
                const leaderEnt = this.entityManager.entities.find(e => e.id === data[0].id);
                this.playerManager.state.leaderPos = leaderEnt ? leaderEnt.pos : undefined;
            } else {
                this.playerManager.state.leaderPos = undefined;
            }
            this.playerManager.emitUpdate();
        }
    });

    this.networkManager.on('player_left', (data) => {
        const idx = this.entityManager.entities.findIndex(e => e.id === data.id);
        if (idx !== -1) {
            const name = this.entityManager.entities[idx].name;
            this.entityManager.entities.splice(idx, 1);
            this.notificationManager.push(`${name} left.`, 'warning');
        }
    });

    this.networkManager.on('chat_message', (data) => {
        this.chatManager.addMessage(data.sender, data.content);
        const speaker = this.entityManager.entities.find(e => e.name === data.sender) || (data.sender === this.playerManager.entity.name ? this.playerManager.entity : null);
        if (speaker) {
            PhysicsSystem.spawnFloatingText(this.entityManager.entities, speaker.pos, data.content, '#fff');
        }
    });
  }

  update(dt: number) {
    if (this.isDestroyed) return;
    
    // --- HOST LOGIC ---
    if (this.networkManager.isHost) {
        const entities = this.entityManager.entities;
        const player = this.playerManager.entity;

        const handleDeathWrapper = (v: Entity, k: Entity) => {
            this.deathManager.handleDeath(v, k, entities);
        };

        // Process Remote Input
        entities.forEach(ent => {
            if (ent.type === EntityType.PLAYER && ent.id !== 'player' && (ent as any).remoteInput) {
                const input = (ent as any).remoteInput;
                const speed = this.statManager.getStat(ent, 'moveSpd') * 60;
                
                // Simple Physics
                ent.vel.x += input.x * speed * dt * 5; 
                ent.vel.y += input.y * speed * dt * 5;
                ent.rotation = input.r; 
            }
        });

        this.playerManager.update(dt);
        this.playerController.update(dt, entities, this.pushNotification.bind(this));
        
        if (!player.isDead) {
            const handleHitscan = (start: Vector2, angle: number, owner: Entity, barrel: Barrel) => 
                PhysicsSystem.processHitscan(start, angle, owner, barrel, entities, player, handleDeathWrapper, this.cameraManager, this.statManager, this.statusEffectSystem, this.audioManager);
            
            this.playerController.handleFiring(dt, entities, handleHitscan);
        }

        this.aiController.update(dt, entities, player, this.cameraManager, handleDeathWrapper);
        this.worldController.update(dt, this.playerController.autoSpin, this.cameraManager, handleDeathWrapper);
        
        if (this.gameMode !== 'SANDBOX') {
            this.spawnManager.update(dt, entities, player, this.gameMode, (team) => this.entityManager.getSpawnPos(team), this.pushNotification.bind(this));
        }

        ParticleSystem.update(entities, dt);
        
        // Broadcast
        this.networkManager.broadcastWorldState([player, ...entities]);

        // Leaderboard (Low Freq)
        if (this.leaderboardManager.shouldUpdate()) {
            this.leaderboardManager.update(entities, player, this.playerManager.state);
            this.playerManager.emitUpdate();
            this.networkManager.broadcastLeaderboard(this.leaderboardManager.getLatest());
        }
    
    } 
    
    // --- CLIENT LOGIC ---
    else {
        const move = this.inputManager.getMovementVector();
        const fire = this.inputManager.getIsFiring();
        this.networkManager.sendClientInput({ 
            x: move.x, 
            y: move.y, 
            r: this.playerManager.entity.rotation,
            fire: fire
        });

        // Client-Side Prediction (Run local physics)
        this.playerController.update(dt, [], () => {}); 
        const player = this.playerManager.entity;
        
        PhysicsSystem.updateMovement([player], dt, this.statManager, WORLD_SIZE, WORLD_SIZE);

        // Reconciliation
        if (this.serverReconciliationPosition) {
            const dx = this.serverReconciliationPosition.x - player.pos.x;
            const dy = this.serverReconciliationPosition.y - player.pos.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 100) { // Teleport if too far
                player.pos.x = this.serverReconciliationPosition.x;
                player.pos.y = this.serverReconciliationPosition.y;
            } else if (dist > 5) { // Lerp if small drift
                player.pos.x += dx * 0.1;
                player.pos.y += dy * 0.1;
            }
            this.serverReconciliationPosition = null;
        }

        // Interpolation for others
        this.entityManager.entities.forEach(ent => {
            if (ent.targetPos) {
                ent.pos.x += (ent.targetPos.x - ent.pos.x) * 0.3; 
                ent.pos.y += (ent.targetPos.y - ent.pos.y) * 0.3;
            }
        });

        ParticleSystem.update(this.entityManager.entities, dt);
    }

    this.chatManager.update(dt, this.entityManager.entities);
    if (this.notificationManager.update()) {
        this.playerManager.state.notifications = this.notificationManager.notifications;
    }

    // --- DEBUG DATA EXPORT ---
    if (this.isDebugMode) {
        this.onDebugUpdate({
            fps: Math.round(this.renderSystem.currentFps),
            ping: this.networkManager.stats.ping,
            rtt: this.networkManager.stats.rtt,
            entities: this.entityManager.entities.length + 1,
            pos: this.playerManager.entity.pos,
            packetsIn: this.networkManager.stats.packetsIn,
            packetsOut: this.networkManager.stats.packetsOut,
            bandwidthIn: this.networkManager.stats.bytesIn,
            isHost: this.networkManager.isHost,
            room: this.gameMode
        });
    }
  }

  // ... (Render and other methods remain) ...
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
      // NEW: F2 Debug Toggle
      if (e.code === 'F2') {
          this.isDebugMode = !this.isDebugMode;
          this.pushNotification(`Developer Mode: ${this.isDebugMode ? 'ON' : 'OFF'}`);
          // Clear debug view if turning off
          if (!this.isDebugMode) this.onDebugUpdate(null); 
      }

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
