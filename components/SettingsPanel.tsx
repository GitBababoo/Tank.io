
import React, { useState } from 'react';
import { GameSettings } from '../types';
import { Monitor, Volume2, Gamepad2, SlidersHorizontal, Terminal, LogOut, X, ShieldAlert } from 'lucide-react';

interface SettingsPanelProps {
  settings: GameSettings;
  onUpdate: (newSettings: GameSettings) => void;
  onClose: () => void;
  onSpawnBoss?: () => void;
  onCloseArena?: () => void;
  onExitGame?: () => void;
}

type Tab = 'display' | 'audio' | 'controls' | 'system';

const CATEGORIES: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'display', label: 'Display', icon: Monitor },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'controls', label: 'Controls', icon: Gamepad2 },
    { id: 'system', label: 'System', icon: Terminal },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate, onClose, onSpawnBoss, onCloseArena, onExitGame }) => {
  const [activeTab, setActiveTab] = useState<Tab>('display');

  const update = (category: keyof GameSettings, key: string, value: any) => {
    onUpdate({
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value
      }
    });
  };

  const applyPreset = (preset: 'performance' | 'balanced' | 'quality') => {
      let newSettings = { ...settings };
      if (preset === 'performance') {
          newSettings.graphics = { ...newSettings.graphics, quality: 'low', particles: false, resolutionScale: 0.5, fpsCap: 60, postProcessing: false };
      } else if (preset === 'balanced') {
          newSettings.graphics = { ...newSettings.graphics, quality: 'medium', particles: true, resolutionScale: 0.75, fpsCap: 60, postProcessing: false };
      } else {
          newSettings.graphics = { ...newSettings.graphics, quality: 'high', particles: true, resolutionScale: 1.0, fpsCap: 120, postProcessing: true };
      }
      onUpdate(newSettings);
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-0 md:p-4 animate-fade-in">
      <div className="bg-slate-900/80 w-full h-full md:w-[950px] md:h-[700px] md:rounded-2xl border-0 md:border md:border-cyan-500/20 shadow-2xl shadow-cyan-900/20 flex relative overflow-hidden interactive-ui scanline-overlay">
        
        {/* Left Navigation */}
        <nav className="w-full md:w-[220px] bg-black/30 p-4 md:p-6 border-b md:border-b-0 md:border-r border-slate-800 flex flex-row md:flex-col gap-2 shrink-0 overflow-x-auto md:overflow-x-visible safe-top">
            <div className="hidden md:block mb-4">
                <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase italic">
                    COMMAND CENTER
                </h2>
                <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">System Settings</p>
            </div>
            {CATEGORIES.map(cat => (
                <CategoryButton 
                    key={cat.id}
                    Icon={cat.icon}
                    label={cat.label}
                    isActive={activeTab === cat.id}
                    onClick={() => setActiveTab(cat.id)}
                />
            ))}
        </nav>

        {/* Right Content */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
            <header className="flex justify-between items-center p-4 md:p-6 border-b border-slate-800 bg-black/20 shrink-0 safe-top md:safe-top-0">
                <h3 className="text-xl md:text-2xl font-bold text-white capitalize">{activeTab}</h3>
                <button 
                    onClick={onClose} 
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-red-500 hover:text-white text-slate-400 transition-colors border border-slate-700 shadow-lg active:scale-90"
                >
                    <X size={24} />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar pb-32 md:pb-8">
                {activeTab === 'display' && (
                    <>
                        <Section title="Quick Presets" description="Instantly configure settings for your hardware.">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <PresetButton label="Performance" description="Max FPS" color="green" onClick={() => applyPreset('performance')} />
                                <PresetButton label="Balanced" description="Good mix" color="yellow" onClick={() => applyPreset('balanced')} />
                                <PresetButton label="Ultra" description="Best visuals" color="cyan" onClick={() => applyPreset('quality')} />
                            </div>
                        </Section>
                        <Section title="Rendering" description="Core visual and performance settings.">
                            <SettingCard label="Visual Quality" impact="High" description="Affects shadows, bloom, and textures.">
                                <Select value={settings.graphics.quality} onChange={e => update('graphics', 'quality', e.target.value)}>
                                    <option value="low">Low (Fastest)</option><option value="medium">Medium</option><option value="high">High (Prettiest)</option>
                                </Select>
                            </SettingCard>
                            <SettingCard label="Post Processing" impact="Medium" description="Chromatic aberration and visual distortions.">
                                <Toggle checked={settings.graphics.postProcessing || false} onChange={v => update('graphics', 'postProcessing', v)} />
                            </SettingCard>
                            <SettingCard label="Resolution Scale" impact="High" description="Lower for a huge FPS boost, especially on mobile.">
                                <Slider min={0.25} max={1.25} step={0.05} value={settings.graphics.resolutionScale || 1.0} onChange={v => update('graphics', 'resolutionScale', v)} displayValue={`${((settings.graphics.resolutionScale || 1.0) * 100).toFixed(0)}%`} />
                            </SettingCard>
                            <SettingCard label="Particles" impact="Medium" description="Debris, smoke, and weapon effects.">
                                <Toggle checked={settings.graphics.particles} onChange={v => update('graphics', 'particles', v)} />
                            </SettingCard>
                        </Section>
                        <Section title="Interface & Framerate">
                            <SettingCard label="Target FPS" impact="Low" description="Set your desired framerate cap.">
                                <Select value={settings.graphics.fpsCap} onChange={e => update('graphics', 'fpsCap', parseInt(e.target.value))}>
                                    <option value="30">30 (Power Save)</option><option value="60">60 (Standard)</option><option value="120">120 (Smooth)</option><option value="999">Unlimited</option>
                                </Select>
                            </SettingCard>
                            <SettingCard label="HUD Scale" impact="None" description="Change the size of your heads-up display.">
                                <Slider min={0.5} max={1.5} step={0.05} value={settings.graphics.hudScale} onChange={v => update('graphics', 'hudScale', v)} displayValue={`${(settings.graphics.hudScale * 100).toFixed(0)}%`}/>
                            </SettingCard>
                            <SettingCard label="Show Performance" impact="None" description="Display FPS counter in-game.">
                                <Toggle checked={settings.graphics.showPerformance || false} onChange={v => update('graphics', 'showPerformance', v)} />
                            </SettingCard>
                        </Section>
                    </>
                )}

                {activeTab === 'audio' && (
                    <Section title="Volume Levels">
                        <SettingCard label="Master Volume">
                            <Slider min={0} max={1} step={0.01} value={settings.audio.masterVolume} onChange={v => update('audio', 'masterVolume', v)} displayValue={`${(settings.audio.masterVolume * 100).toFixed(0)}%`}/>
                        </SettingCard>
                        <SettingCard label="SFX Volume" description="Shots, Hits, Explosions"><Slider min={0} max={1} step={0.01} value={settings.audio.sfxVolume} onChange={v => update('audio', 'sfxVolume', v)} displayValue={`${(settings.audio.sfxVolume * 100).toFixed(0)}%`}/></SettingCard>
                        <SettingCard label="Music Volume" description="Ambiance and themes"><Slider min={0} max={1} step={0.01} value={settings.audio.musicVolume} onChange={v => update('audio', 'musicVolume', v)} displayValue={`${(settings.audio.musicVolume * 100).toFixed(0)}%`}/></SettingCard>
                        <SettingCard label="UI Volume" description="Menu clicks and level ups"><Slider min={0} max={1} step={0.01} value={settings.audio.uiVolume} onChange={v => update('audio', 'uiVolume', v)} displayValue={`${(settings.audio.uiVolume * 100).toFixed(0)}%`}/></SettingCard>
                        <SettingCard label="Spatial Audio" description="3D sound positioning. Recommended for headphones."><Toggle checked={settings.audio.spatialAudio} onChange={v => update('audio', 'spatialAudio', v)} /></SettingCard>
                        <SettingCard label="Sound Theme" description="Soft theme reduces harsh high-frequencies for comfort.">
                            <Select value={settings.audio.soundTheme || 'soft'} onChange={e => update('audio', 'soundTheme', e.target.value)}>
                                <option value="soft">Soft (Comfortable)</option><option value="retro">Retro (Classic)</option>
                            </Select>
                        </SettingCard>
                    </Section>
                )}

                {activeTab === 'controls' && (
                    <>
                        <Section title="Gameplay">
                            <SettingCard label="Auto Fire" description="Automatically shoot towards cursor."><Toggle checked={settings.gameplay.autoFire} onChange={v => update('gameplay', 'autoFire', v)} /></SettingCard>
                            <SettingCard label="Infinite Levels" description="Allow progression beyond level 45."><Toggle checked={settings.gameplay.infiniteLevel} onChange={v => update('gameplay', 'infiniteLevel', v)} /></SettingCard>
                        </Section>
                        <Section title="Input">
                            <SettingCard label="Mouse Aim" description="Use mouse cursor to aim. Disable for keyboard-only play."><Toggle checked={settings.controls.mouseAim} onChange={v => update('controls', 'mouseAim', v)} /></SettingCard>
                            <SettingCard label="Sensitivity" description="Aiming speed multiplier.">
                                <Slider min={0.5} max={3.0} step={0.1} value={settings.controls.sensitivity} onChange={v => update('controls', 'sensitivity', v)} displayValue={`${settings.controls.sensitivity.toFixed(1)}x`}/>
                            </SettingCard>
                        </Section>
                    </>
                )}

                {activeTab === 'system' && (
                    <>
                        {onExitGame && (
                            <Section title="Match Control">
                                <ActionButton Icon={LogOut} label="Leave Match" description="Return to the main lobby. Progress will be lost." onClick={onExitGame} color="red"/>
                            </Section>
                        )}
                        {(onSpawnBoss || onCloseArena) && (
                            <Section title="Admin Actions" description="Debug tools for server owners.">
                                {onSpawnBoss && <ActionButton Icon={ShieldAlert} label="Spawn Boss" description="Force an immediate boss spawn." onClick={onSpawnBoss} color="purple"/>}
                                {onCloseArena && <ActionButton Icon={X} label="Close Arena" description="Prevent new players from joining the server." onClick={onCloseArena} color="yellow"/>}
                            </Section>
                        )}
                    </>
                )}
            </div>
            
            {/* Bottom resume button for mobile view primarily */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-3 safe-bottom md:hidden">
                <button onClick={onClose} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-4 rounded-xl text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 border-b-4 border-cyan-800">
                    <span>▶</span> {onExitGame ? 'RESUME GAME' : 'CLOSE SETTINGS'}
                </button>
            </div>
        </main>
      </div>
    </div>
  );
};

// --- Sub Components ---

const CategoryButton: React.FC<{ Icon: React.ElementType; label: string; isActive: boolean; onClick: () => void }> = ({ Icon, label, isActive, onClick }) => (
    <button onClick={onClick} className={`w-full md:w-auto flex items-center gap-3 p-3 rounded-lg text-left transition-all text-sm font-bold group whitespace-nowrap ${isActive ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-full transition-all ${isActive ? 'bg-cyan-400' : 'bg-transparent'}`}></div>
        <Icon size={20} className={isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'} />
        <span className="flex-1">{label}</span>
    </button>
);

const Section: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
    <div className="space-y-3 animate-fade-in">
        <div>
            <h4 className="text-lg font-bold text-white tracking-wide">{title}</h4>
            {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
        </div>
        <div className="space-y-3">{children}</div>
    </div>
);

const SettingCard: React.FC<{ label: string; description?: string; impact?: 'Low' | 'Medium' | 'High' | 'None'; children: React.ReactNode }> = ({ label, description, impact, children }) => {
    const impactColor = impact === 'High' ? 'text-red-400' : impact === 'Medium' ? 'text-yellow-400' : 'text-green-400';
    return (
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <div className="text-white font-bold text-sm">{label}</div>
                    {impact && impact !== 'None' && <span className={`text-[10px] font-bold ${impactColor}`}>[{impact}]</span>}
                </div>
                {description && <div className="text-xs text-slate-400 mt-1 leading-tight">{description}</div>}
            </div>
            <div className="w-full md:w-2/5 flex justify-end">{children}</div>
        </div>
    );
};

const PresetButton: React.FC<{ label: string, description: string, color: 'green' | 'yellow' | 'cyan', onClick: () => void }> = ({ label, description, color, onClick }) => {
    const colors = {
        green: 'border-green-800/50 hover:bg-green-900/40 text-green-400 hover:border-green-700',
        yellow: 'border-yellow-800/50 hover:bg-yellow-900/40 text-yellow-400 hover:border-yellow-700',
        cyan: 'border-cyan-800/50 hover:bg-cyan-900/40 text-cyan-400 hover:border-cyan-700',
    };
    return (
        <button onClick={onClick} className={`flex-1 p-4 rounded-lg bg-slate-900/50 border transition-all text-left ${colors[color]}`}>
            <div className="font-bold uppercase tracking-wider">{label}</div>
            <div className="text-xs text-slate-400">{description}</div>
        </button>
    );
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <div onClick={() => onChange(!checked)} className={`relative w-14 h-8 rounded-full cursor-pointer transition-colors border-2 ${checked ? 'bg-cyan-500/50 border-cyan-500' : 'bg-slate-700 border-slate-600'}`}>
    <div className={`absolute top-1 w-6 h-6 rounded-full bg-slate-200 transition-all shadow-md ${checked ? 'left-6 border-2 border-cyan-200' : 'left-1'}`} />
  </div>
);

const Slider: React.FC<{ min: number; max: number; step: number; value: number; onChange: (v: number) => void; displayValue: string }> = ({ min, max, step, value, onChange, displayValue }) => (
    <div className="w-full flex items-center gap-4">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="custom-slider flex-1" />
        <div className="bg-slate-900 border border-slate-700 rounded w-16 text-center py-1 text-sm font-mono text-cyan-400">{displayValue}</div>
    </div>
);

const Select: React.FC<{ value: any; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }> = ({ value, onChange, children }) => (
    <select value={value} onChange={onChange} className="bg-slate-800 border border-slate-600 rounded px-3 py-3 md:py-2 text-white outline-none focus:border-cyan-400 w-full md:w-auto font-bold text-sm">
        {children}
    </select>
);

const ActionButton: React.FC<{ Icon: React.ElementType, label: string, description: string, onClick: () => void, color: 'red'|'yellow'|'purple' }> = ({Icon, label, description, onClick, color}) => {
    const colors = {
        red: 'border-red-500/50 hover:bg-red-900/30 text-red-400',
        yellow: 'border-yellow-500/50 hover:bg-yellow-900/30 text-yellow-400',
        purple: 'border-purple-500/50 hover:bg-purple-900/30 text-purple-400',
    };
    return (
        <button onClick={onClick} className={`w-full p-4 rounded-lg bg-slate-800/50 border text-left flex items-start gap-4 transition-colors ${colors[color]}`}>
            <Icon size={24} className="mt-1 shrink-0"/>
            <div>
                <div className="font-bold text-white">{label}</div>
                <div className="text-xs text-slate-400">{description}</div>
            </div>
        </button>
    )
}
