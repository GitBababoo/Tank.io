

import { AudioSettings, SoundType, Vector2 } from '../../types';

export class AudioManager {
  ctx: AudioContext;
  settings: AudioSettings;
  
  // Gain Nodes (Volume Buses)
  masterGain: GainNode;
  sfxGain: GainNode;
  musicGain: GainNode;
  uiGain: GainNode;
  
  // Processing Nodes for Soft Audio
  compressor: DynamicsCompressorNode;
  masterFilter: BiquadFilterNode;

  // Throttling to prevent audio chaos
  lastPlayTimes: Record<string, number> = {};

  constructor(settings: AudioSettings) {
    this.settings = settings;
    
    // Initialize Web Audio API
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new AudioContextClass();
    
    // Create Nodes
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.uiGain = this.ctx.createGain();
    
    this.compressor = this.ctx.createDynamicsCompressor();
    // Soft compression settings to smooth out peaks
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.masterFilter = this.ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 20000; // Open by default

    // Wiring: Inputs -> Gains -> Filter -> Compressor -> Destination
    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.uiGain.connect(this.masterGain);
    
    this.masterGain.connect(this.masterFilter);
    this.masterFilter.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);

    this.updateVolumes();
  }

  updateSettings(newSettings: AudioSettings) {
    this.settings = newSettings;
    this.updateVolumes();
    if (this.ctx.state === 'suspended') {
        this.ctx.resume();
    }
  }

  private updateVolumes() {
    const now = this.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(this.settings.masterVolume, now);
    this.sfxGain.gain.setValueAtTime(this.settings.sfxVolume, now);
    this.musicGain.gain.setValueAtTime(this.settings.musicVolume, now);
    this.uiGain.gain.setValueAtTime(this.settings.uiVolume, now);
    
    // Theme-based EQ
    if (this.settings.soundTheme === 'soft') {
         // Cut harsh frequencies significantly for comfort
         this.masterFilter.frequency.setTargetAtTime(3000, now, 0.2);
    } else {
         this.masterFilter.frequency.setTargetAtTime(20000, now, 0.2);
    }
  }

  play(type: SoundType, pos?: Vector2, listenerPos?: Vector2) {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    const now = Date.now();
    
    // --- 1. Smart Throttling (Aggressive for Comfort) ---
    // Increased throttle times to prevent headache-inducing repetition
    let throttleMs = 0;
    if (type === SoundType.SHOOT) throttleMs = 90; // Limit ~11 shots/sec max heard
    if (type === SoundType.HIT) throttleMs = 80;   
    if (type === SoundType.EXPLOSION) throttleMs = 120;
    if (type === SoundType.CRIT) throttleMs = 150;
    if (type === SoundType.CHARGE) throttleMs = 200; // Only play charge start occasionally if rapid clicking

    if (throttleMs > 0) {
        const last = this.lastPlayTimes[type] || 0;
        if (now - last < throttleMs) return;
        this.lastPlayTimes[type] = now;
    }

    // --- 2. Spatial Calculations (UPDATED) ---
    let volume = 1.0;
    let pan = 0;
    let muffleFreq = 22000; 

    if (this.settings.spatialAudio && pos && listenerPos) {
        const dx = pos.x - listenerPos.x;
        const dy = pos.y - listenerPos.y;
        const dist = Math.hypot(dx, dy);
        
        // REDUCED: Max distance for hearing shots to reduce clutter
        // Previously 1100, now 900 for shots.
        // Sounds beyond this range are cut entirely.
        const maxDist = type === SoundType.SHOOT ? 900 : 2000; 

        if (dist > maxDist) return; 

        // Cubic Falloff: Sounds get quiet VERY fast as they move away
        // Normalized distance (0 to 1)
        const normDist = dist / maxDist;
        
        // Steeper curve: Start dropping volume immediately
        // (1 - x)^3 provides a quick dropoff
        const v = Math.max(0, 1 - normDist);
        volume = v * v * v;
        
        // Additional cutoff for very quiet sounds to save processing
        if (volume < 0.05) return; 

        // Distance Muffling (Lowpass) - More aggressive
        // Far sounds should be dull (low frequency only)
        // 200Hz min (very muffled) to 15000Hz (clear)
        muffleFreq = 200 + (14800 * (v * v)); 

        // Panning
        const panRange = 1000; 
        pan = Math.max(-1, Math.min(1, dx / (panRange / 2)));
    } else {
        volume = 0.5;
        pan = 0;
        muffleFreq = 20000;
    }
    
    // --- 3. Comfort Adjustments ---
    // Drastically reduce volume of repetitive sounds
    if (type === SoundType.SHOOT) volume *= 0.35; 
    if (type === SoundType.HIT) volume *= 0.5;
    if (type === SoundType.CHARGE) volume *= 0.4;

    const isSoft = this.settings.soundTheme === 'soft';

    if (type === SoundType.EXPLOSION || type === SoundType.DIE) {
        this.playNoise(0.5, volume, pan, muffleFreq, isSoft);
    } else {
        this.playSynthesized(type, volume, pan, muffleFreq, isSoft);
    }
  }

  private playSynthesized(type: SoundType, vol: number, pan: number, muffleFreq: number, isSoft: boolean) {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      // Local Filter for Distance Muffling
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      
      // If Soft Theme, cap the max brightness even lower
      const maxFreq = isSoft ? 4000 : 22000; 
      filter.frequency.setValueAtTime(Math.min(muffleFreq, maxFreq), t);

      // Panner
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;

      // Routing: Osc -> Filter -> Gain -> Panner -> Bus
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      
      const dest = (type === SoundType.CLICK || type === SoundType.LEVEL_UP) ? this.uiGain : this.sfxGain;
      panner.connect(dest);

      // --- Sound Definitions ---
      
      if (type === SoundType.CHARGE) {
          // RISING SCI-FI TONE
          osc.type = 'sine';
          osc.frequency.setValueAtTime(200, t);
          osc.frequency.exponentialRampToValueAtTime(800, t + 0.5); // Rise pitch
          
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(vol, t + 0.1);
          gain.gain.linearRampToValueAtTime(vol * 0.5, t + 0.4);
          gain.gain.linearRampToValueAtTime(0, t + 0.5);
          
          // Add secondary harmonic for thickness
          const osc2 = this.ctx.createOscillator();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(100, t);
          osc2.frequency.linearRampToValueAtTime(400, t + 0.5);
          const gain2 = this.ctx.createGain();
          gain2.gain.setValueAtTime(0, t);
          gain2.gain.linearRampToValueAtTime(vol * 0.3, t + 0.1);
          gain2.gain.linearRampToValueAtTime(0, t + 0.5);
          
          osc2.connect(filter); // Route through same filter chain
          // Note: gain2 needs to connect to panner, but panner is single input in this simplified setup.
          // Correct way is gain2 -> panner. Let's just create a new path for simplicity or merge.
          // Merging into filter:
          osc2.disconnect();
          osc2.connect(gain2);
          gain2.connect(panner);

          osc2.start(t);
          osc2.stop(t + 0.5);

          osc.start(t);
          osc.stop(t + 0.5);
      }
      else if (type === SoundType.LASER_BLAST) {
          // HEAVY RAILGUN SHOT (The "Fin" sound)
          // 1. Kick (Low sine drop)
          osc.type = 'sine';
          osc.frequency.setValueAtTime(150, t);
          osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
          
          gain.gain.setValueAtTime(vol, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          
          // 2. Zap (High saw drop)
          const osc2 = this.ctx.createOscillator();
          osc2.type = 'sawtooth';
          osc2.frequency.setValueAtTime(800, t);
          osc2.frequency.exponentialRampToValueAtTime(100, t + 0.15);
          const gain2 = this.ctx.createGain();
          gain2.gain.setValueAtTime(vol * 0.6, t);
          gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          osc2.connect(gain2);
          gain2.connect(panner);
          
          // 3. Noise Burst (Impact)
          this.playNoise(0.2, vol * 0.8, pan, muffleFreq, isSoft);

          osc2.start(t);
          osc2.stop(t + 0.2);
          osc.start(t);
          osc.stop(t + 0.3);
      }
      else if (type === SoundType.SHOOT) {
          if (isSoft) {
              // Very Soft Bubble Pop
              osc.type = 'sine';
              osc.frequency.setValueAtTime(300, t);
              osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
              
              gain.gain.setValueAtTime(0, t);
              gain.gain.linearRampToValueAtTime(vol * 0.5, t + 0.01);
              gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
              
              osc.start(t);
              osc.stop(t + 0.1);
          } else {
              // Muted Zap (Less sharp than before)
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(180, t);
              osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
              
              gain.gain.setValueAtTime(vol * 0.4, t);
              gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
              
              osc.start(t);
              osc.stop(t + 0.08);
          }
      } 
      else if (type === SoundType.HIT) {
          osc.type = 'sine'; // Always sine for hit to be less annoying
          osc.frequency.setValueAtTime(isSoft ? 500 : 200, t);
          
          gain.gain.setValueAtTime(vol * 0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
          
          osc.start(t);
          osc.stop(t + 0.05);
      }
      else if (type === SoundType.CRIT) {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(800, t);
          osc.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
          
          gain.gain.setValueAtTime(vol * 0.5, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
          
          osc.start(t);
          osc.stop(t + 0.25);
      }
      else if (type === SoundType.LEVEL_UP) {
          osc.type = 'sine';
          const now = t;
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.setValueAtTime(554, now + 0.1);
          osc.frequency.setValueAtTime(659, now + 0.2);
          
          gain.gain.setValueAtTime(vol * 0.3, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.6);
          
          osc.start(now);
          osc.stop(now + 0.6);
      }
      else if (type === SoundType.EVOLVE) {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(100, t);
          osc.frequency.linearRampToValueAtTime(600, t + 0.8);
          
          gain.gain.setValueAtTime(vol * 0.3, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.8);
          
          osc.start(t);
          osc.stop(t + 0.8);
      }
      else if (type === SoundType.ABILITY) {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(300, t);
          osc.frequency.linearRampToValueAtTime(500, t + 0.2);
          
          gain.gain.setValueAtTime(vol * 0.3, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.2);
          
          osc.start(t);
          osc.stop(t + 0.2);
      }
      else {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, t);
          gain.gain.setValueAtTime(vol * 0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
          osc.start(t);
          osc.stop(t + 0.05);
      }
  }

  private playNoise(duration: number, vol: number, pan: number, muffleFreq: number, isSoft: boolean) {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const maxFreq = isSoft ? 400 : 1000; 
      filter.frequency.setValueAtTime(Math.min(muffleFreq, maxFreq), this.ctx.currentTime);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol * (isSoft ? 0.25 : 0.4), this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.sfxGain);

      noise.start();
  }
}
