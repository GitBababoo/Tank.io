
import React, { useState, useEffect } from 'react';
import { GLOSSARY_DATA, GAME_MODES, ADMIN_UIDS } from '../constants';
import { GameMode, FactionType, ServerRegion } from '../types';
import { TankGallery } from './TankGallery';
import { BossGallery } from './BossGallery';
import { LegalModal } from './LegalModal';
import { PrivacyModal } from './PrivacyModal';
import { Settings, Book, Database, Sword, Crown, Play, Cpu, LogIn, LogOut, User as UserIcon, Ghost, Globe, Signal, Share2, Users } from 'lucide-react';

// FIREBASE IMPORTS
import { auth, googleProvider, db } from '../firebase';
import { User, onAuthStateChanged, signInWithPopup, signInAnonymously, signOut } from "firebase/auth";
import { ref, onValue, off } from "firebase/database";

interface LobbyViewProps {
  onStart: (name: string, mode: GameMode, faction: FactionType, selectedClass: string, region: ServerRegion) => void;
  onOpenSettings: () => void;
  onOpenStudio?: () => void;
}

const DEFAULT_REGION: ServerRegion = { 
    id: 'asia-se1', 
    name: 'Asia Southeast', 
    flag: '🌏', 
    ping: 0, 
    occupancy: 0, 
    url: 'public', 
    type: 'OFFICIAL' 
};

export const LobbyView: React.FC<LobbyViewProps> = ({ onStart, onOpenSettings, onOpenStudio }) => {
  const [name, setName] = useState('');
  const [selectedMode, setSelectedMode] = useState<GameMode>('FFA');
  const [isHoveringPlay, setIsHoveringPlay] = useState(false);
  
  // Realtime Data
  const [modeCounts, setModeCounts] = useState<Record<string, number>>({});
  const [totalOnline, setTotalOnline] = useState<number>(0);
  const [ping, setPing] = useState<number>(Math.floor(Math.random() * 20) + 15);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Modal States
  const [showGlossary, setShowGlossary] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showBossGallery, setShowBossGallery] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => { 
      setMounted(true); 
      const savedName = localStorage.getItem('tank_io_nickname');
      if (savedName) setName(savedName);

      const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setAuthLoading(false);
          if (currentUser && currentUser.displayName) {
              setName(currentUser.displayName);
          } else if (currentUser && currentUser.isAnonymous && !name) {
              setName(`Guest_${currentUser.uid.slice(0, 4)}`);
          }
      });

      return () => unsubscribeAuth();
  }, []);

  // --- NEW: GLOBAL PLAYER COUNTER SYSTEM ---
  useEffect(() => {
      const unsubscribers: (() => void)[] = [];

      // 1. Loop through all game modes and attach listeners
      GAME_MODES.forEach(mode => {
          if (mode.id === 'SANDBOX') {
              // Sandbox doesn't need DB check, usually just 0 or 1 locally
              setModeCounts(prev => ({ ...prev, [mode.id]: 0 }));
              return;
          }

          const playersRef = ref(db, `rooms/${mode.id}/players`);
          const unsub = onValue(playersRef, (snapshot) => {
              const count = snapshot.exists() ? snapshot.size : 0;
              setModeCounts(prev => {
                  const newState = { ...prev, [mode.id]: count };
                  // Recalculate total immediately
                  const total = Object.values(newState).reduce((a: number, b: number) => a + b, 0);
                  setTotalOnline(total);
                  return newState;
              });
          });
          unsubscribers.push(unsub);
      });

      // Cleanup all listeners on unmount
      return () => {
          unsubscribers.forEach(unsub => unsub());
      };
  }, []);

  const handleStart = () => {
      localStorage.setItem('tank_io_nickname', name);
      // Pass the specific count for the selected mode
      const regionData = { ...DEFAULT_REGION, occupancy: modeCounts[selectedMode] || 0 };
      onStart(name || 'Player', selectedMode, FactionType.NONE, 'basic', regionData);
  };

  const handleLogin = async () => {
      try {
          await signInWithPopup(auth, googleProvider);
      } catch (error: any) {
          if (error.code !== 'auth/popup-closed-by-user') {
              alert(`Login failed: ${error.message}`);
          }
      }
  };

  const handleGuestLogin = async () => {
      try { await signInAnonymously(auth); } catch (error: any) { alert(error.message); }
  };

  const handleLogout = async () => {
      try { await signOut(auth); setName(''); } catch (error) {}
  };

  const handleShare = () => {
      navigator.clipboard.writeText(window.location.href);
      alert("Game Link Copied! Send it to friends.");
  };

  const currentModeConfig = GAME_MODES.find(m => m.id === selectedMode);
  const isAdmin = user && ADMIN_UIDS.includes(user.uid);
  const occupancyColor = totalOnline > 40 ? 'text-red-400' : (totalOnline > 10 ? 'text-yellow-400' : 'text-green-400');

  return (
    <div className="fixed inset-0 bg-[#050505] flex items-center justify-center overflow-hidden font-sans select-none text-slate-200">
      
      {/* Background FX */}
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
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[150px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      <style>{`@keyframes gridMove { 0% { background-position: 0 0; } 100% { background-position: 0 40px; } } .glass-panel { background: rgba(10, 10, 20, 0.6); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); } .neon-text { text-shadow: 0 0 10px currentColor; } .clip-diagonal { clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); }`}</style>

      {/* --- MAIN LAYOUT --- */}
      <div className={`relative z-10 w-full max-w-7xl h-full md:h-[90vh] flex flex-col md:flex-row gap-6 p-4 md:p-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* LEFT COLUMN */}
        <div className="flex-1 flex flex-col justify-center items-center md:items-start space-y-8 relative">
            
            {/* Title */}
            <div className="relative text-center md:text-left">
                <h1 className="text-6xl md:text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-200 to-cyan-500 drop-shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                    TANK.IO
                </h1>
                <div className="absolute -bottom-2 right-0 bg-white/10 px-3 py-1 rounded text-[10px] font-bold tracking-[0.5em] text-cyan-400 border border-cyan-500/30 backdrop-blur-md uppercase">
                    Online Warfare
                </div>
            </div>

            {/* SERVER STATUS DASHBOARD */}
            <div className="w-full max-w-md p-4 bg-slate-900/50 border-l-4 border-green-500 rounded-r-xl backdrop-blur-sm flex items-center justify-between shadow-lg relative group transition-all hover:bg-slate-900/70">
                <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#0f0]"></div>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Globe size={12} /> {DEFAULT_REGION.name}
                        </div>
                        <div className="text-sm font-black text-white">OFFICIAL SERVER</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-2xl font-mono font-black ${occupancyColor}`}>
                        {totalOnline} <span className="text-[10px] text-slate-500 font-sans font-bold uppercase">Total Players</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold flex items-center justify-end gap-1">
                        <Signal size={10} /> {ping}ms
                    </div>
                </div>
                
                <button 
                    onClick={handleShare}
                    className="absolute -right-12 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-lg transition-all active:scale-95 group-hover:right-[-3.5rem] opacity-0 group-hover:opacity-100"
                    title="Copy Invite Link"
                >
                    <Share2 size={18} className="text-white" />
                </button>
            </div>

            {/* Mode Info */}
            <div className="hidden md:block w-full max-w-md p-6 glass-panel rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Protocol</h3>
                    <div className="text-xs font-bold bg-black/40 px-2 py-1 rounded text-cyan-400 border border-cyan-900">
                        {modeCounts[selectedMode] || 0} Pilots Active
                    </div>
                </div>
                <div className="text-4xl font-black text-white mb-2 neon-text" style={{ color: currentModeConfig?.color }}>
                    {currentModeConfig?.name}
                </div>
                <p className="text-sm text-slate-400 font-medium leading-relaxed border-l-2 border-slate-700 pl-3">
                    {currentModeConfig?.description}
                </p>
            </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full md:w-[480px] glass-panel rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden shrink-0">
            
            {/* Auth */}
            <div className="flex justify-end">
                {!authLoading && (
                    user ? (
                        <div className="flex items-center gap-3 bg-slate-900/60 p-2 pl-4 rounded-full border border-green-500/30">
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Pilot</span>
                                <span className="text-xs font-bold text-green-400">{user.displayName || "Unknown"}</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-green-900 flex items-center justify-center text-green-400">
                                {user.photoURL ? <img src={user.photoURL} className="rounded-full"/> : (user.isAnonymous ? <Ghost size={16}/> : <UserIcon size={16}/>)}
                            </div>
                            <button onClick={handleLogout} className="w-8 h-8 flex items-center justify-center bg-red-900/20 hover:bg-red-900/50 rounded-full text-red-400 transition-colors ml-1"><LogOut size={14}/></button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button onClick={handleLogin} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2 px-4 rounded-full border border-slate-600"><LogIn size={14}/> GOOGLE</button>
                            <button onClick={handleGuestLogin} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 px-4 rounded-full border border-slate-600"><Ghost size={14}/> GUEST</button>
                        </div>
                    )
                )}
            </div>

            {/* Name Input */}
            <div className="space-y-2 mt-2">
                <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-1">Identity</label>
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="ENTER CALLSIGN"
                        className="w-full bg-slate-900/50 text-white border-2 border-slate-700 rounded-xl px-5 py-4 text-center font-bold text-lg outline-none focus:border-cyan-500 focus:bg-slate-900/80 transition-all uppercase tracking-wider shadow-inner"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={15}
                    />
                    <Cpu size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-cyan-500 transition-colors" />
                </div>
            </div>

            {/* Mode Select - UPDATED WITH LIVE COUNTS */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-cyan-500 uppercase tracking-widest ml-1">Live Deployment Zones</label>
                <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                    {GAME_MODES.map(mode => {
                        const count = modeCounts[mode.id] || 0;
                        const isSelected = selectedMode === mode.id;
                        
                        return (
                            <button
                                key={mode.id}
                                onClick={() => setSelectedMode(mode.id)}
                                className={`
                                    relative px-4 py-3 rounded-xl border transition-all flex items-center justify-between
                                    ${isSelected 
                                        ? 'bg-slate-800 border-white text-white shadow-lg translate-x-1' 
                                        : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:bg-slate-800 hover:border-slate-600'
                                    }
                                `}
                                style={{ borderColor: isSelected ? mode.color : undefined }}
                            >
                                {/* Left: Name & Dot */}
                                <div className="flex items-center gap-3">
                                    <div 
                                        className={`w-2 h-2 rounded-full ${count > 0 ? 'bg-green-500 shadow-[0_0_5px_#0f0]' : 'bg-slate-600'}`}
                                    />
                                    <div className="flex flex-col items-start">
                                        <span className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'neon-text' : ''}`}>{mode.name}</span>
                                        {isSelected && <span className="text-[9px] font-bold opacity-70">Selected</span>}
                                    </div>
                                </div>

                                {/* Right: Count */}
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${count > 0 ? 'bg-slate-900 text-white' : 'bg-transparent text-slate-600'}`}>
                                    <Users size={10} />
                                    <span className="text-xs font-mono font-bold">{count}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Start Button */}
            <div className="mt-2">
                <button
                    onClick={handleStart}
                    onMouseEnter={() => setIsHoveringPlay(true)}
                    onMouseLeave={() => setIsHoveringPlay(false)}
                    className="w-full relative group overflow-hidden bg-white text-black font-black text-2xl py-5 rounded-xl clip-diagonal shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(34,211,238,0.5)] active:scale-[0.98]"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10 flex items-center justify-center gap-3 group-hover:text-white transition-colors">
                        <Play fill="currentColor" size={24} />
                        JOIN BATTLE
                    </span>
                </button>
            </div>

            {/* Footer Nav */}
            <div className="grid grid-cols-4 gap-2 mt-auto pt-4 border-t border-slate-800">
                <NavBtn icon={<Settings size={18}/>} label="System" onClick={onOpenSettings} />
                <NavBtn icon={<Book size={18}/>} label="Glossary" onClick={() => setShowGlossary(true)} />
                <NavBtn icon={<Database size={18}/>} label="Armory" onClick={() => setShowGallery(true)} />
                <NavBtn icon={<Sword size={18}/>} label="Bestiary" onClick={() => setShowBossGallery(true)} highlight />
                {isAdmin && (
                    <button onClick={onOpenStudio} className="col-span-4 flex items-center justify-center gap-2 py-2 mt-2 rounded border border-dashed border-slate-700 text-[10px] text-slate-500 font-bold hover:text-cyan-400 uppercase tracking-widest group bg-slate-900/50">
                        <Crown size={12} className="group-hover:text-yellow-400" /> Developer Studio
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* Modals */}
      {showGlossary && <ModalWrapper onClose={() => setShowGlossary(false)} title="TACTICAL GUIDE"><GlossaryContent /></ModalWrapper>}
      {showGallery && <TankGallery onClose={() => setShowGallery(false)} />}
      {showBossGallery && <BossGallery onClose={() => setShowBossGallery(false)} />}
      {showLegal && <LegalModal onClose={() => setShowLegal(false)} />}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    </div>
  );
};

const NavBtn: React.FC<{ icon: React.ReactNode, label: string, onClick?: () => void, highlight?: boolean }> = ({ icon, label, onClick, highlight }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all active:scale-95 group relative overflow-hidden ${highlight ? 'bg-red-900/20 border-red-500/30 text-red-400 hover:bg-red-900/40 hover:border-red-500' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-cyan-500/50'}`}>
        <div className="relative z-10 transition-transform group-hover:scale-110 duration-300">{icon}</div>
        <span className="relative z-10 text-[9px] font-black uppercase tracking-wide">{label}</span>
    </button>
);

const ModalWrapper: React.FC<{ onClose: () => void; title: string; children: React.ReactNode }> = ({ onClose, title, children }) => (
    <div className="absolute inset-0 bg-slate-950 z-[100] flex flex-col animate-fade-in">
        <div className="p-4 border-b border-slate-800 bg-black/50 flex justify-between items-center shrink-0 backdrop-blur-md">
            <h2 className="text-xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-tighter">{title}</h2>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-900 rounded-full text-slate-400 border border-slate-700 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-900/50">{children}</div>
    </div>
);

const GlossaryContent = () => (
    <div className="grid gap-3 pb-8 max-w-2xl mx-auto">
        {GLOSSARY_DATA.map((item, idx) => (
            <div key={idx} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 hover:border-cyan-500/30 transition-colors group">
                <span className="text-[9px] font-black uppercase text-cyan-600 mb-1 block tracking-widest">{item.category}</span>
                <h3 className="text-white font-bold text-sm mb-2 group-hover:text-cyan-400 transition-colors">{item.term}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{item.definition}</p>
            </div>
        ))}
    </div>
);
