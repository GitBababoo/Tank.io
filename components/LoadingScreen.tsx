
import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
    serverName: string;
    onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ serverName, onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        // Detect current host to show user where they are connecting
        const host = window.location.hostname;
        const port = "8080";
        const wsUrl = `ws://${host}:${port}`;

        const steps = [
            "Initializing Neural Link...",
            `Resolving Host: ${host}`,
            `Handshake: ${wsUrl}`,
            "Loading Assets...",
            "Syncing World State..."
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
        <div className="absolute inset-0 bg-black z-[100] flex flex-col items-center justify-center font-mono text-cyan-500 overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
            
            <div className="relative z-10 w-full max-w-md p-8 space-y-6">
                <div className="flex justify-center">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-cyan-900/50 rounded-full"></div>
                        <div className="absolute inset-0 border-t-4 border-cyan-400 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-cyan-300">
                            {progress}%
                        </div>
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black text-white tracking-[0.3em] uppercase glitch-text">CONNECTING</h2>
                    <p className="text-xs text-cyan-700 font-bold">{serverName}</p>
                </div>

                <div className="h-32 overflow-hidden border border-cyan-900/50 bg-black/50 rounded p-2 text-[10px] font-mono leading-relaxed text-cyan-600 shadow-inner">
                    {logs.map((log, i) => (
                        <div key={i} className="animate-fade-in-down">> {log}</div>
                    ))}
                    <div className="animate-pulse">_</div>
                </div>

                <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4] transition-all duration-75 ease-linear"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
            
            <style>{`
                .glitch-text { text-shadow: 2px 0 #ff0000, -2px 0 #00ffff; }
            `}</style>
        </div>
    );
};