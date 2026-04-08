
import React from 'react';
import { TankConfig, TankRole, Barrel, BarrelVisual, BulletType } from '../types';
import { TANK_CLASSES, EVOLUTION_TREE } from '../data/tanks';
import { COLORS } from '../constants';
import { TankPreview } from './TankPreview'; // Keep for small buttons
import { LiveTankPreview } from './LiveTankPreview'; // NEW

interface TankDetailViewProps {
  tank: TankConfig;
  tankId: string;
  onClose: () => void;
  onSelectTank: (id: string) => void;
}

// NEW: Visual Armament Mapping
const ARMAMENT_VISUALS: Record<string, { icon: string, name: string }> = {
    'STANDARD': { icon: '💥', name: 'Cannon' },
    'SNIPER': { icon: '🎯', name: 'Sniper' },
    'RAILGUN': { icon: '⚡', name: 'Railgun' },
    'MACHINE_GUN': { icon: '🔥', name: 'Machine Gun' },
    'GATLING': { icon: '⚙️', name: 'Gatling' },
    'DRONE': { icon: '🛰️', name: 'Drone Bay' },
    'TRAP': { icon: '🛑', name: 'Trap Layer' },
    'FLAME': { icon: '🔥', name: 'Flamethrower' },
    'ICE': { icon: '❄️', name: 'Cryo Beam' },
    'FROST': { icon: '❄️', name: 'Frost Beam' },
    'PLASMA': { icon: '✨', name: 'Plasma' },
    'COIL': { icon: '🌀', name: 'Coilgun' },
    'POISON': { icon: '☠️', name: 'Poison' },
    'HIVE': { icon: '🐝', name: 'Hive' },
    'TESLA': { icon: '⚡', name: 'Tesla' },
    'THUNDER': { icon: '⛈️', name: 'Thunder' },
    'HITSCAN': { icon: '🔦', name: 'Laser' },
};

const getArmamentDetails = (barrels: Barrel[]): { icon: string; name: string; count: number, special?: string }[] => {
    const counts: Record<string, { count: number, icon: string, special?: string }> = {};

    barrels.forEach(b => {
        let typeName = 'Cannon';
        let icon = '💥';
        const specials: string[] = [];

        if (b.isDroneSpawner) {
            typeName = 'Drone Bay';
            icon = ARMAMENT_VISUALS['DRONE'].icon;
        } else if (b.isTrapLayer) {
            typeName = 'Trap Layer';
            icon = ARMAMENT_VISUALS['TRAP'].icon;
        } else {
            const visual = ARMAMENT_VISUALS[b.visualType || 'STANDARD'];
            if (visual) {
                typeName = visual.name;
                icon = visual.icon;
            }
        }
        
        // Collect ALL special properties
        if (b.behavior === 'HITSCAN') specials.push('INSTANT');
        if (b.bulletType === BulletType.HIGH_EXPLOSIVE) specials.push('BLAST');
        if (b.bulletType === BulletType.ARMOR_PIERCING) specials.push('PIERCE');
        if (b.bulletType === BulletType.INCENDIARY) specials.push('BURN');
        if (b.bulletType === BulletType.CRYO) specials.push('SLOW');
        if (b.bulletType === BulletType.NANO_SPLITTER) specials.push('SPLIT');
        if (b.isAutoTurret) specials.push('AUTO');

        const special = specials.join(' • ');
        const key = typeName + (special ? `|${special}` : '');
        
        if (!counts[key]) {
            counts[key] = { count: 0, icon: icon, special };
        }
        counts[key].count++;
    });

    return Object.entries(counts).map(([key, data]) => ({ name: key.split('|')[0], ...data }));
};


export const TankDetailView: React.FC<TankDetailViewProps> = ({ tank, tankId, onClose, onSelectTank }) => {
  
  const getStatPercent = (key: 'reload' | 'bulletDmg' | 'maxHp' | 'moveSpd') => {
      const bonus = tank.statBonus?.[key] || 1;
      let val = 0;
      if (key === 'reload') val = 1 / bonus; 
      else val = bonus;
      return Math.min(100, Math.max(10, val * 30));
  };

  const parents = Object.entries(EVOLUTION_TREE).filter(([pid, nodes]) => 
      nodes.some(n => n.target === tankId)
  ).map(([pid]) => pid);

  const evolutions = EVOLUTION_TREE[tankId] || [];
  const armament = getArmamentDetails(tank.barrels);

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-lg p-4 md:p-8 animate-fade-in">
        <div className="w-full max-w-6xl h-full md:h-[90vh] flex flex-col md:flex-row gap-6">
            
            {/* LEFT COLUMN: LIVE PREVIEW */}
            <div className="w-full md:w-5/12 flex flex-col h-[40vh] md:h-full relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-3xl opacity-50 blur-xl"></div>
                <LiveTankPreview config={tank} className="flex-1 shadow-2xl border-2 border-slate-700/50" />
                
                {/* Float badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <span 
                        className="px-3 py-1 rounded-md font-black text-xs uppercase tracking-widest shadow-lg border border-white/10 w-fit backdrop-blur-md"
                        style={{ 
                            backgroundColor: COLORS[`role${tank.role.charAt(0) + tank.role.slice(1).toLowerCase()}` as keyof typeof COLORS],
                            color: '#fff' 
                        }}
                    >
                        {tank.role} Class
                    </span>
                    <span className="text-white/50 text-[10px] font-bold bg-black/50 px-2 py-1 rounded backdrop-blur-md w-fit">
                        TIER {tank.tier}
                    </span>
                </div>
            </div>

            {/* RIGHT COLUMN: INFO & STATS */}
            <div className="w-full md:w-7/12 flex flex-col gap-4 overflow-y-auto custom-scrollbar md:pr-2">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-700 pb-2 shrink-0">
                    <div>
                        <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase mb-1 drop-shadow-lg">{tank.name}</h1>
                        <p className="text-slate-400 text-sm md:text-lg font-medium">{tank.description}</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xl transition-colors border border-slate-600">✕</button>
                </div>

                {/* SKILLS & ABILITIES (Priority Display) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
                    <div className={`p-3 rounded-xl border flex items-center gap-3 relative overflow-hidden ${tank.activeSkill ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-slate-800/30 border-slate-700 opacity-50'}`}>
                        {tank.activeSkill && <div className="absolute inset-0 bg-cyan-500/5 animate-pulse"></div>}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-2xl ${tank.activeSkill ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-slate-700 text-slate-500'}`}>
                            ⚡
                        </div>
                        <div>
                            <div className="text-[10px] text-cyan-400 font-black uppercase tracking-wider">Active Skill (F)</div>
                            <div className="text-white font-bold text-sm">{tank.activeSkill ? tank.activeSkill.name : 'None'}</div>
                            {tank.activeSkill && <div className="text-[10px] text-slate-400 leading-tight">{tank.activeSkill.description}</div>}
                        </div>
                    </div>

                    <div className={`p-3 rounded-xl border flex items-center gap-3 ${tank.passiveSkill ? 'bg-purple-900/20 border-purple-500/30' : 'bg-slate-800/30 border-slate-700 opacity-50'}`}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-2xl ${tank.passiveSkill ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-slate-700 text-slate-500'}`}>
                            🛡️
                        </div>
                        <div>
                            <div className="text-[10px] text-purple-400 font-black uppercase tracking-wider">Passive</div>
                            <div className="text-white font-bold text-sm">{tank.passiveSkill ? tank.passiveSkill.name : 'None'}</div>
                            {tank.passiveSkill && <div className="text-[10px] text-slate-400 leading-tight">{tank.passiveSkill.description}</div>}
                        </div>
                    </div>
                </div>

                {/* ARMAMENT & STATS */}
                <div className="flex flex-col md:flex-row gap-4 shrink-0">
                    {/* Ammo Types */}
                    <div className="flex-1 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-700 pb-1">Weapons Config</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {armament.length > 0 ? armament.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-slate-900/80 p-2 rounded border border-slate-700/50">
                                    <span className="text-lg">{item.icon}</span>
                                    <div className="flex flex-col leading-none">
                                        <div className="flex items-center gap-1">
                                            <span className="font-mono text-cyan-400 text-xs font-bold">{item.count}x</span>
                                            <span className="text-[10px] font-bold text-slate-200">{item.name}</span>
                                        </div>
                                        {item.special && <span className="text-[9px] text-yellow-500 font-bold mt-0.5">{item.special}</span>}
                                    </div>
                                </div>
                            )) : (
                                <div className="text-xs text-slate-500 italic col-span-2 text-center py-2">Melee Body Damage Only</div>
                            )}
                        </div>
                    </div>

                    {/* Stats Bars */}
                    <div className="flex-1 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-700 pb-1">Performance</h3>
                        <div className="space-y-3">
                            <StatBar label="Firepower" percent={getStatPercent('bulletDmg')} color="bg-gradient-to-r from-red-600 to-red-400" />
                            <StatBar label="Rate of Fire" percent={getStatPercent('reload')} color="bg-gradient-to-r from-yellow-600 to-yellow-400" />
                            <StatBar label="Durability" percent={getStatPercent('maxHp')} color="bg-gradient-to-r from-green-600 to-green-400" />
                            <StatBar label="Mobility" percent={getStatPercent('moveSpd')} color="bg-gradient-to-r from-cyan-600 to-cyan-400" />
                        </div>
                    </div>
                </div>

                {/* EVOLUTION TREE */}
                <div className="mt-auto space-y-3 bg-slate-900/80 p-4 rounded-xl border border-slate-700/80 backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🧬</span>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Evolution Network</div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        {parents.length > 0 && (
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-bold text-slate-500 w-8 text-right">PREV</span>
                                <div className="flex flex-wrap gap-2">
                                    {parents.map(pid => (
                                        <EvoButton key={pid} id={pid} onClick={() => onSelectTank(pid)} />
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="flex items-start gap-4">
                            <span className="text-[10px] font-bold text-green-500 w-8 text-right pt-2">NEXT</span>
                            <div className="flex flex-wrap gap-2 flex-1">
                                {evolutions.length > 0 ? evolutions.map(evo => {
                                    const levelReq = evo.requirements.find(r => r.type === 'level')?.value;
                                    const reqText = levelReq ? `Lv ${levelReq}` : "Special";
                                    return (
                                        <EvoButton 
                                            key={evo.target} 
                                            id={evo.target} 
                                            subtext={reqText}
                                            onClick={() => onSelectTank(evo.target)} 
                                        />
                                    );
                                }) : (
                                    <div className="text-xs text-slate-600 italic py-2 px-3 border border-dashed border-slate-700 rounded-lg w-full">
                                        Apex Evolution (Max Tier)
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};

const StatBar: React.FC<{ label: string; percent: number; color: string }> = ({ label, percent, color }) => (
    <div>
        <div className="flex justify-between mb-0.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase">{label}</span>
            <span className="text-[9px] font-bold text-white">{Math.round(percent)}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/50">
            <div className={`h-full rounded-full ${color} shadow-[0_0_8px_currentColor]`} style={{ width: `${percent}%` }}></div>
        </div>
    </div>
);

const EvoButton: React.FC<{ id: string; subtext?: string; onClick: () => void }> = ({ id, subtext, onClick }) => {
    const conf = TANK_CLASSES[id];
    return (
        <button 
            onClick={onClick}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500 px-2 py-1.5 rounded-lg transition-all group active:scale-95"
        >
            <div className="w-8 h-8 relative shrink-0">
                <TankPreview config={conf} size={32} />
            </div>
            <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-slate-300 group-hover:text-white uppercase leading-none">{conf.name}</span>
                {subtext && <span className="text-[8px] font-bold text-cyan-600 leading-none mt-0.5 group-hover:text-cyan-400">{subtext}</span>}
            </div>
        </button>
    );
}
