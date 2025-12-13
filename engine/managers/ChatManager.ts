
import { Entity } from '../../types';

export interface ChatMessage {
    id: string;
    sender: string;
    content: string;
    isSystem?: boolean;
    timestamp: number;
}

export class ChatManager {
    messages: ChatMessage[] = [];
    
    constructor(
        private onUpdate: () => void,
        private onSendNetwork?: (msg: string) => void // Callback for networking
    ) {
        this.addMessage("System", "Welcome! Press Enter to chat.", true);
    }

    // Called when the local player types a message
    sendPlayerMessage(sender: string, content: string) {
        // Add locally immediately for responsiveness
        this.addMessage(sender, content);
        
        // Send to network
        if (this.onSendNetwork) {
            this.onSendNetwork(content);
        }
    }

    addMessage(sender: string, content: string, isSystem = false) {
        // Prevent duplicate IDs if network echoes back own message
        const id = Math.random().toString(36);
        this.messages.push({
            id,
            sender,
            content,
            isSystem,
            timestamp: Date.now()
        });
        if (this.messages.length > 20) this.messages.shift();
        this.onUpdate();
    }

    update(dt: number, entities: Entity[]) {
        // Mock chatter only if offline
        if (!this.onSendNetwork && Math.random() < 0.005) { 
            // ... (Existing bot chatter logic) ...
        }
    }

    handleDeath(victim: Entity, killer: Entity) {
        // ... (Existing logic) ...
    }
}
