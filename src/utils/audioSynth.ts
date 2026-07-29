class AmbientSoundSynth {
  private ctx: AudioContext | null = null;
  private currentType: string | null = null;
  private noiseNode: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public play(type: 'rain' | 'binaural' | 'whitenoise' | 'brownian') {
    this.stop();
    this.initCtx();
    if (!this.ctx) return;

    this.currentType = type;
    this.isPlaying = true;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.15, this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);

    if (type === 'rain' || type === 'whitenoise' || type === 'brownian') {
      // Create noise buffer
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'brownian') {
          // Brown noise filter
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5; // boost
        } else if (type === 'rain') {
          // Pink-ish noise filter
          output[i] = (lastOut + 0.05 * white) / 1.05;
          lastOut = output[i];
        } else {
          // White noise
          output[i] = white * 0.2;
        }
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      if (type === 'rain') {
        // Lowpass filter for soothing rain sound
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);
        whiteNoise.connect(filter);
        filter.connect(this.gainNode);
      } else if (type === 'brownian') {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, this.ctx.currentTime);
        whiteNoise.connect(filter);
        filter.connect(this.gainNode);
      } else {
        whiteNoise.connect(this.gainNode);
      }

      whiteNoise.start();
      this.noiseNode = whiteNoise;
    } else if (type === 'binaural') {
      // Create Binaural Alpha Beats (Left 200Hz, Right 210Hz => 10Hz Alpha Focus Wave)
      const oscL = this.ctx.createOscillator();
      const oscR = this.ctx.createOscillator();
      const merger = this.ctx.createChannelMerger(2);

      oscL.type = 'sine';
      oscL.frequency.setValueAtTime(200, this.ctx.currentTime);

      oscR.type = 'sine';
      oscR.frequency.setValueAtTime(210, this.ctx.currentTime);

      oscL.connect(merger, 0, 0); // left channel
      oscR.connect(merger, 0, 1); // right channel

      merger.connect(this.gainNode);

      oscL.start();
      oscR.start();

      this.noiseNode = merger as unknown as AudioNode;
    }
  }

  public stop() {
    if (this.noiseNode) {
      try {
        if ('stop' in this.noiseNode && typeof (this.noiseNode as AudioBufferSourceNode).stop === 'function') {
          (this.noiseNode as AudioBufferSourceNode).stop();
        }
      } catch {
        // Ignore stop errors if already stopped
      }
      this.noiseNode = null;
    }
    this.isPlaying = false;
    this.currentType = null;
  }

  public setVolume(vol: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  public playCompletionChime() {
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.3);
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.45);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 1.2);
    } catch {
      // Ignore audio context errors
    }
  }

  public getStatus() {
    return { isPlaying: this.isPlaying, currentType: this.currentType };
  }
}

export const ambientSynth = new AmbientSoundSynth();
