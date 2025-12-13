
import { Entity, EntityType } from '../../types';
import { TANK_CLASSES } from '../../data/tanks';
import { InputManager } from '../managers/InputManager';

export class DroneSystem {
    static update(
        entities: Entity[], 
        player: Entity, 
        dt: number, 
        inputManager: InputManager, 
        playerClassPath: string, 
        autoSpin: boolean, 
        autoFire: boolean, 
        activeAbilityTimer: number, 
        canvasWidth: number, 
        canvasHeight: number, 
        getPlayerStat: (key: any) => number,
        cameraZoom: number // NEW: Added camera zoom
    ) {
        
        entities.filter(e => e.type === EntityType.DRONE && !e.isDead).forEach(ent => {
            let target = { x: ent.pos.x, y: ent.pos.y };
            
            if (ent.ownerId && ent.ownerId.startsWith('base')) {
                if (ent.targetPos) {
                     target = ent.targetPos;
                     const dist = Math.hypot(target.x - ent.pos.x, target.y - ent.pos.y);
                     if (dist < 20) ent.isDead = true; 
                }
                const angle = Math.atan2(target.y - ent.pos.y, target.x - ent.pos.x);
                const droneSpeed = 600;
                ent.vel.x += Math.cos(angle) * droneSpeed * dt;
                ent.vel.y += Math.sin(angle) * droneSpeed * dt;
            } 
            else if (ent.ownerId === 'player' && !player.isDead) {
                 const centerX = canvasWidth / 2;
                 const centerY = canvasHeight / 2;
                 
                 // Apply Camera Zoom to mouse offset to get correct World Coordinates
                 // Offset from center screen / zoom + playerPos
                 let worldMouseX = player.pos.x + (inputManager.mousePos.x - centerX) / cameraZoom;
                 let worldMouseY = player.pos.y + (inputManager.mousePos.y - centerY) / cameraZoom;
    
                 if (autoSpin) {
                     const aimDist = 400;
                     worldMouseX = player.pos.x + Math.cos(player.rotation) * aimDist;
                     worldMouseY = player.pos.y + Math.sin(player.rotation) * aimDist;
                 }
                 
                 const isAttract = inputManager.mouseDown || autoFire;
                 const isRepel = inputManager.rightMouseDown || (activeAbilityTimer > 0 && TANK_CLASSES[playerClassPath].activeSkill?.type === 'REPEL');
    
                 if (isRepel) {
                     const dx = worldMouseX - player.pos.x;
                     const dy = worldMouseY - player.pos.y;
                     target = { x: player.pos.x - dx, y: player.pos.y - dy };
                 } else if (isAttract) {
                     target = { x: worldMouseX, y: worldMouseY };
                 } else {
                    // NEW: AUTO-ATTACK AI
                    const AGGRESSION_RADIUS = 900;
                    let nearestEnemy: Entity | null = null;
                    let minDistance = AGGRESSION_RADIUS;

                    for (const potentialTarget of entities) {
                        if (
                            !potentialTarget.isDead &&
                            potentialTarget.id !== player.id &&
                            (!potentialTarget.teamId || potentialTarget.teamId !== player.teamId) &&
                            [EntityType.SHAPE, EntityType.CRASHER, EntityType.ENEMY, EntityType.BOSS, EntityType.PLAYER].includes(potentialTarget.type)
                        ) {
                            const distance = Math.hypot(potentialTarget.pos.x - ent.pos.x, potentialTarget.pos.y - ent.pos.y);
                            if (distance < minDistance) {
                                minDistance = distance;
                                nearestEnemy = potentialTarget;
                            }
                        }
                    }

                    if (nearestEnemy) {
                        // Found a target, attack it!
                        target = nearestEnemy.pos;
                    } else {
                        // No target, swarm protectively
                        const swarmX = player.pos.x + Math.sin(Date.now() / 200 + parseFloat(ent.id)) * 60;
                        const swarmY = player.pos.y + Math.cos(Date.now() / 200 + parseFloat(ent.id)) * 60;
                        target = { x: swarmX, y: swarmY };
                    }
                 }
                 
                 const angle = Math.atan2(target.y - ent.pos.y, target.x - ent.pos.x);
                 // Increased speed multiplier from 40 to 70
                 const droneSpeed = getPlayerStat('bulletSpd') * 70; 
                 ent.vel.x += Math.cos(angle) * droneSpeed * dt;
                 ent.vel.y += Math.sin(angle) * droneSpeed * dt;
    
            } else if (ent.ownerId && ent.ownerId.startsWith('boss')) {
                target = player.pos;
                 const angle = Math.atan2(target.y - ent.pos.y, target.x - ent.pos.x);
                 const droneSpeed = 200; 
                 ent.vel.x += Math.cos(angle) * droneSpeed * dt;
                 ent.vel.y += Math.sin(angle) * droneSpeed * dt;
            }
            
            ent.vel.x *= 0.95; ent.vel.y *= 0.95;
            ent.pos.x += ent.vel.x * dt; ent.pos.y += ent.vel.y * dt;
            ent.rotation = Math.atan2(ent.vel.y, ent.vel.x);
        });
    }
}
