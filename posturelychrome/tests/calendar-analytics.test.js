import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock calendar analytics functionality based on existing sidepanel.js
describe('Calendar Analytics', () => {
  let mockStorage;
  let calendarFunctions;

  beforeEach(() => {
    mockStorage = {};
    
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = {};
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          result[key] = mockStorage[key];
        });
      } else if (typeof keys === 'string') {
        result[keys] = mockStorage[keys];
      }
      callback(result);
    });

    chrome.storage.local.set.mockImplementation((data, callback) => {
      Object.assign(mockStorage, data);
      if (callback) callback();
    });

    // Calendar utility functions from sidepanel.js
    calendarFunctions = {
      ymd: (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      },
      
      mondayStartOfWeek: (d) => {
        const date = new Date(d);
        const day = (date.getDay() + 6) % 7;
        date.setDate(date.getDate() - day);
        date.setHours(0, 0, 0, 0);
        return date;
      },

      getStats: () => {
        return new Promise((resolve) => {
          chrome.storage.local.get(['statsByDate'], (res) => {
            resolve(res.statsByDate || {});
          });
        });
      },

      setStats: (stats) => {
        return new Promise((resolve) => {
          chrome.storage.local.set({ statsByDate: stats }, resolve);
        });
      }
    };
  });

  describe('Calendar Data Rendering', () => {
    it('should correctly format dates for calendar display', () => {
      const testDate = new Date('2024-10-31T15:30:00');
      const formatted = calendarFunctions.ymd(testDate);
      expect(formatted).toBe('2024-10-31');
    });

    it('should calculate Monday start of week correctly', () => {
      const friday = new Date('2024-11-01T15:30:00'); // Friday
      const monday = calendarFunctions.mondayStartOfWeek(friday);
      
      expect(monday.getDay()).toBe(1); // Monday
      expect(monday.getHours()).toBe(0);
      expect(monday.getMinutes()).toBe(0);
      expect(monday.getSeconds()).toBe(0);
    });

    it('should generate calendar grid data correctly', async () => {
      // Set up test data for October 2024
      mockStorage.statsByDate = {
        '2024-10-01': { minutes: 45, scoreSum: 3600, samples: 45, notes: 'Good start' },
        '2024-10-15': { minutes: 60, scoreSum: 4800, samples: 60, notes: 'Productive day' },
        '2024-10-31': { minutes: 30, scoreSum: 2400, samples: 30, notes: 'Halloween work' }
      };

      const stats = await calendarFunctions.getStats();
      
      // Verify data structure
      expect(stats['2024-10-01'].minutes).toBe(45);
      expect(stats['2024-10-15'].minutes).toBe(60);
      expect(stats['2024-10-31'].minutes).toBe(30);
      
      // Calculate average scores
      expect(Math.round(stats['2024-10-01'].scoreSum / stats['2024-10-01'].samples)).toBe(80);
      expect(Math.round(stats['2024-10-15'].scoreSum / stats['2024-10-15'].samples)).toBe(80);
      expect(Math.round(stats['2024-10-31'].scoreSum / stats['2024-10-31'].samples)).toBe(80);
    });
  });

  describe('Day Selection and Statistics', () => {
    it('should calculate daily statistics correctly', async () => {
      mockStorage.statsByDate = {
        '2024-10-31': { 
          minutes: 90,
          scoreSum: 7200, // 90 * 80 average
          samples: 90,
          notes: 'Very productive day',
          sessions: [
            { id: '1', minutes: 45, avgScore: 85, mood: 'focused' },
            { id: '2', minutes: 45, avgScore: 75, mood: 'tired' }
          ]
        }
      };

      const stats = await calendarFunctions.getStats();
      const dayData = stats['2024-10-31'];
      
      expect(dayData.minutes).toBe(90);
      expect(Math.round(dayData.scoreSum / dayData.samples)).toBe(80);
      expect(dayData.sessions).toHaveLength(2);
      expect(dayData.notes).toBe('Very productive day');
    });

    it('should handle days with no tracking data', async () => {
      const stats = await calendarFunctions.getStats();
      const emptyDay = stats['2024-10-30'] || { minutes: 0, scoreSum: 0, samples: 0, notes: '' };
      
      expect(emptyDay.minutes).toBe(0);
      expect(emptyDay.scoreSum).toBe(0);
      expect(emptyDay.samples).toBe(0);
    });

    it('should save and retrieve day notes correctly', async () => {
      const testNote = 'Had a great posture day, feeling energetic!';
      
      // Simulate saving a note
      const stats = await calendarFunctions.getStats();
      const key = '2024-10-31';
      const rec = stats[key] || { minutes: 0, scoreSum: 0, samples: 0, notes: '' };
      rec.notes = testNote;
      stats[key] = rec;
      
      await calendarFunctions.setStats(stats);
      
      // Verify note was saved
      const updatedStats = await calendarFunctions.getStats();
      expect(updatedStats[key].notes).toBe(testNote);
    });
  });

  describe('Weekly Strip Rendering', () => {
    it('should generate weekly progress data correctly', async () => {
      const today = new Date('2024-10-31'); // Thursday
      const monday = calendarFunctions.mondayStartOfWeek(today);
      
      // Set up week data
      const weekData = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const key = calendarFunctions.ymd(d);
        weekData[key] = { 
          minutes: (i + 1) * 15, // Increasing minutes each day
          scoreSum: (i + 1) * 15 * 80,
          samples: (i + 1) * 15
        };
      }
      
      mockStorage.statsByDate = weekData;
      const stats = await calendarFunctions.getStats();
      
      // Generate week strip data
      const weekStrip = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const key = calendarFunctions.ymd(d);
        const rec = stats[key] || { minutes: 0 };
        const minutes = rec.minutes;
        const pct = Math.min(1, minutes / 60); // Progress towards 60 minutes
        const deg = Math.round(360 * pct);
        
        weekStrip.push({
          day: d.getDate(),
          minutes: minutes,
          percentage: pct,
          degrees: deg,
          label: d.toLocaleDateString(undefined, { weekday: 'short' })
        });
      }
      
      expect(weekStrip).toHaveLength(7);
      expect(weekStrip[0].minutes).toBe(15);
      expect(weekStrip[6].minutes).toBe(105);
      expect(weekStrip[0].degrees).toBe(90); // 15/60 * 360
      expect(weekStrip[6].degrees).toBe(360); // 105/60 * 360 (capped at 360)
    });
  });

  describe('Calendar Navigation', () => {
    it('should handle month navigation correctly', () => {
      let calendarCursor = new Date('2024-10-15');
      
      // Navigate to previous month
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
      expect(calendarCursor.getMonth()).toBe(8); // September (0-indexed)
      expect(calendarCursor.getFullYear()).toBe(2024);
      
      // Navigate to next month
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
      expect(calendarCursor.getMonth()).toBe(9); // October
      
      // Navigate across year boundary
      calendarCursor = new Date('2024-12-15');
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
      expect(calendarCursor.getMonth()).toBe(0); // January
      expect(calendarCursor.getFullYear()).toBe(2025);
    });

    it('should generate correct calendar grid for any month', () => {
      const testDate = new Date('2024-10-01'); // October 2024
      const firstOfMonth = new Date(testDate.getFullYear(), testDate.getMonth(), 1);
      const start = calendarFunctions.mondayStartOfWeek(firstOfMonth);
      
      // October 1, 2024 is a Tuesday, so Monday start should be September 30
      expect(start.getDate()).toBe(30);
      expect(start.getMonth()).toBe(8); // September
      
      // Generate 42 days (6 weeks) for calendar grid
      const calendarDays = [];
      for (let i = 0; i < 42; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        calendarDays.push({
          date: d.getDate(),
          month: d.getMonth(),
          isCurrentMonth: d.getMonth() === testDate.getMonth()
        });
      }
      
      expect(calendarDays).toHaveLength(42);
      
      // First few days should be from previous month
      expect(calendarDays[0].isCurrentMonth).toBe(false);
      expect(calendarDays[1].isCurrentMonth).toBe(true); // October 1st
      
      // Last few days should be from next month
      expect(calendarDays[41].isCurrentMonth).toBe(false);
    });
  });

  describe('Data Migration for Calendar', () => {
    it('should handle legacy seconds-based data in calendar display', async () => {
      // Set up legacy data
      mockStorage.statsByDate = {
        '2024-10-30': { seconds: 3600, scoreSum: 2400, samples: 40 }, // 1 hour in seconds
        '2024-10-31': { minutes: 45, scoreSum: 3600, samples: 45 }    // Already migrated
      };

      const stats = await calendarFunctions.getStats();
      
      // Calendar should handle both formats
      const oct30 = stats['2024-10-30'];
      const oct31 = stats['2024-10-31'];
      
      // Legacy data (seconds)
      expect(oct30.seconds).toBe(3600);
      const oct30Minutes = oct30.minutes || Math.floor((oct30.seconds || 0) / 60);
      expect(oct30Minutes).toBe(60);
      
      // Migrated data (minutes)
      expect(oct31.minutes).toBe(45);
      expect(oct31.seconds).toBeUndefined();
    });
  });
});