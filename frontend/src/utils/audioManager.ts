/**
 * Soundtrack Audio Manager for 360 Panorama Experience.
 * Uses exclusively the 3 provided ambient soundtrack songs, randomly playing
 * them in a continuous loop.
 *
 * Rules:
 * 1. ONLY the three songs are used:
 *    - Above_the_Glass_Wing.mp3
 *    - Beyond_the_Morning_Rise.mp3
 *    - Golden_Latitude.mp3
 * 2. Songs play randomly over and over.
 * 3. Switching through panoramas does NOT change or restart the sound.
 * 4. A new random song starts only when the currently playing song ends.
 */

export const SOUNDTRACK_SONGS = [
  'Above_the_Glass_Wing.mp3',
  'Beyond_the_Morning_Rise.mp3',
  'Golden_Latitude.mp3',
];

function getSongCandidates(filename: string): string[] {
  const clean = filename.replace(/^\/+/, '').replace(/^sounds\//, '');
  return [
    `/sounds/${clean}`,
    `/panoramas/sounds/${clean}`,
    `./sounds/${clean}`,
  ];
}

export class SpatialAudioManager {
  private static instance: SpatialAudioManager | null = null;

  private audio: HTMLAudioElement | null = null;
  private currentSong: string | null = null;
  private isRunning: boolean = false;
  private isMuted: boolean = false;
  private masterVolume: number = 0.5;
  private candidateIndex: number = 0;

  constructor() {
    this.setupAudioElement();
    this.setupUnlockListeners();
  }

  public static getInstance(): SpatialAudioManager {
    if (!SpatialAudioManager.instance) {
      SpatialAudioManager.instance = new SpatialAudioManager();
    }
    return SpatialAudioManager.instance;
  }

  private setupAudioElement() {
    if (typeof window === 'undefined') return;

    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.volume = this.masterVolume;
    this.audio.muted = this.isMuted;

    // When the song ends naturally, pick another random song from the three
    this.audio.addEventListener('ended', () => {
      this.playNextRandomSong();
    });

    // Error recovery: try fallback candidates if path differs
    this.audio.addEventListener('error', () => {
      if (!this.currentSong || !this.isRunning) return;
      const candidates = getSongCandidates(this.currentSong);
      this.candidateIndex++;
      if (this.candidateIndex < candidates.length && this.audio) {
        this.audio.src = candidates[this.candidateIndex];
        this.audio.play().catch(() => {});
      }
    });
  }

  private setupUnlockListeners() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      if (this.isRunning && this.audio && this.audio.paused) {
        this.audio.play().catch(() => {});
      }
      ['click', 'pointerdown', 'keydown', 'touchstart'].forEach((ev) => {
        window.removeEventListener(ev, unlock);
      });
    };

    ['click', 'pointerdown', 'keydown', 'touchstart'].forEach((ev) => {
      window.addEventListener(ev, unlock, { once: true, passive: true });
    });
  }

  /**
   * Pick a random song from SOUNDTRACK_SONGS (preferring one different from current)
   */
  private pickRandomSong(): string {
    if (SOUNDTRACK_SONGS.length <= 1) return SOUNDTRACK_SONGS[0];
    const available = SOUNDTRACK_SONGS.filter((s) => s !== this.currentSong);
    const pool = available.length > 0 ? available : SOUNDTRACK_SONGS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private playNextRandomSong() {
    const next = this.pickRandomSong();
    this.currentSong = next;
    this.candidateIndex = 0;

    if (!this.audio) return;

    const candidates = getSongCandidates(next);
    this.audio.src = candidates[0];
    this.audio.currentTime = 0;

    if (this.isRunning) {
      const p = this.audio.play();
      if (p !== undefined) {
        p.catch((err) => {
          console.warn('[Soundtrack] Play interrupted or waiting for user gesture:', err);
        });
      }
    }
  }

  /**
   * Called by ThreePanoViewer on mount.
   * Does NOT interrupt, switch or restart any currently playing song.
   */
  public init(_camera?: any, _scene?: any) {
    if (!this.currentSong && SOUNDTRACK_SONGS.length > 0) {
      this.currentSong = this.pickRandomSong();
      if (this.audio) {
        const candidates = getSongCandidates(this.currentSong);
        this.audio.src = candidates[0];
      }
    }
  }

  /**
   * Start or resume playback.
   * If a song is already actively playing, it continues seamlessly without restarting.
   */
  public start() {
    this.isRunning = true;

    if (!this.audio) {
      this.setupAudioElement();
    }

    if (!this.audio) return;

    // If no song loaded yet, pick a random one
    if (!this.currentSong || !this.audio.src) {
      this.playNextRandomSong();
      return;
    }

    // If currently paused, resume smoothly from current position
    if (this.audio.paused) {
      const p = this.audio.play();
      if (p !== undefined) {
        p.catch((err) => {
          console.warn('[Soundtrack] Play awaiting user gesture:', err);
        });
      }
    }
  }

  /**
   * Pause playback.
   * Does NOT reset track position or change song.
   */
  public stop() {
    this.isRunning = false;
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.audio) {
      this.audio.volume = this.isMuted ? 0 : this.masterVolume;
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.audio) {
      this.audio.muted = muted;
    }
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  public getCurrentSong(): string | null {
    return this.currentSong;
  }

  /**
   * Per-frame animation tick (Three.js render loop compatibility)
   */
  public update(_deltaSec: number = 0.016) {
    // No-op for continuous soundtrack
  }

  /**
   * Called on viewer unmount. Pauses playback without resetting track.
   */
  public dispose() {
    this.stop();
  }
}
