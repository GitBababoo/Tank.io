import React, { useState, useEffect, useRef } from 'react';
import { GAME_MODES } from '../constants';
import { GameMode, FactionType, ServerRegion } from '../types';
import { TankGallery } from './TankGallery';
import { BossGallery } from './BossGallery';
import { LegalModal } from './LegalModal';
import { PrivacyModal } from './PrivacyModal';
import { Settings, Book, Database, Sword, Play, Globe } from 'lucide-react';

interface LobbyViewProps {
  onStart: (name: string, mode: GameMode, faction: FactionType, selectedClass: string, region: ServerRegion) => void;
  onOpenSettings: () => void;
  onOpenStudio?: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ onStart, onOpenSettings, onOpenStudio }) => {
  const [name, setName] = useState('');
  const [selectedMode, setSelectedMode] = useState<GameMode>('FFA');
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [inGameCount, setInGameCount] = useState<number>(0);
  const [showGlossary, setShowGlossary] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showBossGallery, setShowBossGallery] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Dynamic Region Detection for Local Network Play
  const getWebSocketUrl = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      // If dev, use 8080, else assume same port or proxied
      const port = (host === 'localhost' || host === '127.0.0.1') ? ':8080' : (window.location.port ? `:${window.location.port}` : '');
      return `${protocol}//${host}${port}/ws`;
  };

  const currentRegion: ServerRegion = { 
      id: 'local', 
      name: window.location.hostname === 'localhost' ? 'Localhost' : 'Network Server', 
      flag: '🟢', 
      ping: 5, 
      occupancy: 0, 
      url: 'public', // This tells NetworkManager to calculate dynamic URL
      type: 'OFFICIAL' 
  };
  
  useEffect(() => { 
      setMounted(true); 
      const savedName = localStorage.getItem('tank_io_nickname');
      if (savedName) setName(savedName);
      
      const connectLobby = () => {
          try {
              const wsUrl = getWebSocketUrl();
              const ws = new WebSocket(wsUrl);
              wsRef.current = ws;

              ws.onmessage = (e) => {
                  if (typeof e.data === 'string') {
                      try {
                          const msg = JSON.parse(e.data);
                          if (msg.t === 'stats') {
                              setOnlineCount(msg.d.online);
                              setInGameCount(msg.d.ingame);
                          }
                      } catch (err) {}
                  }
              };
          } catch(e) {
              console.warn("Server unavailable");
          }
      };

      connectLobby();
      return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  const handleStart = () => {
      let finalName = name.trim();
      if (!finalName) finalName = `Commander_${Math.floor(Math.random()*1000)}`;
      localStorage.setItem('tank_io_nickname', finalName);
      if (wsRef.current) wsRef.current.close();
      onStart(finalName, selectedMode, FactionType.NONE, 'basic', currentRegion);
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
                    Hybrid Core
                </div>
            </div>

            <div className="w-full max-w-md p-4 bg-slate-900/50 border-l-4 border-green-500 rounded-r-xl backdrop-blur-sm flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#0f0]"></div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Globe size={12} /> {currentRegion.name}
                        </div>
                        <div className="text-sm font-black text-white">ONLINE</div>
                    </div>
                </div>
                <div className="text-right flex gap-6">
                    <div>
                        <div className="text-2xl font-mono font-black text-white">{onlineCount}</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Online</div>
                    </div>
                    <div>
                        <div className="text-2xl font-mono font-black text-green-400">{inGameCount}</div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Fighting</div>
                    </div>
                </div>
            </div>
        </div>

        {/* RIGHT: Login */}
        <div className="w-full md:w-[480px] glass-panel rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden shrink-0">
            <div className="flex justify-end items-center gap-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">GUEST ACCESS</span>
                <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            </div>

            <div className="space-y-2 mt-2">
                <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-1">Callsign</label>
                <input
                    type="text"
                    placeholder="ENTER NAME"
                    className="w-full bg-slate-900/50 text-white border-2 border-slate-700 rounded-xl px-5 py-4 text-center font-bold text-lg outline-none focus:border-cyan-500 uppercase tracking-wider"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={15}
                />
            </div>

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

            <button
                onClick={handleStart}
                className="mt-2 w-full bg-white text-black font-black text-2xl py-5 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
            >
                <Play fill="currentColor" size={24} />
                DEPLOY
            </button>

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