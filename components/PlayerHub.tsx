
import React, { useState, useEffect } from 'react';
import { PlayerState, StatKey } from '../types';
import { UpgradeMenu } from './UpgradeMenu';
import { EvolutionMenu } from './EvolutionMenu';
import { DraggableWindow } from './DraggableWindow'; 

interface PlayerHubProps {
  playerState: PlayerState;
  showEvolutionMenu: boolean;
  onUpgrade: (key: StatKey) => void;
  onEvolve: (className: string) => void;
  isMobile: boolean;
}

export const PlayerHub: React.FC<PlayerHubProps> = ({ playerState, showEvolutionMenu, onUpgrade, onEvolve, isMobile }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'UPGRADES' | 'EVOLUTIONS'>('UPGRADES');

  const points = playerState.availablePoints;
  const isEvoReady = showEvolutionMenu;

  useEffect(() => {
    if (showEvolutionMenu && activeTab !== 'EVOLUTIONS') {
      setActiveTab('EVOLUTIONS');
    }
    if (!showEvolutionMenu && activeTab === 'EVOLUTIONS') {
      setActiveTab('UPGRADES');
    }
  }, [showEvolutionMenu]);

  useEffect(() => {
      if (isMobile && points === 0 && !showEvolutionMenu && isExpanded) {
          const timer = setTimeout(() => setIsExpanded(false), 500);
          return () => clearTimeout(timer);
      }
  }, [points, isMobile, showEvolutionMenu, isExpanded]);

  const handleEvolve = (className: string) => {
    onEvolve(className);
    setActiveTab('UPGRADES');
    if(isMobile) setIsExpanded(false);
  };

  if (isMobile) {
      if (!isExpanded) {
          return (
            <div className="absolute top-4 left-4 z-40 interactive-ui">
                <button
                    onClick={() => setIsExpanded(true)}
                    className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border transition-all active:scale-95
                        ${points > 0 || isEvoReady 
                            ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 border-yellow-300 text-black animate-pulse' 
                            : 'bg-slate-900/80 border-slate-600 text-slate-400'}
                    `}
                >
                    <span className="text-lg leading-none">
                        {isEvoReady ? '🧬' : '⚡'}
                    </span>
                    {(points > 0 || isEvoReady) && (
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[9px] font-black uppercase">
                                {isEvoReady ? 'EVOLVE' : 'UPGRADE'}
                            </span>
                            {points > 0 && <span className="text-[10px] font-bold">({points} Pts)</span>}
                        </div>
                    )}
                </button>
            </div>
          );
      }

      return (
          <div className="fixed inset-0 z-50 flex">
              <div 
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm interactive-ui animate-fade-in"
                  onClick={() => setIsExpanded(false)}
              ></div>
              <div className="relative w-64 h-full bg-slate-950/95 border-r border-slate-700 flex flex-col shadow-2xl animate-fade-in-left interactive-ui">
                  <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900">
                      <div className="flex items-center gap-2">
                          <span className="text-yellow-500 font-bold text-lg">{points > 0 ? `(${points})` : ''}</span>
                          <h2 className="text-white font-black uppercase italic tracking-wider text-sm">
                              {activeTab === 'EVOLUTIONS' ? 'Class Tree' : 'Stats'}
                          </h2>
                      </div>
                      <button 
                        onClick={() => setIsExpanded(false)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded text-slate-400 border border-slate-700 active:scale-95"
                      >
                          ✕
                      </button>
                  </div>
                  {showEvolutionMenu && (
                      <div className="flex p-2 gap-2 bg-slate-900 border-b border-slate-800 shrink-0">
                          <button 
                            onClick={() => setActiveTab('UPGRADES')}
                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded ${activeTab === 'UPGRADES' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                          >
                              Stats
                          </button>
                          <button 
                            onClick={() => setActiveTab('EVOLUTIONS')}
                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded ${activeTab === 'EVOLUTIONS' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                          >
                              Evolve
                          </button>
                      </div>
                  )}
                  <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                      {activeTab === 'UPGRADES' && (
                          <UpgradeMenu playerState={playerState} onUpgrade={onUpgrade} />
                      )}
                      {activeTab === 'EVOLUTIONS' && (
                          <EvolutionMenu playerState={playerState} onEvolve={handleEvolve} />
                      )}
                  </div>
              </div>
          </div>
      );
  }

  const header = (
    <div className="flex items-center gap-2 w-full">
        {showEvolutionMenu ? (
            <>
                <button 
                    onClick={() => setActiveTab('UPGRADES')}
                    className={`flex-1 py-1 px-3 text-[10px] font-bold uppercase rounded-md transition-colors ${activeTab === 'UPGRADES' ? 'bg-cyan-600/80 text-white' : 'bg-slate-800/80 text-slate-500 hover:text-white'}`}
                >
                    Stats {points > 0 && <span className="text-yellow-300">({points})</span>}
                </button>
                <button 
                    onClick={() => setActiveTab('EVOLUTIONS')}
                    className={`flex-1 py-1 px-3 text-[10px] font-bold uppercase rounded-md transition-colors ${activeTab === 'EVOLUTIONS' ? 'bg-green-600/80 text-white animate-pulse' : 'bg-slate-800/80 text-slate-500 hover:text-white'}`}
                >
                    Evolve!
                </button>
            </>
        ) : (
            <div className="flex justify-between items-center w-full px-1">
                <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Upgrades</span>
                {points > 0 && (
                    <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded animate-pulse">
                        {points} Available
                    </span>
                )}
            </div>
        )}
    </div>
  );

  return (
    <DraggableWindow 
        id="player-hub"
        initialPos={{ x: 24, y: 100, anchor: 'bottom-left' }} 
        headerContent={header}
        className="w-[260px]"
    >
        <div className="bg-[#0f172a]/90 border border-slate-700/50 backdrop-blur-md shadow-2xl p-3 max-h-[60vh] overflow-y-auto custom-scrollbar rounded-b-xl border-t-0">
            {activeTab === 'UPGRADES' && <UpgradeMenu playerState={playerState} onUpgrade={onUpgrade} />}
            {activeTab === 'EVOLUTIONS' && <EvolutionMenu playerState={playerState} onEvolve={handleEvolve} />}
        </div>
    </DraggableWindow>
  );
};
