
export class LoopManager {
    lastTime: number = 0;
    animationFrameId: number | null = null;
    isRunning: boolean = false;

    constructor(
        private onUpdate: (dt: number) => void, 
        private onRender: () => void
    ) {}

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }

    private loop = (timestamp: number) => {
        if (!this.isRunning) return;

        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        // --- PREVENTION: Spiral of Death / Tab Throttling ---
        // If the browser tab was inactive, dt might be huge (e.g., 5 seconds).
        // Processing 5 seconds of physics in one frame causes massive lag/freezing.
        // Cap dt to a maximum of 0.1s (100ms) to ensure stability.
        if (dt > 0.1) dt = 0.1;
        if (dt < 0) dt = 0;

        try {
            this.onUpdate(dt);
            this.onRender();
        } catch (e) {
            console.error("Game Loop Error:", e);
            // Don't crash the whole loop, try to recover next frame
        }

        this.animationFrameId = requestAnimationFrame(this.loop);
    };
}
