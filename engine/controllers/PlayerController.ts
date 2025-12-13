
import { InputManager } from '../managers/InputManager';
import { PlayerManager } from '../managers/PlayerManager';
import { Entity, GameSettings, StatKey, BiomeType, EntityType, SoundType, Barrel, Vector2 } from '../../types';
import { TANK_CLASSES } from '../../data/tanks';
import { WeaponSystem } from '../systems/WeaponSystem';
import { WorldSystem } from '../systems/WorldSystem';
import { ACCELERATION } from '../../constants';
import { AudioManager } from '../managers/AudioManager';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { CameraManager } from '../managers/CameraManager';

export class PlayerController {
    inputManager: InputManager;
    playerManager: PlayerManager;
    settings: GameSettings;
    canvas: HTMLCanvasElement;
    audioManager: AudioManager;
    cameraManager: CameraManager;
    
    // State controlled by keys
    autoSpin: boolean = false;
    wasShooting: boolean = false; 

    constructor(
        inputManager: InputManager, 
        playerManager: PlayerManager, 
        settings: GameSettings, 
        canvas: HTMLCanvasElement,
        audioManager: AudioManager,
        cameraManager: CameraManager
    ) {
        this.inputManager = inputManager;
        this.playerManager = playerManager;
        this.settings = settings;
        this.canvas = canvas;
        this.audioManager = audioManager;
        this.cameraManager = cameraManager;
    }

    update(dt: number, entities: Entity[], pushNotification: (msg: string, type?: any) => void) {
        const player = this.playerManager.entity;
        if (player.isDead) return;

        this.handleInputActions();
        this.updatePhysics(dt);
    }

    handleKeyDown(e: KeyboardEvent, pushNotification: (msg: string, type?: any) => void, onDeath: (victim: Entity, killer: Entity) => void) {
        if (e.code === 'KeyC') {
            const config = TANK_CLASSES[this.playerManager.state.classPath];
            const hasPassiveSpin = ['Smasher', 'Landmine', 'Spike', 'Auto Smasher', 'Auto 3', 'Auto 5'].includes(config.name);
            if (!hasPassiveSpin) {
                this.autoSpin = !this.autoSpin;
                pushNotification(this.autoSpin ? "Auto Spin Enabled" : "Auto Spin Disabled", 'info');
            }
        }
        if (e.code === 'KeyE') {
            this.settings.gameplay.autoFire = !this.settings.gameplay.autoFire;
            pushNotification(this.settings.gameplay.autoFire ? "Auto Fire Enabled" : "Auto Fire Disabled", 'info');
        }
        if (e.code === 'KeyO' && !this.playerManager.entity.isDead) {
            onDeath(this.playerManager.entity, this.playerManager.entity);
        }
    }

    private handleInputActions() {
        if (this.inputManager.isKeyDown('Space') || this.inputManager.isKeyDown('KeyF')) {
            if (this.playerManager.activateAbility()) {
                this.audioManager.play(SoundType.ABILITY, this.playerManager.entity.pos, this.playerManager.entity.pos);
            }
        }
    }

    private updatePhysics(dt: number) {
        const player = this.playerManager.entity;
        
        // 1. Get Input Direction (Now checks API -> Joystick -> Keyboard)
        const moveVec = this.inputManager.getMovementVector();

        // 2. Calculate Stats
        // Top Speed (Pixels/frame approx)
        const topSpeedStat = this.playerManager.getStatValue('moveSpd');
        const maxSpeed = topSpeedStat * 60; // Convert to per second for velocity comparison
        
        // Mass (Resistance)
        const mass = this.playerManager.statManager.getEntityMass(player, this.playerManager.state);
        player.mass = mass; // Sync for collisions

        // 3. Apply Acceleration (Force / Mass)
        if (moveVec.x !== 0 || moveVec.y !== 0) {
            const sensitivity = this.settings.controls.sensitivity || 1;
            
            // FORCE = Engine Power * Sensitivity
            // ACCEL = Force / Mass
            const accel = (ACCELERATION * 400 * sensitivity) / mass; 
            
            // Soft Cap: Reduce acceleration if exceeding top speed
            const currentSpeed = Math.hypot(player.vel.x, player.vel.y);
            let accelFactor = 1.0;
            if (currentSpeed > maxSpeed) {
                accelFactor = 0.1; // Drastically reduce accel if overspeeding
            }

            player.vel.x += moveVec.x * accel * accelFactor * dt;
            player.vel.y += moveVec.y * accel * accelFactor * dt;
        }

        // NOTE: We do NOT update position here anymore.
        // PhysicsSystem.updateMovement handles Position += Velocity * dt and Friction for EVERYONE.
        // This prevents the "double speed" issue.

        // 4. Rotation Logic (Corrected for Resolution Scale)
        
        const config = TANK_CLASSES[this.playerManager.state.classPath];
        const passiveSpin = ['Smasher', 'Landmine', 'Spike', 'Auto Smasher', 'Auto 3', 'Auto 5'].includes(config.name);
        
        if (passiveSpin) {
            player.rotation += dt * 0.5;
        } else if (this.autoSpin) {
            player.rotation += dt * 1.0;
        } else {
            const aimInput = this.inputManager.getAimVector(player.pos, {x:0, y:0});
            
            if (aimInput.active) {
                if (aimInput.x !== 0 || aimInput.y !== 0) {
                    player.rotation = Math.atan2(aimInput.y, aimInput.x);
                }
            } else {
                // --- CRITICAL FIX: Resolution Scaling for Mouse Aim ---
                // We must map the client mouse coordinates (screen pixels) to the canvas internal coordinates.
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;

                const mouseX = (this.inputManager.mousePos.x) * scaleX;
                const mouseY = (this.inputManager.mousePos.y) * scaleY;
                
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;

                player.rotation = Math.atan2(mouseY - centerY, mouseX - centerX);
            }
        }
    }

    public handleFiring(dt: number, entities: Entity[], onHitscan: (start: Vector2, angle: number, owner: Entity, barrel: Barrel) => void) {
        const player = this.playerManager.entity;
        const config = TANK_CLASSES[this.playerManager.state.classPath];
        const isSummoner = config.barrels.some((b: any) => b.isDroneSpawner);
        
        // Use updated method that supports API override
        let isShooting = this.inputManager.getIsFiring() || this.settings.gameplay.autoFire;

        if (config.activeSkill?.type === 'INVISIBILITY' && this.playerManager.activeAbilityTimer > 0) {
            if (isShooting) this.playerManager.activeAbilityTimer = 0; 
            else player.opacity = 0.2;
        }

        if (config.name !== 'Manager' && config.name !== 'Landmine' && isShooting) {
            this.playerManager.reveal();
        }

        const justStarted = isShooting && !this.wasShooting;
        this.wasShooting = isShooting;

        WeaponSystem.update(
            player, 
            config, 
            dt, 
            isShooting || !!isSummoner, 
            justStarted,
            entities, 
            (key) => this.playerManager.getStatValue(key as StatKey),
            onHitscan,
            this.playerManager.activeAbilityTimer,
            this.audioManager,
            player.pos, 
            (amount) => this.cameraManager.addShake(amount) 
        );
    }
}
