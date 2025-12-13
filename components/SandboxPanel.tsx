
import React, { useState } from 'react';
import { TANK_CLASSES } from '../data/tanks';
import { PlayerState, TankRole } from '../types';
import { TankPreview } from './TankPreview';

interface SandboxPanelProps {
  playerState: PlayerState;
  onCheatLevelUp: () => void;
  onCheatSetLevel: (level: number) => void;
  onCheatMaxStats: () => void;
  onCheatGodMode: () => void;
  onCheatSpawnDummy: () => void;
  onCheatSpawnBoss: () => void;
  onCheatSwitchClass: (id: string) => void;
  onCheatSuicide: () => void;
}

export const SandboxPanel: React.FC<SandboxPanelProps> = ({ 
    playerState, 
    onCheatLevelUp, 
    onCheatSetLevel,
    onCheatMaxStats,
    onCheatGodMode,
    onCheatSpawnDummy,
    onCheatSpawnBoss,
    onCheatSwitchClass,
    onCheatSuicide
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'spawning' | 'classes'>('general');

  if (!isOpen) {
      return (
          // CHANGED: Position logic
          // Mobile: Top Center (top-2 left-1/2) to avoid Right (Settings) and Left (Upgrade)
          // Desktop: Top Right but shifted left (right-24) to avoid overlapping leaderboard/minimap toggle
          <div className="fixed top-2 left-1/2 -translate-x-1/2 md:top-6 md:right-24 md:left-auto md:translate-x-0 z-[200] pointer-events-auto">
              <button 
                onClick={() => setIsOpen(true)}
                className="group flex flex-col items-center gap-1 outline-none interactive-ui"
              >
                 <div className="relative">
                    <div className="absolute inset-0 bg-yellow-400/50 rounded-full blur-xl animate-pulse group-hover:bg-yellow-400/80 transition-all duration-500"></div>
                    {/* Size slightly reduced for mobile to not obstruct view */}
                    <div className="relative w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.6)] flex items-center justify-center border-2 border-white transform transition-all group-hover:scale-110 active:scale-95">
                        <span className="text-lg md:text-2xl filter drop-shadow-md">👑</span>
                    </div>
                 </div>
                 <span className="text-[8px] font-black text-yellow-400 uppercase tracking-widest bg-black/50 px-2 rounded-full backdrop-blur-sm">Admin</span>
              </button>
          </div>
      );
  }

  // Sort tanks alphabetically by name for easier searching
  const tanks = Object.entries(TANK_CLASSES)
      .filter(([id, conf]) => conf.name.toLowerCase().includes(search.toLowerCase()))
      .sort(([, a], [, b]) => a.name.localeCompare(b.name));

  return (
    <div className="fixed inset-0 md:inset-auto md:top-6 md:right-6 z-[200] w-full md:w-96 h-full md:h-[85vh] bg-slate-950/95 backdrop-blur-2xl border-0 md:border-2 border-yellow-500 md:rounded-2xl shadow-2xl flex flex-col pointer-events-auto animate-scale-in overflow-hidden interactive-ui">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-yellow-600/20 to-transparent border-b border-yellow-500/30 flex justify-between items-center shrink-0 safe-top">
            <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                <h2 className="text-yellow-400 font-black tracking-[0.2em] text-sm uppercase">GOD MODE</h2>
            </div>
            <button 
                onClick={() => setIsOpen(false)} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-red-500 text-slate-400 hover:text-white transition-all font-bold text-lg border border-slate-700"
            >
                ✕
            </button>
        </div>
        
        {/* Navigation */}
        <div className="flex p-2 gap-2 border-b border-slate-800 bg-black/40 shrink-0">
            {['general', 'spawning', 'classes'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all border ${
                        activeTab === tab 
                        ? 'bg-yellow-500 text-black border-yellow-400 shadow-lg scale-105' 
                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="p-4 md:p-5 overflow-y-auto custom-scrollbar flex-1 bg-black/20 pb-24 md:pb-5">
            
            {activeTab === 'general' && (
                <div className="space-y-6">
                    <div>
                        <SectionTitle title="XP & Levels" />
                        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 mb-2 flex items-center justify-between">
                            <div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase">Current Level</div>
                                <div className="text-3xl font-black text-cyan-400">{playerState.level}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-slate-500 font-bold uppercase">Points Available</div>
                                <div className="text-xl font-bold text-yellow-400">{playerState.availablePoints}</div>
                            </div>
                        </div>

                        {/* Level Slider */}
                        <div className="mb-4 px-2">
                            <input 
                                type="range" 
                                min="1" max="150" 
                                value={playerState.level} 
                                onChange={(e) => onCheatSetLevel(parseInt(e.target.value))}
                                className="w-full h-6 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 touch-none"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                                <span>1</span>
                                <span>45</span>
                                <span>150</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-3">
                            {[10, 30, 45, 60, 90, 120, 150].map(lvl => (
                                <button 
                                    key={lvl}
                                    onClick={() => onCheatSetLevel(lvl)}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold py-3 rounded border border-slate-700 hover:border-cyan-500"
                                >
                                    Lv{lvl}
                                </button>
                            ))}
                            <button onClick={onCheatLevelUp} className="bg-blue-900/50 hover:bg-blue-800 text-blue-300 text-[10px] font-bold py-3 rounded border border-blue-800">+1</button>
                        </div>

                        <AdminBtn onClick={onCheatMaxStats} color="cyan" icon="⚡">Max Stats (45)</AdminBtn>
                    </div>

                    <div>
                        <SectionTitle title="Player State" />
                        <div className="flex flex-col gap-3 mt-2">
                            <button 
                                onClick={onCheatGodMode} 
                                className={`w-full py-4 px-4 rounded-xl font-bold text-sm uppercase tracking-wide border-2 transition-all flex items-center justify-between group shadow-lg ${
                                    playerState.godMode 
                                    ? 'bg-green-900/40 border-green-500 text-green-400 shadow-green-500/20' 
                                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">🛡️</span>
                                    <span>Invulnerability</span>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black ${playerState.godMode ? "bg-green-500 text-black" : "bg-slate-700 text-slate-500"}`}>
                                    {playerState.godMode ? "ACTIVE" : "OFF"}
                                </span>
                            </button>
                            <AdminBtn onClick={onCheatSuicide} color="red" icon="💀">Force Suicide</AdminBtn>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'spawning' && (
                <div className="space-y-6">
                    <div>
                        <SectionTitle title="Entity Spawner" />
                        <div className="grid grid-cols-1 gap-3 mt-2">
                            <AdminBtn onClick={onCheatSpawnDummy} color="slate" icon="🎯">Spawn Target Dummy</AdminBtn>
                            <AdminBtn onClick={onCheatSpawnBoss} color="purple" icon="👹">Spawn Random Boss</AdminBtn>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex gap-3 items-center">
                        <span className="text-2xl">⚠️</span>
                        <div className="text-[10px] text-red-300 font-medium leading-relaxed">
                            Spawning too many entities may cause lag on mobile devices.
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'classes' && (
                <div className="space-y-4 h-full flex flex-col">
                     <div className="relative group shrink-0">
                        <input 
                            className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl p-3 pl-10 text-white text-sm font-bold placeholder:text-slate-600 focus:border-yellow-500 focus:bg-slate-950 outline-none transition-all"
                            placeholder="Search class..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <span className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-yellow-500">🔍</span>
                     </div>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                        {tanks.map(([id, conf]) => (
                            <button 
                                key={id}
                                onClick={() => onCheatSwitchClass(id)}
                                className={`w-full text-left p-2 rounded-xl border-2 text-xs font-bold transition-all flex items-center gap-3 group relative overflow-hidden ${
                                    playerState.classPath === id 
                                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300' 
                                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-600'
                                }`}
                            >
                                <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center shrink-0 border border-white/10">
                                    <TankPreview config={conf} size={40} />
                                </div>
                                
                                <div className="flex flex-col">
                                    <span className="relative z-10 text-sm">{conf.name}</span>
                                    <span className="relative z-10 text-[10px] opacity-50 bg-black/30 px-2 py-0.5 rounded w-fit mt-1">
                                        Tier {conf.tier} • {conf.role}
                                    </span>
                                </div>
                                
                                {playerState.classPath === id && (
                                    <div className="absolute inset-0 bg-yellow-500/5 animate-pulse pointer-events-none"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
        
        {/* Footer */}
        <div className="p-3 bg-black border-t border-slate-800 text-[9px] text-center text-slate-600 font-mono tracking-widest uppercase shrink-0 safe-bottom">
            v3.0 Dev Build • Authorized Personnel Only
        </div>
    </div>
  );
};

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-2 border-l-4 border-yellow-600">
        {title}
    </div>
);

const AdminBtn: React.FC<{ children: React.ReactNode; onClick: () => void; color: string; icon?: string }> = ({ children, onClick, color, icon }) => {
    const colors: Record<string, string> = {
        blue: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30',
        cyan: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/30',
        red: 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/30',
        purple: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/30',
        slate: 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-500/30',
    };

    return (
        <button 
            onClick={onClick}
            className={`${colors[color] || colors.slate} py-4 rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all uppercase tracking-wide flex items-center justify-center gap-2 w-full`}
        >
            {icon && <span className="text-lg">{icon}</span>}
            {children}
        </button>
    );
};
