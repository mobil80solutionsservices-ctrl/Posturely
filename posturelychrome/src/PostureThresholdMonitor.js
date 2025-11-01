/**
 * PostureThresholdMonitor - Monitors current posture score against user threshold
 * Triggers audio alerts when posture drops below threshold
 */
export class PostureThresholdMonitor {
  constructor(audioAlertService) {
    this.audioAlertService = audioAlertService;
    this.thresholdValue = 80; // default threshold
    this.isEnabled = true;
    this.isMonitoring = false;
    this.consecutiveLowScoreCount = 0;
    this.lastAlertTime = 0;
    this.alertCooldownMs = 30000; // 30 seconds between alerts
    this.requiredLowScoreCount = 10; // ~2 seconds at 200ms intervals
    
    this.loadConfiguration();
  }

  /**
   * Load threshold configuration from storage
   */
  async loadConfiguration() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['postureThresholdConfig'], (result) => {
        const config = result.postureThresholdConfig || {};
        this.thresholdValue = config.threshold || 80;
        this.isEnabled = config.audioEnabled !== false; // default to true
        this.alertCooldownMs = config.alertCooldown || 30000;
        resolve();
      });
    });
  }

  /**
   * Save threshold configuration to storage
   */
  async saveConfiguration() {
    const config = {
      threshold: this.thresholdValue,
      audioEnabled: this.isEnabled,
      alertCooldown: this.alertCooldownMs
    };
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ postureThresholdConfig: config }, resolve);
    });
  }

  /**
   * Update threshold configuration
   */
  async updateConfiguration(config) {
    if (config.threshold !== undefined) {
      this.thresholdValue = Math.max(50, Math.min(95, config.threshold));
    }
    if (config.audioEnabled !== undefined) {
      this.isEnabled = config.audioEnabled;
    }
    if (config.alertCooldown !== undefined) {
      this.alertCooldownMs = Math.max(5000, config.alertCooldown);
    }
    
    await this.saveConfiguration();
    console.log('Posture threshold configuration updated:', {
      threshold: this.thresholdValue,
      audioEnabled: this.isEnabled,
      alertCooldown: this.alertCooldownMs
    });
  }

  /**
   * Start monitoring posture scores
   */
  startMonitoring() {
    this.isMonitoring = true;
    this.consecutiveLowScoreCount = 0;
    this.lastAlertTime = 0;
    console.log('Posture threshold monitoring started');
  }

  /**
   * Stop monitoring posture scores
   */
  stopMonitoring() {
    this.isMonitoring = false;
    this.consecutiveLowScoreCount = 0;
    console.log('Posture threshold monitoring stopped');
  }

  /**
   * Monitor current posture score against threshold
   */
  monitorPostureScore(currentScore) {
    if (!this.isMonitoring || !this.isEnabled) {
      return;
    }

    const isLowScore = currentScore < this.thresholdValue;
    
    if (isLowScore) {
      this.consecutiveLowScoreCount++;
      
      // Check if we should trigger an alert
      if (this.shouldTriggerAlert()) {
        this.triggerPostureAlert(currentScore);
      }
    } else {
      // Reset counter when posture improves
      this.consecutiveLowScoreCount = 0;
    }
  }

  /**
   * Check if threshold is breached and alert should be triggered
   */
  checkThresholdBreach(score) {
    return score < this.thresholdValue;
  }

  /**
   * Determine if an alert should be triggered based on conditions
   */
  shouldTriggerAlert() {
    const now = Date.now();
    const timeSinceLastAlert = now - this.lastAlertTime;
    
    // Trigger if we have enough consecutive low scores and cooldown has passed
    return this.consecutiveLowScoreCount >= this.requiredLowScoreCount && 
           timeSinceLastAlert >= this.alertCooldownMs;
  }

  /**
   * Trigger posture alert when threshold is breached
   */
  triggerPostureAlert(currentScore) {
    if (!this.audioAlertService) {
      console.warn('AudioAlertService not available for posture alert');
      return;
    }

    const now = Date.now();
    this.lastAlertTime = now;
    this.consecutiveLowScoreCount = 0; // Reset to prevent immediate re-triggering

    // Play audio alert
    this.audioAlertService.playPostureAlert();

    // Log the alert event
    this.logAlertEvent(currentScore);

    console.log(`Posture alert triggered - Score: ${currentScore}, Threshold: ${this.thresholdValue}`);
  }

  /**
   * Log alert event for analytics
   */
  logAlertEvent(score) {
    const event = {
      timestamp: new Date().toISOString(),
      type: 'posture_alert',
      score: score,
      threshold: this.thresholdValue,
      consecutiveCount: this.consecutiveLowScoreCount
    };

    chrome.storage.local.get(['postureAlertEvents'], (result) => {
      const events = result.postureAlertEvents || [];
      events.push(event);
      
      // Keep only last 50 events
      if (events.length > 50) {
        events.splice(0, events.length - 50);
      }
      
      chrome.storage.local.set({ postureAlertEvents: events });
    });
  }

  /**
   * Get current monitoring status
   */
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      isMonitoring: this.isMonitoring,
      threshold: this.thresholdValue,
      consecutiveLowScoreCount: this.consecutiveLowScoreCount,
      alertCooldownMs: this.alertCooldownMs,
      timeSinceLastAlert: this.lastAlertTime > 0 ? Date.now() - this.lastAlertTime : null
    };
  }

  /**
   * Get alert statistics
   */
  async getAlertStats() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['postureAlertEvents'], (result) => {
        const events = result.postureAlertEvents || [];
        
        const stats = {
          totalAlerts: events.length,
          averageScore: events.length > 0 
            ? Math.round(events.reduce((sum, e) => sum + e.score, 0) / events.length)
            : 0,
          alertsToday: events.filter(e => {
            const eventDate = new Date(e.timestamp).toDateString();
            const today = new Date().toDateString();
            return eventDate === today;
          }).length,
          currentThreshold: this.thresholdValue,
          isEnabled: this.isEnabled
        };
        
        resolve(stats);
      });
    });
  }

  /**
   * Enable or disable audio alerts
   */
  async setAudioEnabled(enabled) {
    this.isEnabled = enabled;
    await this.saveConfiguration();
    console.log(`Posture audio alerts ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update threshold value
   */
  async setThreshold(threshold) {
    this.thresholdValue = Math.max(50, Math.min(95, threshold));
    await this.saveConfiguration();
    console.log(`Posture threshold updated to: ${this.thresholdValue}`);
  }

  /**
   * Reset alert statistics
   */
  resetStats() {
    chrome.storage.local.set({ postureAlertEvents: [] });
    console.log('Posture alert statistics reset');
  }
}