
import React from 'react';
import { PlayerState, StatKey } from '../types';
import { MAX_STAT_LEVEL } from '../constants';
import { 
    HeartPulse, Shield, Swords, Zap, Drill, Flame, RefreshCw, Wind, 
    Crosshair, Skull, Plus
} from 'lucide-react';

interface UpgradeMenuProps {
  playerState: PlayerState;
  onUpgrade: (key: StatKey) => void;
}

const STAT_CONFIG: Record<StatKey, { label: string, color: string, Icon: React.ElementType, hotkey: string }> = {
  regen: { label: 'Regen', color: 'bg-pink-500', Icon: HeartPulse, hotkey: '1' },
  maxHp: { label: 'Max Health', color: 'bg-pink-600', Icon: Shield, hotkey: '2' },
  bodyDmg: { label: 'Body Damage', color: 'bg-purple-600', Icon: Swords, hotkey: '3' },
  bulletSpd: { label: 'Bullet Speed', color: 'bg-blue-500', Icon: Zap, hotkey: '4' },
  bulletPen: { label: 'Bullet Pen', color: 'bg-yellow-500', Icon: Drill, hotkey: '5' },
  bulletDmg: { label: 'Bullet Damage', color: 'bg-red-500', Icon: Flame, hotkey: '6' },
  reload: { label: 'Reload', color: 'bg-green-500', Icon: RefreshCw, hotkey: '7' },
  moveSpd: { label: 'Movement', color: 'bg-cyan-500', Icon: Wind, hotkey: '8' },
  critChance: { label: 'Crit Chance', color: 'bg-orange-400', Icon: Crosshair, hotkey: '' },
  critDamage: { label: 'Crit Damage', color: 'bg-orange-600', Icon: Skull, hotkey: '' },
};

export const UpgradeMenu: React.FC<UpgradeMenuProps> = ({ playerState, onUpgrade }) => {
  const available = playerState.availablePoints > 0;

  return (
    <div className="flex flex-col gap-1.5 animate-fade-in origin-center pointer-events-auto select-none interactive-ui w-full">
      {(Object.keys(STAT_CONFIG) as StatKey[]).map((key) => {
        const { label, color, Icon, hotkey } = STAT_CONFIG[key];
        const level = playerState.stats[key];
        const isMax = level >= MAX_STAT_LEVEL;
        const canClick = available && !isMax;
        const textColorClass = color.replace('bg-', 'text-');

        return (
          <div 
            key={key}
            className={`
                relative flex items-center gap-3 p-1.5 pr-3 rounded-lg border transition-all duration-200
                ${canClick 
                    ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 hover:border-slate-500 cursor-pointer active:scale-[0.98]' 
                    : 'bg-slate-900/50 border-transparent'}
                ${isMax ? 'opacity-50 grayscale-[0.5]' : ''}
            `}
            onClick={(e) => {
                e.stopPropagation();
                if (canClick) onUpgrade(key);
            }}
          >
            <div className={`
                w-8 h-8 flex items-center justify-center rounded-md shrink-0 shadow-inner
                ${isMax ? 'bg-slate-800 text-slate-500' : 'bg-slate-900 border border-slate-700'}
            `}>
                <Icon size={16} className={isMax ? 'text-slate-600' : textColorClass} strokeWidth={2.5} />
            </div>

            <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
                <div className="flex justify-between items-center leading-none">
                    <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${canClick ? 'text-slate-200' : 'text-slate-500'}`}>
                        {label}
                    </span>
                    {isMax 
                        ? <span className="text-[9px] font-black text-yellow-600 uppercase">MAX</span>
                        : <span className="text-[9px] font-mono text-slate-600 hidden md:inline">[{hotkey}]</span>
                    }
                </div>

                <div className="flex gap-0.5 h-1.5 w-full bg-slate-950 rounded-sm overflow-hidden">
                    {[...Array(MAX_STAT_LEVEL)].map((_, i) => (
                        <div 
                            key={i} 
                            className={`
                                flex-1 rounded-[1px] transition-all duration-300
                                ${i < level ? color : 'bg-slate-800/30'}
                                ${i < level ? 'shadow-[0_0_5px_currentColor]' : ''}
                            `}
                        />
                    ))}
                </div>
            </div>

            {canClick && (
                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-700 text-slate-400 border border-slate-600 shadow-sm">
                    <Plus size={14} strokeWidth={4} />
                </div>
            )}

          </div>
        );
      })}
    </div>
  );
};
