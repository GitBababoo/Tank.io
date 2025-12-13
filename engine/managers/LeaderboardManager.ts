
import { Entity, LeaderboardEntry, PlayerState, EntityType } from '../../types';
import { TANK_CLASSES } from '../../data/tanks';

export class LeaderboardManager {
    lastUpdate: number = 0;
    currentLeaderboard: LeaderboardEntry[] = []; // Cache locally

    shouldUpdate(): boolean {
        const now = Date.now();
        // Update every 0.5 seconds is enough
        if (now - this.lastUpdate > 500) {
            this.lastUpdate = now;
            return true;
        }
        return false;
    }

    // NEW: Getter for the GameEngine to send via Network
    getLatest() {
        return this.currentLeaderboard;
    }

    update(entities: Entity[], player: Entity, playerState: PlayerState) {
        const candidates: LeaderboardEntry[] = [];

        // 1. Remote Players (Identified by PLAYER type but not 'player' ID)
        entities.forEach(e => {
            if (e.type === EntityType.PLAYER && e.id !== 'player' && !e.isDead) {
                candidates.push({
                    id: e.id,
                    name: e.name || 'Unknown',
                    score: e.scoreValue || 0,
                    tankClass: TANK_CLASSES[e.classPath || 'basic']?.name || 'Tank',
                    teamId: e.teamId,
                    isPlayer: false
                });
            }
        });

        // 2. Local Player (Host/Client Self)
        if (!player.isDead) {
            candidates.push({
                id: 'player',
                name: player.name || 'Me',
                score: playerState.score,
                tankClass: TANK_CLASSES[playerState.classPath]?.name || 'Tank',
                teamId: player.teamId,
                isPlayer: true
            });
        }

        // 3. High Value AI/Bosses (Optional, makes world feel alive)
        entities.forEach(e => {
            if (e.type === EntityType.ENEMY && e.teamId !== 'ARENA_CLOSER' && e.scoreValue && e.scoreValue > 1000 && !e.isDead) {
                candidates.push({
                    id: e.id,
                    name: e.name || 'Elite Tank',
                    score: e.scoreValue,
                    tankClass: e.classPath ? (TANK_CLASSES[e.classPath]?.name || 'Tank') : 'Tank',
                    teamId: e.teamId,
                    isPlayer: false
                });
            }
        });

        // Sort Highest Score First
        candidates.sort((a, b) => b.score - a.score);
        
        // Keep top 10
        this.currentLeaderboard = candidates.slice(0, 10);
        playerState.leaderboard = this.currentLeaderboard;

        // Update Leader Arrow Position
        if (candidates.length > 0) {
            const leader = candidates[0];
            if (leader.isPlayer) {
                playerState.leaderPos = undefined;
            } else {
                const leaderEntity = entities.find(e => e.id === leader.id);
                if (leaderEntity) {
                    playerState.leaderPos = leaderEntity.pos;
                }
            }
        }
    }
}
