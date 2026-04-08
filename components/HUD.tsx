
import React from 'react';
import { PlayerState, GameNotification } from '../types';
import { TANK_CLASSES } from '../data/tanks';
import { COLORS } from '../constants';

interface HUDProps {
  playerState: PlayerState;
}

const NotificationItem: React.FC<{ notif: GameNotification }> = ({ notif }) => {
    let color = COLORS.notifyInfo;
    if (notif.type === 'warning') color = COLORS.notifyWarn;
    if (notif.type === 'success') color = COLORS.notifySuccess;
    if (notif.type === 'boss') color = COLORS.notifyBoss;

    return (
        <div 
          className="bg-black/60 backdrop-blur-sm px-3 py-1 rounded border-l-2 shadow-sm animate-fade-in-down mb-1 max-w-[90vw] mx-auto text-center"
          style={{ borderColor: color }}
        >
           <span className="text-white font-bold tracking-tight text-[10px]" style={{ color: color }}>
               {notif.message}
           </span>
        </div>
    );
};

export const HUD: React.FC<HUDProps> = ({ playerState }) => {
  const xpPct = Math.min(100, (playerState.xp / playerState.xpToNext) * 100);
  const healthPct = Math.min(100, Math.max(0, (playerState.health / playerState.maxHealth) * 100));
  
  const config = TANK_CLASSES[playerState.classPath];
  const ability = config.activeSkill;

  let healthColor = '#22c55e'; // green-500
  if (healthPct < 50) healthColor = '#eab308'; // yellow-500
  if (healthPct < 25) healthColor = '#ef4444'; // red-500

  return (
    <>
      {/* Notifications Layer */}
      <div className="absolute top-16 inset-x-0 flex flex-col items-center pointer-events-none z-20 px-2">
          {playerState.notifications && playerState.notifications.map(n => (
              <NotificationItem key={n.id} notif={n} />
          ))}
      </div>

      {/* Boss Timer - Small Corner */}
      {playerState.nextBossTimer !== undefined && playerState.nextBossTimer > 0 && (
          <div className="absolute top-16 right-2 z-20 flex flex-col items-end pointer-events-none opacity-80">
             <div className="bg-black/50 px-2 py-1 rounded flex items-center gap-1">
                 <span className="text-xs">☠️</span>
                 <span className="text-[10px] font-mono text-red-400 font-bold">
                     {Math.floor(playerState.nextBossTimer / 60)}:{Math.floor(playerState.nextBossTimer % 60).toString().padStart(2, '0')}
                 </span>
             </div>
          </div>
      )}

      {/* Bottom Status Area - Lifted High for Mobile Thumbs */}
      <div className="absolute inset-x-0 bottom-4 md:bottom-6 px-4 pointer-events-none flex flex-col items-center gap-1">
        
        {/* Score - Very Small */}
        <div className="text-white font-bold text-[10px] drop-shadow-md bg-black/30 px-2 py-0.5 rounded-full border border-white/5 mb-1">
          Score: <span className="text-yellow-400 font-mono">{playerState.score.toLocaleString()}</span>
        </div>
        
        {/* Desktop Only: Ability Icon (Mobile has button) */}
        <div className="hidden md:block mb-2">
             {/* ... (Desktop ability indicators kept hidden for mobile cleanliness) ... */}
        </div>
        
        {/* Status Bars - Slim & Compact */}
        <div className="w-full max-w-[220px] flex flex-col items-center gap-1">
            {/* Health Bar */}
            <div className="w-full h-3 bg-slate-900/90 rounded-full border border-slate-700 overflow-hidden relative shadow-sm">
               <div 
                  className="h-full transition-all duration-200 ease-out"
                  style={{ width: `${healthPct}%`, backgroundColor: healthColor }}
               />
               <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/90 drop-shadow-md">
                   {Math.ceil(playerState.health)}/{Math.ceil(playerState.maxHealth)}
               </span>
            </div>

            {/* XP Bar */}
            <div className="w-full h-1.5 bg-slate-900/90 rounded-full border border-slate-600 overflow-hidden relative shadow-sm">
              <div 
                className="h-full bg-gradient-to-r from-yellow-600 to-yellow-300 transition-all duration-300 ease-out"
                style={{ width: `${xpPct}%` }}
              />
            </div>
            
            <div className="w-full flex justify-between text-[8px] font-bold text-white/50 px-1">
                <span>Lvl {playerState.level}</span>
                <span>{config.name}</span>
            </div>
        </div>
      </div>
    </>
  );
};
