
import React, { useState, useEffect, useRef } from 'react';

interface ConsoleOverlayProps {
  onExecute: (cmd: string) => string;
  onClose: () => void;
  isOpen: boolean;
}

export const ConsoleOverlay: React.FC<ConsoleOverlayProps> = ({ onExecute, onClose, isOpen }) => {
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<string[]>(['Welcome to Tank.io Console. Type "help" for commands.']);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        if (!input.trim()) return;
        
        if (input.trim() === 'clear') {
            setLogs([]);
            setInput('');
            return;
        }

        const result = onExecute(input);
        setLogs(prev => [...prev, `> ${input}`, result]);
        setHistory(prev => [input, ...prev]);
        setHistoryIndex(-1);
        setInput('');
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (history.length > 0) {
            const nextIndex = Math.min(historyIndex + 1, history.length - 1);
            setHistoryIndex(nextIndex);
            setInput(history[nextIndex]);
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex > 0) {
            const nextIndex = historyIndex - 1;
            setHistoryIndex(nextIndex);
            setInput(history[nextIndex]);
        } else if (historyIndex === 0) {
            setHistoryIndex(-1);
            setInput('');
        }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 left-0 w-full h-[300px] bg-black/80 backdrop-blur-md text-green-500 font-mono text-sm z-[100] flex flex-col border-b-2 border-green-700 shadow-2xl">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
            {logs.map((log, i) => (
                <div key={i} className="break-words">{log}</div>
            ))}
        </div>
        <div className="flex items-center bg-black/50 p-2 border-t border-green-800">
            <span className="mr-2 text-green-300 font-bold">{'>'}</span>
            <input 
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none outline-none text-green-400 placeholder-green-800"
                placeholder="Type command..."
            />
        </div>
        <div className="absolute top-2 right-4 text-xs text-green-700">
            Press HOME to close
        </div>
    </div>
  );
};
