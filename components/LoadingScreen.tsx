
import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
    serverName: string;
    onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ serverName, onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        const steps = [
            "Initializing Neural Link...",
            `Authenticating with Global Relay...`,
            `Syncing World State: ${serverName}`,
            "Loading Assets...",
            "Deploying Unit..."
        ];

        let currentStep = 0;
        
        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                setLogs(prev => [...prev, steps[currentStep]]);
                currentStep++;
            }
            
            setProgress(prev => {
                const next = prev + 20;
                return next > 100 ? 100 : next;
            });

        }, 150);

        const timeout = setTimeout(() => {
            setProgress(100);
            onComplete();
        }, 1200); 

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [onComplete, serverName]);

    return (
        <div className="absolute inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center font-outfit text-cyan-500 overflow-hidden">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] animate-gridMove"></div>
            
            <div className="relative z-10 w-full max-w-md p-8 glass-card space-y-6 flex flex-col items-center">
                <div className="relative w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full animate-pulse-cyan"></div>
                    <div className="absolute inset-0 border-t-4 border-cyan-400 rounded-full animate-spin"></div>
                    <div className="font-bold text-lg text-white drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                        {progress}%
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black text-white tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-300 to-white">INITIALIZING</h2>
                    <div className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></span>
                        <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest">{serverName}</p>
                    </div>
                </div>

                <div className="w-full h-24 overflow-hidden border border-white/10 bg-black/40 rounded-xl p-4 text-[10px] font-mono leading-relaxed text-cyan-300/70 shadow-inner">
                    <div className="space-y-1">
                        {logs.map((log, i) => (
                            <div key={i} className="animate-fade-in-down flex gap-2">
                                <span className="text-cyan-500 opacity-50">[OK]</span>
                                <span>{log}</span>
                            </div>
                        ))}
                    </div>
                    {progress < 100 && <div className="animate-pulse text-cyan-400 mt-1">_ SYNCHRONIZING_DATA...</div>}
                </div>

                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px]">
                    <div 
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-300 ease-out"
                        style={{ 
                            width: `${progress}%`,
                            boxShadow: '0 0 15px rgba(34, 211, 238, 0.5)'
                        }}
                    ></div>
                </div>
            </div>
        </div>
    );
};
