
import React from 'react';
import { EVOLUTION_TREE, TANK_CLASSES } from '../data/tanks';
import { PlayerState, EvoRequirement } from '../types';
import { TankPreview } from './TankPreview';
import { COLORS } from '../constants';

interface EvolutionMenuProps {
  playerState: PlayerState;
  onEvolve: (className: string) => void;
}

export const EvolutionMenu: React.FC<EvolutionMenuProps> = ({ playerState, onEvolve }) => {
  const currentClass = playerState.classPath;
  const options = EVOLUTION_TREE[currentClass];

  const getProgress = (req: EvoRequirement): { current: number; max: number; met: boolean } => {
    let current = 0;
    switch (req.type) {
        case 'level': current = playerState.level; break;
        case 'score': current = playerState.score; break;
        default: current = 0;
    }
    return { current, max: req.value, met: current >= req.value };
  };

  const unlockedOptions = options?.filter(node => node.requirements.every(req => getProgress(req).met)) || [];
  
  return (
    <div className="flex flex-col gap-1 p-2">
        {unlockedOptions.map((node) => {
            const config = TANK_CLASSES[node.target];
            const roleColor = COLORS[`role${config.role.charAt(0) + config.role.slice(1).toLowerCase()}` as keyof typeof COLORS];

            return (
                <button
                    key={node.target}
                    onClick={() => onEvolve(node.target)}
                    className="group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-slate-800"
                >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-900 border border-white/10">
                        <TankPreview config={config} size={32} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-white truncate">{config.name}</p>
                        <p className="text-xs font-black uppercase" style={{ color: roleColor }}>
                            {config.role}
                        </p>
                    </div>
                    <div className="ml-auto text-xl font-bold text-green-400 transition-transform group-hover:text-white group-hover:translate-x-1">
                        →
                    </div>
                </button>
            );
        })}
    </div>
  );
};
