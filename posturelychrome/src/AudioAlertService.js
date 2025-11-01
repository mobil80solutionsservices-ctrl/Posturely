/**
 * AudioAlertService - Manages audio notifications for posture alerts
 * Provides different alert sounds and user preference management
 */
export class AudioAlertService {
  constructor() {
    this.audioContext = null;
    this.isEnabled = true;
    this.alertVolume = 0.3; // 30% volume by default
    this.alertType = 'gentle'; // 'gentle', 'standard', 'urgent'
    this.lastPlayTime = 0;
    this.minPlayInterval = 1000; // Minimum 1 second between plays
    
    this.loadPreferences();
  }

  /**
   * Load audio alert preferences from storage
   */
  async loadPreferences() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['audioAlertPreferences'], (result) => {
        const prefs = result.audioAlertPreferences || {};
        this.isEnabled = prefs.enabled !== false; // default to true
        this.alertVolume = prefs.volume || 0.3;
        this.alertType = prefs.type || 'gentle';
        resolve();
      });
    });
  }

  /**
   * Save audio alert preferences to storage
   */
  async savePreferences() {
    const preferences = {
      enabled: this.isEnabled,
      volume: this.alertVolume,
      type: this.alertType
    };
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ audioAlertPreferences: preferences }, resolve);
    });
  }

  /**
   * Initialize audio context if needed
   */
  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Resume audio context if suspended (required by some browsers)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Play posture alert sound
   */
  playPostureAlert() {
    if (!this.isEnabled) {
      console.log('Audio alerts disabled, skipping sound');
      return;
    }

    const now = Date.now();
    if (now - this.lastPlayTime < this.minPlayInterval) {
      console.log('Audio alert rate limited');
      return;
    }

    this.lastPlayTime = now;

    try {
      this.initAudioContext();
      
      switch (this.alertType) {
        case 'gentle':
          this.playGentleAlert();
          break;
        case 'standard':
          this.playStandardAlert();
          break;
        case 'urgent':
          this.playUrgentAlert();
          break;
        default:
          this.playGentleAlert();
      }
      
      console.log(`Played ${this.alertType} posture alert`);
    } catch (error) {
      console.error('Failed to play posture alert:', error);
    }
  }

  /**
   * Play gentle alert sound (soft chime)
   */
  playGentleAlert() {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Gentle chime: 800Hz -> 600Hz
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.3);
    
    // Soft volume envelope
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.alertVolume * 0.5, this.audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);
    
    oscillator.type = 'sine';
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.4);
  }

  /**
   * Play standard alert sound (double beep)
   */
  playStandardAlert() {
    // First beep
    this.createBeep(600, 0.15, 0);
    
    // Second beep after short pause
    setTimeout(() => {
      this.createBeep(600, 0.15, 0);
    }, 200);
  }

  /**
   * Play urgent alert sound (triple ascending beeps)
   */
  playUrgentAlert() {
    // Three ascending beeps
    this.createBeep(500, 0.12, 0);
    setTimeout(() => this.createBeep(650, 0.12, 0), 150);
    setTimeout(() => this.createBeep(800, 0.15, 0), 300);
  }

  /**
   * Create a single beep sound
   */
  createBeep(frequency, duration, delay) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime + delay);
    
    // Volume envelope
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(this.alertVolume, this.audioContext.currentTime + delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + delay + duration);
    
    oscillator.type = 'triangle';
    oscillator.start(this.audioContext.currentTime + delay);
    oscillator.stop(this.audioContext.currentTime + delay + duration);
  }

  /**
   * Check if audio alerts are enabled
   */
  isAudioEnabled() {
    return this.isEnabled;
  }

  /**
   * Configure alert sound preferences
   */
  async configureAlertPreferences(settings) {
    if (settings.enabled !== undefined) {
      this.isEnabled = settings.enabled;
    }
    if (settings.volume !== undefined) {
      this.alertVolume = Math.max(0, Math.min(1, settings.volume));
    }
    if (settings.type !== undefined && ['gentle', 'standard', 'urgent'].includes(settings.type)) {
      this.alertType = settings.type;
    }
    
    await this.savePreferences();
    console.log('Audio alert preferences updated:', {
      enabled: this.isEnabled,
      volume: this.alertVolume,
      type: this.alertType
    });
  }

  /**
   * Test audio alert (for settings preview)
   */
  testAlert() {
    console.log('Testing audio alert...');
    this.playPostureAlert();
  }

  /**
   * Enable or disable audio alerts
   */
  async setEnabled(enabled) {
    this.isEnabled = enabled;
    await this.savePreferences();
    console.log(`Audio alerts ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set alert volume (0.0 to 1.0)
   */
  async setVolume(volume) {
    this.alertVolume = Math.max(0, Math.min(1, volume));
    await this.savePreferences();
    console.log(`Audio alert volume set to: ${Math.round(this.alertVolume * 100)}%`);
  }

  /**
   * Set alert type
   */
  async setAlertType(type) {
    if (['gentle', 'standard', 'urgent'].includes(type)) {
      this.alertType = type;
      await this.savePreferences();
      console.log(`Audio alert type set to: ${type}`);
    }
  }

  /**
   * Get current audio alert status
   */
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      volume: this.alertVolume,
      type: this.alertType,
      hasAudioContext: !!this.audioContext,
      audioContextState: this.audioContext ? this.audioContext.state : 'not-initialized'
    };
  }

  /**
   * Play a success sound (for positive feedback)
   */
  playSuccessSound() {
    if (!this.isEnabled) return;

    try {
      this.initAudioContext();
      
      // Pleasant ascending chime
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Success chime: 523Hz -> 659Hz -> 784Hz (C -> E -> G)
      oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2);
      
      // Gentle volume envelope
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.alertVolume * 0.6, this.audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);
      
      oscillator.type = 'sine';
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.4);
      
    } catch (error) {
      console.error('Failed to play success sound:', error);
    }
  }

  /**
   * Cleanup audio resources
   */
  cleanup() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}