
import React, { useState, useEffect, useRef } from 'react';
import { ChatManager, ChatMessage } from '../engine/managers/ChatManager';
import { X, LogOut } from 'lucide-react';

interface IngameOverlayProps {
    chatManager: ChatManager;
    onExit: () => void;
}

export const IngameOverlay: React.FC<IngameOverlayProps> = ({ chatManager, onExit }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [showExitMenu, setShowExitMenu] = useState(false);
    const [input, setInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync state with manager
    useEffect(() => {
        setMessages([...chatManager.messages]);
        const interval = setInterval(() => {
            setMessages([...chatManager.messages]);
        }, 200);
        return () => clearInterval(interval);
    }, [chatManager]);

    // Keyboard Handlers
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                if (isChatOpen) {
                    if (input.trim()) {
                        chatManager.sendPlayerMessage("Player", input.trim());
                        setInput("");
                    }
                    setIsChatOpen(false);
                } else {
                    setIsChatOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 50);
                }
            }
            if (e.key === 'Escape') {
                if (isChatOpen) {
                    setIsChatOpen(false);
                } else {
                    setShowExitMenu(prev => !prev);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isChatOpen, input, chatManager]);

    return (
        <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-between p-4">
            {/* Top Bar - Exit Button */}
            <div className="flex justify-start pointer-events-auto">
                <button 
                    onClick={() => setShowExitMenu(true)} 
                    className="p-2 bg-black/40 hover:bg-red-900/40 rounded border border-white/10 text-white transition-colors flex items-center gap-2 group"
                    title="Exit to Lobby (Esc)"
                >
                    <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Exit Confirmation Dialog */}
            {showExitMenu && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto flex items-center justify-center animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 p-8 rounded-xl shadow-2xl flex flex-col items-center gap-6 max-w-sm text-center">
                        <div className="bg-red-500/20 p-4 rounded-full text-red-400">
                            <X size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">Leave Game?</h2>
                            <p className="text-slate-400 text-sm">Your current score and progress will be lost. Are you sure you want to exit to the lobby?</p>
                        </div>
                        <div className="flex gap-4 w-full">
                            <button 
                                onClick={() => setShowExitMenu(false)}
                                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold transition-colors"
                            >
                                CANCEL
                            </button>
                            <button 
                                onClick={onExit}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-colors"
                            >
                                EXIT
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Bar - Chat */}
            <div className="absolute bottom-24 left-4 w-80 flex flex-col justify-end pointer-events-auto">
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar-hidden mb-2">
                    {messages.map(msg => (
                        <div key={msg.id} className={`text-xs px-2 py-0.5 rounded ${msg.isSystem ? 'text-yellow-400 italic' : 'text-white'} drop-shadow-md bg-black/20 w-fit animate-fade-in`}>
                            {!msg.isSystem && <span className="font-bold text-cyan-300 mr-1">{msg.sender}:</span>}
                            <span>{msg.content}</span>
                        </div>
                    ))}
                </div>
                
                <div className={`transition-all duration-200 ${isChatOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Press Enter to chat..."
                        className="w-full bg-slate-900/80 border border-slate-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 shadow-xl backdrop-blur-md"
                    />
                </div>
            </div>
        </div>
    );
};
