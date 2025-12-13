
import { Entity, LeaderboardEntry, PlayerState, EntityType } from '../../types';
import { TANK_CLASSES } from '../../data/tanks';

export class LeaderboardManager {
    lastUpdate: number = 0;

    shouldUpdate(): boolean {
        const now = Date.now();
        if (now - this.lastUpdate > 500) {
            this.lastUpdate = now;
            return true;
        }
        return false;
    }

    update(entities: Entity[], player: Entity, playerState: PlayerState) {
        const candidates: LeaderboardEntry[] = [];

        // 1. Add all player entities (remote players)
        entities.forEach(e => {
            if (e.type === EntityType.PLAYER && e.id !== 'player' && !e.isDead) {
                candidates.push({
                    id: e.id,
                    name: e.name || 'Player',
                    score: e.scoreValue || 0,
                    tankClass: TANK_CLASSES[e.classPath || 'basic'].name,
                    teamId: e.teamId,
                    isPlayer: false
                });
            }
        });

        // 2. Add the local player
        if (!player.isDead) {
            candidates.push({
                id: 'player',
                name: player.name || 'Player',
                score: playerState.score,
                tankClass: TANK_CLASSES[playerState.classPath].name,
                teamId: player.teamId,
                isPlayer: true
            });
        }

        // 3. Add bots
        entities.forEach(e => {
            if (e.type === EntityType.ENEMY && e.teamId !== 'ARENA_CLOSER' && e.scoreValue && !e.isDead) {
                candidates.push({
                    id: e.id,
                    name: e.name || 'An unnamed tank',
                    score: e.scoreValue,
                    tankClass: e.classPath ? TANK_CLASSES[e.classPath].name : 'Tank',
                    teamId: e.teamId,
                    isPlayer: false
                });
            }
        });

        candidates.sort((a, b) => b.score - a.score);
        playerState.leaderboard = candidates.slice(0, 10);

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
