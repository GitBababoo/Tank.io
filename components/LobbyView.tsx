
import React, { useState, useEffect } from 'react';
import { GAME_MODES } from '../constants';
import { GameMode, FactionType, ServerRegion } from '../types';
import { TankGallery } from './TankGallery';
import { BossGallery } from './BossGallery';
import { LegalModal } from './LegalModal';
import { PrivacyModal } from './PrivacyModal';
import { Settings, Book, Database, Sword, Play, Users, Copy, Check } from 'lucide-react';

interface LobbyViewProps {
  onStart: (name: string, mode: GameMode, faction: FactionType, selectedClass: string, region: ServerRegion, isHost: boolean, hostId?: string) => void;
  onOpenSettings: () => void;
  onOpenStudio?: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ onStart, onOpenSettings, onOpenStudio }) => {
  const [name, setName] = useState('');
  const [selectedMode, setSelectedMode] = useState<GameMode>('FFA');
  const [showGlossary, setShowGlossary] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showBossGallery, setShowBossGallery] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // P2P State
  const [lobbyMode, setLobbyMode] = useState<'MAIN' | 'JOIN'>('MAIN');
  const [targetRoomId, setTargetRoomId] = useState('');

  const currentRegion: ServerRegion = { 
      id: 'p2p', name: 'Peer-to-Peer', flag: '🔗', ping: 0, occupancy: 0, url: '', type: 'OFFICIAL' 
  };
  
  useEffect(() => { 
      setMounted(true); 
      const savedName = localStorage.getItem('tank_io_nickname');
      if (savedName) setName(savedName);
  }, []);

  const handleHost = () => {
      let finalName = name.trim() || `Commander_${Math.floor(Math.random()*1000)}`;
      localStorage.setItem('tank_io_nickname', finalName);
      // Start as Host
      onStart(finalName, selectedMode, FactionType.NONE, 'basic', currentRegion, true);
  };

  const handleJoin = () => {
      if (!targetRoomId.trim()) return alert("Please enter a Room ID!");
      let finalName = name.trim() || `Guest_${Math.floor(Math.random()*1000)}`;
      localStorage.setItem('tank_io_nickname', finalName);
      // Start as Client
      onStart(finalName, selectedMode, FactionType.NONE, 'basic', currentRegion, false, targetRoomId);
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
        
        {/* LEFT: Branding */}
        <div className="flex-1 flex flex-col justify-center items-center md:items-start space-y-8 relative">
            <div className="relative text-center md:text-left">
                <h1 className="text-6xl md:text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-200 to-cyan-500 drop-shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                    TANK.IO
                </h1>
                <div className="absolute -bottom-2 right-0 bg-white/10 px-3 py-1 rounded text-[10px] font-bold tracking-[0.5em] text-cyan-400 border border-cyan-500/30 backdrop-blur-md uppercase">
                    P2P Edition
                </div>
            </div>
        </div>

        {/* RIGHT: Login / Mode Select */}
        <div className="w-full md:w-[480px] glass-panel rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden shrink-0">
            
            <div className="space-y-2 mt-2">
                <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-1">Callsign</label>
                <input
                    type="text"
                    placeholder="YOUR NAME"
                    className="w-full bg-slate-900/50 text-white border-2 border-slate-700 rounded-xl px-5 py-4 text-center font-bold text-lg outline-none focus:border-cyan-500 uppercase tracking-wider"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={15}
                />
            </div>

            {lobbyMode === 'MAIN' ? (
                <>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-1">Zone</label>
                        <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                            {GAME_MODES.map(mode => (
                                <button
                                    key={mode.id}
                                    onClick={() => setSelectedMode(mode.id)}
                                    className={`relative px-4 py-3 rounded-xl border transition-all flex items-center justify-between ${selectedMode === mode.id ? 'bg-slate-800 border-white text-white shadow-lg translate-x-1' : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:bg-slate-800'}`}
                                    style={{ borderColor: selectedMode === mode.id ? mode.color : undefined }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${selectedMode === mode.id ? 'bg-green-500 shadow-[0_0_5px_#0f0]' : 'bg-slate-600'}`} />
                                        <span className="text-xs font-black uppercase tracking-wider">{mode.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={handleHost}
                            className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Play fill="currentColor" size={20} />
                            CREATE ROOM
                        </button>
                        <button
                            onClick={() => setLobbyMode('JOIN')}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-xl border-2 border-slate-600 hover:border-slate-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Users size={20} />
                            JOIN FRIEND
                        </button>
                    </div>
                </>
            ) : (
                <div className="space-y-4 animate-fade-in">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-green-500 uppercase tracking-widest ml-1">Room ID</label>
                        <input
                            type="text"
                            placeholder="PASTE ID HERE"
                            className="w-full bg-slate-900/50 text-white border-2 border-green-700 rounded-xl px-5 py-4 text-center font-mono font-bold text-sm outline-none focus:border-green-500"
                            value={targetRoomId}
                            onChange={(e) => setTargetRoomId(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={() => setLobbyMode('MAIN')}
                            className="w-1/3 bg-slate-800 text-slate-400 font-bold py-4 rounded-xl hover:bg-slate-700"
                        >
                            BACK
                        </button>
                        <button
                            onClick={handleJoin}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95"
                        >
                            CONNECT
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-4 gap-2 mt-auto pt-4 border-t border-slate-800">
                <NavBtn icon={<Settings size={18}/>} label="System" onClick={onOpenSettings} />
                <NavBtn icon={<Book size={18}/>} label="Guide" onClick={() => setShowGlossary(true)} />
                <NavBtn icon={<Database size={18}/>} label="Data" onClick={() => setShowGallery(true)} />
                <NavBtn icon={<Sword size={18}/>} label="Threats" onClick={() => setShowBossGallery(true)} />
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
