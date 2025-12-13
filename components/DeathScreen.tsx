
import React, { useState, useEffect } from 'react';
import { PlayerState } from '../types';

interface DeathScreenProps {
  playerState: PlayerState;
  onRespawn: () => void;
  onBackToLobby: () => void;
  // New Props for Spectator
  onSpectatePrev?: () => void;
  onSpectateNext?: () => void;
  spectatingName?: string;
}

export const DeathScreen: React.FC<DeathScreenProps> = ({ 
    playerState, 
    onRespawn, 
    onBackToLobby,
    onSpectatePrev,
    onSpectateNext,
    spectatingName = "Unknown"
}) => {
  const [isSpectating, setIsSpectating] = useState(false);
  const details = playerState.deathDetails;
  
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };

  // Keyboard Shortcuts for Spectator
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (isSpectating) {
              if (e.key === 'ArrowLeft' || e.key === 'a') onSpectatePrev?.();
              if (e.key === 'ArrowRight' || e.key === 'd') onSpectateNext?.();
              if (e.key === 'Escape') setIsSpectating(false);
          } else {
              if (e.key === 'Enter') onRespawn();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpectating, onSpectatePrev, onSpectateNext, onRespawn]);

  // --- SPECTATOR MODE UI ---
  if (isSpectating) {
      return (
          <div className="absolute inset-0 z-50 flex flex-col justify-between pointer-events-none">
              {/* Top Bar: Info */}
              <div className="bg-gradient-to-b from-black/80 to-transparent p-4 text-center animate-fade-in-down pointer-events-auto">
                  <div className="text-red-500 font-black text-xs tracking-widest uppercase mb-1">YOU ARE DEAD</div>
                  <div className="flex items-center justify-center gap-2">
                      <span className="text-slate-400 text-sm font-bold">SPECTATING:</span>
                      <span className="text-cyan-400 text-lg font-black uppercase drop-shadow-md">{spectatingName}</span>
                  </div>
              </div>

              {/* Center: Invisible Click Areas for Desktop (Optional, relying on buttons) */}

              {/* Bottom Bar: Controls */}
              <div className="mb-8 flex flex-col items-center gap-4 animate-fade-in pointer-events-auto px-4">
                  
                  {/* Spectate Controls */}
                  <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md p-2 rounded-full border border-slate-700 shadow-xl">
                      <button 
                        onClick={onSpectatePrev}
                        className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full text-white text-xl border border-slate-600 active:scale-95 transition-all"
                      >
                          ←
                      </button>
                      
                      <div className="text-[10px] text-slate-400 font-bold uppercase px-2 text-center">
                          <div>Change View</div>
                          <div className="text-[8px] opacity-50">(Arrow Keys)</div>
                      </div>

                      <button 
                        onClick={onSpectateNext}
                        className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full text-white text-xl border border-slate-600 active:scale-95 transition-all"
                      >
                          →
                      </button>
                  </div>

                  {/* Return to Menu Actions */}
                  <div className="flex gap-2">
                      <button 
                        onClick={() => setIsSpectating(false)}
                        className="bg-red-600/90 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg text-sm transition-all border border-red-400"
                      >
                          EXIT SPECTATOR
                      </button>
                      <button 
                        onClick={onRespawn}
                        className="bg-green-600/90 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg text-sm transition-all border border-green-400"
                      >
                          RESPAWN NOW
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- STANDARD DEATH SUMMARY UI ---
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {/* Dark overlay with fade in */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      
      <div className="relative bg-slate-900/95 border-2 border-slate-700 rounded-2xl p-6 md:p-8 w-[90%] max-w-[500px] text-center shadow-2xl animate-scale-in flex flex-col items-center gap-6">
        
        {/* Killer Info */}
        <div className="space-y-2">
           <div className="text-slate-400 text-xs md:text-sm uppercase tracking-widest">Killed By</div>
           <div className="text-3xl md:text-4xl font-black text-red-500 drop-shadow-md truncate max-w-[300px]">
             {details?.killerName || "Unknown"}
           </div>
           <div className="text-slate-500 text-[10px] md:text-xs uppercase bg-slate-800 px-3 py-1 rounded-full inline-block border border-slate-700">
             {details?.killerType || "tank"}
           </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700">
           <StatBox label="Score" value={playerState.score.toLocaleString()} highlight />
           <StatBox label="Level" value={playerState.level.toString()} />
           <StatBox label="Time Alive" value={formatTime(playerState.statsTracker.timeAlive)} />
           <StatBox label="Kills" value={playerState.statsTracker.playerKills.toString()} />
        </div>

        {/* Spectate Button (Primary Feature Request) */}
        <button 
            onClick={() => setIsSpectating(true)}
            className="w-full bg-cyan-900/50 hover:bg-cyan-800/80 text-cyan-300 hover:text-white font-bold py-3 rounded-lg border border-cyan-700/50 transition-all flex items-center justify-center gap-2 group"
        >
            <span className="text-lg group-hover:scale-110 transition-transform">👁️</span>
            <span>SPECTATE MATCH</span>
        </button>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full mt-2">
            <button 
              onClick={onBackToLobby}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-3 md:py-4 rounded-xl text-sm md:text-lg shadow-lg transition-all border-b-4 border-slate-800 active:border-b-0 active:translate-y-1"
            >
              LOBBY
            </button>
            <button 
              onClick={onRespawn}
              className="flex-[2] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 md:py-4 rounded-xl text-sm md:text-lg shadow-lg shadow-green-900/50 transition-all border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
            >
              RESPAWN (ENTER)
            </button>
        </div>
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="flex flex-col p-1">
    <span className="text-slate-500 text-[9px] md:text-xs font-bold uppercase">{label}</span>
    <span className={`font-mono text-base md:text-lg ${highlight ? 'text-yellow-400 font-black' : 'text-white'}`}>{value}</span>
  </div>
);
