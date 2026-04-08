
import React, { useEffect, useRef } from 'react';
import { BOSS_DATA } from '../data/bosses';
import { BossType, Entity, EntityType } from '../types';
import { RenderSystem } from '../engine/systems/RenderSystem';

interface BossGalleryProps {
  onClose: () => void;
}

export const BossGallery: React.FC<BossGalleryProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-0 md:p-8 animate-fade-in">
       <div className="bg-slate-900 w-full h-full md:max-w-6xl md:h-[85vh] md:rounded-2xl border-0 md:border border-red-900/50 shadow-[0_0_50px_rgba(220,38,38,0.2)] flex flex-col overflow-hidden relative">
          
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>

          {/* Header */}
          <div className="p-4 md:p-6 border-b border-red-900/30 flex justify-between items-center bg-slate-950 shrink-0 z-10">
            <div className="flex items-center gap-3 md:gap-4">
                <span className="text-2xl md:text-4xl">⚠️</span>
                <div>
                    <h2 className="text-2xl md:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-600">
                    THREAT DB
                    </h2>
                    <p className="text-red-400/60 text-[10px] md:text-sm font-mono tracking-widest uppercase">Classified Intel • High Priority</p>
                </div>
            </div>
            <button onClick={onClose} className="text-2xl font-bold text-slate-400 hover:text-white transition-colors bg-slate-800 w-10 h-10 rounded-full flex items-center justify-center border border-slate-700">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 z-10">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                 {Object.values(BOSS_DATA).map((boss) => (
                     <div key={boss.type} className="bg-slate-950/80 border border-red-900/30 rounded-xl overflow-hidden flex flex-col group hover:border-red-500/50 transition-colors duration-500">
                         
                         {/* Visual Preview */}
                         <div className="h-48 md:h-64 bg-slate-900/50 relative flex items-center justify-center border-b border-red-900/20 overflow-hidden">
                             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80"></div>
                             {/* Animated Background Pulse */}
                             <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors duration-500 animate-pulse"></div>
                             
                             <div className="relative z-10 transform group-hover:scale-110 transition-transform duration-700">
                                 <BossPreview bossType={boss.type} size={200} />
                             </div>
                         </div>

                         {/* Info Panel */}
                         <div className="p-4 md:p-6 flex-1 flex flex-col">
                             <div className="flex justify-between items-start mb-4">
                                 <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-wide">{boss.name}</h3>
                                 <span className={`px-2 py-1 rounded text-[9px] md:text-[10px] font-black uppercase tracking-widest border ${
                                     boss.difficulty === 'Insane' ? 'bg-purple-900/50 border-purple-500 text-purple-400' :
                                     boss.difficulty === 'Extreme' ? 'bg-red-900/50 border-red-500 text-red-400' :
                                     'bg-orange-900/50 border-orange-500 text-orange-400'
                                 }`}>
                                     {boss.difficulty} Threat
                                 </span>
                             </div>
                             
                             <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-6 border-l-2 border-red-800 pl-4 italic">
                                 "{boss.description}"
                             </p>

                             <div className="mt-auto grid grid-cols-3 gap-2">
                                 <StatBox label="Health" value={boss.hp.toLocaleString()} />
                                 <StatBox label="XP Reward" value={boss.xp.toLocaleString()} />
                                 <StatBox label="Damage" value={boss.damage} />
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
          </div>

       </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="bg-slate-900 rounded p-2 border border-slate-800 text-center">
        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">{label}</div>
        <div className="text-xs md:text-sm font-mono font-bold text-white">{value}</div>
    </div>
);

const BossPreview: React.FC<{ bossType: BossType; size: number }> = ({ bossType, size }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const config = BOSS_DATA[bossType];
        
        // High DPI scaling
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        
        const renderer = new RenderSystem(canvas, true);
        const ctx = renderer.ctx;
        ctx.scale(dpr, dpr);
        ctx.translate(size/2, size/2);
        
        // Scale down to fit
        const scale = (size / 2) / (config.radius * 2.5); // 2.5 to account for visual extras
        ctx.scale(scale, scale);

        // Mock Boss Entity
        const dummyBoss: Entity = {
            id: 'preview_boss',
            type: EntityType.BOSS,
            bossType: bossType,
            pos: { x: 0, y: 0 },
            vel: { x: 0, y: 0 },
            radius: config.radius,
            rotation: -Math.PI/2,
            color: config.color,
            health: config.hp, maxHealth: config.hp, damage: config.damage, isDead: false
        };

        // Custom Render Loop for Spin Effect
        let animId: number;
        const renderLoop = () => {
            ctx.clearRect(-size, -size, size*2, size*2);
            dummyBoss.rotation += 0.01; 
            renderer.drawEntity(dummyBoss);
            animId = requestAnimationFrame(renderLoop);
        };
        renderLoop();

        return () => cancelAnimationFrame(animId);
    }, [bossType, size]);

    return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
};
