
import React, { useState } from 'react';
import { LegalModal } from './LegalModal';
import { PrivacyModal } from './PrivacyModal';
import { Star, Award, Code, Globe } from 'lucide-react';

interface MainMenuProps {
  onEnterLobby: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onEnterLobby }) => {
  const [showLegal, setShowLegal] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center overflow-hidden animate-fade-in">
      {/* Background elements from LobbyView for consistency */}
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950"></div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center p-8">
        <div className="animate-fade-in-down">
          <h1 className="text-8xl md:text-9xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_15px_rgba(0,204,255,0.4)]">
            TANK.IO
          </h1>
          <p className="text-slate-400 tracking-[0.5em] text-sm md:text-base uppercase mt-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            Next Gen + Mega Expansion
          </p>
        </div>

        {/* --- PRO GAME BADGE (Like Store Listing) --- */}
        <div className="mt-8 flex gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl p-3 flex items-center gap-3 shadow-lg">
                <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-400">
                    <Star size={20} fill="currentColor" />
                </div>
                <div className="text-left">
                    <div className="text-xl font-black text-white leading-none">9.8</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">35k+ Votes</div>
                </div>
            </div>
            
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl p-3 flex items-center gap-3 shadow-lg">
                <div className="bg-cyan-500/10 p-2 rounded-lg text-cyan-400">
                    <Code size={20} />
                </div>
                <div className="text-left">
                    <div className="text-xs font-black text-white uppercase tracking-wider">Developer</div>
                    <div className="text-[10px] text-slate-400 font-bold">Tank.io Team</div>
                </div>
            </div>
        </div>

        <button
          onClick={onEnterLobby}
          className="mt-12 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-5 px-16 rounded-xl text-2xl shadow-lg shadow-cyan-900/50 transition-all transform hover:scale-105 active:scale-100 animate-fade-in relative overflow-hidden"
          style={{ animationDelay: '0.6s' }}
        >
          <span className="absolute inset-0 bg-white/10 animate-pulse"></span>
          <span className="relative">ENTER HANGAR</span>
        </button>
      </div>

      <div className="absolute bottom-6 left-6 right-6 z-10 flex justify-between text-xs text-slate-500 font-bold animate-fade-in" style={{ animationDelay: '0.9s' }}>
        <div className="flex gap-4">
            <button onClick={() => setShowPrivacy(true)} className="hover:text-white transition-colors">
            PRIVACY POLICY
            </button>
            <button onClick={() => setShowLegal(true)} className="hover:text-white transition-colors">
            TERMS OF SERVICE
            </button>
        </div>
        <div className="flex gap-2 items-center opacity-50">
            <Globe size={12} />
            <span>v3.0.1 (Pro Engine)</span>
        </div>
      </div>

      {showLegal && <LegalModal onClose={() => setShowLegal(false)} />}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    </div>
  );
};
