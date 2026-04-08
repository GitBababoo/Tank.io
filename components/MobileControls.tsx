
import React, { useRef, useEffect, useState } from 'react';
import { InputManager } from '../engine/managers/InputManager';

interface MobileControlsProps {
    inputManager: InputManager | null;
    onAbility: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ inputManager, onAbility }) => {
    const moveStickRef = useRef<{ id: number, startX: number, startY: number, currX: number, currY: number } | null>(null);
    const aimStickRef = useRef<{ id: number, startX: number, startY: number, currX: number, currY: number } | null>(null);
    
    const [moveVis, setMoveVis] = useState({ x: 0, y: 0, originX: 0, originY: 0, active: false });
    const [aimVis, setAimVis] = useState({ x: 0, y: 0, originX: 0, originY: 0, active: false });
    const [isAutoFire, setIsAutoFire] = useState(false);

    const MAX_RADIUS = 60; 

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            const target = e.target as HTMLElement;
            
            // --- SMART TOUCH FILTERING ---
            // If the touch target is a button, input, or explicitly marked as interactive UI,
            // we IGNORE it for the joystick. This allows clicks to pass through to React.
            const isInteractive = 
                target.tagName === 'BUTTON' || 
                target.tagName === 'INPUT' || 
                target.tagName === 'SELECT' ||
                target.tagName === 'A' ||
                target.closest('.interactive-ui') !== null ||
                target.closest('button') !== null;

            if (isInteractive) {
                // Let the browser handle this click natively (Upgrade buttons, Class selection, etc.)
                return;
            }

            e.preventDefault(); 
            
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                const halfWidth = window.innerWidth / 2;

                if (t.clientX < halfWidth) {
                    if (!moveStickRef.current) {
                        moveStickRef.current = { id: t.identifier, startX: t.clientX, startY: t.clientY, currX: t.clientX, currY: t.clientY };
                        setMoveVis({ x: 0, y: 0, originX: t.clientX, originY: t.clientY, active: true });
                        updateInput('move');
                    }
                } else {
                    if (!aimStickRef.current) {
                        aimStickRef.current = { id: t.identifier, startX: t.clientX, startY: t.clientY, currX: t.clientX, currY: t.clientY };
                        setAimVis({ x: 0, y: 0, originX: t.clientX, originY: t.clientY, active: true });
                        updateInput('aim');
                    }
                }
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            // Only prevent default if we are actually tracking a stick, otherwise scrolling might be blocked unnecessarily
            // but for a full screen game, generally preventing default is safer to stop bounce.
            e.preventDefault();

            let moveChanged = false;
            let aimChanged = false;

            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];

                if (moveStickRef.current && t.identifier === moveStickRef.current.id) {
                    moveStickRef.current.currX = t.clientX;
                    moveStickRef.current.currY = t.clientY;
                    moveChanged = true;
                }
                if (aimStickRef.current && t.identifier === aimStickRef.current.id) {
                    aimStickRef.current.currX = t.clientX;
                    aimStickRef.current.currY = t.clientY;
                    aimChanged = true;
                }
            }

            if (moveChanged) updateInput('move');
            if (aimChanged) updateInput('aim');
        };

        const handleTouchEnd = (e: TouchEvent) => {
            // Don't prevent default on end, might mess up click firing for the elements we skipped in start
            
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                
                if (moveStickRef.current && t.identifier === moveStickRef.current.id) {
                    moveStickRef.current = null;
                    setMoveVis(prev => ({ ...prev, active: false }));
                    updateInput('move');
                }
                if (aimStickRef.current && t.identifier === aimStickRef.current.id) {
                    aimStickRef.current = null;
                    setAimVis(prev => ({ ...prev, active: false }));
                    updateInput('aim');
                }
            }
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: false });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd, { passive: false });
        window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [inputManager, isAutoFire]); 

    useEffect(() => {
        if(inputManager) {
            updateInput('aim'); 
        }
    }, [isAutoFire]);

    const updateInput = (type: 'move' | 'aim') => {
        if (!inputManager) return;

        let mx = 0, my = 0, ax = 0, ay = 0;
        let firing = isAutoFire; 

        if (moveStickRef.current) {
            const dx = moveStickRef.current.currX - moveStickRef.current.startX;
            const dy = moveStickRef.current.currY - moveStickRef.current.startY;
            const dist = Math.hypot(dx, dy);
            const clampedDist = Math.min(dist, MAX_RADIUS);
            
            const normX = dist > 0 ? (dx / dist) * clampedDist : 0;
            const normY = dist > 0 ? (dy / dist) * clampedDist : 0;

            setMoveVis(prev => ({ ...prev, x: normX, y: normY }));

            // Normalize output to -1 to 1
            mx = dist > 0 ? (dx / dist) * (clampedDist / MAX_RADIUS) : 0;
            my = dist > 0 ? (dy / dist) * (clampedDist / MAX_RADIUS) : 0;
        }

        if (aimStickRef.current) {
            const dx = aimStickRef.current.currX - aimStickRef.current.startX;
            const dy = aimStickRef.current.currY - aimStickRef.current.startY;
            const dist = Math.hypot(dx, dy);
            
            if (dist > 10) { // Deadzone
                firing = true; 
                const clampedDist = Math.min(dist, MAX_RADIUS);
                const normX = (dx / dist) * clampedDist;
                const normY = (dy / dist) * clampedDist;

                setAimVis(prev => ({ ...prev, x: normX, y: normY }));

                // Normalized direction vector
                ax = (dx / dist);
                ay = (dy / dist);
            } else {
                setAimVis(prev => ({ ...prev, x: 0, y: 0 }));
            }
        }
        
        // Combine with ref values if one stick didn't update but exists
        // (Not strictly necessary as we send the full state to inputManager every update)
        // Note: We need to maintain the state of the *other* stick if we only calculated one
        
        // However, React state update is async, so we use the calculated values immediately for the InputManager
        // But we need the *other* stick's value too. 
        // Simplest: Recalculate both from refs every time one changes to ensure sync.
        
        // Re-calculate Move from Ref
        if (type === 'aim' && moveStickRef.current) {
             const dx = moveStickRef.current.currX - moveStickRef.current.startX;
             const dy = moveStickRef.current.currY - moveStickRef.current.startY;
             const dist = Math.hypot(dx, dy);
             const clampedDist = Math.min(dist, MAX_RADIUS);
             mx = dist > 0 ? (dx / dist) * (clampedDist / MAX_RADIUS) : 0;
             my = dist > 0 ? (dy / dist) * (clampedDist / MAX_RADIUS) : 0;
        }
        
        // Re-calculate Aim from Ref
        if (type === 'move' && aimStickRef.current) {
             const dx = aimStickRef.current.currX - aimStickRef.current.startX;
             const dy = aimStickRef.current.currY - aimStickRef.current.startY;
             const dist = Math.hypot(dx, dy);
             if (dist > 10) {
                 firing = true;
                 ax = (dx / dist);
                 ay = (dy / dist);
             }
        }

        inputManager.setVirtualJoystick({ x: mx, y: my }, { x: ax, y: ay }, firing);
    };

    return (
        <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
            
            {/* Visual Zones Hint (Subtle) */}
            {/* <div className="absolute inset-y-0 left-0 w-1/2 border-r border-white/5 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-red-500/5 to-transparent pointer-events-none" /> */}

            {/* Move Stick Visual */}
            {moveVis.active && (
                <div 
                    className="absolute w-28 h-28 rounded-full bg-slate-900/30 border-2 border-cyan-500/50 transform -translate-x-1/2 -translate-y-1/2 backdrop-blur-[2px] transition-opacity duration-200"
                    style={{ left: moveVis.originX, top: moveVis.originY }}
                >
                    <div 
                        className="absolute w-12 h-12 rounded-full bg-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,0.6)] transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: '50%', top: '50%', transform: `translate(calc(-50% + ${moveVis.x}px), calc(-50% + ${moveVis.y}px))` }}
                    />
                </div>
            )}

            {/* Aim Stick Visual */}
            {aimVis.active && (
                <div 
                    className="absolute w-28 h-28 rounded-full bg-slate-900/30 border-2 border-red-500/50 transform -translate-x-1/2 -translate-y-1/2 backdrop-blur-[2px] transition-opacity duration-200"
                    style={{ left: aimVis.originX, top: aimVis.originY }}
                >
                    <div 
                        className="absolute w-12 h-12 rounded-full bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.6)] transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: '50%', top: '50%', transform: `translate(calc(-50% + ${aimVis.x}px), calc(-50% + ${aimVis.y}px))` }}
                    />
                </div>
            )}

            {/* INTERACTIVE CONTROLS (Bottom Right) - Marked as interactive-ui */}
            <div className="absolute bottom-16 right-6 pointer-events-auto flex flex-col gap-6 items-center interactive-ui">
                
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsAutoFire(!isAutoFire); }}
                    className={`w-12 h-12 rounded-full border-2 shadow-lg transition-all flex items-center justify-center backdrop-blur-md active:scale-90 ${isAutoFire ? 'bg-red-500/90 border-white text-white animate-pulse' : 'bg-slate-800/80 border-slate-600 text-slate-400'}`}
                >
                    <span className="text-[10px] font-black uppercase leading-tight text-center">Auto</span>
                </button>

                <button 
                    onClick={(e) => { e.stopPropagation(); onAbility(); }}
                    className="w-16 h-16 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 border-4 border-yellow-200 shadow-[0_0_20px_rgba(234,179,8,0.6)] active:scale-95 transition-transform flex items-center justify-center"
                >
                    <span className="text-2xl filter drop-shadow-md">⚡</span>
                </button>
            </div>
        </div>
    );
};
