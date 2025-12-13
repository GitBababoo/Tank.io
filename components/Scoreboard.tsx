
import React, { useState, useEffect } from 'react';
import { PlayerState, LeaderboardEntry } from '../types';
import { DraggableWindow } from './DraggableWindow';

interface ScoreboardProps {
  playerState: PlayerState;
}

const formatScore = (score: number): string => {
  if (score >= 1_000_000) return (score / 1_000_000).toFixed(1) + 'm';
  if (score >= 1_000) return (score / 1_000).toFixed(1) + 'k';
  return score.toLocaleString();
};

export const Scoreboard: React.FC<ScoreboardProps> = ({ playerState }) => {
  const { leaderboard } = playerState;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const myIndex = leaderboard.findIndex(e => e.isPlayer);
  const myRank = myIndex !== -1 ? `#${myIndex + 1}` : '-';
  
  useEffect(() => {
      const checkMobile = () => {
          const mobile = window.innerWidth < 900;
          setIsMobile(mobile);
          if (mobile) setIsCollapsed(true);
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return isCollapsed ? (
      <div className="absolute top-4 right-4 z-30 interactive-ui">
        <button 
          onClick={() => setIsCollapsed(false)}
          className="group flex items-center gap-3 bg-slate-900/90 border border-slate-700 hover:border-cyan-500/50 rounded-xl p-2 pl-4 pr-3 shadow-xl backdrop-blur-md transition-all active:scale-95 w-full"
        >
            <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Rank</span>
                <span className="text-sm font-black text-cyan-400 leading-none">{myRank}</span>
            </div>
            <div className="w-px h-6 bg-slate-700 group-hover:bg-slate-600 transition-colors"></div>
            <div className="flex flex-col items-start min-w-[50px]">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Score</span>
                <span className="text-sm font-mono font-bold text-white leading-none">{formatScore(playerState.score)}</span>
            </div>
            <div className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 text-[10px] group-hover:bg-cyan-900 group-hover:text-cyan-400 transition-colors ml-auto">
                ▼
            </div>
        </button>
      </div>
    ) : (
      <div className="absolute top-4 right-4 z-30 interactive-ui">
        <div className="flex flex-col w-64 bg-slate-950/90 backdrop-blur-xl rounded-xl border border-slate-800 shadow-2xl overflow-hidden animate-fade-in transition-all">
          <div 
              className="flex justify-between items-center px-4 py-3 bg-slate-900 border-b border-slate-800 cursor-pointer hover:bg-slate-800/80 transition-colors group"
              onClick={() => setIsCollapsed(true)}
          >
              <div className="flex items-center gap-2">
                  <span className="text-lg">🏆</span>
                  <h3 className="text-xs font-black text-slate-200 uppercase tracking-[0.2em]">Leaderboard</h3>
              </div>
              <button className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 text-slate-500 text-[10px] group-hover:text-white transition-colors">
                  ✕
              </button>
          </div>
          <LeaderboardList leaderboard={leaderboard} />
        </div>
      </div>
    );
  }

  const header = (
      <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
              <span className="text-lg">🏆</span>
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-[0.2em]">Leaderboard</h3>
          </div>
          <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 text-slate-500 text-[10px] hover:text-white transition-colors"
          >
              {isCollapsed ? '▼' : '✕'}
          </button>
      </div>
  );

  return (
      <DraggableWindow 
          id="scoreboard"
          initialPos={{ x: 20, y: 20, anchor: 'top-right' }} 
          headerContent={header}
          className="w-64"
      >
        {!isCollapsed && <LeaderboardList leaderboard={leaderboard} />}
      </DraggableWindow>
  );
};

const LeaderboardList: React.FC<{leaderboard: LeaderboardEntry[]}> = ({ leaderboard }) => (
    <div className="bg-slate-950/90 backdrop-blur-xl rounded-b-xl border border-t-0 border-slate-700/50 shadow-2xl overflow-hidden transition-all">
      <div className="flex flex-col max-h-[50vh] overflow-y-auto custom-scrollbar p-1.5 gap-0.5">
          {leaderboard.length === 0 && (
              <div className="py-6 text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  Scanning...
              </div>
          )}

          {leaderboard.map((entry, index) => {
              const isPlayer = entry.isPlayer;
              const rank = index + 1;
              
              let rowClass = "border-transparent text-slate-400 hover:bg-slate-800/50";
              let rankContent = <span className="text-slate-600 font-mono text-[10px]">#{rank}</span>;
              let scoreColor = "text-slate-500";
              let nameColor = "text-slate-300";

              if (rank === 1) {
                  rowClass = "bg-yellow-500/10 border-yellow-500/20";
                  rankContent = <span className="text-sm">🥇</span>;
                  scoreColor = "text-yellow-500";
                  nameColor = "text-yellow-100";
              } else if (rank === 2) {
                  rowClass = "bg-slate-400/10 border-slate-400/20";
                  rankContent = <span className="text-sm">🥈</span>;
                  scoreColor = "text-slate-300";
                  nameColor = "text-slate-200";
              } else if (rank === 3) {
                  rowClass = "bg-orange-700/10 border-orange-700/20";
                  rankContent = <span className="text-sm">🥉</span>;
                  scoreColor = "text-orange-400";
                  nameColor = "text-orange-200";
              }

              if (isPlayer) {
                  rowClass = "bg-cyan-500/20 border-cyan-500/50 shadow-[inset_0_0_15px_rgba(6,182,212,0.1)]";
                  scoreColor = "text-cyan-300";
                  nameColor = "text-white";
                  if(rank > 3) rankContent = <span className="text-cyan-400 font-bold text-xs">#{rank}</span>;
              }

              return (
                  <div 
                      key={entry.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${rowClass}`}
                  >
                      <div className="w-5 flex justify-center shrink-0">
                          {rankContent}
                      </div>
                      <div className="flex-1 flex flex-col min-w-0">
                          <span className={`text-xs font-bold truncate leading-tight ${nameColor}`}>
                              {entry.name}
                          </span>
                          <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wide truncate">
                              {entry.tankClass}
                          </span>
                      </div>
                      <div className={`font-mono font-bold text-xs text-right ${scoreColor}`}>
                          {formatScore(entry.score)}
                      </div>
                  </div>
              );
          })}
      </div>
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-[9px] font-black text-slate-600 uppercase tracking-wider">
          <span>{leaderboard.length} Online</span>
          <span>Top 10</span>
      </div>
    </div>
);
