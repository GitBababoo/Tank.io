
"use client";

import React, { useRef, useEffect, useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
// ... rest of the file stays exactly the same as provided, just ensure 'use client' is at the top.
// I will output the beginning to ensure it's applied correctly.

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
import { CollapsiblePanel } from './CollapsiblePanel';
import { MobileControls } from './MobileControls';
import { PlayerHub } from './PlayerHub';
import { Minimap } from './Minimap'; 
import { IngameOverlay } from './IngameOverlay'; 
import { LoadingScreen } from './LoadingScreen';

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
  
  // Game States
  const [gameState, setGameState] = useState<'LOBBY' | 'CONNECTING' | 'PLAYING' | 'STUDIO'>('LOBBY');
  const [gameMode, setGameMode] = useState<GameMode>('FFA');
  const [faction, setFaction] = useState<FactionType>(FactionType.NONE);
  const [playerName, setPlayerName] = useState('Player');
  const [initialClass, setInitialClass] = useState('basic');
  const [serverRegion, setServerRegion] = useState<ServerRegion | null>(null); 
  const [showSettings, setShowSettings] = useState(false);
  const [showConsole, setShowConsole] = useState(false); 
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  
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

  useEffect(() => {
      if (gameState === 'PLAYING' && isDead) {
          const interval = setInterval(() => {
              if (engineRef.current) {
                  const name = engineRef.current.cameraManager.getSpectatingName(engineRef.current.entityManager.entities);
                  setSpectatingName(name);
              }
          }, 500);
          return () => clearInterval(interval);
      }
  }, [gameState, isDead]);

  const handleLobbyStart = (name: string, mode: GameMode, faction: FactionType, selectedClass: string, region: ServerRegion) => {
    setPlayerName(name || 'Player');
    setGameMode(mode);
    setFaction(faction);
    setInitialClass(selectedClass);
    setServerRegion(region);
    
    setGameState('CONNECTING');
  };

  const handleConnectionComplete = () => {
      setGameState('PLAYING');
  };

  useEffect(() => {
      const handleResize = () => {
          if (canvasRef.current) {
              const scale = settings.graphics.resolutionScale || 1.0;
              canvasRef.current.width = window.innerWidth * scale;
              canvasRef.current.height = window.innerHeight * scale;
              canvasRef.current.style.width = '100%';
              canvasRef.current.style.height = '100%';
          }
      };
      window.addEventListener('resize', handleResize);
      if (gameState === 'PLAYING') handleResize(); 
      return () => window.removeEventListener('resize', handleResize);
  }, [settings.graphics.resolutionScale, gameState]); 

  useEffect(() => {
    mountedRef.current = true;

    if (gameState === 'PLAYING' && canvasRef.current && serverRegion) {
        
        if (engineRef.current) {
            console.log("[GAME] Cleaning up old engine before spawn");
            engineRef.current.destroy();
            engineRef.current = null;
        }

        const timer = setTimeout(() => {
            if (!mountedRef.current || gameState !== 'PLAYING' || !canvasRef.current) return;

            const scale = settings.graphics.resolutionScale || 1.0;
            canvasRef.current.width = window.innerWidth * scale;
            canvasRef.current.height = window.innerHeight * scale;
            
            console.log("[GAME] Initializing New Engine...");
            const newEngine = new GameEngine(
                canvasRef.current,
                settings, 
                gameMode,
                playerName,
                faction,
                initialClass,
                (newState) => {
                    if (mountedRef.current) setPlayerState(newState);
                },
                minimapRef.current 
            );
            
            newEngine.audioManager.ctx.resume();

            newEngine.networkManager.connect(serverRegion, { name: playerName, tank: initialClass, mode: gameMode, faction: faction });

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
        console.log("[GAME] Destroying Engine");
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [gameState, gameMode, faction, initialClass, serverRegion]); 

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSettings(prev => !prev);
      }
      if (e.key === 'Home') {
          e.preventDefault();
          setShowConsole(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
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
              serverName={serverRegion.name} 
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
            
            {gameMode === 'SANDBOX' && !isDead && (
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
            
            {/* PAUSE / SETTINGS BUTTON FOR MOBILE */}
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
          onSpawnBoss={gameState === 'PLAYING' ? handleSpawnBoss : undefined}
          onCloseArena={gameState === 'PLAYING' ? handleCloseArena : undefined}
          onExitGame={gameState === 'PLAYING' ? handleBackToLobby : undefined} 
        />
      )}

    </div>
  );
};
