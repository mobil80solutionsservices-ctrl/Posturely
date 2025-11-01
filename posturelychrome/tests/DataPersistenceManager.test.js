import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataPersistenceManager } from '../src/DataPersistenceManager.js';

describe('DataPersistenceManager', () => {
  let manager;
  let mockStorage;

  beforeEach(() => {
    manager = new DataPersistenceManager();
    
    // Reset chrome storage mock
    mockStorage = {};
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          result[key] = mockStorage[key];
        });
      } else if (typeof keys === 'string') {
        result[keys] = mockStorage[keys];
      } else if (keys && typeof keys === 'object') {
        Object.keys(keys).forEach(key => {
          result[key] = mockStorage[key] || keys[key];
        });
      }
      callback(result);
    });

    chrome.storage.local.set.mockImplementation((data, callback) => {
      Object.assign(mockStorage, data);
      if (callback) callback();
    });
  });

  describe('Date utilities', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2024-10-31T15:30:00');
      expect(manager.ymd(date)).toBe('2024-10-31');
    });

    it('should get Monday start of week', () => {
      const friday = new Date('2024-11-01T15:30:00'); // Friday
      const monday = manager.mondayStartOfWeek(friday);
      expect(monday.getDay()).toBe(1); // Monday
      expect(monday.getHours()).toBe(0);
      expect(monday.getMinutes()).toBe(0);
    });
  });

  describe('Storage operations', () => {
    it('should get empty stats when no data exists', async () => {
      const stats = await manager.getStats();
      expect(stats).toEqual({});
    });

    it('should save and retrieve stats', async () => {
      const testStats = {
        '2024-10-31': { minutes: 45, scoreSum: 400, samples: 5 }
      };
      
      await manager.setStats(testStats);
      const retrieved = await manager.getStats();
      
      expect(retrieved).toEqual(testStats);
    });
  });

  describe('Minute tracking (FIXED functionality)', () => {
    it('should add minutes to today correctly', async () => {
      const today = manager.ymd(new Date());
      
      await manager.addMinutesToToday(15, 85);
      const stats = await manager.getStats();
      
      expect(stats[today]).toEqual({
        minutes: 15,  // FIXED: Should be minutes, not seconds
        scoreSum: 85,
        samples: 1,
        notes: '',
        sessions: []
      });
    });

    it('should accumulate minutes across multiple calls', async () => {
      const today = manager.ymd(new Date());
      
      await manager.addMinutesToToday(10, 80);
      await manager.addMinutesToToday(5, 90);
      
      const stats = await manager.getStats();
      
      expect(stats[today].minutes).toBe(15);
      expect(stats[today].scoreSum).toBe(170);
      expect(stats[today].samples).toBe(2);
    });

    it('should handle score-less minute additions', async () => {
      const today = manager.ymd(new Date());
      
      await manager.addMinutesToToday(20);
      const stats = await manager.getStats();
      
      expect(stats[today].minutes).toBe(20);
      expect(stats[today].scoreSum).toBe(0);
      expect(stats[today].samples).toBe(0);
    });
  });

  describe('Session management', () => {
    it('should start a new session', async () => {
      const sessionId = await manager.startSession({ mood: 'focused' });
      const stats = await manager.getStats();
      const today = manager.ymd(new Date());
      
      expect(sessionId).toBeTruthy();
      expect(stats[today].sessions).toHaveLength(1);
      expect(stats[today].sessions[0].mood).toBe('focused');
      expect(stats[today].sessions[0].startTime).toBeTruthy();
      expect(stats[today].sessions[0].endTime).toBeNull();
    });

    it('should end a session and update totals', async () => {
      const sessionId = await manager.startSession();
      const session = await manager.endSession(sessionId, { 
        minutes: 30, 
        avgScore: 85 
      });
      
      expect(session.endTime).toBeTruthy();
      expect(session.minutes).toBe(30);
      expect(session.avgScore).toBe(85);
      
      const stats = await manager.getStats();
      const today = manager.ymd(new Date());
      
      expect(stats[today].minutes).toBe(30);
      expect(stats[today].scoreSum).toBe(85);
      expect(stats[today].samples).toBe(1);
    });
  });

  describe('Data migration', () => {
    it('should migrate seconds to minutes', async () => {
      // Set up old format data
      mockStorage.statsByDate = {
        '2024-10-31': { seconds: 3600, scoreSum: 400, samples: 5 }
      };
      
      const migrated = await manager.validateAndMigrateData();
      const stats = await manager.getStats();
      
      expect(migrated).toBe(true);
      expect(stats['2024-10-31'].minutes).toBe(60); // 3600 seconds = 60 minutes
      expect(stats['2024-10-31'].seconds).toBeUndefined();
    });

    it('should add missing sessions array', async () => {
      mockStorage.statsByDate = {
        '2024-10-31': { minutes: 45, scoreSum: 400, samples: 5 }
      };
      
      await manager.validateAndMigrateData();
      const stats = await manager.getStats();
      
      expect(stats['2024-10-31'].sessions).toEqual([]);
    });
  });

  describe('Tracking history', () => {
    it('should get tracking history for date range', async () => {
      mockStorage.statsByDate = {
        '2024-10-30': { minutes: 30, scoreSum: 240, samples: 3, notes: 'Good day' },
        '2024-10-31': { minutes: 45, scoreSum: 400, samples: 5, notes: 'Great focus' }
      };
      
      const startDate = new Date('2024-10-30');
      const endDate = new Date('2024-10-31');
      const history = await manager.getTrackingHistory(startDate, endDate);
      
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({
        date: '2024-10-30',
        minutes: 30,
        avgScore: 80, // 240/3
        sessions: [],
        notes: 'Good day'
      });
      expect(history[1]).toEqual({
        date: '2024-10-31',
        minutes: 45,
        avgScore: 80, // 400/5
        sessions: [],
        notes: 'Great focus'
      });
    });
  });

  describe('Data compression', () => {
    it('should compress old session data', async () => {
      const oldDate = new Date('2024-01-01');
      mockStorage.statsByDate = {
        '2024-01-01': { 
          minutes: 60, 
          scoreSum: 400, 
          samples: 5,
          sessions: [{ id: '1', startTime: '2024-01-01T10:00:00Z' }]
        }
      };
      
      const cutoffDate = new Date('2024-06-01');
      const compressed = await manager.compressOldData(cutoffDate);
      const stats = await manager.getStats();
      
      expect(compressed).toBe(true);
      expect(stats['2024-01-01'].sessions).toBeUndefined();
      expect(stats['2024-01-01'].minutes).toBe(60); // Summary stats preserved
    });
  });

  describe('Timer functionality (FIXED)', () => {
    it('should start minute-based timer', () => {
      const callback = vi.fn();
      manager.startTrackingTimer(callback);
      
      expect(manager.trackingTimerId).toBeTruthy();
      
      // Clean up
      manager.stopTrackingTimer();
    });

    it('should not start multiple timers', () => {
      manager.startTrackingTimer();
      const firstTimerId = manager.trackingTimerId;
      
      manager.startTrackingTimer();
      expect(manager.trackingTimerId).toBe(firstTimerId);
      
      // Clean up
      manager.stopTrackingTimer();
    });

    it('should stop timer and flush data', async () => {
      manager.startTrackingTimer();
      expect(manager.trackingTimerId).toBeTruthy();
      
      await manager.stopTrackingTimer();
      expect(manager.trackingTimerId).toBeNull();
    });
  });
});