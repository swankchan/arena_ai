// A small procedural Hong Kong soundscape: harbour rumble, traffic hiss, tram bells and the odd taxi horn.
// No audio files are needed; everything is synthesised on first use, after a user gesture.

export class HKAudioSystem {
  constructor({ onStateChange = () => {} } = {}) {
    this.onStateChange = onStateChange;
    this.supported = Boolean(globalThis.AudioContext || globalThis.webkitAudioContext);
    this.enabled = false;
    this.ready = false;
    this.disposed = false;
    this.context = null;
    this.master = null;
    this.hum = null;
    this.hiss = null;
    this.traffic = null;
    this.nextAmbient = 10;
    this.tramBell = 14;
  }

  _ensure() {
    if (this.context) return true;
    if (!this.supported) return false;
    try {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      const context = new AudioContextClass();
      this.context = context;
      this.master = context.createGain();
      this.master.gain.value = 0;
      this.master.connect(context.destination);

      const noise = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
      const data = noise.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      }
      const loop = () => {
        const source = context.createBufferSource();
        source.buffer = noise;
        source.loop = true;
        return source;
      };

      // Deep harbour / city rumble.
      const humFilter = context.createBiquadFilter();
      humFilter.type = 'lowpass';
      humFilter.frequency.value = 240;
      humFilter.Q.value = 0.5;
      this.hum = context.createGain();
      this.hum.gain.value = 0.34;
      const humSource = loop();
      humSource.connect(humFilter).connect(this.hum).connect(this.master);
      humSource.start();

      // Mid-band traffic.
      const trafficFilter = context.createBiquadFilter();
      trafficFilter.type = 'bandpass';
      trafficFilter.frequency.value = 620;
      trafficFilter.Q.value = 0.42;
      this.traffic = context.createGain();
      this.traffic.gain.value = 0.14;
      const trafficSource = loop();
      trafficSource.connect(trafficFilter).connect(this.traffic).connect(this.master);
      trafficSource.start();

      // Fine tyre / air-conditioning hiss.
      const hissFilter = context.createBiquadFilter();
      hissFilter.type = 'highpass';
      hissFilter.frequency.value = 2600;
      this.hiss = context.createGain();
      this.hiss.gain.value = 0.06;
      const hissSource = loop();
      hissSource.connect(hissFilter).connect(this.hiss).connect(this.master);
      hissSource.start();

      return true;
    } catch (error) {
      console.warn('[hongkong audio]', error);
      this.supported = false;
      return false;
    }
  }

  setEnabled(enabled) {
    if (!this.supported) return;
    enabled = Boolean(enabled);
    if (enabled && !this._ensure()) return;
    this.enabled = enabled;
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(enabled ? 0.5 : 0, now, 0.12);
    }
    this.onStateChange();
  }

  _blast(frequencies, duration = 0.55, volume = 0.11, type = 'sawtooth') {
    if (!this.enabled || !this.context || !this.master) return;
    const now = this.context.currentTime;
    for (const frequency of frequencies) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain).connect(this.master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.05);
    }
  }

  honk() {
    this._blast([370, 466], 0.5, 0.1, 'sawtooth');
  }

  update(dt, elapsed, camera, night = false) {
    if (!this.enabled || !this.context || !this.master) return;
    const height = Math.max(0, camera ? camera.position.y : 0);
    const hush = 1 / (1 + height / 90);
    const now = this.context.currentTime;
    if (this.hum) this.hum.gain.setTargetAtTime(0.3 * hush * (night ? 0.7 : 1), now, 0.4);
    if (this.traffic) this.traffic.gain.setTargetAtTime(0.13 * hush, now, 0.4);
    if (this.hiss) this.hiss.gain.setTargetAtTime(0.05 * hush, now, 0.4);

    if (elapsed > this.nextAmbient) {
      this.nextAmbient = elapsed + 11 + Math.random() * 17;
      this._blast([Math.random() < 0.5 ? 310 : 392, Math.random() < 0.5 ? 415 : 523], 0.38, 0.035, 'sawtooth');
    }
    if (elapsed > this.tramBell) {
      this.tramBell = elapsed + 26 + Math.random() * 22;
      // Two quick tram-bell dings.
      this._blast([1180, 1560], 0.12, 0.022, 'sine');
      setTimeout(() => this._blast([1180, 1560], 0.12, 0.02, 'sine'), 170);
    }
  }

  dispose() {
    this.disposed = true;
    this.enabled = false;
    if (this.context) {
      this.context.close().catch(() => {});
      this.context = null;
    }
  }
}
