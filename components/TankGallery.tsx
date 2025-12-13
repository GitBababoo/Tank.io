
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TANK_CLASSES } from '../data/tanks';
import { TankRole, BulletType, WeaponBehavior, BarrelVisual, Entity, EntityType } from '../types';
import { COLORS } from '../constants';
import { TankPreview } from './TankPreview';
import { TankDetailView } from './TankDetailView';
import { LiveTankPreview } from './LiveTankPreview';
import { Barrels } from '../data/barrels/presets';
import { defineTank } from '../data/TankBuilder';
import { RenderSystem } from '../engine/systems/RenderSystem';

// --- BULLET PREVIEW COMPONENT (Renders "Real" Models) ---
const BulletPreview: React.FC<{ type: BulletType, visual?: BarrelVisual, color: string, size?: number }> = ({ type, visual, color, size = 80 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // High DPI setup
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;

        const renderer = new RenderSystem(canvas, true);
        const ctx = renderer.ctx;
        ctx.scale(dpr, dpr);
        ctx.translate(size/2, size/2);
        
        // Rotate to point up-right for dynamic look
        ctx.rotate(-Math.PI / 4); 
        ctx.scale(1.5, 1.5); // Zoom in

        // Mock Entity
        const dummyBullet: Entity = {
            id: 'preview_bullet',
            type: EntityType.BULLET,
            pos: { x: 0, y: 0 },
            vel: { x: 0, y: 0 },
            radius: size / 5, 
            rotation: 0, 
            color: color,
            health: 1, maxHealth: 1, damage: 1, isDead: false,
            bulletType: type,
            bulletVisual: visual,
            // Add some "fake" data for visuals that rely on it
            isCritical: Math.random() < 0.1 // Occasional crit shine
        };

        // Use the actual game renderer
        renderer.effectRenderer.drawBullet(dummyBullet);

    }, [type, visual, color, size]);

    return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
};

// --- WEAPON DATABASE ---
const WEAPON_DB = [
    { 
        id: 'standard', name: 'Standard Shell', type: 'KINETIC',
        bulletType: BulletType.STANDARD, visual: 'STANDARD' as BarrelVisual,
        barrel: Barrels.Standard({ width: 15, length: 45 }), 
        desc: 'The baseline projectile. Balanced damage, speed, and penetration.',
        color: '#a0a0a0',
        stats: { dmg: 'Normal', spd: 'Normal', effect: 'None' }
    },
    { 
        id: 'ap', name: 'AP Sabot', type: 'KINETIC',
        bulletType: BulletType.ARMOR_PIERCING, visual: 'SNIPER' as BarrelVisual,
        barrel: Barrels.Sniper({ width: 12, length: 60 }), 
        desc: 'Armor Piercing kinetic rod. High velocity and penetration power. Ignores some armor.',
        color: '#ff4444',
        stats: { dmg: 'High', spd: 'Fast', effect: 'Pierce' }
    },
    { 
        id: 'he', name: 'HE Rocket', type: 'EXPLOSIVE',
        bulletType: BulletType.HIGH_EXPLOSIVE, visual: 'RAILGUN' as BarrelVisual, // Using visual type map
        barrel: Barrels.Rocket({ width: 24, length: 50 }), 
        desc: 'High Explosive warhead. Detonates on impact dealing Area of Effect (AOE) damage.',
        color: '#ffaa00',
        stats: { dmg: 'Massive', spd: 'Slow', effect: 'Explode' }
    },
    { 
        id: 'plasma', name: 'Plasma Bolt', type: 'ENERGY',
        bulletType: BulletType.HIGH_EXPLOSIVE, visual: 'PLASMA' as BarrelVisual,
        barrel: Barrels.Plasma({ width: 35, length: 55 }), 
        desc: 'Unstable energy sphere. Pulsating core melts through targets with high DPS.',
        color: '#aa00ff',
        stats: { dmg: 'Very High', spd: 'Medium', effect: 'Meltdown' }
    },
    { 
        id: 'cryo', name: 'Cryo Shard', type: 'ELEMENTAL',
        bulletType: BulletType.CRYO, visual: 'ICE' as BarrelVisual,
        barrel: Barrels.CryoBeam({ width: 20, length: 55 }), 
        desc: 'Sub-zero crystal shard. Applies a stacking SLOW effect to enemies on contact.',
        color: '#00ffff',
        stats: { dmg: 'Low', spd: 'Fast', effect: 'Slow -30%' }
    },
    { 
        id: 'flame', name: 'Napalm Stream', type: 'ELEMENTAL',
        bulletType: BulletType.INCENDIARY, visual: 'FLAME' as BarrelVisual,
        barrel: Barrels.Flamethrower({ width: 30, length: 50 }), 
        desc: 'Liquid fire. Applies a BURN effect (Damage over Time) that ignores armor.',
        color: '#ff6600',
        stats: { dmg: 'DoT', spd: 'Fast', effect: 'Burn' }
    },
    { 
        id: 'nano', name: 'Nano-Cluster', type: 'TECH',
        bulletType: BulletType.NANO_SPLITTER, visual: 'STANDARD' as BarrelVisual,
        barrel: Barrels.Standard({ width: 20, length: 45, bulletType: BulletType.NANO_SPLITTER }), 
        desc: 'Smart-cluster round. Splits into smaller tracking pellets on impact or range.',
        color: '#00ff00',
        stats: { dmg: 'Medium', spd: 'Medium', effect: 'Split' }
    },
    { 
        id: 'rail', name: 'Railgun Slug', type: 'KINETIC',
        bulletType: BulletType.ARMOR_PIERCING, visual: 'RAILGUN' as BarrelVisual,
        barrel: Barrels.Railgun({ width: 12, length: 70 }), 
        desc: 'Hyper-velocity slug. Instantly travels to target (Hitscan) or moves extremely fast.',
        color: '#00ffff',
        stats: { dmg: 'Extreme', spd: 'Instant', effect: 'Snipe' }
    },
];

// --- DASHBOARD (STATS) ---
const DashboardSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-slate-900/40 p-2 rounded-lg border border-white/5 h-full min-w-[150px] flex flex-col justify-center backdrop-blur-sm">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-2 border-l-2 border-cyan-500/50">{title}</h3>
        {children}
    </div>
);

const StatChip: React.FC<{ icon: string, label: string, value?: number }> = ({ icon, label, value }) => (
    <div className="flex items-center gap-2" title={label}>
        <span className="text-xs opacity-70">{icon}</span>
        <div className="flex items-baseline gap-1">
            <span className="text-[9px] font-bold text-slate-400 truncate">{label}</span>
            {value !== undefined && <span className="text-[10px] font-mono text-cyan-400">{value}</span>}
        </div>
    </div>
);

const Dashboard = () => {
  const stats = useMemo(() => {
    const roles: Record<string, number> = {};
    for (const tank of Object.values(TANK_CLASSES)) {
      roles[tank.role] = (roles[tank.role] || 0) + 1;
    }
    return {
      roles: Object.entries(roles).sort(([,a], [,b]) => b - a).slice(0, 6),
      totalTanks: Object.keys(TANK_CLASSES).length
    };
  }, []);

  return (
    <div className="absolute top-4 left-4 z-20 flex gap-2 pointer-events-none hidden md:flex">
        <DashboardSection title="Database">
            <div className="text-2xl font-black text-white">{stats.totalTanks} <span className="text-xs text-slate-500 font-normal">UNITS</span></div>
        </DashboardSection>
        <DashboardSection title="Classes">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {stats.roles.map(([role, count]) => (
              <StatChip key={role} icon="💠" label={role} value={count} />
            ))}
          </div>
        </DashboardSection>
    </div>
  );
};

// --- INTERACTIVE COMPONENTS ---

interface TankGalleryProps {
  onClose: () => void;
}

export const TankGallery: React.FC<TankGalleryProps> = ({ onClose }) => {
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
  const [selectedWeaponIdx, setSelectedWeaponIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'CLASSES' | 'ARMORY'>('CLASSES');
  
  // Viewport State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // --- DATA PREP ---
  const tiers = useMemo(() => 
    [...new Set(Object.values(TANK_CLASSES).map(t => t.tier))].sort((a, b) => a - b),
    []
  );

  const getTanksByTier = (tier: number) => {
      return Object.entries(TANK_CLASSES)
        .filter(([_, t]) => t.tier === tier)
        .sort(([, a], [, b]) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
  };

  // --- NAVIGATION LOGIC ---
  const handleWheel = (e: React.WheelEvent) => {
      e.stopPropagation();
      const scaleAmount = -e.deltaY * 0.001;
      const newScale = Math.min(Math.max(0.5, transform.scale + scaleAmount), 2);
      setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      setIsDragging(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      dragStart.current = { x: clientX - transform.x, y: clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault(); 
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      
      setTransform(prev => ({
          ...prev,
          x: clientX - dragStart.current.x,
          y: clientY - dragStart.current.y
      }));
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden animate-fade-in touch-none">
       
       {/* --- BACKGROUND GRID --- */}
       <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ 
                backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', 
                backgroundSize: '20px 20px',
                transform: `translate(${transform.x % 20}px, ${transform.y % 20}px)` 
            }}
       ></div>

       {/* --- HEADER --- */}
       <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-950 to-transparent z-30 pointer-events-none">
            <div className="absolute top-4 right-4 pointer-events-auto flex gap-2">
                <button onClick={() => setTransform({ x: 0, y: 0, scale: 1 })} className="bg-slate-800/80 hover:bg-slate-700 text-white p-2 rounded-lg border border-slate-700 backdrop-blur transition-all active:scale-95 text-xs font-bold">
                    📍 RESET
                </button>
                <button onClick={onClose} className="bg-red-900/80 hover:bg-red-800 text-white px-4 py-2 rounded-lg border border-red-700 backdrop-blur transition-all font-bold active:scale-95 text-xs">
                    EXIT ✕
                </button>
            </div>
            
            {/* View Switcher */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto flex bg-slate-900/80 rounded-lg p-1 border border-slate-700 backdrop-blur shadow-xl">
                <button 
                    onClick={() => setViewMode('CLASSES')}
                    className={`px-6 py-3 rounded-md text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'CLASSES' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Class Tree
                </button>
                <button 
                    onClick={() => setViewMode('ARMORY')}
                    className={`px-6 py-3 rounded-md text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'ARMORY' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Armory
                </button>
            </div>
       </div>

       {/* --- DASHBOARD (Only in Classes Mode) --- */}
       {viewMode === 'CLASSES' && <Dashboard />}

       {/* --- MAIN CONTENT CANVAS --- */}
       <div 
            ref={containerRef}
            className={`flex-1 w-full h-full relative overflow-hidden cursor-grab active:cursor-grabbing touch-none ${isDragging ? 'select-none' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            onWheel={handleWheel}
       >
            <div 
                className="absolute origin-top-left transition-transform duration-75 ease-linear will-change-transform"
                style={{ 
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                    minWidth: '100%',
                    minHeight: '100%'
                }}
            >
                {viewMode === 'CLASSES' ? (
                    // --- TANK TREE VIEW ---
                    <div className="flex items-start p-20 gap-12">
                        {tiers.map((tier) => {
                            const tanksInTier = getTanksByTier(tier);
                            if (tanksInTier.length === 0) return null;

                            return (
                                <div key={tier} className="flex flex-col gap-4 w-48 shrink-0 relative">
                                    <div className="sticky top-0 -mt-10 mb-4 text-center">
                                        <div className="text-4xl font-black text-slate-800/50 absolute -top-4 left-1/2 -translate-x-1/2 select-none">T{tier}</div>
                                        <div className="relative text-xs font-bold text-cyan-500 bg-slate-950/80 px-3 py-1 rounded-full border border-cyan-900/50 inline-block backdrop-blur">
                                            TIER {tier}
                                        </div>
                                    </div>

                                    {tanksInTier.map(([id, tank]) => (
                                        <div 
                                            key={id}
                                            onClick={(e) => { e.stopPropagation(); if (!isDragging) setSelectedTankId(id); }}
                                            className="relative flex items-center gap-3 p-2 rounded-xl border-2 border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-cyan-400 hover:scale-105 hover:z-10 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-200 cursor-pointer backdrop-blur-sm group"
                                        >
                                            <div className="w-10 h-10 bg-slate-950 rounded-lg border border-white/5 flex items-center justify-center shrink-0">
                                                <TankPreview config={tank} size={32} />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-black uppercase truncate text-slate-300 group-hover:text-white">
                                                    {tank.name}
                                                </span>
                                                <span 
                                                    className="text-[8px] font-bold uppercase tracking-wide"
                                                    style={{ color: COLORS[`role${tank.role.charAt(0) + tank.role.slice(1).toLowerCase()}` as keyof typeof COLORS] }}
                                                >
                                                    {tank.role}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // --- ARMORY VIEW (New & Improved) ---
                    <div className="p-24 pb-48 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto pointer-events-none">
                        {WEAPON_DB.map((weapon, idx) => (
                            <div 
                                key={idx} 
                                onClick={(e) => { e.stopPropagation(); if(!isDragging) setSelectedWeaponIdx(idx); }}
                                className="bg-slate-900/90 border border-slate-700 p-0 rounded-2xl flex flex-col cursor-pointer pointer-events-auto hover:bg-slate-800 hover:border-orange-500 hover:shadow-[0_0_30px_rgba(249,115,22,0.2)] transition-all group overflow-hidden relative"
                            >
                                {/* Top: Visual Preview */}
                                <div className="h-32 bg-slate-950/50 flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                                    {/* The Real Bullet Model */}
                                    <BulletPreview 
                                        type={weapon.bulletType} 
                                        visual={weapon.visual} 
                                        color={weapon.color} 
                                        size={100} 
                                    />
                                    
                                    <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/60 text-[9px] font-bold text-slate-400 border border-white/10 uppercase tracking-wider">
                                        {weapon.type}
                                    </div>
                                </div>

                                {/* Bottom: Info */}
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="text-white font-bold text-lg leading-none mb-1 group-hover:text-orange-400 transition-colors">
                                        {weapon.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 leading-tight mb-3">
                                        {weapon.desc}
                                    </div>
                                    
                                    {/* Mini Stats Grid */}
                                    <div className="mt-auto grid grid-cols-3 gap-1 pt-2 border-t border-slate-800">
                                        <div className="text-center bg-slate-800/50 rounded py-1">
                                            <div className="text-[8px] text-slate-500 uppercase">DMG</div>
                                            <div className="text-[10px] text-white font-bold">{weapon.stats.dmg}</div>
                                        </div>
                                        <div className="text-center bg-slate-800/50 rounded py-1">
                                            <div className="text-[8px] text-slate-500 uppercase">SPD</div>
                                            <div className="text-[10px] text-white font-bold">{weapon.stats.spd}</div>
                                        </div>
                                        <div className="text-center bg-slate-800/50 rounded py-1">
                                            <div className="text-[8px] text-slate-500 uppercase">FX</div>
                                            <div className="text-[10px] text-yellow-400 font-bold">{weapon.stats.effect}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
       </div>

       {/* --- BOTTOM EXIT BAR (Mobile Friendly) --- */}
       <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-950 border-t border-slate-800 z-40 flex justify-center pointer-events-auto safe-bottom">
            <button 
                onClick={onClose}
                className="w-full max-w-sm bg-slate-800 hover:bg-red-900/80 text-slate-300 hover:text-white font-bold py-4 rounded-xl text-sm uppercase tracking-widest transition-all border border-slate-700 shadow-lg flex items-center justify-center gap-2"
            >
                <span>✕</span> Close Database
            </button>
       </div>

       {/* --- ZOOM CONTROLS --- */}
       <div className="absolute bottom-24 right-6 flex flex-col gap-2 z-30 pointer-events-auto">
            <button onClick={() => setTransform(p => ({...p, scale: Math.min(2, p.scale + 0.2)}))} className="w-12 h-12 bg-slate-800 rounded-xl text-2xl font-bold text-white border border-slate-700 hover:bg-slate-700 active:scale-95 shadow-lg">+</button>
            <button onClick={() => setTransform(p => ({...p, scale: Math.max(0.5, p.scale - 0.2)}))} className="w-12 h-12 bg-slate-800 rounded-xl text-2xl font-bold text-white border border-slate-700 hover:bg-slate-700 active:scale-95 shadow-lg">-</button>
       </div>

       {/* --- MODALS --- */}
       
       {/* TANK DETAIL MODAL */}
       {selectedTankId && (
          <TankDetailView 
              tankId={selectedTankId} 
              tank={TANK_CLASSES[selectedTankId]} 
              onClose={() => setSelectedTankId(null)} 
              onSelectTank={(id) => setSelectedTankId(id)}
          />
       )}

       {/* WEAPON DETAIL MODAL */}
       {selectedWeaponIdx !== null && (
           <WeaponDetailModal 
                weapon={WEAPON_DB[selectedWeaponIdx]} 
                onClose={() => setSelectedWeaponIdx(null)} 
           />
       )}
    </div>
  );
};

// --- WEAPON DETAIL MODAL SUB-COMPONENT ---
const WeaponDetailModal: React.FC<{ weapon: typeof WEAPON_DB[0], onClose: () => void }> = ({ weapon, onClose }) => {
    // Create a dummy tank config just for this weapon
    const testConfig = useMemo(() => defineTank("Weapon Testbed", 0, TankRole.MEDIUM, [
        // Center the barrel for clean preview
        { ...weapon.barrel, offset: { x: 0, y: 0 }, angle: 0 }
    ], {
        bodyColorOverride: '#333',
        turretColor: '#666',
        statBonus: { reload: 0.5, bulletSpd: 1.0, bulletDmg: 1.0, bulletPen: 1.0 } // Balanced stats for demo
    }), [weapon]);

    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-lg p-4 md:p-8 animate-fade-in">
            <div className="w-full max-w-5xl h-[80vh] bg-slate-900 border-2 border-slate-700 rounded-2xl flex flex-col md:flex-row overflow-hidden shadow-2xl relative">
                
                {/* Close Button Mobile */}
                <button onClick={onClose} className="absolute top-4 right-4 z-20 w-10 h-10 bg-slate-800 rounded-full text-white border border-slate-600 font-bold md:hidden">✕</button>

                {/* Left: Info */}
                <div className="w-full md:w-1/3 bg-slate-950 p-6 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto">
                    <button onClick={onClose} className="hidden md:block mb-6 self-start text-xs font-bold text-slate-500 hover:text-white uppercase tracking-widest">← Back to Armory</button>
                    
                    <div className="text-sm font-black uppercase tracking-widest mb-1" style={{ color: weapon.color }}>{weapon.type} Class</div>
                    <h1 className="text-3xl font-black text-white italic uppercase mb-4 leading-none">{weapon.name}</h1>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">{weapon.desc}</p>
                    
                    <div className="mt-auto space-y-3">
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Technical Specifications</div>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                                <div><span className="text-slate-400 block text-[10px]">Multiplier</span> <span className="text-white font-mono text-sm">{weapon.barrel.damageMult || 1}x</span></div>
                                <div><span className="text-slate-400 block text-[10px]">Cycle Time</span> <span className="text-white font-mono text-sm">{(weapon.barrel.delay || 0) + 1}s</span></div>
                                <div><span className="text-slate-400 block text-[10px]">Ammo Type</span> <span className="text-white font-mono text-sm">{weapon.barrel.bulletType || 'Normal'}</span></div>
                                <div><span className="text-slate-400 block text-[10px]">Special</span> <span className="text-yellow-400 font-mono text-sm font-bold">{weapon.stats.effect}</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Live Preview */}
                <div className="flex-1 relative bg-slate-900 flex flex-col">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
                    <LiveTankPreview config={testConfig} className="w-full h-full" />
                    
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest bg-black/60 px-4 py-2 rounded-full backdrop-blur border border-white/5">
                            Live Fire Simulation • Target Dummy (10k HP)
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
