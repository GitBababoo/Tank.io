
import { Vector2, GameSettings } from '../../types';

export class InputManager {
  keys: Set<string> = new Set();
  mousePos: Vector2 = { x: 0, y: 0 };
  mouseDown: boolean = false;
  rightMouseDown: boolean = false;
  
  // Virtual Joystick Vectors (Range -1.0 to 1.0)
  moveVector: Vector2 = { x: 0, y: 0 };
  aimVector: Vector2 = { x: 0, y: 0 };
  isMobileFiring: boolean = false;

  // --- API OVERRIDES ---
  private apiMove: Vector2 | null = null;
  private apiAim: Vector2 | null = null;
  private apiFire: boolean | null = null;

  canvas: HTMLCanvasElement;
  settings: GameSettings;

  constructor(canvas: HTMLCanvasElement, settings: GameSettings) {
    this.canvas = canvas;
    this.settings = settings;
    this.bindEvents();
  }

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Prevent default touch actions on canvas to stop scrolling/zooming
    this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    
    this.canvas.focus();
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('contextmenu', (e) => e.preventDefault());
  }

  // --- API Methods ---
  overrideMove(vec: Vector2) { this.apiMove = vec; }
  overrideAim(vec: Vector2) { this.apiAim = vec; }
  overrideFire(active: boolean) { this.apiFire = active; }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
  };
  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos.x = e.clientX - rect.left;
    this.mousePos.y = e.clientY - rect.top;
  };
  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = true;
    if (e.button === 2) this.rightMouseDown = true;
  };
  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = false;
    if (e.button === 2) this.rightMouseDown = false;
  };

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  // --- Unified Input Accessors ---

  public getMovementVector(): Vector2 {
      // 0. Check API Override
      if (this.apiMove) return this.apiMove;

      // 1. Check Virtual Joystick first
      if (Math.abs(this.moveVector.x) > 0.1 || Math.abs(this.moveVector.y) > 0.1) {
          return { ...this.moveVector };
      }

      // 2. Fallback to Keyboard
      let x = 0, y = 0;
      if (this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp')) y -= 1;
      if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown')) y += 1;
      if (this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft')) x -= 1;
      if (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) x += 1;

      // Normalize diagonal
      if (x !== 0 || y !== 0) {
          const len = Math.sqrt(x*x + y*y);
          x /= len;
          y /= len;
      }
      return { x, y };
  }

  public getAimVector(playerPos: Vector2, cameraOffset: Vector2): { x: number, y: number, active: boolean } {
      // 0. Check API Override
      if (this.apiAim) return { x: this.apiAim.x, y: this.apiAim.y, active: true };

      // 1. Check Virtual Aim Joystick
      if (Math.abs(this.aimVector.x) > 0.1 || Math.abs(this.aimVector.y) > 0.1 || this.isMobileFiring) {
          return { x: this.aimVector.x, y: this.aimVector.y, active: true };
      }

      // 2. Fallback to Mouse (relative to screen center/player)
      return { x: 0, y: 0, active: false };
  }
  
  public getIsFiring(): boolean {
      if (this.apiFire !== null) return this.apiFire;
      return this.mouseDown || this.isMobileFiring;
  }

  // Called by MobileControls UI
  public setVirtualJoystick(move: Vector2, aim: Vector2, isFiring: boolean) {
      this.moveVector = move;
      this.aimVector = aim;
      this.isMobileFiring = isFiring;
  }
}
