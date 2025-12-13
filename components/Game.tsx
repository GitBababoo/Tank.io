
"use client";

import React, { useRef, useEffect, useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { PlayerState, GameSettings, GameMode, FactionType, ServerRegion, StatKey } from '../types';
import { DEFAULT_SETTINGS, BASE_STATS } from '../constants';
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
import { Copy, Wifi, Activity } from 'lucide-react';

const initialPlayerState: PlayerState = {
    level: 1, xp: 0, xpToNext: 100, score: 0, availablePoints: 0,
    classPath: 'basic',
    stats: { regen: 0, maxHp: 0, bodyDmg: 0, bulletSpd: 0, bulletPen: 0, bulletDmg: 0, reload: 0, moveSpd: 0, critChance: 0, critDamage: 0 },
    maxLevel: 1, abilityCooldown: 0, statsTracker: { damageDealt: 0, shapesDestroyed: 0, timeAlive: 0, bossKills: 0, playerKills: 0 },
    notifications: [], leaderboard: [], faction: FactionType.NONE, health: BASE_STATS.maxHp, maxHealth: BASE_STATS.maxHp
};

// --- NEW DEBUG OVERLAY COMPONENT ---
const DebugOverlay: React.FC<{ stats: any }> = ({ stats }) => {
    if (!stats) return null;
    return (
        <div className="absolute top-0 left-0 bg-black/80 text-green-400 font-mono text-[10px] p-2 z-[200] border-b border-r border-green-700 shadow-xl pointer-events-none select-none">
            <h3 className="font-bold border-b border-green-800 mb-1 text-xs">DEVELOPER CONSOLE (F2)</h3>
            <div className="grid grid-cols-2 gap-x-4">
                <div>FPS: <span className="text-white">{stats.fps}</span></div>
                <div>PING: <span className={stats.ping > 100 ? "text-red-500" : "text-white"}>{stats.ping}ms</span></div>
                <div>RTT: <span className="text-white">{stats.rtt}ms</span></div>
                <div>ROLE: <span className="text-yellow-400">{stats.isHost ? 'HOST' : 'CLIENT'}</span></div>
                <div>ENTITIES: <span className="text-white">{stats.entities}</span></div>
                <div>ROOM: <span className="text-white">{stats.room}</span></div>
                <div>POS: <span className="text-slate-400">{Math.round(stats.pos.x)}, {Math.round(stats.pos.y)}</span></div>
            </div>
            <div className="mt-1 border-t border-green-800 pt-1">
                <div>NET IN: {stats.packetsIn} pkts / {(stats.bandwidthIn/1024).toFixed(1)} KB</div>
                <div>NET OUT: {stats.packetsOut} pkts</div>
            </div>
        </div>
    );
};

export const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null); 
  const engineRef = useRef<GameEngine | null>(null);
  const mountedRef = useRef(false);
  
  const [gameState, setGameState] = useState<'LOBBY' | 'CONNECTING' | 'PLAYING' | 'STUDIO'>('LOBBY');
  const [gameMode, setGameMode] = useState<GameMode>('FFA');
  const [faction, setFaction] = useState<FactionType>(FactionType.NONE);
  const [playerName, setPlayerName] = useState('Player');
  const [initialClass, setInitialClass] = useState('basic');
  const [serverRegion, setServerRegion] = useState<ServerRegion | null>(null); 
  const [showSettings, setShowSettings] = useState(false);
  const [showConsole, setShowConsole] = useState(false); 
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  
  const [isHost, setIsHost] = useState(false);
  const [hostIdToJoin, setHostIdToJoin] = useState<string | undefined>(undefined);
  const [myRoomId, setMyRoomId] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  const [spectatingName, setSpectatingName] = useState("Unknown");

  const [netStats, setNetStats] = useState({ ping: 0, players: 1 });
  const [debugStats, setDebugStats] = useState<any>(null); // NEW

  useEffect(() => {
      const checkMobile = () => {
          const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 900;
          setIsMobile(mobile);
          if (mobile && settings.graphics.hudScale === 1.0) {
              setSettings(prev => ({ ...prev, graphics: { ...prev.graphics, hudScale: 0.85 } }));
          }
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [playerState, setPlayerState] = useState<PlayerState>(initialPlayerState);
  const isDead = playerState.deathDetails !== undefined;

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

  useEffect(() => {
    mountedRef.current = true;
    if (gameState === 'PLAYING' && canvasRef.current && serverRegion) {
        if (engineRef.current) { engineRef.current.destroy(); engineRef.current = null; }

        setTimeout(() => {
            if (!mountedRef.current || gameState !== 'PLAYING' || !canvasRef.current) return;
            const scale = settings.graphics.resolutionScale || 1.0;
            canvasRef.current.width = window.innerWidth * scale;
            canvasRef.current.height = window.innerHeight * scale;
            
            const newEngine = new GameEngine(
                canvasRef.current, settings, gameMode, playerName, faction, initialClass,
                (newState) => setPlayerState(newState),
                (debugData) => setDebugStats(debugData), // Handle F2 debug data
                minimapRef.current 
            );
            newEngine.audioManager.ctx.resume();
            
            newEngine.networkManager.on('net_stat', (stats) => {
                setNetStats(prev => ({
                    ping: stats.ping,
                    players: stats.players !== -1 ? stats.players : prev.players
                }));
            });

            if (isHost) {
                newEngine.networkManager.hostGame({ name: playerName, mode: gameMode })
                    .then(id => setMyRoomId(id))
                    .catch(err => { alert(err); setGameState('LOBBY'); });
            } else if (hostIdToJoin) {
                newEngine.networkManager.joinGame(hostIdToJoin, { name: playerName, tank: initialClass, faction })
                    .catch(err => { alert(err); setGameState('LOBBY'); });
            }

            if (isMobile) {
                newEngine.cameraManager.targetZoom = 0.8;
                newEngine.cameraManager.currentZoom = 0.8;
            }
            engineRef.current = newEngine;
            canvasRef.current.focus();
        }, 100);
    }
    return () => { if (engineRef.current) engineRef.current.destroy(); };
  }, [gameState, gameMode]); 

  const updateSettings = (newSettings: GameSettings) => { setSettings(newSettings); engineRef.current?.updateSettings(newSettings); };
  const handleUpgrade = (key: StatKey) => engineRef.current?.upgradeStat(key);
  const handleEvolve = (className: string) => engineRef.current?.evolve(className);
  const handleSpawnBoss = () => engineRef.current?.spawnBoss();
  const handleCloseArena = () => engineRef.current?.closeArena();
  const handleRespawn = () => engineRef.current?.respawn();
  const handleBackToLobby = () => { setShowSettings(false); setGameState('LOBBY'); setPlayerState(initialPlayerState); engineRef.current?.destroy(); };
  const handleConsoleCommand = (cmd: string) => engineRef.current ? engineRef.current.executeCommand(cmd) : "Engine not ready";
  const handleAbilityTrigger = () => { engineRef.current?.playerController.inputManager.keys.add('Space'); setTimeout(() => engineRef.current?.playerController.inputManager.keys.delete('Space'), 100); };
  
  const handleSpectateNext = () => {
      engineRef.current?.cameraManager.cycleSpectatorTarget(engineRef.current.entityManager.entities, 1);
      setSpectatingName(engineRef.current?.cameraManager.getSpectatingName(engineRef.current.entityManager.entities) || "Unknown");
  };
  const handleSpectatePrev = () => {
      engineRef.current?.cameraManager.cycleSpectatorTarget(engineRef.current.entityManager.entities, -1);
      setSpectatingName(engineRef.current?.cameraManager.getSpectatingName(engineRef.current.entityManager.entities) || "Unknown");
  };

  const showEvolutionMenu = playerState.availablePoints > 0 || (initialClass === 'basic' && playerState.level >= 15);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900 cursor-crosshair font-sans select-none touch-none">
      {gameState === 'LOBBY' && <LobbyView onStart={handleLobbyStart} onOpenSettings={() => setShowSettings(true)} onOpenStudio={() => setGameState('STUDIO')} />}
      {gameState === 'CONNECTING' && <LoadingScreen serverName={isHost ? "Creating Room..." : "Joining Host..."} onComplete={() => setGameState('PLAYING')} />}
      {gameState === 'STUDIO' && <StudioView onClose={() => setGameState('LOBBY')} />}

      {gameState === 'PLAYING' && (
        <>
            <canvas ref={canvasRef} className="block w-full h-full outline-none touch-none" tabIndex={0} />
            
            {/* NEW: F2 Debug Panel */}
            <DebugOverlay stats={debugStats} />

            {/* NET STATS DISPLAY - Top Right */}
            <div className="absolute top-2 right-2 flex gap-2 pointer-events-none z-20">
                <div className="bg-black/60 px-3 py-1 rounded text-[10px] font-mono font-bold text-green-400 flex items-center gap-2 border border-green-900/50">
                    <Wifi size={12} className={netStats.ping < 100 ? 'text-green-500' : 'text-yellow-500'} />
                    <span>{isHost ? 'HOST' : `${netStats.ping}ms`}</span>
                </div>
                {isHost && (
                    <div className="bg-black/60 px-3 py-1 rounded text-[10px] font-mono font-bold text-cyan-400 border border-cyan-900/50">
                        👥 {netStats.players}
                    </div>
                )}
            </div>

            {isHost && myRoomId && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/60 backdrop-blur px-4 py-2 rounded-full border border-green-500/50 shadow-lg pointer-events-auto hover:bg-black/80 transition-colors">
                    <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">ID:</span>
                    <span className="font-mono font-bold text-white select-all text-xs">{myRoomId}</span>
                    <button onClick={() => { navigator.clipboard.writeText(myRoomId); alert("Copied!"); }} className="p-1 hover:text-green-300 text-slate-400 transition-colors"><Copy size={12} /></button>
                </div>
            )}

            {engineRef.current && <IngameOverlay chatManager={engineRef.current.chatManager} />}
            <Minimap ref={minimapRef} size={isMobile ? 120 : 150} />
            {isMobile && !isDead && <MobileControls inputManager={engineRef.current?.inputManager || null} onAbility={handleAbilityTrigger} />}
            <ConsoleOverlay isOpen={showConsole} onClose={() => setShowConsole(false)} onExecute={handleConsoleCommand} />
            
            <div className={`absolute inset-0 pointer-events-none z-30`} style={{ transform: `scale(${settings.graphics.hudScale})`, transformOrigin: 'top left' }}>
                 {!isDead && <PlayerHub playerState={playerState} showEvolutionMenu={showEvolutionMenu} onUpgrade={handleUpgrade} onEvolve={handleEvolve} isMobile={isMobile} />}
                {gameMode !== 'SANDBOX' && <Scoreboard playerState={playerState} />}
            </div>
            
            <div style={{ transform: `scale(${settings.graphics.hudScale})`, transformOrigin: 'bottom center', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                 {!isDead && <HUD playerState={playerState} />}
            </div>
            
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
                    playerState={playerState} onRespawn={handleRespawn} onBackToLobby={handleBackToLobby}
                    onSpectateNext={handleSpectateNext} onSpectatePrev={handleSpectatePrev} spectatingName={spectatingName}
                />
            )}
            
            {isMobile && !isDead && (
                <button onClick={() => setShowSettings(true)} className="absolute top-3 right-3 md:hidden z-50 bg-slate-900/90 border border-slate-600 rounded-lg px-3 py-2 text-white font-black text-xs shadow-xl active:scale-95 flex items-center gap-1 backdrop-blur pointer-events-auto interactive-ui">
                    <span className="text-yellow-500">⏸</span> MENU
                </button>
            )}
        </>
      )}
      {showSettings && <SettingsPanel settings={settings} onUpdate={updateSettings} onClose={() => setShowSettings(false)} onExitGame={gameState === 'PLAYING' ? handleBackToLobby : undefined} />}
    </div>
  );
};
