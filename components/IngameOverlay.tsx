
import React, { useState, useEffect, useRef } from 'react';
import { ChatManager, ChatMessage } from '../engine/managers/ChatManager';

interface IngameOverlayProps {
    chatManager: ChatManager;
}

export const IngameOverlay: React.FC<IngameOverlayProps> = ({ chatManager }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isChatOpen, setIsChatOpen] = useState(false);
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

    // Focus input on Enter
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                if (isChatOpen) {
                    if (input.trim()) {
                        // Use the new method that triggers networking
                        chatManager.sendPlayerMessage("Player", input.trim());
                        setInput("");
                    }
                    setIsChatOpen(false);
                } else {
                    setIsChatOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 50);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isChatOpen, input, chatManager]);

    return (
        <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-between p-4">
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
