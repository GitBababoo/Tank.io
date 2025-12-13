
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
            "Handshake...",
            "TLS 1.3...",
            `Host: ${serverName}`,
            "Syncing..."
        ];

        let currentStep = 0;
        
        // Much faster update interval (PRO Feel)
        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                setLogs(prev => [...prev, steps[currentStep]]);
                currentStep++;
            }
            
            setProgress(prev => {
                const next = prev + 25; // 4 ticks to 100%
                return next > 100 ? 100 : next;
            });

        }, 100);

        const timeout = setTimeout(() => {
            setProgress(100);
            onComplete();
        }, 600); // 0.6s total load time

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
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-4 border-cyan-900 rounded-full"></div>
                        <div className="absolute inset-0 border-t-4 border-cyan-400 rounded-full animate-spin"></div>
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-xl font-black text-white tracking-widest uppercase">JOINING</h2>
                </div>

                <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-cyan-500 transition-all duration-75 ease-linear"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};
