
import { WeatherType, ParticleType, Entity, EntityType } from '../../types';
import { COLORS } from '../../constants';

export class WeatherSystem {
    currentWeather: WeatherType = WeatherType.CLEAR;
    timer: number = 0;
    intensity: number = 0; // 0 to 1

    update(dt: number, entities: Entity[], canvasWidth: number, canvasHeight: number, cameraX: number, cameraY: number) {
        this.timer -= dt;
        if (this.timer <= 0) {
            this.changeWeather();
            this.timer = 60 + Math.random() * 120; // Weather lasts 1-3 minutes
        }

        if (this.currentWeather === WeatherType.RAIN || this.currentWeather === WeatherType.STORM) {
            // Spawn Rain Particles
            const count = this.currentWeather === WeatherType.STORM ? 20 : 5;
            for(let i=0; i<count; i++) {
                if (Math.random() < 0.5) {
                    const x = cameraX + (Math.random() * canvasWidth * 1.5) - (canvasWidth * 0.25);
                    const y = cameraY - canvasHeight/2 - 100;
                    
                    entities.push({
                        id: `rain_${Math.random()}`,
                        type: EntityType.PARTICLE,
                        particleType: ParticleType.RAIN,
                        pos: { x, y },
                        vel: { x: (Math.random() - 0.5) * 200 - 100, y: 800 + Math.random() * 400 },
                        radius: Math.random() * 2 + 1, // Length
                        rotation: 0,
                        color: '#aaddff',
                        health: 1, maxHealth: 1, damage: 0, isDead: false,
                        lifespan: 1.0,
                        opacity: 0.6
                    });
                }
            }
        }

        if (this.currentWeather === WeatherType.SNOW) {
             const count = 2;
             for(let i=0; i<count; i++) {
                 if (Math.random() < 0.3) {
                    const x = cameraX + (Math.random() * canvasWidth * 1.5) - (canvasWidth * 0.25);
                    const y = cameraY - canvasHeight/2 - 50;
                    entities.push({
                        id: `snow_${Math.random()}`,
                        type: EntityType.PARTICLE,
                        particleType: ParticleType.SNOW,
                        pos: { x, y },
                        vel: { x: (Math.random() - 0.5) * 100 + 50, y: 100 + Math.random() * 100 },
                        radius: Math.random() * 3 + 2,
                        rotation: Math.random() * Math.PI,
                        color: '#ffffff',
                        health: 1, maxHealth: 1, damage: 0, isDead: false,
                        lifespan: 3.0,
                        opacity: 0.8
                    });
                 }
             }
        }
    }

    changeWeather() {
        const rand = Math.random();
        if (rand < 0.5) this.currentWeather = WeatherType.CLEAR;
        else if (rand < 0.7) this.currentWeather = WeatherType.RAIN;
        else if (rand < 0.85) this.currentWeather = WeatherType.FOG;
        else if (rand < 0.95) this.currentWeather = WeatherType.SNOW;
        else this.currentWeather = WeatherType.STORM;
    }

    getOverlayColor(): string | null {
        switch (this.currentWeather) {
            case WeatherType.RAIN: return 'rgba(0, 10, 30, 0.1)';
            case WeatherType.STORM: return 'rgba(0, 5, 20, 0.3)';
            case WeatherType.FOG: return 'rgba(200, 200, 200, 0.15)';
            case WeatherType.SNOW: return 'rgba(255, 255, 255, 0.05)';
            default: return null;
        }
    }
}
