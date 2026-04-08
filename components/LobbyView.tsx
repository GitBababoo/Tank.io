
import React, { useState, useEffect } from 'react';
import { GAME_MODES } from '../constants';
import { GameMode, FactionType, ServerRegion } from '../types';
import { TankGallery } from './TankGallery';
import { BossGallery } from './BossGallery';
import { LegalModal } from './LegalModal';
import { PrivacyModal } from './PrivacyModal';
import { Settings, Book, Database, Sword, Play, Users, Globe } from 'lucide-react';

interface LobbyViewProps {
  onStart: (name: string, mode: GameMode, faction: FactionType, selectedClass: string, region: ServerRegion, isHost: boolean, hostId?: string) => void;
  onStartOffline: (name: string, mode: GameMode, selectedClass: string) => void;
  onOpenSettings: () => void;
  onOpenStudio?: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ onStart, onStartOffline, onOpenSettings, onOpenStudio }) => {
  const [name, setName] = useState('');
  const [selectedMode, setSelectedMode] = useState<GameMode>('FFA');
  const [showGlossary, setShowGlossary] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showBossGallery, setShowBossGallery] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [lobbyMode, setLobbyMode] = useState<'MAIN' | 'JOIN'>('MAIN');
  const [targetRoomId, setTargetRoomId] = useState('');

  const currentRegion: ServerRegion = { 
      id: 'p2p', name: 'Private Connection', flag: '🔒', ping: 0, occupancy: 0, url: '', type: 'OFFICIAL' 
  };
  
  useEffect(() => { 
      setMounted(true); 
      const savedName = localStorage.getItem('tank_io_nickname');
      if (savedName) setName(savedName);
  }, []);

  const handleHost = () => {
      let finalName = name.trim() || `Commander_${Math.floor(Math.random()*1000)}`;
      localStorage.setItem('tank_io_nickname', finalName);
      onStart(finalName, selectedMode, FactionType.NONE, 'basic', currentRegion, true);
  };

  const handleJoin = () => {
      if (!targetRoomId.trim()) return alert("Please enter a Room ID!");
      let finalName = name.trim() || `Guest_${Math.floor(Math.random()*1000)}`;
      localStorage.setItem('tank_io_nickname', finalName);
      onStart(finalName, selectedMode, FactionType.NONE, 'basic', currentRegion, false, targetRoomId);
  };

  const handleOffline = () => {
      let finalName = name.trim() || `Pilot_${Math.floor(Math.random()*1000)}`;
      localStorage.setItem('tank_io_nickname', finalName);
      onStartOffline(finalName, selectedMode, 'basic');
  };

  return (
    <div className="fixed inset-0 bg-[#050505] flex items-center justify-center overflow-hidden font-sans select-none text-slate-200">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 opacity-20" 
               style={{ 
                   backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
                   backgroundSize: '40px 40px',
                   transform: 'perspective(500px) rotateX(60deg) translateY(100px) scale(2)',
                   animation: 'gridMove 20s linear infinite',
                   maskImage: 'linear-gradient(to bottom, transparent, black)'
               }}>
          </div>
      </div>
      <style>{`@keyframes gridMove { 0% { background-position: 0 0; } 100% { background-position: 0 40px; } } .glass-panel { background: rgba(10, 10, 20, 0.6); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }`}</style>

      <div className={`relative z-10 w-full max-w-7xl h-full md:h-[90vh] flex flex-col md:flex-row gap-6 p-4 md:p-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* LEFT: Branding & Status */}
        <div className="flex-1 flex flex-col justify-center items-center md:items-start space-y-8 relative">
            <div className="relative text-center md:text-left animate-float">
                <h1 className="text-7xl md:text-[10rem] font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-200 to-cyan-500 drop-shadow-[0_0_50px_rgba(34,211,238,0.4)] leading-none select-none">
                    TANK.IO
                </h1>
                <div className="absolute -bottom-4 right-0 bg-cyan-500/20 px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.5em] text-cyan-400 border border-cyan-500/30 backdrop-blur-xl uppercase shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                    Advanced Combat System
                </div>
            </div>

            <div className="w-full max-w-md p-5 bg-slate-900/40 border-l-4 border-cyan-500 rounded-r-2xl backdrop-blur-xl flex items-center justify-between shadow-2xl border border-white/5 animate-slide-in-right">
                <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_15px_#06b6d4]"></div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Globe size={12} className="text-cyan-500" /> SYSTEM STATUS
                        </div>
                        <div className="text-sm font-black text-white tracking-wider uppercase">Operational • 60 FPS</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-cyan-400 font-black uppercase tracking-tighter">ULTRA LOW LATENCY</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{currentRegion.name}</div>
                </div>
            </div>
        </div>

        {/* RIGHT: Login / Mode Select */}
        <div className="w-full md:w-[500px] glass-panel rounded-[2.5rem] p-8 md:p-10 flex flex-col gap-8 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden shrink-0 border border-white/10">
            <div className="space-y-3">
                <label className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.3em] ml-1 opacity-80">Pilot Designation</label>
                <input type="text" placeholder="ENTER CALLSIGN" className="w-full bg-black/40 text-white border-2 border-slate-800/50 rounded-2xl px-6 py-5 text-center font-black text-xl outline-none focus:border-cyan-500/50 focus:bg-black/60 transition-all uppercase tracking-[0.2em] shadow-inner" value={name} onChange={(e) => setName(e.target.value)} maxLength={15} />
            </div>

            {lobbyMode === 'MAIN' ? (
                <>
                    <div className="space-y-3">
                        <label className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.3em] ml-1 opacity-80">Engagement Zone</label>
                        <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                            {GAME_MODES.map(mode => (
                                <button key={mode.id} onClick={() => setSelectedMode(mode.id)} className={`group relative px-5 py-4 rounded-2xl border-2 transition-all flex items-center justify-between overflow-hidden ${selectedMode === mode.id ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-[0_0_30px_rgba(34,211,238,0.1)] translate-x-2' : 'bg-black/20 border-slate-800/50 text-slate-500 hover:border-slate-700 hover:bg-black/30'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${selectedMode === mode.id ? 'bg-cyan-400 shadow-[0_0_15px_#06b6d4] scale-125' : 'bg-slate-700'}`} />
                                        <div className="flex flex-col items-start">
                                            <span className="text-[13px] font-black uppercase tracking-widest">{mode.name}</span>
                                            <span className={`text-[9px] font-bold uppercase tracking-tighter opacity-60 transition-colors ${selectedMode === mode.id ? 'text-cyan-300' : ''}`}>Standard Protocol</span>
                                        </div>
                                    </div>
                                    <Play size={14} className={`transition-all duration-500 ${selectedMode === mode.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 mt-2">
                        <div className="flex gap-3">
                            <button onClick={handleHost} className="flex-[1.5] bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black py-5 rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.3)] transition-all active:scale-95 flex items-center justify-center gap-3 text-lg uppercase tracking-wider group border-t border-white/20">
                                <Play fill="currentColor" size={24} className="group-hover:scale-110 transition-transform" /> START BATTLE
                            </button>
                            <button onClick={() => setLobbyMode('JOIN')} className="flex-1 bg-slate-900/60 hover:bg-slate-800 text-white font-black py-5 rounded-2xl border-2 border-slate-800 hover:border-cyan-500/30 transition-all active:scale-95 flex flex-col items-center justify-center gap-1">
                                <Users size={18} className="text-slate-500" />
                                <span className="text-[10px] tracking-widest opacity-80">JOIN ROOM</span>
                            </button>
                        </div>
                        <button onClick={handleOffline} className="w-full bg-black/40 hover:bg-black/60 text-cyan-400 font-bold py-4 rounded-2xl border border-cyan-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 text-xs tracking-[0.2em] group">
                            <Sword size={16} className="group-hover:rotate-12 transition-transform" /> OFFLINE TRAINING MODE
                        </button>
                    </div>
                </>
            ) : (
                <div className="space-y-6 animate-fade-in py-4">
                    <div className="space-y-3">
                        <label className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.3em] ml-1 opacity-80">Frequency Sync (Room ID)</label>
                        <input type="text" placeholder="PASTE TARGET ID" className="w-full bg-black/40 text-white border-2 border-cyan-900/30 rounded-2xl px-6 py-5 text-center font-mono font-black text-lg outline-none focus:border-cyan-500/50 shadow-inner" value={targetRoomId} onChange={(e) => setTargetRoomId(e.target.value)} />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setLobbyMode('MAIN')} className="w-1/3 bg-slate-900/60 text-slate-500 font-black py-5 rounded-2xl hover:bg-slate-800 border border-slate-800 transition-all uppercase tracking-widest text-xs">BACK</button>
                        <button onClick={handleJoin} className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest">ESTABLISH LINK</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-4 gap-3 mt-auto pt-6 border-t border-white/5">
                <NavBtn icon={<Settings size={18}/>} label="Config" onClick={onOpenSettings} />
                <NavBtn icon={<Book size={18}/>} label="Logs" onClick={() => setShowGlossary(true)} />
                <NavBtn icon={<Database size={18}/>} label="Stats" onClick={() => setShowGallery(true)} />
                <NavBtn icon={<Sword size={18}/>} label="Intel" onClick={() => setShowBossGallery(true)} />
            </div>
        </div>
      </div>

      {showGlossary && <ModalWrapper onClose={() => setShowGlossary(false)} title="DATA LOG"><div/></ModalWrapper>}
      {showGallery && <TankGallery onClose={() => setShowGallery(false)} />}
      {showBossGallery && <BossGallery onClose={() => setShowBossGallery(false)} />}
      {showLegal && <LegalModal onClose={() => setShowLegal(false)} />}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    </div>
  );
};

const NavBtn: React.FC<{ icon: React.ReactNode, label: string, onClick?: () => void }> = ({ icon, label, onClick }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-900/50 border border-slate-700 text-slate-400 hover:text-white hover:border-cyan-500/50 transition-all active:scale-95">
        {icon}
        <span className="text-[9px] font-black uppercase tracking-wide">{label}</span>
    </button>
);

const ModalWrapper: React.FC<{ onClose: () => void; title: string; children: React.ReactNode }> = ({ onClose, title, children }) => (
    <div className="absolute inset-0 bg-slate-950 z-[100] flex flex-col animate-fade-in">
        <div className="p-4 border-b border-slate-800 bg-black/50 flex justify-between items-center shrink-0 backdrop-blur-md">
            <h2 className="text-xl font-black italic text-cyan-400 uppercase">{title}</h2>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-900 rounded-full text-slate-400">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </div>
);
