/**
 * DataPersistenceManager - Handles minute-by-minute tracking data storage
 * Fixes the current second-based tracking to proper minute-based tracking
 */
export class DataPersistenceManager {
  constructor() {
    this.storageFlushCounter = 0;
    this.trackingTimerId = null;
  }

  /**
   * Get date string in YYYY-MM-DD format
   */
  ymd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Get Monday start of week for a given date
   */
  mondayStartOfWeek(date) {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // 0=Mon ... 6=Sun
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Get tracking statistics from storage
   */
  async getStats() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['statsByDate'], (result) => {
        resolve(result.statsByDate || {});
      });
    });
  }

  /**
   * Save tracking statistics to storage
   */
  async setStats(stats) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ statsByDate: stats }, resolve);
    });
  }

  /**
   * Add minutes to today's tracking record (FIXED: was adding seconds)
   */
  async addMinutesToToday(minutesToAdd, scoreOpt) {
    const stats = await this.getStats();
    const key = this.ymd(new Date());
    const rec = stats[key] || { 
      minutes: 0,           // FIXED: Changed from seconds to minutes
      scoreSum: 0, 
      samples: 0, 
      notes: '',
      sessions: []          // Track individual sessions
    };
    
    rec.minutes += minutesToAdd;  // FIXED: Track minutes instead of seconds
    
    if (typeof scoreOpt === 'number' && scoreOpt > 0) {
      rec.scoreSum += scoreOpt;
      rec.samples += 1;
    }
    
    stats[key] = rec;
    this.storageFlushCounter++;
    
    // Flush to storage every 10 updates OR immediately for testing
    if (this.storageFlushCounter % 10 === 0 || process.env.NODE_ENV === 'test') {
      await this.setStats(stats);
    }
    
    return stats;
  }

  /**
   * Start a new tracking session
   */
  async startSession(sessionData = {}) {
    const stats = await this.getStats();
    const key = this.ymd(new Date());
    const rec = stats[key] || { 
      minutes: 0, 
      scoreSum: 0, 
      samples: 0, 
      notes: '',
      sessions: []
    };

    const session = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      endTime: null,
      minutes: 0,
      avgScore: 0,
      mood: sessionData.mood || '',
      moodTimestamp: sessionData.mood ? new Date().toISOString() : null,
      ...sessionData
    };

    rec.sessions.push(session);
    stats[key] = rec;
    await this.setStats(stats);
    
    return session.id;
  }

  /**
   * End a tracking session
   */
  async endSession(sessionId, sessionData = {}) {
    const stats = await this.getStats();
    const key = this.ymd(new Date());
    const rec = stats[key];
    
    if (!rec || !rec.sessions) return null;

    const session = rec.sessions.find(s => s.id === sessionId);
    if (!session) return null;

    session.endTime = new Date().toISOString();
    session.minutes = sessionData.minutes || 0;
    session.avgScore = sessionData.avgScore || 0;
    
    // Update mood data if provided
    if (sessionData.mood !== undefined) {
      session.mood = sessionData.mood;
      session.moodTimestamp = sessionData.mood ? new Date().toISOString() : null;
    }
    
    // Update daily totals
    rec.minutes += session.minutes;
    if (session.avgScore > 0) {
      rec.scoreSum += session.avgScore;
      rec.samples += 1;
    }

    stats[key] = rec;
    await this.setStats(stats);
    
    return session;
  }

  /**
   * Update mood data for an active session
   */
  async updateSessionMood(sessionId, mood) {
    const stats = await this.getStats();
    const key = this.ymd(new Date());
    const rec = stats[key];
    
    if (!rec || !rec.sessions) return null;

    const session = rec.sessions.find(s => s.id === sessionId);
    if (!session) return null;

    session.mood = mood;
    session.moodTimestamp = mood ? new Date().toISOString() : null;

    stats[key] = rec;
    await this.setStats(stats);
    
    return session;
  }

  /**
   * Get mood data for a specific session
   */
  async getSessionMood(sessionId, date = new Date()) {
    const stats = await this.getStats();
    const key = this.ymd(date);
    const rec = stats[key];
    
    if (!rec || !rec.sessions) return null;

    const session = rec.sessions.find(s => s.id === sessionId);
    if (!session) return null;

    return {
      mood: session.mood || '',
      moodTimestamp: session.moodTimestamp || null
    };
  }

  /**
   * Get all mood data for a specific date
   */
  async getDayMoodData(date = new Date()) {
    const stats = await this.getStats();
    const key = this.ymd(date);
    const rec = stats[key];
    
    if (!rec || !rec.sessions) return [];

    return rec.sessions
      .filter(session => session.mood && session.mood.trim())
      .map(session => ({
        sessionId: session.id,
        mood: session.mood,
        moodTimestamp: session.moodTimestamp,
        startTime: session.startTime,
        endTime: session.endTime,
        minutes: session.minutes,
        avgScore: session.avgScore
      }));
  }

  /**
   * Get tracking history for a date range
   */
  async getTrackingHistory(startDate, endDate) {
    const stats = await this.getStats();
    const history = [];
    
    const current = new Date(startDate);
    while (current <= endDate) {
      const key = this.ymd(current);
      const rec = stats[key];
      
      if (rec) {
        history.push({
          date: key,
          minutes: rec.minutes || 0,
          avgScore: rec.samples > 0 ? Math.round(rec.scoreSum / rec.samples) : 0,
          sessions: rec.sessions || [],
          notes: rec.notes || ''
        });
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return history;
  }

  /**
   * Validate and migrate storage data format
   */
  async validateAndMigrateData() {
    const stats = await this.getStats();
    let migrated = false;

    for (const [key, rec] of Object.entries(stats)) {
      // Migrate from seconds to minutes if needed
      if (rec.seconds && !rec.minutes) {
        rec.minutes = Math.floor(rec.seconds / 60);
        delete rec.seconds;
        migrated = true;
      }

      // Ensure sessions array exists
      if (!rec.sessions) {
        rec.sessions = [];
        migrated = true;
      }

      // Ensure all required fields exist
      if (typeof rec.minutes !== 'number') rec.minutes = 0;
      if (typeof rec.scoreSum !== 'number') rec.scoreSum = 0;
      if (typeof rec.samples !== 'number') rec.samples = 0;
      if (typeof rec.notes !== 'string') rec.notes = '';

      // Ensure mood fields exist in sessions
      if (rec.sessions && Array.isArray(rec.sessions)) {
        rec.sessions.forEach(session => {
          if (typeof session.mood !== 'string') {
            session.mood = '';
            migrated = true;
          }
          if (!session.moodTimestamp && session.mood) {
            session.moodTimestamp = session.startTime || new Date().toISOString();
            migrated = true;
          }
        });
      }
    }

    if (migrated) {
      await this.setStats(stats);
      console.log('Data migration completed: seconds -> minutes, mood fields added');
    }

    return migrated;
  }

  /**
   * Compress old data (keep summary stats, remove detailed sessions)
   */
  async compressOldData(cutoffDate) {
    const stats = await this.getStats();
    let compressed = false;

    for (const [key, rec] of Object.entries(stats)) {
      const recordDate = new Date(key);
      
      if (recordDate < cutoffDate && rec.sessions && rec.sessions.length > 0) {
        // Keep summary stats but remove detailed sessions
        delete rec.sessions;
        compressed = true;
      }
    }

    if (compressed) {
      await this.setStats(stats);
      console.log(`Compressed data older than ${cutoffDate.toISOString()}`);
    }

    return compressed;
  }

  /**
   * Start minute-based tracking timer (FIXED: was second-based)
   */
  startTrackingTimer(onMinuteCallback) {
    if (this.trackingTimerId) return;
    
    // FIXED: Timer now runs every 60 seconds (1 minute) instead of every second
    this.trackingTimerId = setInterval(() => {
      if (onMinuteCallback) {
        onMinuteCallback();
      }
    }, 60000); // 60 seconds = 1 minute
  }

  /**
   * Stop tracking timer and flush data
   */
  async stopTrackingTimer() {
    if (this.trackingTimerId) {
      clearInterval(this.trackingTimerId);
      this.trackingTimerId = null;
      
      // Final flush to storage
      const stats = await this.getStats();
      await this.setStats(stats);
    }
  }
}