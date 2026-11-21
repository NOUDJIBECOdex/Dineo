/**
 * Générateur sonore Web Audio API production-grade pour :
 * - Alerte Cuisine (5 secondes) lors d'une nouvelle commande
 * - Alerte Livreur (10 secondes + vibration) dès qu'un colis est PRÊT en cuisine
 * 100 % autonome (zéro fichier externe, zéro réseau requis).
 */
class SoundNotifier {
  private audioCtx: AudioContext | null = null;
  private soundEnabled = true;
  private driverAlarmTimers: number[] = [];
  private isDriverAlarmPlaying = false;
  private kitchenAlarmTimers: number[] = [];
  private isKitchenAlarmPlaying = false;

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (!enabled) {
      this.stopDriverReadyAlarm();
      this.stopKitchenNewOrderAlarm();
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  /**
   * Indique si le navigateur/téléphone expose l'API Web Vibration (Android Chrome/Edge/Firefox ;
   * non supporté par Apple sur iOS Safari).
   */
  public supportsHardwareVibration(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  /**
   * Déclenche une vibration matérielle Android de façon sûre (sans jamais lever d'exception).
   */
  public vibrate(pattern: number | number[]) {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Déverrouille l'AudioContext et réveille le moteur haptique suite à un geste utilisateur.
   */
  public unlockAudio() {
    this.getContext();
  }

  /**
   * Retour tactile + sonore immédiat d'erreur (ex: mauvais code de remise ou code dérogation erroné).
   * Appelé directement dans le gestionnaire de clic/soumission pour garantir la vibration sur mobile.
   */
  public playErrorFeedback() {
    // Triple vibration sèche d'erreur immédiatement dans le geste utilisateur (Android)
    this.vibrate([110, 55, 110, 55, 170]);

    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [
        { freq: 230, start: 0, dur: 0.14 },
        { freq: 168, start: 0.15, dur: 0.22 },
      ];
      for (const n of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.freq, now + n.start);
        gain.gain.setValueAtTime(0.001, now + n.start);
        gain.gain.linearRampToValueAtTime(0.24, now + n.start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + n.start);
        osc.stop(now + n.start + n.dur + 0.02);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Courte impulsion haptique de succès (validation d'une livraison).
   */
  public playSuccessHaptic() {
    this.vibrate([45, 45, 95]);
  }

  private getContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Une salve douce de cloche de cuisine (double note chaleureuse D5 → A5)
   */
  private playKitchenChimeBurst() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const tones = [
        { freq: 587.33, start: 0, dur: 0.35, amp: 0.32 }, // D5
        { freq: 880.0, start: 0.16, dur: 0.55, amp: 0.36 }, // A5
      ];

      for (const t of tones) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(t.freq, now + t.start);
        gain.gain.setValueAtTime(0.001, now + t.start);
        gain.gain.linearRampToValueAtTime(t.amp, now + t.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t.start + t.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t.start);
        osc.stop(now + t.start + t.dur + 0.02);
      }
    } catch {
      // Ignorer silencieusement si politique autoplay bloque
    }
  }

  /**
   * Alerte Cuisine / Restaurant (5 secondes par défaut = 5 salves rythmées)
   * déclenchée lorsqu'une nouvelle commande arrive (Caisse POS, QR Table ou Mobile).
   */
  public playKitchenNewOrderAlarm(durationSeconds = 5, onEnd?: () => void) {
    if (!this.soundEnabled) return;
    this.stopKitchenNewOrderAlarm();
    this.isKitchenAlarmPlaying = true;

    const pulses = Math.max(1, Math.round(durationSeconds));
    const intervalMs = 1000;

    for (let i = 0; i < pulses; i++) {
      const id = window.setTimeout(() => {
        if (this.isKitchenAlarmPlaying) {
          this.playKitchenChimeBurst();
        }
      }, i * intervalMs);
      this.kitchenAlarmTimers.push(id);
    }

    const endId = window.setTimeout(() => {
      this.isKitchenAlarmPlaying = false;
      this.kitchenAlarmTimers = [];
      onEnd?.();
    }, pulses * intervalMs);
    this.kitchenAlarmTimers.push(endId);
  }

  public stopKitchenNewOrderAlarm() {
    this.isKitchenAlarmPlaying = false;
    for (const id of this.kitchenAlarmTimers) {
      window.clearTimeout(id);
    }
    this.kitchenAlarmTimers = [];
  }

  /**
   * Bip discret de confirmation (côté Client lors de l'envoi d'une commande ou appel serveur).
   */
  public playSoftConfirmChime() {
    this.playKitchenChimeBurst();
  }

  /**
   * Alias conservé pour compatibilité : déclenche désormais l'alerte cuisine de 5 secondes.
   */
  public playNewOrderChime() {
    this.playKitchenNewOrderAlarm(5);
  }

  /**
   * Salve musicale pénétrante de 3 notes pour le livreur (audible même près d'une moto)
   */
  private playDriverReadyBurst() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 659.25, start: 0, dur: 0.22 }, // E5
        { freq: 880.0, start: 0.16, dur: 0.22 }, // A5
        { freq: 1174.66, start: 0.32, dur: 0.45 }, // D6
      ];

      for (const n of notes) {
        const osc = ctx.createOscillator();
        const harmonic = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, now + n.start);

        harmonic.type = 'sine';
        harmonic.frequency.setValueAtTime(n.freq * 2, now + n.start);

        gain.gain.setValueAtTime(0.001, now + n.start);
        gain.gain.linearRampToValueAtTime(0.38, now + n.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);

        osc.connect(gain);
        harmonic.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + n.start);
        osc.stop(now + n.start + n.dur + 0.02);
        harmonic.start(now + n.start);
        harmonic.stop(now + n.start + n.dur + 0.02);
      }
    } catch {
      // Ignorer silencieusement si bloqué
    }
  }

  /**
   * Alerte sonore prolongée côté Livreur : 10 secondes complètes (10 salves rythmées + vibration Android à chaque salve)
   * déclenchée dès que la cuisine valide qu'une commande assignée est PRÊTE.
   */
  public playDriverReadyAlarm(durationSeconds = 10, onEnd?: () => void) {
    if (!this.soundEnabled) {
      // Même si le son est coupé, on conserve la vibration tactile si disponible
      this.vibrate([260, 140, 260, 140, 260]);
      return;
    }
    this.stopDriverReadyAlarm();
    this.isDriverAlarmPlaying = true;

    const pulses = Math.max(1, Math.round(durationSeconds));
    const intervalMs = 1000;

    // Salve immédiate (synchrone dans le geste si déclenchée par clic "Test 10s", fiable sur Android)
    this.vibrate([280, 130, 280]);
    this.playDriverReadyBurst();

    for (let i = 1; i < pulses; i++) {
      const id = window.setTimeout(() => {
        if (this.isDriverAlarmPlaying) {
          // Impulsions courtes par salve : beaucoup mieux exécutées par les téléphones Android (Tecno, Infinix, Samsung, Xiaomi)
          this.vibrate([280, 130, 280]);
          this.playDriverReadyBurst();
        }
      }, i * intervalMs);
      this.driverAlarmTimers.push(id);
    }

    const endId = window.setTimeout(() => {
      this.isDriverAlarmPlaying = false;
      this.driverAlarmTimers = [];
      onEnd?.();
    }, pulses * intervalMs);
    this.driverAlarmTimers.push(endId);
  }

  /**
   * Coupe immédiatement l'alerte sonore & la vibration livreur
   */
  public stopDriverReadyAlarm() {
    this.isDriverAlarmPlaying = false;
    for (const id of this.driverAlarmTimers) {
      window.clearTimeout(id);
    }
    this.driverAlarmTimers = [];
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(0);
      }
    } catch {
      // ignore
    }
  }
}

export const soundNotifier = new SoundNotifier();
