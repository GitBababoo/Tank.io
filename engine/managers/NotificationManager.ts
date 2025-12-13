
import { GameNotification } from '../../types';

export class NotificationManager {
    notifications: GameNotification[] = [];

    push(message: string, type: 'info' | 'warning' | 'success' | 'boss' = 'info') {
        this.notifications.push({ 
            id: Math.random().toString(36).slice(2), 
            message, 
            type, 
            timestamp: Date.now() 
        });
    }

    update() {
        const now = Date.now();
        if (this.notifications.some(n => now - n.timestamp > 5000)) {
            this.notifications = this.notifications.filter(n => now - n.timestamp <= 5000);
            return true; // Indicates change
        }
        return false;
    }
}
