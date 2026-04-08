
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GripHorizontal } from 'lucide-react';

interface DraggableWindowProps {
    id: string; // Unique ID for saving position
    children: React.ReactNode;
    initialPos: { x: number; y: number; anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' };
    className?: string;
    headerContent?: React.ReactNode; 
    isMobile?: boolean; 
}

export const DraggableWindow: React.FC<DraggableWindowProps> = ({ id, children, initialPos, className = '', headerContent, isMobile }) => {
    if (isMobile) {
        return <div className={className}>{children}</div>;
    }

    const [pos, setPos] = useState({ x: initialPos.x, y: initialPos.y });
    const [isDragging, setIsDragging] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    
    const [isBottomHalf, setIsBottomHalf] = useState(false);

    const dragStart = useRef({ x: 0, y: 0 });
    const windowRef = useRef<HTMLDivElement>(null);
    const hasInitialized = useRef(false);

    const posRef = useRef(pos);
    posRef.current = pos;
    const isBottomHalfRef = useRef(isBottomHalf);
    isBottomHalfRef.current = isBottomHalf;

    const saveState = useCallback(() => {
        if (!hasInitialized.current) return;
        localStorage.setItem(`window_pos_${id}`, JSON.stringify({ 
            x: posRef.current.x, 
            y: posRef.current.y, 
            isBottomHalf: isBottomHalfRef.current 
        }));
    }, [id]);

    const enforceBounds = useCallback(() => {
        if (!windowRef.current) return;
        const rect = windowRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        setPos(currentPos => {
            let newX = currentPos.x;
            let newY = currentPos.y;

            const maxX = Math.max(0, screenW - width);
            newX = Math.max(0, Math.min(newX, maxX));
            
            if (isBottomHalfRef.current) {
                newY = Math.max(height, Math.min(newY, screenH));
            } else {
                const maxY = Math.max(0, screenH - height);
                newY = Math.max(0, Math.min(newY, maxY));
            }

            if (Math.abs(newX - currentPos.x) < 1 && Math.abs(newY - currentPos.y) < 1) {
                return currentPos;
            }
            return { x: newX, y: newY };
        });
    }, []);

    useEffect(() => {
        if (hasInitialized.current) return;
        
        const savedStateRaw = localStorage.getItem(`window_pos_${id}`);
        let loadedState = null;
        if (savedStateRaw) {
            try {
                loadedState = JSON.parse(savedStateRaw);
            } catch (e) {
                console.warn("Failed to parse saved window position.");
            }
        }

        if (loadedState) {
            setPos({ x: loadedState.x, y: loadedState.y });
            setIsBottomHalf(loadedState.isBottomHalf || false);
        } else {
            let startX = initialPos.x;
            let startY = initialPos.y;
            const w = window.innerWidth;
            const h = window.innerHeight;
            const estWidth = 250;
            const estHeight = 300;
            if (initialPos.anchor?.includes('right')) startX = w - initialPos.x - estWidth;
            if (initialPos.anchor?.includes('bottom')) startY = h - initialPos.y - estHeight;
            setPos({ x: startX, y: startY });
            setIsBottomHalf(startY > h / 2);
        }
        
        hasInitialized.current = true;
    }, [id, initialPos]);

    useEffect(() => {
        const el = windowRef.current;
        if (!el) return;
        const observer = new ResizeObserver(() => requestAnimationFrame(enforceBounds));
        observer.observe(el);
        window.addEventListener('resize', enforceBounds);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', enforceBounds);
        };
    }, [enforceBounds]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, a, select')) {
            return;
        }
        setIsDragging(true);
        dragStart.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !windowRef.current) return;
            
            const newY = e.clientY - dragStart.current.y;
            const screenH = window.innerHeight;

            const threshold = screenH / 2;
            if (!isBottomHalf && newY > threshold) {
                setIsBottomHalf(true);
            } else if (isBottomHalf && newY < threshold) {
                setIsBottomHalf(false);
            }
            
            setPos({
                x: e.clientX - dragStart.current.x,
                y: newY
            });
        };

        const handleMouseUp = () => {
            if (!isDragging) return;
            setIsDragging(false);
            setTimeout(() => {
                enforceBounds();
                saveState();
            }, 0);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('mouseleave', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mouseleave', handleMouseUp);
        };
    }, [isDragging, isBottomHalf, enforceBounds, saveState]);

    return (
        <div 
            ref={windowRef}
            className={`absolute pointer-events-auto transition-opacity duration-300 flex ${className} ${isBottomHalf ? 'flex-col-reverse' : 'flex-col'}`}
            style={{ 
                left: pos.x, 
                top: pos.y,
                transform: isBottomHalf ? 'translateY(-100%)' : 'none',
                opacity: isDragging || isHovered ? 1.0 : 0.7, 
                zIndex: isDragging ? 100 : 30,
                maxWidth: '100vw'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div 
                onMouseDown={handleMouseDown}
                className={`
                    w-full bg-slate-900/90 hover:bg-slate-800/90 cursor-grab active:cursor-grabbing 
                    flex items-center justify-between p-2 border-x border-slate-700/50 transition-colors group z-20 shrink-0 backdrop-blur-md
                    ${isBottomHalf ? 'rounded-b-lg border-b' : 'rounded-t-lg border-t'}
                    ${isDragging ? 'shadow-2xl shadow-cyan-500/20 border-cyan-500/50' : ''}
                `}
            >
                <div className="flex-1 min-w-0">{headerContent}</div>
                <GripHorizontal size={16} className="text-slate-500 group-hover:text-cyan-400 ml-2 shrink-0" />
            </div>
            
            <div className={`relative ${isBottomHalf ? 'origin-bottom' : 'origin-top'}`}>
                {children}
            </div>
        </div>
    );
};
