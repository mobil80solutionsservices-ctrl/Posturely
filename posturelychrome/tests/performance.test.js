import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataPersistenceManager } from '../src/DataPersistenceManager.js';
import { AIServicesManager } from '../src/AIServicesManager.js';

describe('Performance Tests', () => {
  let dataManager;
  let aiManager;
  let mockStorage;

  beforeEach(() => {
    dataManager = new DataPersistenceManager();
    aiManager = new AIServicesManager();
    
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

  describe('Storage Performance', () => {
    it('should handle rapid minute additions efficiently', async () => {
      const startTime = performance.now();
      
      // Simulate rapid minute tracking (100 minutes)
      for (let i = 0; i < 100; i++) {
        await dataManager.addMinutesToToday(1, Math.floor(Math.random() * 100) + 1); // Ensure score > 0
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      
      // Verify data integrity
      const stats = await dataManager.getStats();
      const today = dataManager.ymd(new Date());
      expect(stats[today].minutes).toBe(100);
      expect(stats[today].samples).toBe(100);
    });

    it('should efficiently query large date ranges', async () => {
      // Create 365 days of data
      const stats = {};
      const baseDate = new Date('2024-01-01');
      
      for (let i = 0; i < 365; i++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + i);
        const key = dataManager.ymd(date);
        
        stats[key] = {
          minutes: Math.floor(Math.random() * 120) + 30,
          scoreSum: Math.floor(Math.random() * 8000) + 2000,
          samples: Math.floor(Math.random() * 100) + 20,
          sessions: []
        };
      }
      
      mockStorage.statsByDate = stats;
      
      const startTime = performance.now();
      
      // Query 3 months of data
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-08-31');
      const history = await dataManager.getTrackingHistory(startDate, endDate);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete quickly (less than 100ms)
      expect(duration).toBeLessThan(100);
      expect(history.length).toBe(92); // ~3 months of data
    });

    it('should handle storage compression efficiently', async () => {
      // Create large dataset with sessions
      const stats = {};
      const baseDate = new Date('2023-01-01');
      
      for (let i = 0; i < 200; i++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + i);
        const key = dataManager.ymd(date);
        
        // Create sessions for each day
        const sessions = [];
        for (let j = 0; j < 5; j++) {
          sessions.push({
            id: `${i}-${j}`,
            startTime: new Date(date.getTime() + j * 3600000).toISOString(),
            endTime: new Date(date.getTime() + (j + 1) * 3600000).toISOString(),
            minutes: 60,
            avgScore: Math.floor(Math.random() * 40) + 60
          });
        }
        
        stats[key] = {
          minutes: 300, // 5 hours
          scoreSum: 4000,
          samples: 50,
          sessions: sessions
        };
      }
      
      mockStorage.statsByDate = stats;
      
      const startTime = performance.now();
      
      // Compress data older than 6 months
      const cutoffDate = new Date('2023-07-01');
      const compressed = await dataManager.compressOldData(cutoffDate);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(compressed).toBe(true);
      expect(duration).toBeLessThan(500); // Should complete within 500ms
      
      // Verify compression worked
      const compressedStats = await dataManager.getStats();
      const oldKey = dataManager.ymd(new Date('2023-03-01'));
      const newKey = dataManager.ymd(new Date('2023-09-01'));
      
      expect(compressedStats[oldKey]).toBeDefined();
      expect(compressedStats[oldKey].sessions).toBeUndefined();
      expect(compressedStats[oldKey].minutes).toBe(300); // Summary preserved
      
      if (compressedStats[newKey]) {
        expect(compressedStats[newKey].sessions).toHaveLength(5); // Recent data intact
      }
    });
  });

  describe('AI API Performance', () => {
    it('should handle AI API timeouts gracefully', async () => {
      // Mock slow AI response
      const slowAISession = {
        prompt: vi.fn(() => new Promise(resolve => setTimeout(() => resolve('Slow response'), 2000))),
        destroy: vi.fn()
      };
      
      chrome.aiOriginTrial = {
        summarizer: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn(() => slowAISession)
        }
      };
      
      const startTime = performance.now();
      
      // This should timeout and fall back to cached content
      const summary = await Promise.race([
        aiManager.generatePostureSummary({ minutes: 30, avgScore: 85 }),
        new Promise(resolve => setTimeout(() => resolve('timeout'), 1000))
      ]);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should either get AI response or fallback within reasonable time
      expect(duration).toBeLessThan(2500);
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should efficiently batch process AI requests', async () => {
      // Mock fast AI responses
      const fastAISession = {
        prompt: vi.fn()
          .mockResolvedValueOnce('Summary 1')
          .mockResolvedValueOnce('Motivation 1')
          .mockResolvedValueOnce('Summary 2')
          .mockResolvedValueOnce('Motivation 2'),
        translate: vi.fn().mockResolvedValue('Translated text'),
        destroy: vi.fn()
      };
      
      chrome.aiOriginTrial = {
        summarizer: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn(() => fastAISession)
        },
        writer: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn(() => fastAISession)
        },
        translator: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn(() => fastAISession)
        }
      };
      
      const requests = [
        { type: 'summary', sessionData: { minutes: 30, avgScore: 85 } },
        { type: 'motivational', performance: { avgScore: 85, minutes: 30 } },
        { type: 'summary', sessionData: { minutes: 45, avgScore: 90 } },
        { type: 'motivational', performance: { avgScore: 90, minutes: 45 } },
        { type: 'translation', text: 'Hello world', targetLanguage: 'es' }
      ];
      
      const startTime = performance.now();
      const results = await aiManager.batchProcess(requests);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should process all requests efficiently
      expect(duration).toBeLessThan(1000);
      expect(results).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should measure AI API response times', async () => {
      const responseTimes = [];
      
      // Mock AI with variable response times
      const variableAISession = {
        prompt: vi.fn(() => {
          const delay = Math.random() * 200 + 50; // 50-250ms
          return new Promise(resolve => 
            setTimeout(() => resolve('AI response'), delay)
          );
        }),
        destroy: vi.fn()
      };
      
      chrome.aiOriginTrial = {
        writer: {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
          create: vi.fn(() => variableAISession)
        }
      };
      
      // Test multiple requests
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        await aiManager.generateMotivationalMessage({
          avgScore: Math.floor(Math.random() * 40) + 60,
          minutes: Math.floor(Math.random() * 60) + 30
        });
        
        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
      }
      
      // Calculate statistics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      
      // Verify reasonable performance
      expect(avgResponseTime).toBeLessThan(300); // Average under 300ms
      expect(maxResponseTime).toBeLessThan(500); // Max under 500ms
      expect(minResponseTime).toBeGreaterThan(40); // Min over 40ms (realistic)
      
      console.log(`AI Response Times - Avg: ${avgResponseTime.toFixed(2)}ms, Min: ${minResponseTime.toFixed(2)}ms, Max: ${maxResponseTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during extended tracking', async () => {
      // Simulate extended tracking session
      const initialMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      
      // Start tracking timer
      let minuteCount = 0;
      dataManager.startTrackingTimer(() => {
        minuteCount++;
      });
      
      // Simulate 1000 minute updates
      for (let i = 0; i < 1000; i++) {
        await dataManager.addMinutesToToday(1, Math.floor(Math.random() * 100) + 1); // Ensure score > 0
        
        // Occasionally trigger garbage collection simulation
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }
      
      await dataManager.stopTrackingTimer();
      
      const finalMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB for 1000 operations)
      if (process.memoryUsage) {
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
      }
      
      // Verify data integrity
      const stats = await dataManager.getStats();
      const today = dataManager.ymd(new Date());
      expect(stats[today].minutes).toBe(1000);
    });
  });
});