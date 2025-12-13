
"use client";

import React, { useRef, useEffect, useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { PlayerState, StatKey, GameSettings, GameMode, FactionType, EvoRequirement, ServerRegion } from '../types';
import { DEFAULT_SETTINGS, BASE_STATS } from '../constants';
import { EVOLUTION_TREE } from '../data/tanks';
import { HUD } from './HUD';
import { LobbyView } from './LobbyView';
import { SettingsPanel } from './SettingsPanel';
import { DeathScreen } from './DeathScreen';
import { ConsoleOverlay } from './ConsoleOverlay';
import { Scoreboard } from './Scoreboard';
import { SandboxPanel } from './SandboxPanel'; 
import { StudioView } from './StudioView'; 
import { MobileControls } from './MobileControls';
import { PlayerHub } from './PlayerHub';
import { Minimap } from './Minimap'; 
import { IngameOverlay } from './IngameOverlay'; 
import { LoadingScreen } from './LoadingScreen';
import { Copy } from 'lucide-react';

const initialPlayerState: PlayerState = {
    level: 1, xp: 0, xpToNext: 100, score: 0, availablePoints: 0,
    classPath: 'basic',
    stats: { regen: 0, maxHp: 0, bodyDmg: 0, bulletSpd: 0, bulletPen: 0, bulletDmg: 0, reload: 0, moveSpd: 0, critChance: 0, critDamage: 0 },
    maxLevel: 1,
    abilityCooldown: 0,
    statsTracker: {
        damageDealt: 0,
        shapesDestroyed: 0,
        timeAlive: 0,
        bossKills: 0,
        playerKills: 0
    },
    notifications: [],
    leaderboard: [],
    faction: FactionType.NONE,
    health: BASE_STATS.maxHp,
    maxHealth: BASE_STATS.maxHp
};

export const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null); 
  const engineRef = useRef<GameEngine | null>(null);
  const mountedRef = useRef(false);
  
  const lastUiUpdateRef = useRef(0);
  
  const [gameState, setGameState] = useState<'LOBBY' | 'CONNECTING' | 'PLAYING' | 'STUDIO'>('LOBBY');
  const [gameMode, setGameMode] = useState<GameMode>('FFA');
  const [faction, setFaction] = useState<FactionType>(FactionType.NONE);
  const [playerName, setPlayerName] = useState('Player');
  const [initialClass, setInitialClass] = useState('basic');
  const [serverRegion, setServerRegion] = useState<ServerRegion | null>(null); 
  const [showSettings, setShowSettings] = useState(false);
  const [showConsole, setShowConsole] = useState(false); 
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  
  // P2P State
  const [isHost, setIsHost] = useState(false);
  const [hostIdToJoin, setHostIdToJoin] = useState<string | undefined>(undefined);
  const [myRoomId, setMyRoomId] = useState<string>("");

  const [isMobile, setIsMobile] = useState(false);
  const [spectatingName, setSpectatingName] = useState("Unknown");

  useEffect(() => {
      const checkMobile = () => {
          const mobileCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 900;
          setIsMobile(mobileCheck);
          
          if (mobileCheck && settings.graphics.hudScale === 1.0) {
              setSettings(prev => ({ 
                  ...prev, 
                  graphics: { ...prev.graphics, hudScale: 0.85 } 
              }));
          }
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [playerState, setPlayerState] = useState<PlayerState>(initialPlayerState);
  const isDead = playerState.deathDetails !== undefined;

  // Handle Lobby Start
  const handleLobbyStart = (name: string, mode: GameMode, faction: FactionType, selectedClass: string, region: ServerRegion, host: boolean, hostId?: string) => {
    setPlayerName(name || 'Player');
    setGameMode(mode);
    setFaction(faction);
    setInitialClass(selectedClass);
    setServerRegion(region);
    
    setIsHost(host);
    setHostIdToJoin(hostId);
    
    setGameState('CONNECTING');
  };

  const handleConnectionComplete = () => {
      setGameState('PLAYING');
  };

  // Init Engine
  useEffect(() => {
    mountedRef.current = true;

    if (gameState === 'PLAYING' && canvasRef.current && serverRegion) {
        
        if (engineRef.current) {
            engineRef.current.destroy();
            engineRef.current = null;
        }

        const timer = setTimeout(() => {
            if (!mountedRef.current || gameState !== 'PLAYING' || !canvasRef.current) return;

            const scale = settings.graphics.resolutionScale || 1.0;
            canvasRef.current.width = window.innerWidth * scale;
            canvasRef.current.height = window.innerHeight * scale;
            
            const newEngine = new GameEngine(
                canvasRef.current,
                settings, 
                gameMode,
                playerName,
                faction,
                initialClass,
                (newState) => {
                    const now = performance.now();
                    if (now - lastUiUpdateRef.current > 33) { 
                        if (mountedRef.current) setPlayerState(newState);
                        lastUiUpdateRef.current = now;
                    }
                },
                minimapRef.current 
            );
            
            newEngine.audioManager.ctx.resume();
            
            // --- P2P CONNECTION LOGIC ---
            if (isHost) {
                newEngine.networkManager.hostGame({ name: playerName, mode: gameMode })
                    .then(id => setMyRoomId(id))
                    .catch(err => { alert("Failed to host: " + err); setGameState('LOBBY'); });
            } else if (hostIdToJoin) {
                newEngine.networkManager.joinGame(hostIdToJoin, { name: playerName, tank: initialClass, faction })
                    .catch(err => { alert("Failed to join: " + err); setGameState('LOBBY'); });
            }

            if (isMobile) {
                newEngine.cameraManager.targetZoom = 0.8;
                newEngine.cameraManager.currentZoom = 0.8;
            }

            engineRef.current = newEngine;
            canvasRef.current.focus();
        }, 100);

        return () => clearTimeout(timer);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [gameState, gameMode, faction, initialClass, serverRegion]); 

  // ... (Keep existing handlers for upgrade, evolve, etc.)
  const updateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    if (engineRef.current) {
      engineRef.current.updateSettings(newSettings);
    }
  };

  const handleUpgrade = (key: StatKey) => {
    engineRef.current?.upgradeStat(key);
  };

  const handleEvolve = (className: string) => {
    engineRef.current?.evolve(className);
  };

  const handleSpawnBoss = () => {
      engineRef.current?.spawnBoss();
  };

  const handleCloseArena = () => {
      engineRef.current?.closeArena();
  };

  const handleRespawn = () => {
      engineRef.current?.respawn();
  };
  
  const handleBackToLobby = () => {
      setShowSettings(false); 
      setGameState('LOBBY');
      setPlayerState(initialPlayerState); 
      if (engineRef.current) {
          engineRef.current.destroy();
          engineRef.current = null;
      }
  };

  const handleConsoleCommand = (cmd: string) => {
      if (engineRef.current) {
          return engineRef.current.executeCommand(cmd);
      }
      return "Game engine not ready.";
  };

  const handleAbilityTrigger = () => {
      engineRef.current?.playerController.inputManager.keys.add('Space');
      setTimeout(() => engineRef.current?.playerController.inputManager.keys.delete('Space'), 100);
  };

  const handleSpectateNext = () => {
      engineRef.current?.cameraManager.cycleSpectatorTarget(engineRef.current.entityManager.entities, 1);
      const name = engineRef.current?.cameraManager.getSpectatingName(engineRef.current.entityManager.entities);
      if(name) setSpectatingName(name);
  };

  const handleSpectatePrev = () => {
      engineRef.current?.cameraManager.cycleSpectatorTarget(engineRef.current.entityManager.entities, -1);
      const name = engineRef.current?.cameraManager.getSpectatingName(engineRef.current.entityManager.entities);
      if(name) setSpectatingName(name);
  };

  const evolutionOptions = EVOLUTION_TREE[playerState.classPath] || [];
  const getProgress = (req: EvoRequirement): { met: boolean } => {
    let current = 0;
    switch (req.type) {
      case 'level': current = playerState.level; break;
      case 'score': current = playerState.score; break;
      default: current = 0;
    }
    return { met: current >= req.value };
  };
  const unlockedEvolutions = evolutionOptions.filter(node => node.requirements.every(req => getProgress(req).met));
  const showEvolutionMenu = unlockedEvolutions.length > 0;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900 cursor-crosshair font-sans select-none touch-none">
      
      {gameState === 'LOBBY' && (
        <LobbyView 
          onStart={handleLobbyStart} 
          onOpenSettings={() => setShowSettings(true)}
          onOpenStudio={() => setGameState('STUDIO')}
        />
      )}
      
      {gameState === 'CONNECTING' && serverRegion && (
          <LoadingScreen 
              serverName={isHost ? "Creating Room..." : "Joining Host..."} 
              onComplete={handleConnectionComplete} 
          />
      )}
      
      {gameState === 'STUDIO' && (
          <StudioView onClose={() => setGameState('LOBBY')} />
      )}

      {gameState === 'PLAYING' && (
        <>
            <canvas 
              ref={canvasRef} 
              className="block w-full h-full outline-none touch-none" 
              tabIndex={0} 
            />
            
            {/* ROOM ID OVERLAY (Host Only) */}
            {isHost && myRoomId && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/60 backdrop-blur px-4 py-2 rounded-full border border-green-500/50 shadow-lg pointer-events-auto">
                    <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Room ID:</span>
                    <span className="font-mono font-bold text-white select-all">{myRoomId}</span>
                    <button 
                        onClick={() => { navigator.clipboard.writeText(myRoomId); alert("Copied!"); }}
                        className="p-1 hover:text-green-300 text-slate-400 transition-colors"
                    >
                        <Copy size={14} />
                    </button>
                </div>
            )}

            {engineRef.current && (
                <IngameOverlay chatManager={engineRef.current.chatManager} />
            )}

            <Minimap ref={minimapRef} size={isMobile ? 120 : 150} />
            
            {isMobile && !isDead && (
                <MobileControls 
                    inputManager={engineRef.current?.inputManager || null} 
                    onAbility={handleAbilityTrigger}
                />
            )}
            
            <ConsoleOverlay 
                isOpen={showConsole} 
                onClose={() => setShowConsole(false)} 
                onExecute={handleConsoleCommand} 
            />
            
            <div className={`absolute inset-0 pointer-events-none z-30`} style={{ transform: `scale(${settings.graphics.hudScale})`, transformOrigin: 'top left' }}>
                 {!isDead && (
                    <PlayerHub
                        playerState={playerState}
                        showEvolutionMenu={showEvolutionMenu}
                        onUpgrade={handleUpgrade}
                        onEvolve={handleEvolve}
                        isMobile={isMobile}
                    />
                )}

                {gameMode !== 'SANDBOX' && (
                    <Scoreboard playerState={playerState} />
                )}
            </div>
            
            <div style={{ transform: `scale(${settings.graphics.hudScale})`, transformOrigin: 'bottom center', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                 {!isDead && <HUD playerState={playerState} />}
            </div>
            
            {/* Sandbox panel available only to Host */}
            {gameMode === 'SANDBOX' && !isDead && isHost && (
               <SandboxPanel 
                    playerState={playerState}
                    onCheatLevelUp={() => engineRef.current?.cheatLevelUp()}
                    onCheatSetLevel={(lvl) => engineRef.current?.cheatSetLevel(lvl)}
                    onCheatMaxStats={() => engineRef.current?.cheatMaxStats()}
                    onCheatGodMode={() => engineRef.current?.cheatToggleGodMode()}
                    onCheatSpawnDummy={() => engineRef.current?.cheatSpawnDummy()}
                    onCheatSpawnBoss={() => engineRef.current?.cheatSpawnBoss()}
                    onCheatSwitchClass={(id) => engineRef.current?.cheatClassSwitch(id)}
                    onCheatSuicide={() => engineRef.current?.cheatSuicide()}
               />
            )}
            
            {isDead && (
                <DeathScreen 
                    playerState={playerState} 
                    onRespawn={handleRespawn} 
                    onBackToLobby={handleBackToLobby}
                    onSpectateNext={handleSpectateNext}
                    onSpectatePrev={handleSpectatePrev}
                    spectatingName={spectatingName}
                />
            )}
            
            {isMobile && !isDead && (
                <button 
                    onClick={() => setShowSettings(true)}
                    className="absolute top-3 right-3 md:hidden z-50 bg-slate-900/90 border border-slate-600 rounded-lg px-3 py-2 text-white font-black text-xs shadow-xl active:scale-95 flex items-center gap-1 backdrop-blur pointer-events-auto interactive-ui"
                >
                    <span className="text-yellow-500">⏸</span> MENU
                </button>
            )}
        </>
      )}

      {showSettings && (
        <SettingsPanel 
          settings={settings} 
          onUpdate={updateSettings} 
          onClose={() => setShowSettings(false)}
          onSpawnBoss={gameState === 'PLAYING' && isHost ? handleSpawnBoss : undefined}
          onCloseArena={gameState === 'PLAYING' && isHost ? handleCloseArena : undefined}
          onExitGame={gameState === 'PLAYING' ? handleBackToLobby : undefined} 
        />
      )}

    </div>
  );
};
