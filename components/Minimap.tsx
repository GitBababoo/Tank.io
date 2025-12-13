
import React from 'react';

interface MinimapProps {
    size?: number;
}

export const Minimap = React.forwardRef<HTMLCanvasElement, MinimapProps>(({ size = 150 }, ref) => {
  return (
    <div className="absolute bottom-6 right-6 z-[60] pointer-events-none select-none animate-fade-in">
        <div className="bg-slate-900/90 border-2 border-slate-600 rounded-lg p-1 shadow-2xl backdrop-blur-md">
            <canvas 
                ref={ref} 
                width={size} 
                height={size}
                className="block rounded bg-black/80"
                style={{ width: `${size}px`, height: `${size}px` }} 
            />
            <div className="text-[9px] text-center text-slate-500 font-bold mt-1 uppercase tracking-wider flex justify-between px-2">
                <span>RADAR</span>
                <span className="text-cyan-600">AUTO</span>
            </div>
        </div>
    </div>
  );
});
