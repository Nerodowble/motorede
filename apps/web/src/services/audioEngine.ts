/**
 * Audio Engine & MediaSession Background Keepalive for MotoRede
 * Handles Web Audio API, microphone capture, PTT radio beeps,
 * silent audio background loop for mobile lock-screen execution,
 * and MediaSession OS lockscreen integration.
 */

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private silentAudioElement: HTMLAudioElement | null = null;
  private isBackgroundAudioActive: boolean = false;
  private isMicMuted: boolean = false;
  private roomVolume: number = 0.85;
  private onSpeakingChangeCallback?: (isSpeaking: boolean, volumeLevel: number) => void;
  private animationFrameId: number | null = null;

  constructor() {
    // Audio element will be initialized lazily on first user gesture
  }

  /**
   * Generates a 1-second silent audio WAV data URI for continuous loop playback.
   * This is recognized by iOS Safari and Android Chrome to sustain the background audio session.
   */
  private setupSilentAudioElement() {
    if (typeof window === 'undefined') return;
    if (this.silentAudioElement) return;

    // Minimal valid WAV containing 0.5s of near-silence (sub-audible low sine wave)
    const silentAudio = document.createElement('audio');
    silentAudio.id = 'motorede-bg-audio-keepalive';
    silentAudio.loop = true;
    silentAudio.setAttribute('playsinline', 'true');
    silentAudio.setAttribute('webkit-playsinline', 'true');

    // Base64 encoded WAV file with silence
    silentAudio.src =
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
    
    this.silentAudioElement = silentAudio;
  }

  /**
   * Initializes Audio Context on user gesture
   */
  public async initAudioContext(): Promise<boolean> {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      return true;
    } catch (err) {
      console.warn('AudioContext initialization error:', err);
      return false;
    }
  }

  /**
   * Starts background audio session & registers OS MediaSession controls
   */
  public startBackgroundSession(roomName: string, channelName: string, onToggleMute?: () => void) {
    this.isBackgroundAudioActive = true;
    this.setupSilentAudioElement();

    // Start silent audio loop to hold OS background audio priority
    if (this.silentAudioElement) {
      this.silentAudioElement.play().catch((err) => {
        // Autoplay policy or user hasn't interacted yet; non-fatal
      });
    }

    // Register Media Session API for lock screen controls
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Comboio: ${roomName}`,
        artist: 'MotoRede Voz em Segundo Plano',
        album: `Canal: ${channelName} • PTT Ativo`,
        artwork: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      // Handlers for phone lock screen / bluetooth headset buttons
      navigator.mediaSession.setActionHandler('play', () => {
        if (this.silentAudioElement) this.silentAudioElement.play();
        navigator.mediaSession.playbackState = 'playing';
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (onToggleMute) {
          onToggleMute();
        } else {
          this.toggleMute();
        }
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        this.stopBackgroundSession();
      });

      // Custom action for bluetooth headset track buttons (can toggle mute or channel)
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (onToggleMute) onToggleMute();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.playRadioChirp(true);
      });

      navigator.mediaSession.playbackState = 'playing';
    }
  }

  /**
   * Stops background keepalive and cleans up MediaSession
   */
  public stopBackgroundSession() {
    this.isBackgroundAudioActive = false;
    if (this.silentAudioElement) {
      this.silentAudioElement.pause();
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  }

  /**
   * Requests real microphone access with active volume level meter
   */
  public async startMicrophone(
    onSpeakingChange: (isSpeaking: boolean, volumeLevel: number) => void
  ): Promise<boolean> {
    try {
      await this.initAudioContext();
      this.onSpeakingChangeCallback = onSpeakingChange;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (this.audioContext) {
        this.micSource = this.audioContext.createMediaStreamSource(this.micStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.micSource.connect(this.analyser);

        this.startVolumeMonitoring();
      }

      return true;
    } catch (err) {
      console.warn('Microphone access not granted or unavailable:', err);
      // Even if physical mic fails (e.g. simulated environment), allow voice room UI
      return false;
    }
  }

  private startVolumeMonitoring() {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    let lastSpeaking = false;
    let lastTime = 0;

    const checkVolume = (now: number) => {
      if (!this.analyser || this.isMicMuted) {
        if (lastSpeaking && this.onSpeakingChangeCallback) {
          lastSpeaking = false;
          this.onSpeakingChangeCallback(false, 0);
        }
        this.animationFrameId = requestAnimationFrame(checkVolume);
        return;
      }

      // Throttle analysis to ~100ms intervals to prevent frame drops
      if (now - lastTime < 100) {
        this.animationFrameId = requestAnimationFrame(checkVolume);
        return;
      }
      lastTime = now;

      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length; // 0 to 255
      const normalizedVol = Math.min(100, Math.round((avg / 128) * 100));

      const isSpeakingNow = normalizedVol > 18;

      if (this.onSpeakingChangeCallback && (isSpeakingNow !== lastSpeaking || isSpeakingNow)) {
        lastSpeaking = isSpeakingNow;
        this.onSpeakingChangeCallback(isSpeakingNow, normalizedVol);
      }

      this.animationFrameId = requestAnimationFrame(checkVolume);
    };

    this.animationFrameId = requestAnimationFrame(checkVolume);
  }

  public stopMicrophone() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
  }

  public setMute(muted: boolean) {
    this.isMicMuted = muted;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMicMuted);
    return this.isMicMuted;
  }

  public getIsMuted(): boolean {
    return this.isMicMuted;
  }

  public setRoomVolume(volume: number) {
    this.roomVolume = Math.max(0, Math.min(1, volume));
  }

  public getRoomVolume(): number {
    return this.roomVolume;
  }

  /**
   * Plays a high-tactile two-tone radio squelch chirp (Roger beep / PTT open)
   * used in motorcycle intercoms (e.g., Sena/Cardo)
   */
  public playRadioChirp(isOpen: boolean) {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    if (!this.audioContext) return;

    try {
      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      if (isOpen) {
        // High ascending beep
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
      } else {
        // Descending double pip
        osc.frequency.setValueAtTime(1050, now);
        osc.frequency.exponentialRampToValueAtTime(650, now + 0.09);
      }

      gain.gain.setValueAtTime(0.2 * this.roomVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (err) {
      console.warn('Could not play radio chirp:', err);
    }
  }

  /**
   * Plays simulated radio sound effect for incoming group chatter
   */
  public playSimulatedIncomingRadio(memberName: string, messageText: string) {
    this.playRadioChirp(true);

    // If browser supports SpeechSynthesis, synthesize with slight radio filter
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(messageText);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      utterance.volume = this.roomVolume;
      window.speechSynthesis.speak(utterance);
    }
  }
}

export const audioEngine = new AudioEngine();
