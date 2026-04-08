
import React, { useRef, useEffect, useState } from 'react';
import { TANK_CLASSES } from '../data/tanks';
import { TankConfig, BodyShape, TankRole, Barrel, Entity, EntityType, BulletType, WeaponBehavior, BarrelVisual, BarrelMaterial, BarrelShape } from '../types';
import { ACTIVE_SKILLS, PASSIVE_SKILLS } from '../data/skills';
import { RenderSystem } from '../engine/systems/RenderSystem';
import { COLORS } from '../constants';
import { Barrels } from '../data/barrels/presets';

interface StudioViewProps {
  onClose: () => void;
}

// Mini-Types for Studio Simulation
interface StudioBullet {
    x: number; y: number; vx: number; vy: number;
    radius: number; color: string; life: number;
}

const VISUAL_TYPES: BarrelVisual[] = [
    'STANDARD', 'SNIPER', 'MACHINE_GUN', 'RAILGUN', 'GATLING', 'TRAP', 'DRONE', 
    'COIL', 'TWIN_COIL', 'PLASMA', 'FLAME', 'ICE', 'FROST', 'POISON', 'HIVE', 'LASER', 'TESLA', 'THUNDER', 'HITSCAN'
];

const MATERIALS: BarrelMaterial[] = ['STEEL', 'TITANIUM', 'OBSIDIUM'];
const SHAPES: BarrelShape[] = ['CYLINDER', 'CONE', 'TAPERED', 'HEXAGON', 'SPIKED', 'DIAMOND'];

export const StudioView: React.FC<StudioViewProps> = ({ onClose }) => {
  // --- Refs & State ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [config, setConfig] = useState<TankConfig>(JSON.parse(JSON.stringify(TANK_CLASSES['basic'])));
  const [selectedBarrel, setSelectedBarrel] = useState<number | null>(null);
  const [tab, setTab] = useState<'CORE' | 'ARMORY' | 'PERFORMANCE'>('ARMORY');
  const [debugMode, setDebugMode] = useState(false);
  
  // Storage State
  const [savedDesigns, setSavedDesigns] = useState<string[]>([]);
  
  // Simulation State
  const [isTestDrive, setIsTestDrive] = useState(false);
  const simState = useRef({
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      rotation: 0,
      bullets: [] as StudioBullet[],
      lastShot: 0,
      barrelCooldowns: [] as number[], // Track individual barrel delays
      keys: {} as Record<string, boolean>,
      mouse: { x: 0, y: 0, down: false }
  });

  // --- Helpers ---
  const updateConfig = (key: keyof TankConfig, val: any) => setConfig(prev => ({ ...prev, [key]: val }));
  
  const handleBarrelUpdate = (idx: number, key: keyof Barrel, val: any) => {
      const newBarrels = [...config.barrels];
      newBarrels[idx] = { ...newBarrels[idx], [key]: val };
      setConfig(prev => ({ ...prev, barrels: newBarrels }));
  };
  
  const handleBarrelOffset = (idx: number, axis: 'x' | 'y', val: number) => {
      const newBarrels = [...config.barrels];
      newBarrels[idx] = { ...newBarrels[idx], offset: { ...newBarrels[idx].offset, [axis]: val } };
      setConfig(prev => ({ ...prev, barrels: newBarrels }));
  };

  const addBarrel = () => {
      const count = config.barrels.length;
      let offsetY = 0;
      let angle = 0;
      
      if (count === 1) offsetY = 12; 
      if (count === 2) offsetY = -12; 
      if (count >= 3) angle = (Math.PI * 2) / (count + 1);

      setConfig(prev => ({ 
          ...prev, 
          barrels: [...prev.barrels, Barrels.Standard({ width: 10, length: 20, offsetY, angle })] 
      }));
      setSelectedBarrel(config.barrels.length);
  };
  
  const cloneBarrel = (idx: number) => {
      const newBarrel = JSON.parse(JSON.stringify(config.barrels[idx]));
      newBarrel.offset.y += 10;
      setConfig(prev => ({ ...prev, barrels: [...prev.barrels, newBarrel] }));
      setSelectedBarrel(config.barrels.length);
  }

  const mirrorBarrel = (idx: number) => {
      const source = config.barrels[idx];
      const mirrored = JSON.parse(JSON.stringify(source));
      
      // Mirror Logic
      mirrored.offset.y = -source.offset.y; // Flip Y offset
      if (source.angle !== 0) mirrored.angle = -source.angle; // Flip angle if not 0
      
      setConfig(prev => ({ ...prev, barrels: [...prev.barrels, mirrored] }));
  };

  const removeBarrel = (idx: number) => {
      setConfig(prev => ({ ...prev, barrels: prev.barrels.filter((_, i) => i !== idx) }));
      setSelectedBarrel(null);
  };

  // --- Save/Load System ---
  useEffect(() => {
      refreshSavedDesigns();
  }, []);

  const refreshSavedDesigns = () => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('tank_studio_saved_'));
      setSavedDesigns(keys.map(k => k.replace('tank_studio_saved_', '')));
  };

  const saveToStorage = () => {
      const name = prompt("Enter design name:", config.name);
      if (!name) return;
      localStorage.setItem(`tank_studio_saved_${name}`, JSON.stringify({ ...config, name }));
      alert("Design Saved!");
      refreshSavedDesigns();
  };

  const loadFromStorage = (name: string) => {
      const raw = localStorage.getItem(`tank_studio_saved_${name}`);
      if (raw) {
          try {
              const loaded = JSON.parse(raw);
              setConfig(loaded);
              setSelectedBarrel(null);
              if (canvasRef.current) {
                  simState.current.pos = { x: canvasRef.current.width/2, y: canvasRef.current.height/2 };
                  simState.current.vel = { x: 0, y: 0 };
              }
          } catch(e) {
              alert("Failed to load design.");
          }
      }
  };

  // --- Simulation Loop ---
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const renderSystem = new RenderSystem(canvas);
    let animId: number;
    let lastTime = performance.now();

    simState.current.pos = { x: canvas.width/2, y: canvas.height/2 };
    
    const handleKeyDown = (e: KeyboardEvent) => simState.current.keys[e.code] = true;
    const handleKeyUp = (e: KeyboardEvent) => simState.current.keys[e.code] = false;
    const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        simState.current.mouse = { ...simState.current.mouse, x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    const handleMouseDown = () => simState.current.mouse.down = true;
    const handleMouseUp = () => simState.current.mouse.down = false;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    const loop = (time: number) => {
        const dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;
        const state = simState.current;

        // 1. Physics (Test Drive Mode)
        if (isTestDrive) {
             let fx = 0, fy = 0;
             if (state.keys['KeyW']) fy -= 1;
             if (state.keys['KeyS']) fy += 1;
             if (state.keys['KeyA']) fx -= 1;
             if (state.keys['KeyD']) fx += 1;
             if (fx !== 0 || fy !== 0) {
                 const len = Math.hypot(fx, fy);
                 fx /= len; fy /= len;
             }
             const speed = 300 * (config.statBonus?.moveSpd || 1);
             state.vel.x += fx * speed * 5 * dt;
             state.vel.y += fy * speed * 5 * dt;
             state.rotation = Math.atan2(state.mouse.y - state.pos.y, state.mouse.x - state.pos.x);
        } else {
            state.rotation += 0.5 * dt;
            state.pos.x += (canvas.width/2 - state.pos.x) * 5 * dt;
            state.pos.y += (canvas.height/2 - state.pos.y) * 5 * dt;
            state.vel = { x: 0, y: 0 };
        }
        
        state.vel.x *= 0.9;
        state.vel.y *= 0.9;
        state.pos.x += state.vel.x * dt;
        state.pos.y += state.vel.y * dt;

        if (state.pos.x < 0) state.pos.x = 0;
        if (state.pos.x > canvas.width) state.pos.x = canvas.width;
        if (state.pos.y < 0) state.pos.y = 0;
        if (state.pos.y > canvas.height) state.pos.y = canvas.height;

        // 2. Firing Logic
        const reloadTime = 0.5 / (config.statBonus?.reload || 1);
        const shouldShoot = isTestDrive && state.mouse.down;
        
        if (state.barrelCooldowns.length !== config.barrels.length) {
            state.barrelCooldowns = new Array(config.barrels.length).fill(0);
        }

        if (shouldShoot) {
            config.barrels.forEach((b, i) => {
                if (state.barrelCooldowns[i] <= 0) {
                    const angle = state.rotation + b.angle + (Math.random()-0.5)*(b.spread || 0);
                    const speed = 400 * (config.statBonus?.bulletSpd || 1);
                    
                    const cos = Math.cos(state.rotation); const sin = Math.sin(state.rotation);
                    const bx = state.pos.x + (cos * b.offset.x) - (sin * b.offset.y) + (cos * b.length);
                    const by = state.pos.y + (sin * b.offset.x) + (cos * b.offset.y) + (sin * b.length);
                    
                    const bColor = b.bulletColor || config.turretColor || config.bodyColorOverride || COLORS.player;

                    if (b.behavior === WeaponBehavior.HITSCAN) {
                        state.bullets.push({
                            x: bx, y: by, 
                            vx: Math.cos(angle) * 2000, vy: Math.sin(angle) * 2000,
                            radius: b.width/2, color: bColor, life: 0.1
                        });
                    } else {
                        state.bullets.push({
                            x: bx, y: by, 
                            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                            radius: b.width/2, color: bColor, life: 2.0
                        });
                    }

                    const recoilForce = (b.recoil || 0) * 100 * dt;
                    state.vel.x -= Math.cos(angle) * recoilForce;
                    state.vel.y -= Math.sin(angle) * recoilForce;
                    state.barrelCooldowns[i] = reloadTime + (b.delay || 0);
                }
            });
        }

        for(let i=0; i<state.barrelCooldowns.length; i++) {
            if (state.barrelCooldowns[i] > 0) state.barrelCooldowns[i] -= dt;
        }

        state.bullets.forEach(b => {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
        });
        state.bullets = state.bullets.filter(b => b.life > 0);

        // 4. Render
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const gridSize = 40;
        for(let i=0; i<canvas.width; i+=gridSize) { ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); }
        for(let i=0; i<canvas.height; i+=gridSize) { ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); }
        ctx.stroke();

        state.bullets.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.beginPath();
            if (b.life < 0.15 && b.vx > 1000) { 
                 ctx.strokeStyle = b.color;
                 ctx.lineWidth = b.radius;
                 ctx.moveTo(b.x, b.y);
                 ctx.lineTo(b.x + b.vx * 0.5, b.y + b.vy * 0.5);
                 ctx.stroke();
            } else {
                ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2);
                ctx.fill();
            }
        });

        const dummyEnt: Entity = {
            id: 'studio_tank', type: EntityType.PLAYER,
            pos: state.pos, vel: state.vel, rotation: state.rotation,
            radius: 24 * (isTestDrive ? 1 : 1.2),
            color: config.bodyColorOverride || COLORS.player,
            health: 100, maxHealth: 100, damage: 10, isDead: false
        };

        renderSystem.drawTankDynamic(dummyEnt, config, debugMode);

        animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [config, isTestDrive, debugMode]);


  return (
    <div className="absolute inset-0 z-[200] bg-slate-950 flex overflow-hidden font-sans text-slate-200">
        
        {/* --- LEFT: SIMULATION AREA --- */}
        <div className="flex-1 relative flex flex-col">
             <div className="absolute top-4 left-4 z-10 flex gap-2">
                 <button onClick={onClose} className="btn-secondary">← EXIT</button>
                 <button 
                    onClick={() => setIsTestDrive(!isTestDrive)} 
                    className={`btn-primary ${isTestDrive ? 'bg-red-500 border-red-400 animate-pulse' : 'bg-green-600 border-green-500'}`}
                 >
                     {isTestDrive ? '🛑 STOP TEST' : '▶ TEST DRIVE (WASD)'}
                 </button>
                 <button 
                    onClick={() => setDebugMode(!debugMode)} 
                    className={`px-4 py-2 rounded-lg font-bold text-xs border transition-all ${debugMode ? 'bg-yellow-500 text-black border-yellow-600' : 'bg-slate-800 text-slate-300 border-slate-600'}`}
                 >
                     🛠️ DEBUG
                 </button>
             </div>

             <canvas ref={canvasRef} className="flex-1 cursor-crosshair active:cursor-grabbing" />
             
             <div className="h-8 bg-slate-900 border-t border-slate-800 flex items-center px-4 text-[10px] text-slate-500 gap-4">
                 <span>POS: {Math.round(simState.current.pos.x)}, {Math.round(simState.current.pos.y)}</span>
                 <span>BARRELS: {config.barrels.length}</span>
                 <span>MODE: {isTestDrive ? 'ACTIVE' : 'EDITING'}</span>
             </div>
        </div>

        {/* --- RIGHT: INSPECTOR --- */}
        <div className="w-[450px] bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-20">
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col gap-2">
                 <div className="flex justify-between items-center">
                     <h1 className="text-xl font-black italic text-cyan-400 tracking-tighter">DESIGN STUDIO <span className="text-xs font-normal text-slate-400 not-italic">ULTIMATE</span></h1>
                     <div className="flex gap-2">
                         <button onClick={() => {
                             const json = JSON.stringify(config, null, 2);
                             navigator.clipboard.writeText(json);
                             alert("JSON Copied!");
                         }} className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700">EXPORT</button>
                         <button onClick={() => {
                             const input = prompt("Paste Tank JSON:");
                             if (input) {
                                 try { setConfig(JSON.parse(input)); } catch(e) { alert("Invalid JSON"); }
                             }
                         }} className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700">IMPORT</button>
                     </div>
                 </div>
                 <div className="flex justify-between items-center gap-2">
                     <select 
                        className="bg-slate-800 text-xs rounded p-1 border border-slate-700 outline-none flex-1 max-w-[150px]"
                        onChange={(e) => {
                            if (e.target.value) loadFromStorage(e.target.value);
                        }}
                        value=""
                     >
                         <option value="" disabled>Load Saved...</option>
                         {savedDesigns.map(name => <option key={name} value={name}>{name}</option>)}
                     </select>
                     <button onClick={saveToStorage} className="text-xs bg-green-900 hover:bg-green-800 px-2 py-1 rounded border border-green-700 text-green-100 flex-1">
                         SAVE DESIGN
                     </button>
                 </div>
            </div>

            {/* Config Name */}
            <div className="p-4 border-b border-slate-800 bg-slate-900 space-y-3">
                 <input 
                    value={config.name} 
                    onChange={e => updateConfig('name', e.target.value)} 
                    className="w-full bg-transparent text-2xl font-bold placeholder-slate-600 outline-none" 
                    placeholder="UNTITLED TANK"
                 />
                 <div className="flex gap-2">
                     <select 
                        className="bg-slate-800 text-xs rounded p-1 border border-slate-700 outline-none"
                        value={config.role} onChange={e => updateConfig('role', e.target.value)}
                     >
                         {Object.values(TankRole).map(r => <option key={r} value={r}>{r}</option>)}
                     </select>
                     <select 
                        className="bg-slate-800 text-xs rounded p-1 border border-slate-700 outline-none"
                        value={config.tier} onChange={e => updateConfig('tier', parseInt(e.target.value))}
                     >
                         {[0,1,2,3,4,5,6,7,8,9,10].map(t => <option key={t} value={t}>Tier {t}</option>)}
                     </select>
                 </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-950 border-b border-slate-800">
                {['CORE', 'ARMORY', 'PERFORMANCE'].map((t) => (
                    <button 
                        key={t} 
                        onClick={() => setTab(t as any)}
                        className={`flex-1 py-3 text-[10px] font-bold tracking-widest transition-colors border-b-2 ${tab === t ? 'border-cyan-500 text-cyan-400 bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Content Scroller */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                
                {tab === 'CORE' && (
                    <div className="space-y-6 animate-fade-in">
                        <Accordion title="Chassis & Body" defaultOpen>
                            <ControlRow label="Shape">
                                <div className="grid grid-cols-4 gap-2">
                                    {Object.values(BodyShape).map(s => (
                                        <button 
                                            key={s} 
                                            onClick={() => updateConfig('bodyShape', s)}
                                            className={`p-2 rounded border text-[10px] font-bold ${config.bodyShape === s ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                        >
                                            {s.substring(0,3)}
                                        </button>
                                    ))}
                                </div>
                            </ControlRow>
                            <ControlRow label="Treads">
                                <Toggle label="Enable Tracks" checked={!!config.hasTreads} onChange={v => updateConfig('hasTreads', v)} />
                            </ControlRow>
                            <ColorPicker label="Body Color" value={config.bodyColorOverride || COLORS.player} onChange={v => updateConfig('bodyColorOverride', v)} />
                            <ColorPicker label="Turret Color" value={config.turretColor || '#999'} onChange={v => updateConfig('turretColor', v)} />
                        </Accordion>

                        <Accordion title="Skills & Abilities">
                             <div className="space-y-4">
                                <ControlRow label="Active Skill (F)">
                                    <select 
                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                                        value={config.activeSkill ? config.activeSkill.type : 'NONE'}
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            if (type === 'NONE') updateConfig('activeSkill', undefined);
                                            else updateConfig('activeSkill', ACTIVE_SKILLS[type]);
                                        }}
                                    >
                                        <option value="NONE">None</option>
                                        {Object.keys(ACTIVE_SKILLS).map(k => <option key={k} value={k}>{ACTIVE_SKILLS[k].name}</option>)}
                                    </select>
                                </ControlRow>
                                <ControlRow label="Passive Skill">
                                    <select 
                                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                                        value={config.passiveSkill ? config.passiveSkill.type : 'NONE'}
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            if (type === 'NONE') updateConfig('passiveSkill', undefined);
                                            else updateConfig('passiveSkill', PASSIVE_SKILLS[type]);
                                        }}
                                    >
                                        <option value="NONE">None</option>
                                        {Object.keys(PASSIVE_SKILLS).map(k => <option key={k} value={k}>{PASSIVE_SKILLS[k].name}</option>)}
                                    </select>
                                </ControlRow>
                             </div>
                        </Accordion>
                    </div>
                )}

                {tab === 'ARMORY' && (
                    <div className="space-y-4 animate-fade-in">
                        <button onClick={addBarrel} className="w-full py-3 bg-slate-800 hover:bg-slate-700 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 font-bold text-xs transition-all hover:text-white hover:border-slate-400">
                            + ADD NEW BARREL
                        </button>

                        <div className="space-y-2">
                            {config.barrels.map((barrel, idx) => {
                                const isSelected = selectedBarrel === idx;
                                return (
                                    <div key={idx} className={`rounded-xl border transition-all overflow-hidden ${isSelected ? 'bg-slate-800 border-cyan-500 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}>
                                        
                                        <div 
                                            onClick={() => setSelectedBarrel(isSelected ? null : idx)}
                                            className="p-3 flex justify-between items-center cursor-pointer select-none"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 bg-slate-950 rounded flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-700">
                                                    #{idx+1}
                                                </div>
                                                <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                                    {barrel.visualType} Gun
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                 <button onClick={(e) => { e.stopPropagation(); mirrorBarrel(idx); }} className="p-1 hover:text-green-400 text-slate-500" title="Mirror (L/R)">↔️</button>
                                                 <button onClick={(e) => { e.stopPropagation(); cloneBarrel(idx); }} className="p-1 hover:text-blue-400 text-slate-500" title="Clone">📋</button>
                                                 <button onClick={(e) => { e.stopPropagation(); removeBarrel(idx); }} className="p-1 hover:text-red-400 text-slate-500" title="Delete">🗑️</button>
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div className="p-4 bg-slate-950/50 border-t border-slate-700 space-y-4">
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-4">
                                                        <Label>Geometry</Label>
                                                        <Slider label="Length" value={barrel.length} min={5} max={120} onChange={v => handleBarrelUpdate(idx, 'length', v)} compact />
                                                        <Slider label="Width" value={barrel.width} min={2} max={80} onChange={v => handleBarrelUpdate(idx, 'width', v)} compact />
                                                        <div className="space-y-2 pt-2">
                                                            <Label>Shape</Label>
                                                            <select 
                                                                className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-slate-300 outline-none focus:border-cyan-500"
                                                                value={barrel.shape || 'CYLINDER'}
                                                                onChange={e => handleBarrelUpdate(idx, 'shape', e.target.value)}
                                                            >
                                                                {SHAPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <Label>Position</Label>
                                                        <Slider label="Offset X (F/B)" value={barrel.offset.x} min={-50} max={50} onChange={v => handleBarrelOffset(idx, 'x', v)} compact />
                                                        <Slider label="Offset Y (L/R)" value={barrel.offset.y} min={-50} max={50} onChange={v => handleBarrelOffset(idx, 'y', v)} compact />
                                                        
                                                        <Label>Angle (Radians)</Label>
                                                        <div className="flex gap-2 items-center">
                                                            <input 
                                                                type="range" min={-Math.PI} max={Math.PI} step={0.1}
                                                                value={barrel.angle}
                                                                onChange={e => handleBarrelUpdate(idx, 'angle', parseFloat(e.target.value))}
                                                                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                                            />
                                                            <input 
                                                                type="number" step={0.1}
                                                                value={barrel.angle}
                                                                onChange={e => handleBarrelUpdate(idx, 'angle', parseFloat(e.target.value))}
                                                                className="w-14 bg-slate-800 border border-slate-700 rounded p-1 text-xs text-center text-white outline-none focus:border-cyan-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="border-t border-slate-800 pt-4">
                                                    <Label>Visuals & Ammo</Label>
                                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                                        <select 
                                                            className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-slate-300 outline-none focus:border-cyan-500"
                                                            value={barrel.visualType || 'STANDARD'}
                                                            onChange={e => handleBarrelUpdate(idx, 'visualType', e.target.value)}
                                                        >
                                                            {VISUAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                        </select>
                                                        <select 
                                                            className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-slate-300 outline-none focus:border-cyan-500"
                                                            value={barrel.bulletType || 'STANDARD'}
                                                            onChange={e => handleBarrelUpdate(idx, 'bulletType', e.target.value)}
                                                        >
                                                            {Object.values(BulletType).map(t => <option key={t} value={t}>{t}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="mt-2">
                                                        <ColorPicker label="Bullet Color (Override)" value={barrel.bulletColor || ''} onChange={v => handleBarrelUpdate(idx, 'bulletColor', v)} />
                                                    </div>
                                                </div>

                                                <div className="border-t border-slate-800 pt-4">
                                                    <Label>Ballistics</Label>
                                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                                        <Input label="Dmg Mult" value={barrel.damageMult || 1} onChange={v => handleBarrelUpdate(idx, 'damageMult', v)} type="number" step={0.1} />
                                                        <Input label="Recoil" value={barrel.recoil || 0} onChange={v => handleBarrelUpdate(idx, 'recoil', v)} type="number" step={0.1} />
                                                        <Slider label="Spread" value={barrel.spread || 0} min={0} max={1} step={0.05} onChange={v => handleBarrelUpdate(idx, 'spread', v)} compact />
                                                        <Slider label="Delay (s)" value={barrel.delay || 0} min={0} max={2} step={0.1} onChange={v => handleBarrelUpdate(idx, 'delay', v)} compact />
                                                    </div>
                                                    
                                                    <div className="flex gap-2 mt-4">
                                                        <button 
                                                            onClick={() => handleBarrelUpdate(idx, 'behavior', 'PROJECTILE')}
                                                            className={`flex-1 py-2 text-[10px] font-bold rounded transition-colors ${!barrel.behavior || barrel.behavior === 'PROJECTILE' ? 'bg-cyan-600 text-white shadow' : 'bg-slate-800 text-slate-500'}`}
                                                        >
                                                            PROJECTILE
                                                        </button>
                                                        <button 
                                                            onClick={() => handleBarrelUpdate(idx, 'behavior', 'HITSCAN')}
                                                            className={`flex-1 py-2 text-[10px] font-bold rounded transition-colors ${barrel.behavior === 'HITSCAN' ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-500'}`}
                                                        >
                                                            HITSCAN (LASER)
                                                        </button>
                                                        <button 
                                                            onClick={() => handleBarrelUpdate(idx, 'isAutoTurret', !barrel.isAutoTurret)}
                                                            className={`flex-1 py-2 text-[10px] font-bold rounded transition-colors ${barrel.isAutoTurret ? 'bg-green-600 text-white shadow' : 'bg-slate-800 text-slate-500'}`}
                                                        >
                                                            AUTO TURRET
                                                        </button>
                                                    </div>
                                                </div>

                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {tab === 'PERFORMANCE' && (
                    <div className="space-y-6 animate-fade-in">
                        <Accordion title="Combat Stats" defaultOpen>
                             <div className="grid grid-cols-2 gap-4">
                                 <Slider label="Reload Speed" value={config.statBonus?.reload || 1} min={0.1} max={5} step={0.1} onChange={v => updateConfig('statBonus', {...config.statBonus, reload: v})} />
                                 <Slider label="Bullet Dmg" value={config.statBonus?.bulletDmg || 1} min={0.1} max={5} step={0.1} onChange={v => updateConfig('statBonus', {...config.statBonus, bulletDmg: v})} />
                                 <Slider label="Bullet Pen" value={config.statBonus?.bulletPen || 1} min={0.1} max={5} step={0.1} onChange={v => updateConfig('statBonus', {...config.statBonus, bulletPen: v})} />
                                 <Slider label="Bullet Spd" value={config.statBonus?.bulletSpd || 1} min={0.1} max={5} step={0.1} onChange={v => updateConfig('statBonus', {...config.statBonus, bulletSpd: v})} />
                             </div>
                        </Accordion>
                        <Accordion title="Hull Specs" defaultOpen>
                             <div className="grid grid-cols-2 gap-4">
                                 <Slider label="Movement Spd" value={config.statBonus?.moveSpd || 1} min={0.5} max={3} step={0.1} onChange={v => updateConfig('statBonus', {...config.statBonus, moveSpd: v})} />
                                 <Slider label="Max Health" value={config.statBonus?.maxHp || 1} min={0.5} max={10} step={0.1} onChange={v => updateConfig('statBonus', {...config.statBonus, maxHp: v})} />
                                 <Slider label="Body Damage" value={config.statBonus?.bodyDmg || 1} min={0.5} max={10} step={0.1} onChange={v => updateConfig('statBonus', {...config.statBonus, bodyDmg: v})} />
                                 <Slider label="Regen" value={config.statBonus?.regen || 1} min={0.5} max={5} step={0.1} onChange={v => updateConfig('statBonus', {...config.statBonus, regen: v})} />
                             </div>
                        </Accordion>
                        <Accordion title="Advanced">
                             <div className="space-y-4">
                                 <Slider label="FOV Multiplier" value={config.fovMult || 1} min={0.5} max={3.0} step={0.1} onChange={v => updateConfig('fovMult', v)} />
                                 <ControlRow label="Base Crit Chance">
                                     <Slider label="Chance %" value={(config.baseCritChance || 0) * 100} min={0} max={100} step={5} onChange={v => updateConfig('baseCritChance', v/100)} compact />
                                 </ControlRow>
                                 <ControlRow label="Invisibility">
                                     <div className="flex flex-col gap-2 w-full">
                                         <Toggle label="Enabled" checked={!!config.invisibility} onChange={v => updateConfig('invisibility', v ? { revealDelay: 2, fadeSpeed: 2 } : undefined)} />
                                         {config.invisibility && (
                                             <div className="pl-4 border-l-2 border-slate-700 space-y-2 mt-2">
                                                 <Slider label="Reveal Delay" value={config.invisibility.revealDelay} min={0.1} max={10} step={0.1} onChange={v => updateConfig('invisibility', {...config.invisibility, revealDelay: v})} />
                                                 <Slider label="Fade Speed" value={config.invisibility.fadeSpeed} min={0.1} max={10} step={0.1} onChange={v => updateConfig('invisibility', {...config.invisibility, fadeSpeed: v})} />
                                             </div>
                                         )}
                                     </div>
                                 </ControlRow>
                             </div>
                        </Accordion>
                    </div>
                )}

            </div>
        </div>
        
        <style>{`
            .btn-primary {
                @apply px-4 py-2 rounded-lg font-bold text-xs text-white shadow-lg transition-transform active:scale-95 border-b-4 border-green-700;
            }
            .btn-secondary {
                @apply bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-bold text-xs border border-slate-600;
            }
        `}</style>
    </div>
  );
};

// --- Sub Components ---

const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/50">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-3 flex justify-between items-center bg-slate-900 hover:bg-slate-800 transition-colors"
            >
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
                <span className="text-slate-500 text-xs transform transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>
            {isOpen && <div className="p-4 border-t border-slate-800 animate-fade-in space-y-4">{children}</div>}
        </div>
    );
};

const ControlRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-slate-400">{label}</label>
        {children}
    </div>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">{children}</div>
);

const Slider: React.FC<{ label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; compact?: boolean }> = ({ label, value, min, max, step=1, onChange, compact }) => {
    const [tempValue, setTempValue] = React.useState<string | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTempValue(e.target.value);
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) {
            onChange(v);
        }
    };

    const handleBlur = () => {
        setTempValue(null);
    };

    return (
        <div className="flex flex-col gap-1 w-full">
            {!compact && <div className="flex justify-between">
                <label className="text-xs font-bold text-slate-400">{label}</label>
            </div>}
            <div className="flex gap-2 items-center">
                <input 
                    type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <input 
                    type="number" 
                    value={tempValue !== null ? tempValue : value} 
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    step={step}
                    className="w-12 bg-slate-800 border border-slate-700 rounded p-0.5 text-[10px] text-center text-cyan-400 outline-none focus:border-cyan-500"
                />
            </div>
            {compact && <div className="flex justify-between text-[9px] text-slate-500">
                 <span>{label}</span>
            </div>}
        </div>
    );
};

const Input: React.FC<{ label: string; value: number | string; onChange: (v: any) => void; type?: string; step?: number }> = ({ label, value, onChange, type="text", step }) => (
    <div>
        <Label>{label}</Label>
        <input 
            type={type} step={step} value={value} onChange={e => onChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white outline-none focus:border-cyan-500"
        />
    </div>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700 cursor-pointer" onClick={() => onChange(!checked)}>
        <span className="text-xs font-bold text-slate-300">{label}</span>
        <div className={`w-8 h-4 rounded-full relative transition-colors ${checked ? 'bg-green-500' : 'bg-slate-600'}`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${checked ? 'left-4.5' : 'left-0.5'}`} />
        </div>
    </div>
);

const ColorPicker: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
    <ControlRow label={label}>
        <div className="flex gap-2 items-center">
            <input 
                type="color" value={value} onChange={e => onChange(e.target.value)} 
                className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
            />
            <input 
                type="text" value={value} onChange={e => onChange(e.target.value)} 
                className="flex-1 bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-mono text-white outline-none focus:border-cyan-500"
            />
        </div>
    </ControlRow>
);
