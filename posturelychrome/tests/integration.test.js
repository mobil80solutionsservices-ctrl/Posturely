import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataPersistenceManager } from '../src/DataPersistenceManager.js';
import { AIServicesManager } from '../src/AIServicesManager.js';
import { LanguageModelManager } from '../src/LanguageModelManager.js';

describe('Integration Tests - End-to-End Tracking Workflow', () => {
  let dataManager;
  let aiManager;
  let mockStorage;

  beforeEach(() => {
    dataManager = new DataPersistenceManager();
    aiManager = new AIServicesManager();
    
    // Reset storage mock
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

    // Mock Chrome AI APIs using global objects (corrected implementation)
    global.Summarizer = {
      availability: vi.fn().mockResolvedValue('readily'),
      create: vi.fn(() => ({
        summarize: vi.fn().mockResolvedValue('AI generated summary'),
        destroy: vi.fn()
      }))
    };
    
    global.LanguageModel = {
      availability: vi.fn().mockResolvedValue('readily'),
      create: vi.fn(() => ({
        prompt: vi.fn().mockResolvedValue('AI motivational message'),
        promptStreaming: vi.fn(() => ({
          async *[Symbol.asyncIterator]() {
            yield 'AI ';
            yield 'motivational message';
          }
        })),
        destroy: vi.fn()
      }))
    };
    
    global.Translator = {
      availability: vi.fn().mockResolvedValue('readily'),
      create: vi.fn(() => ({
        translate: vi.fn().mockResolvedValue('Translated text'),
        destroy: vi.fn()
      }))
    };
    
    global.Writer = {
      availability: vi.fn().mockResolvedValue('readily'),
      create: vi.fn(() => ({
        write: vi.fn().mockResolvedValue('AI generated content'),
        writeStreaming: vi.fn(() => ({
          async *[Symbol.asyncIterator]() {
            yield 'AI ';
            yield 'generated content';
          }
        })),
        destroy: vi.fn()
      }))
    };
    
    global.Rewriter = {
      availability: vi.fn().mockResolvedValue('readily'),
      create: vi.fn(() => ({
        rewrite: vi.fn().mockResolvedValue('Rewritten content'),
        rewriteStreaming: vi.fn(() => ({
          async *[Symbol.asyncIterator]() {
            yield 'Rewritten ';
            yield 'content';
          }
        })),
        destroy: vi.fn()
      }))
    };
    
    // Mock chrome.runtime for manifest access
    global.chrome.runtime = {
      getManifest: vi.fn(() => ({
        trial_tokens: ['valid_token_123456789']
      }))
    };
  });

  describe('Complete Tracking Session Workflow', () => {
    it('should handle full session lifecycle with AI integration', async () => {
      // 1. Start tracking session
      const sessionId = await dataManager.startSession({ 
        mood: 'focused',
        notes: 'Working on important project'
      });
      
      expect(sessionId).toBeTruthy();

      // 2. Simulate minute-by-minute tracking
      await dataManager.addMinutesToToday(1, 85);
      await dataManager.addMinutesToToday(1, 82);
      await dataManager.addMinutesToToday(1, 88);

      // 3. End session
      const session = await dataManager.endSession(sessionId, {
        minutes: 3,
        avgScore: 85
      });

      expect(session.minutes).toBe(3);
      expect(session.avgScore).toBe(85);
      expect(session.endTime).toBeTruthy();

      // 4. Generate AI summary
      const summary = await aiManager.generatePostureSummary({
        minutes: session.minutes,
        avgScore: session.avgScore,
        notes: 'Working on important project'
      }, { mood: 'focused' });

      expect(summary).toBe('AI generated summary');

      // 5. Generate motivational message
      const motivation = await aiManager.generateMotivationalMessage({
        avgScore: session.avgScore,
        minutes: session.minutes
      }, 'focused');

      expect(motivation).toBe('AI motivational message');

      // 6. Verify data persistence
      const stats = await dataManager.getStats();
      const today = dataManager.ymd(new Date());
      
      expect(stats[today].minutes).toBe(6); // 3 from tracking + 3 from session end
      expect(stats[today].sessions).toHaveLength(1);
      expect(stats[today].sessions[0].mood).toBe('focused');
    });

    it('should handle session workflow with AI fallback', async () => {
      // Mock AI unavailable
      chrome.aiOriginTrial.summarizer.capabilities.mockResolvedValue({ available: 'no' });
      chrome.aiOriginTrial.writer.capabilities.mockResolvedValue({ available: 'no' });

      // Start and end session
      const sessionId = await dataManager.startSession();
      await dataManager.addMinutesToToday(5, 75);
      const session = await dataManager.endSession(sessionId, { minutes: 5, avgScore: 75 });

      // Generate content with fallbacks
      const summary = await aiManager.generatePostureSummary({
        minutes: session.minutes,
        avgScore: session.avgScore
      });

      const motivation = await aiManager.generateMotivationalMessage({
        avgScore: session.avgScore,
        minutes: session.minutes
      });

      // Should get fallback content
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
      expect(typeof motivation).toBe('string');
      expect(motivation.length).toBeGreaterThan(0);
    });
  });

  describe('Analytics Data Flow', () => {
    it('should provide complete analytics data after tracking', async () => {
      // Create multiple sessions over different days
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Today's session
      const todaySessionId = await dataManager.startSession({ mood: 'energetic' });
      await dataManager.addMinutesToToday(10, 90);
      await dataManager.endSession(todaySessionId, { minutes: 10, avgScore: 90 });

      // Simulate yesterday's data
      const yesterdayKey = dataManager.ymd(yesterday);
      mockStorage.statsByDate = {
        ...mockStorage.statsByDate,
        [yesterdayKey]: {
          minutes: 45,
          scoreSum: 3600, // 45 * 80 average
          samples: 45,
          notes: 'Good focus day',
          sessions: [
            { id: 'yesterday1', minutes: 25, avgScore: 82 },
            { id: 'yesterday2', minutes: 20, avgScore: 78 }
          ]
        }
      };

      // Get tracking history
      const startDate = yesterday;
      const endDate = today;
      const history = await dataManager.getTrackingHistory(startDate, endDate);

      expect(history).toHaveLength(2);
      
      // Yesterday's data
      expect(history[0].date).toBe(yesterdayKey);
      expect(history[0].minutes).toBe(45);
      expect(history[0].avgScore).toBe(80);
      expect(history[0].sessions).toHaveLength(2);

      // Today's data
      const todayKey = dataManager.ymd(today);
      expect(history[1].date).toBe(todayKey);
      expect(history[1].minutes).toBe(20); // 10 from tracking + 10 from session
      expect(history[1].sessions).toHaveLength(1);
    });
  });

  describe('Data Migration and Validation', () => {
    it('should migrate legacy data and maintain functionality', async () => {
      // Set up legacy data format (seconds-based)
      mockStorage.statsByDate = {
        '2024-10-30': { 
          seconds: 1800, // 30 minutes in seconds
          scoreSum: 2400,
          samples: 30
        },
        '2024-10-31': {
          minutes: 45, // Already migrated
          scoreSum: 3600,
          samples: 45,
          sessions: []
        }
      };

      // Migrate data
      const migrated = await dataManager.validateAndMigrateData();
      expect(migrated).toBe(true);

      // Verify migration
      const stats = await dataManager.getStats();
      expect(stats['2024-10-30'].minutes).toBe(30); // Converted from seconds
      expect(stats['2024-10-30'].seconds).toBeUndefined();
      expect(stats['2024-10-30'].sessions).toEqual([]); // Added missing array

      // Verify existing data unchanged
      expect(stats['2024-10-31'].minutes).toBe(45);
      expect(stats['2024-10-31'].sessions).toEqual([]);

      // Test continued functionality after migration
      await dataManager.addMinutesToToday(5, 85);
      const updatedStats = await dataManager.getStats();
      const today = dataManager.ymd(new Date());
      expect(updatedStats[today].minutes).toBe(5);
    });
  });

  describe('Performance and Storage Management', () => {
    it('should handle large datasets efficiently', async () => {
      // Create a large dataset
      const stats = {};
      const startDate = new Date('2024-01-01');
      
      for (let i = 0; i < 100; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const key = dataManager.ymd(date);
        
        stats[key] = {
          minutes: Math.floor(Math.random() * 120) + 30, // 30-150 minutes
          scoreSum: Math.floor(Math.random() * 8000) + 2000,
          samples: Math.floor(Math.random() * 100) + 20,
          sessions: [
            { id: `${i}-1`, minutes: 30, avgScore: 80 },
            { id: `${i}-2`, minutes: 25, avgScore: 75 }
          ]
        };
      }

      mockStorage.statsByDate = stats;

      // Test data compression
      const cutoffDate = new Date('2024-02-01');
      const compressed = await dataManager.compressOldData(cutoffDate);
      expect(compressed).toBe(true);

      // Verify old sessions removed but stats preserved
      const compressedStats = await dataManager.getStats();
      const oldKey = dataManager.ymd(new Date('2024-01-15'));
      const newKey = dataManager.ymd(new Date('2024-03-01'));

      expect(compressedStats[oldKey].sessions).toBeUndefined();
      expect(compressedStats[oldKey].minutes).toBeGreaterThan(0);
      expect(compressedStats[newKey].sessions).toHaveLength(2);
    });

    it('should handle storage quota efficiently', async () => {
      // Test storage flush behavior
      let flushCount = 0;
      chrome.storage.local.set.mockImplementation((data, callback) => {
        flushCount++;
        Object.assign(mockStorage, data);
        if (callback) callback();
      });

      // Add multiple minutes (should flush every 10 updates)
      for (let i = 0; i < 25; i++) {
        await dataManager.addMinutesToToday(1, 80);
      }

      // In test mode, should flush every time (25 times)
      expect(flushCount).toBe(25);

      // Final flush on timer stop (only if timer was running)
      await dataManager.stopTrackingTimer();
      expect(flushCount).toBe(25); // No additional flush since timer wasn't started
    });
  });

  describe('End-to-End AI Workflow Testing', () => {
    describe('Complete Posture Summary Generation Workflow', () => {
      it('should handle complete posture summary workflow with AI available', async () => {
        // Initialize AI manager
        await aiManager.initialize();
        
        // Verify AI availability
        const availability = await aiManager.checkAIAvailability();
        expect(availability.summarizer).toBe(true);
        
        // Create session data
        const sessionData = {
          minutes: 45,
          avgScore: 87,
          notes: 'Focused work session'
        };
        
        const moodData = { mood: 'focused' };
        
        // Generate summary
        const summary = await aiManager.generatePostureSummary(sessionData, moodData);
        
        // Verify AI was called correctly
        expect(global.Summarizer.create).toHaveBeenCalledWith({
          type: 'tldr',
          format: 'plain-text',
          length: 'medium'
        });
        
        expect(summary).toBe('AI generated summary');
        
        // Verify session cleanup
        const mockSession = global.Summarizer.create.mock.results[0].value;
        expect(mockSession.destroy).toHaveBeenCalled();
      });

      it('should handle posture summary workflow with AI unavailable', async () => {
        // Mock AI as unavailable
        global.Summarizer.availability.mockResolvedValue('unavailable');
        
        await aiManager.initialize();
        
        const sessionData = { minutes: 30, avgScore: 75 };
        const summary = await aiManager.generatePostureSummary(sessionData);
        
        // Should get fallback content
        expect(typeof summary).toBe('string');
        expect(summary.length).toBeGreaterThan(0);
        expect(global.Summarizer.create).not.toHaveBeenCalled();
      });

      it('should handle posture summary workflow with API errors', async () => {
        // Mock API error
        global.Summarizer.create.mockRejectedValue(new Error('Origin Trial token invalid'));
        
        await aiManager.initialize();
        
        const sessionData = { minutes: 30, avgScore: 75 };
        const summary = await aiManager.generatePostureSummary(sessionData);
        
        // Should get fallback content when API fails
        expect(typeof summary).toBe('string');
        expect(summary.length).toBeGreaterThan(0);
        
        // Verify error was categorized and stored
        const errors = aiManager.getAPIErrors();
        expect(errors.summarizer).toBeDefined();
        expect(errors.summarizer.type).toBe('origin_trial_invalid');
      });
    });

    describe('Complete Motivational Message Generation Workflow', () => {
      it('should handle complete motivational message workflow with AI available', async () => {
        await aiManager.initialize();
        
        const performance = { avgScore: 92, minutes: 60 };
        const mood = 'energetic';
        
        const message = await aiManager.generateMotivationalMessage(performance, mood);
        
        // Verify AI was called correctly
        expect(global.LanguageModel.create).toHaveBeenCalledWith({
          temperature: 1.0,
          topK: 3
        });
        
        expect(message).toBe('AI motivational message');
        
        // Verify session cleanup
        const mockSession = global.LanguageModel.create.mock.results[0].value;
        expect(mockSession.destroy).toHaveBeenCalled();
      });

      it('should handle motivational message workflow with streaming', async () => {
        await aiManager.initialize();
        
        const performance = { avgScore: 85, minutes: 45 };
        const chunks = [];
        
        const options = {
          streaming: true,
          onChunk: (chunk, full) => chunks.push({ chunk, full })
        };
        
        const message = await aiManager.generateMotivationalMessage(performance, null, options);
        
        expect(message).toBe('AI motivational message');
        expect(chunks).toHaveLength(2);
        expect(chunks[0].chunk).toBe('AI ');
        expect(chunks[1].chunk).toBe('motivational message');
      });

      it('should handle motivational message workflow with AI unavailable', async () => {
        global.LanguageModel.availability.mockResolvedValue('unavailable');
        
        await aiManager.initialize();
        
        const performance = { avgScore: 70, minutes: 30 };
        const message = await aiManager.generateMotivationalMessage(performance);
        
        // Should get fallback content
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
        expect(global.LanguageModel.create).not.toHaveBeenCalled();
      });
    });

    describe('Complete Translation Workflow with Model Downloading', () => {
      let languageManager;

      beforeEach(() => {
        languageManager = new LanguageModelManager();
      });

      it('should handle complete translation workflow with model available', async () => {
        await languageManager.initialize();
        await aiManager.initialize();
        
        // Set target language
        await languageManager.setLanguage('es');
        
        const text = 'Hello world';
        const translation = await aiManager.translateContent(text, 'es');
        
        // Verify translator was called correctly
        expect(global.Translator.create).toHaveBeenCalledWith({
          sourceLanguage: 'en',
          targetLanguage: 'es'
        });
        
        expect(translation).toBe('Translated text');
        
        // Verify session cleanup
        const mockSession = global.Translator.create.mock.results[0].value;
        expect(mockSession.destroy).toHaveBeenCalled();
      });

      it('should handle translation workflow with model download required', async () => {
        // Mock model download scenario
        global.Translator.availability.mockResolvedValue('after-download');
        
        await languageManager.initialize();
        
        let progressUpdates = [];
        const progressCallback = (progress) => progressUpdates.push(progress);
        
        // Download model
        const success = await languageManager.downloadModel('fr', progressCallback);
        
        expect(success).toBe(true);
        expect(progressUpdates).toContain(0);
        expect(progressUpdates).toContain(100);
        
        // Verify model was marked as downloaded
        expect(languageManager.getDownloadedModels()).toContain('fr');
      });

      it('should handle translation workflow with unsupported language', async () => {
        global.Translator.availability.mockResolvedValue('unavailable');
        
        await languageManager.initialize();
        
        try {
          await languageManager.downloadModel('unsupported_lang');
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).toContain('not supported');
        }
      });

      it('should handle translation workflow with API unavailable', async () => {
        // Mock API not available
        delete global.Translator;
        
        const newLanguageManager = new LanguageModelManager();
        await newLanguageManager.initialize();
        
        const capabilities = await newLanguageManager.getTranslationCapabilities();
        
        expect(capabilities.available).toBe(false);
        expect(capabilities.reason).toBe('api_not_available');
        expect(capabilities.supportedLanguages).toEqual({ 'en': 'English' });
      });
    });

    describe('API Unavailability Graceful Handling', () => {
      it('should handle all APIs unavailable scenario', async () => {
        // Mock all APIs as unavailable
        global.Summarizer.availability.mockResolvedValue('unavailable');
        global.LanguageModel.availability.mockResolvedValue('unavailable');
        global.Translator.availability.mockResolvedValue('unavailable');
        global.Writer.availability.mockResolvedValue('unavailable');
        global.Rewriter.availability.mockResolvedValue('unavailable');
        
        await aiManager.initialize();
        
        const availability = await aiManager.checkAIAvailability();
        
        expect(availability.summarizer).toBe(false);
        expect(availability.languageModel).toBe(false);
        expect(availability.translator).toBe(false);
        expect(availability.writer).toBe(false);
        expect(availability.rewriter).toBe(false);
        
        // Test that all workflows still work with fallbacks
        const sessionData = { minutes: 30, avgScore: 80 };
        const performance = { avgScore: 80, minutes: 30 };
        
        const summary = await aiManager.generatePostureSummary(sessionData);
        const motivation = await aiManager.generateMotivationalMessage(performance);
        const translation = await aiManager.translateContent('Hello', 'es');
        
        expect(typeof summary).toBe('string');
        expect(typeof motivation).toBe('string');
        expect(translation).toBe('Hello'); // Returns original text
      });

      it('should handle partial API availability', async () => {
        // Mock partial availability
        global.Summarizer.availability.mockResolvedValue('readily');
        global.LanguageModel.availability.mockResolvedValue('unavailable');
        global.Translator.availability.mockResolvedValue('readily');
        global.Writer.availability.mockResolvedValue('unavailable');
        global.Rewriter.availability.mockResolvedValue('unavailable');
        
        await aiManager.initialize();
        
        const availability = await aiManager.checkAIAvailability();
        
        expect(availability.summarizer).toBe(true);
        expect(availability.languageModel).toBe(false);
        expect(availability.translator).toBe(true);
        
        // Test mixed workflow - some AI, some fallback
        const sessionData = { minutes: 30, avgScore: 80 };
        const performance = { avgScore: 80, minutes: 30 };
        
        const summary = await aiManager.generatePostureSummary(sessionData);
        const motivation = await aiManager.generateMotivationalMessage(performance);
        
        expect(summary).toBe('AI generated summary'); // AI available
        expect(typeof motivation).toBe('string'); // Fallback content
      });

      it('should handle Origin Trial configuration issues', async () => {
        // Mock invalid Origin Trial
        global.chrome.runtime.getManifest.mockReturnValue({
          trial_tokens: ['//placeholder_token']
        });
        
        await aiManager.initialize();
        
        const status = await aiManager.getOriginTrialStatus();
        
        expect(status.status).toBe('not_configured');
        expect(status.setupRequired).toBe(true);
        expect(status.canUseAI).toBe(false);
        expect(status.troubleshooting).toContain('Configure Origin Trial tokens');
      });
    });

    describe('Session Lifecycle Management', () => {
      it('should properly manage session creation and cleanup', async () => {
        await aiManager.initialize();
        
        const sessionData = { minutes: 30, avgScore: 85 };
        
        // Generate multiple pieces of content
        await aiManager.generatePostureSummary(sessionData);
        await aiManager.generateMotivationalMessage({ avgScore: 85, minutes: 30 });
        await aiManager.translateContent('Hello', 'es');
        
        // Verify all sessions were created and destroyed
        expect(global.Summarizer.create).toHaveBeenCalledTimes(1);
        expect(global.LanguageModel.create).toHaveBeenCalledTimes(1);
        expect(global.Translator.create).toHaveBeenCalledTimes(1);
        
        // Verify all sessions were properly cleaned up
        const summarizerSession = global.Summarizer.create.mock.results[0].value;
        const languageModelSession = global.LanguageModel.create.mock.results[0].value;
        const translatorSession = global.Translator.create.mock.results[0].value;
        
        expect(summarizerSession.destroy).toHaveBeenCalled();
        expect(languageModelSession.destroy).toHaveBeenCalled();
        expect(translatorSession.destroy).toHaveBeenCalled();
      });

      it('should handle session creation failures gracefully', async () => {
        // Mock session creation failure
        global.Summarizer.create.mockRejectedValue(new Error('Session creation failed'));
        
        await aiManager.initialize();
        
        const sessionData = { minutes: 30, avgScore: 85 };
        const summary = await aiManager.generatePostureSummary(sessionData);
        
        // Should get fallback content
        expect(typeof summary).toBe('string');
        expect(summary.length).toBeGreaterThan(0);
        
        // Verify error was handled
        const errors = aiManager.getAPIErrors();
        expect(errors.summarizer).toBeDefined();
      });

      it('should handle streaming session cleanup on errors', async () => {
        const mockSession = {
          promptStreaming: vi.fn(() => {
            throw new Error('Streaming failed');
          }),
          destroy: vi.fn()
        };
        
        global.LanguageModel.create.mockResolvedValue(mockSession);
        
        await aiManager.initialize();
        
        const performance = { avgScore: 85, minutes: 30 };
        const options = {
          streaming: true,
          onChunk: vi.fn()
        };
        
        const result = await aiManager.generateMotivationalMessage(performance, null, options);
        
        // Should get fallback content
        expect(typeof result).toBe('string');
        
        // Verify session was still cleaned up despite error
        expect(mockSession.destroy).toHaveBeenCalled();
      });
    });

    describe('Token Usage and Performance Tracking', () => {
      it('should track token usage with new API properties', async () => {
        const mockSession = {
          inputQuota: 1000,
          inputUsage: 250,
          measureInputUsage: vi.fn().mockResolvedValue(50),
          prompt: vi.fn().mockResolvedValue('Response'),
          destroy: vi.fn()
        };
        
        global.LanguageModel.create.mockResolvedValue(mockSession);
        
        await aiManager.initialize();
        
        const performance = { avgScore: 85, minutes: 30 };
        await aiManager.generateMotivationalMessage(performance);
        
        // Test token usage tracking
        const usage = aiManager.getTokenUsage(mockSession);
        expect(usage.inputQuota).toBe(1000);
        expect(usage.inputUsage).toBe(250);
        expect(usage.tokensLeft).toBe(750);
        
        // Test input measurement
        const inputUsage = await aiManager.measureInputUsage(mockSession, 'test prompt');
        expect(inputUsage).toBe(50);
        expect(mockSession.measureInputUsage).toHaveBeenCalledWith('test prompt');
        
        // Test token sufficiency check
        expect(aiManager.hasEnoughTokens(mockSession, 500)).toBe(true);
        expect(aiManager.hasEnoughTokens(mockSession, 800)).toBe(false);
      });

      it('should track token usage with old API properties', async () => {
        const mockSession = {
          maxTokens: 1000,
          tokensSoFar: 300,
          tokensLeft: 700,
          countPromptTokens: vi.fn().mockResolvedValue(45),
          prompt: vi.fn().mockResolvedValue('Response'),
          destroy: vi.fn()
        };
        
        global.LanguageModel.create.mockResolvedValue(mockSession);
        
        await aiManager.initialize();
        
        const performance = { avgScore: 85, minutes: 30 };
        await aiManager.generateMotivationalMessage(performance);
        
        // Test token usage tracking with old API
        const usage = aiManager.getTokenUsage(mockSession);
        expect(usage.inputQuota).toBe(1000);
        expect(usage.inputUsage).toBe(300);
        expect(usage.tokensLeft).toBe(700);
        
        // Test input measurement with old API
        const inputUsage = await aiManager.measureInputUsage(mockSession, 'test prompt');
        expect(inputUsage).toBe(45);
        expect(mockSession.countPromptTokens).toHaveBeenCalledWith('test prompt');
      });

      it('should get detailed session statistics', async () => {
        const mockSession = {
          temperature: 0.8,
          topK: 3,
          inputQuota: 1000,
          inputUsage: 250,
          prompt: vi.fn().mockResolvedValue('Response'),
          destroy: vi.fn()
        };
        
        global.LanguageModel.create.mockResolvedValue(mockSession);
        
        await aiManager.initialize();
        
        const performance = { avgScore: 85, minutes: 30 };
        await aiManager.generateMotivationalMessage(performance);
        
        const stats = aiManager.getSessionStats(mockSession);
        
        expect(stats.temperature).toBe(0.8);
        expect(stats.topK).toBe(3);
        expect(stats.inputQuota).toBe(1000);
        expect(stats.inputUsage).toBe(250);
        expect(stats.tokensLeft).toBe(750);
        expect(stats.usagePercentage).toBe(25);
      });
    });

    describe('Batch Processing Workflows', () => {
      it('should handle batch processing of multiple AI requests', async () => {
        await aiManager.initialize();
        
        const requests = [
          {
            type: 'summary',
            sessionData: { minutes: 30, avgScore: 85 },
            moodData: { mood: 'focused' }
          },
          {
            type: 'motivational',
            performance: { avgScore: 85, minutes: 30 },
            mood: 'energetic'
          },
          {
            type: 'translation',
            text: 'Hello world',
            targetLanguage: 'es'
          }
        ];
        
        const results = await aiManager.batchProcess(requests);
        
        expect(results).toHaveLength(3);
        expect(results[0].success).toBe(true);
        expect(results[0].data).toBe('AI generated summary');
        expect(results[1].success).toBe(true);
        expect(results[1].data).toBe('AI motivational message');
        expect(results[2].success).toBe(true);
        expect(results[2].data).toBe('Translated text');
      });

      it('should handle batch processing with mixed success/failure', async () => {
        // Mock one API to fail
        global.Summarizer.create.mockRejectedValue(new Error('API Error'));
        
        await aiManager.initialize();
        
        const requests = [
          {
            type: 'summary',
            sessionData: { minutes: 30, avgScore: 85 }
          },
          {
            type: 'motivational',
            performance: { avgScore: 85, minutes: 30 }
          }
        ];
        
        const results = await aiManager.batchProcess(requests);
        
        expect(results).toHaveLength(2);
        expect(results[0].success).toBe(true); // Uses fallback
        expect(results[1].success).toBe(true); // AI works
      });
    });
  });

  describe('Chrome Version Compatibility Testing', () => {
    describe('Chrome Stable vs Canary API Differences', () => {
      it('should handle streaming response patterns for Chrome Stable', async () => {
        // Mock Chrome Stable behavior - returns full text in each chunk
        const mockSession = {
          promptStreaming: vi.fn(() => ({
            async *[Symbol.asyncIterator]() {
              yield 'Hello ';
              yield 'Hello world!'; // Full text accumulation
            }
          })),
          destroy: vi.fn()
        };
        
        global.LanguageModel.create.mockResolvedValue(mockSession);
        
        await aiManager.initialize();
        
        const chunks = [];
        const options = {
          streaming: true,
          onChunk: (chunk, full) => chunks.push({ chunk, full })
        };
        
        const result = await aiManager.generateMotivationalMessage(
          { avgScore: 85, minutes: 30 }, 
          null, 
          options
        );
        
        expect(result).toBe('Hello world!');
        expect(chunks).toHaveLength(2);
        expect(chunks[0].chunk).toBe('Hello ');
        expect(chunks[0].full).toBe('Hello ');
        expect(chunks[1].chunk).toBe('world!'); // Incremental chunk
        expect(chunks[1].full).toBe('Hello world!');
      });

      it('should handle streaming response patterns for Chrome Canary', async () => {
        // Mock Chrome Canary behavior - returns incremental chunks
        const mockSession = {
          promptStreaming: vi.fn(() => ({
            async *[Symbol.asyncIterator]() {
              yield 'Hello ';
              yield 'world!'; // Incremental chunks
            }
          })),
          destroy: vi.fn()
        };
        
        global.LanguageModel.create.mockResolvedValue(mockSession);
        
        await aiManager.initialize();
        
        const chunks = [];
        const options = {
          streaming: true,
          onChunk: (chunk, full) => chunks.push({ chunk, full })
        };
        
        const result = await aiManager.generateMotivationalMessage(
          { avgScore: 85, minutes: 30 }, 
          null, 
          options
        );
        
        expect(result).toBe('Hello world!');
        expect(chunks).toHaveLength(2);
        expect(chunks[0].chunk).toBe('Hello ');
        expect(chunks[1].chunk).toBe('world!');
      });

      it('should handle Writer API streaming differences', async () => {
        // Test Writer streaming with different Chrome versions
        const mockSession = {
          writeStreaming: vi.fn(() => ({
            async *[Symbol.asyncIterator]() {
              yield 'Take ';
              yield 'a break!';
            }
          })),
          destroy: vi.fn()
        };
        
        global.Writer.create.mockResolvedValue(mockSession);
        
        await aiManager.initialize();
        
        const chunks = [];
        const options = {
          streaming: true,
          onChunk: (chunk, full) => chunks.push({ chunk, full })
        };
        
        const result = await aiManager.generateBreakReminder(70, 45, options);
        
        expect(result).toBe('Take a break!');
        expect(chunks).toHaveLength(2);
        
        // Writer API uses incremental pattern when 'Writer' in self is true
        expect(chunks[0].chunk).toBe('Take ');
        expect(chunks[0].full).toBe('Take ');
        expect(chunks[1].chunk).toBe('a break!');
        expect(chunks[1].full).toBe('Take a break!');
      });

      it('should handle Rewriter API streaming differences', async () => {
        const mockSession = {
          rewriteStreaming: vi.fn(() => ({
            async *[Symbol.asyncIterator]() {
              yield 'Improved ';
              yield 'text!';
            }
          })),
          destroy: vi.fn()
        };
        
        global.Rewriter.create.mockResolvedValue(mockSession);
        
        await aiManager.initialize();
        
        const chunks = [];
        const options = {
          streaming: true,
          onChunk: (chunk, full) => chunks.push({ chunk, full })
        };
        
        const result = await aiManager.rewriteContent('Original text', options);
        
        expect(result).toBe('Improved text!');
        expect(chunks).toHaveLength(2);
        
        // Rewriter API uses incremental pattern when 'Rewriter' in self is true
        expect(chunks[0].chunk).toBe('Improved ');
        expect(chunks[0].full).toBe('Improved ');
        expect(chunks[1].chunk).toBe('text!');
        expect(chunks[1].full).toBe('Improved text!');
      });
    });

    describe('Token Usage API Version Compatibility', () => {
      it('should handle new API token properties (Chrome Canary)', async () => {
        const mockSession = {
          inputQuota: 2000,
          inputUsage: 500,
          measureInputUsage: vi.fn().mockResolvedValue(75),
          prompt: vi.fn().mockResolvedValue('Response'),
          destroy: vi.fn()
        };
        
        global.LanguageModel.create.mockResolvedValue(mockSession);
        
        await aiManager.initialize();
        
        await aiManager.generateMotivationalMessage({ avgScore: 85, minutes: 30 });
        
        const usage = aiManager.getTokenUsage(mockSession);
        expect(usage.inputQuota).toBe(2000);
        expect(usage.inputUsage).toBe(500);
        expect(usage.tokensLeft).toBe(1500);
        
        const inputUsage = await aiManager.measureInputUsage(mockSession, 'test');
        expect(inputUsage).toBe(75);
        expect(mockSession.measureInputUsage).toHaveBeenCalledWith('test');
      });

      it('should handle old API token properties (Chrome Stable)', async () => {
        const mockSession = {
          maxTokens: 2000,
          tokensSoFar: 500,
          tokensLeft: 1500,
          countPromptTokens: vi.fn().mockResolvedValue(75),
          prompt: vi.fn().mockResolvedValue('Response'),
          destroy: vi.fn()
        };
        
        global.LanguageModel.create.mockResolvedValue(mockSession);
        
        await aiManager.initialize();
        
        await aiManager.generateMotivationalMessage({ avgScore: 85, minutes: 30 });
        
        const usage = aiManager.getTokenUsage(mockSession);
        expect(usage.inputQuota).toBe(2000);
        expect(usage.inputUsage).toBe(500);
        expect(usage.tokensLeft).toBe(1500);
        
        const inputUsage = await aiManager.measureInputUsage(mockSession, 'test');
        expect(inputUsage).toBe(75);
        expect(mockSession.countPromptTokens).toHaveBeenCalledWith('test');
      });

      it('should handle mixed API properties gracefully', async () => {
        const mockSession = {
          inputQuota: 2000,
          tokensSoFar: 500, // Mixed old/new properties
          prompt: vi.fn().mockResolvedValue('Response'),
          destroy: vi.fn()
        };
        
        global.LanguageModel.create.mockResolvedValue(mockSession);
        
        await aiManager.initialize();
        
        await aiManager.generateMotivationalMessage({ avgScore: 85, minutes: 30 });
        
        const usage = aiManager.getTokenUsage(mockSession);
        expect(usage.inputQuota).toBe(2000);
        expect(usage.inputUsage).toBe(500);
        expect(usage.tokensLeft).toBe(1500);
      });
    });

    describe('Origin Trial Behavior Across Chrome Versions', () => {
      it('should handle valid Origin Trial tokens', async () => {
        global.chrome.runtime.getManifest.mockReturnValue({
          trial_tokens: [
            'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0'
          ]
        });
        
        await aiManager.initialize();
        
        const validation = await aiManager.validateOriginTrial();
        expect(validation.configured).toBe(true);
        expect(validation.tokenCount).toBe(1);
        
        const status = await aiManager.getOriginTrialStatus();
        expect(status.status).toBe('ready');
        expect(status.canUseAI).toBe(true);
        expect(status.setupRequired).toBe(false);
      });

      it('should handle placeholder/commented Origin Trial tokens', async () => {
        global.chrome.runtime.getManifest.mockReturnValue({
          trial_tokens: [
            '//placeholder_token_replace_with_actual_token',
            '// Another commented token'
          ]
        });
        
        await aiManager.initialize();
        
        const validation = await aiManager.validateOriginTrial();
        expect(validation.configured).toBe(false);
        expect(validation.reason).toBe('invalid_tokens');
        
        const status = await aiManager.getOriginTrialStatus();
        expect(status.status).toBe('not_configured');
        expect(status.setupRequired).toBe(true);
        expect(status.troubleshooting).toContain('Configure Origin Trial tokens');
      });

      it('should handle missing Origin Trial tokens', async () => {
        global.chrome.runtime.getManifest.mockReturnValue({
          trial_tokens: []
        });
        
        await aiManager.initialize();
        
        const validation = await aiManager.validateOriginTrial();
        expect(validation.configured).toBe(false);
        expect(validation.reason).toBe('no_tokens');
        
        const status = await aiManager.getOriginTrialStatus();
        expect(status.status).toBe('not_configured');
        expect(status.message).toContain('Origin Trial tokens');
      });

      it('should handle Origin Trial API errors', async () => {
        global.Summarizer.availability.mockRejectedValue(
          new Error('Origin trial token is invalid or expired')
        );
        
        await aiManager.initialize();
        
        const availability = await aiManager.checkAIAvailability();
        expect(availability.summarizer).toBe(false);
        expect(availability.errors.summarizer).toBe('origin_trial_invalid');
        
        const status = await aiManager.getOriginTrialStatus();
        expect(status.status).toBe('apis_unavailable');
        expect(status.errorDetails.primaryIssue).toBe('origin_trial_invalid');
        expect(status.troubleshooting).toContain('Origin Trial tokens');
      });

      it('should provide specific troubleshooting for different Chrome versions', async () => {
        // Mock API not available (older Chrome version)
        delete global.Summarizer;
        delete global.LanguageModel;
        delete global.Translator;
        delete global.Writer;
        delete global.Rewriter;
        
        await aiManager.initialize();
        
        const availability = await aiManager.checkAIAvailability();
        expect(Object.values(availability).every(val => val === false || typeof val === 'object')).toBe(true);
        
        const status = await aiManager.getOriginTrialStatus();
        expect(status.status).toBe('apis_unavailable');
        expect(status.troubleshooting).toContain('Chrome Canary or Chrome Dev');
        expect(status.troubleshooting).toContain('chrome://flags/');
      });

      it('should handle transition planning from Origin Trial to stable API', async () => {
        await aiManager.initialize();
        
        const transitionPlan = await aiManager.planStableAPITransition();
        
        expect(transitionPlan.currentlyUsingOriginTrial).toBe(true);
        expect(transitionPlan.stableAPIAvailable).toBe(false);
        expect(transitionPlan.migrationSteps).toContain('Monitor Chrome release notes');
        expect(transitionPlan.migrationSteps).toContain('Update manifest.json to remove trial_tokens');
      });
    });

    describe('Chrome Flag Dependencies', () => {
      it('should handle API availability with required flags enabled', async () => {
        // All APIs available (flags enabled)
        await aiManager.initialize();
        
        const availability = await aiManager.checkAIAvailability();
        
        expect(availability.summarizer).toBe(true);
        expect(availability.languageModel).toBe(true);
        expect(availability.translator).toBe(true);
        expect(availability.writer).toBe(true);
        expect(availability.rewriter).toBe(true);
      });

      it('should handle partial API availability with some flags disabled', async () => {
        // Mock some APIs unavailable (flags disabled)
        global.Writer.availability.mockResolvedValue('unavailable');
        global.Rewriter.availability.mockResolvedValue('unavailable');
        
        await aiManager.initialize();
        
        const availability = await aiManager.checkAIAvailability();
        
        expect(availability.summarizer).toBe(true);
        expect(availability.languageModel).toBe(true);
        expect(availability.translator).toBe(true);
        expect(availability.writer).toBe(false);
        expect(availability.rewriter).toBe(false);
        
        const status = await aiManager.getOriginTrialStatus();
        expect(status.status).toBe('partial');
        expect(status.canUseAI).toBe(true);
        expect(status.troubleshooting).toContain('additional Chrome flags');
      });

      it('should provide flag-specific error guidance', async () => {
        global.LanguageModel.availability.mockRejectedValue(
          new Error('Feature not available - check chrome://flags/#prompt-api-for-gemini-nano')
        );
        
        await aiManager.initialize();
        
        const availability = await aiManager.checkAIAvailability();
        expect(availability.errors.languageModel).toBe('feature_not_available');
        
        const status = await aiManager.getOriginTrialStatus();
        expect(status.errorDetails.primaryIssue).toBe('feature_not_available');
        expect(status.troubleshooting).toContain('chrome://flags/');
      });
    });
  });

  describe('Performance and Memory Testing', () => {
    describe('Session Creation and Cleanup Memory Management', () => {
      it('should properly clean up sessions to prevent memory leaks', async () => {
        await aiManager.initialize();
        
        const sessionTracker = {
          created: [],
          destroyed: []
        };
        
        // Mock session creation with tracking
        const createMockSession = (apiName) => {
          const session = {
            id: `${apiName}_${Date.now()}_${Math.random()}`,
            prompt: vi.fn().mockResolvedValue('Response'),
            summarize: vi.fn().mockResolvedValue('Summary'),
            translate: vi.fn().mockResolvedValue('Translation'),
            write: vi.fn().mockResolvedValue('Content'),
            rewrite: vi.fn().mockResolvedValue('Rewritten'),
            destroy: vi.fn(() => {
              sessionTracker.destroyed.push(session.id);
            })
          };
          sessionTracker.created.push(session.id);
          return session;
        };
        
        global.Summarizer.create.mockImplementation(() => createMockSession('summarizer'));
        global.LanguageModel.create.mockImplementation(() => createMockSession('languageModel'));
        global.Translator.create.mockImplementation(() => createMockSession('translator'));
        global.Writer.create.mockImplementation(() => createMockSession('writer'));
        global.Rewriter.create.mockImplementation(() => createMockSession('rewriter'));
        
        // Create multiple sessions
        const sessionData = { minutes: 30, avgScore: 85 };
        const performance = { avgScore: 85, minutes: 30 };
        
        await aiManager.generatePostureSummary(sessionData);
        await aiManager.generateMotivationalMessage(performance);
        await aiManager.translateContent('Hello', 'es');
        await aiManager.generateContent('Generate content');
        await aiManager.rewriteContent('Original text');
        
        // Verify all sessions were created and destroyed
        expect(sessionTracker.created).toHaveLength(5);
        expect(sessionTracker.destroyed).toHaveLength(5);
        expect(sessionTracker.created).toEqual(sessionTracker.destroyed);
      });

      it('should handle session cleanup even when operations fail', async () => {
        await aiManager.initialize();
        
        const destroyMock = vi.fn();
        const mockSession = {
          prompt: vi.fn().mockRejectedValue(new Error('Operation failed')),
          destroy: destroyMock
        };
        
        global.LanguageModel.create.mockResolvedValue(mockSession);
        
        const performance = { avgScore: 85, minutes: 30 };
        
        // Operation should fail but still clean up
        const result = await aiManager.generateMotivationalMessage(performance);
        
        // Should get fallback content
        expect(typeof result).toBe('string');
        
        // Session should still be destroyed
        expect(destroyMock).toHaveBeenCalled();
      });

      it('should handle streaming session cleanup on errors', async () => {
        await aiManager.initialize();
        
        const destroyMock = vi.fn();
        const mockSession = {
          promptStreaming: vi.fn(() => {
            throw new Error('Streaming failed');
          }),
          destroy: destroyMock
        };
        
        global.LanguageModel.create.mockResolvedValue(mockSession);
        
        const performance = { avgScore: 85, minutes: 30 };
        const options = {
          streaming: true,
          onChunk: vi.fn()
        };
        
        const result = await aiManager.generateMotivationalMessage(performance, null, options);
        
        // Should get fallback content
        expect(typeof result).toBe('string');
        
        // Session should still be destroyed despite streaming error
        expect(destroyMock).toHaveBeenCalled();
      });

      it('should handle concurrent session creation and cleanup', async () => {
        await aiManager.initialize();
        
        const sessionTracker = {
          active: new Set(),
          maxConcurrent: 0
        };
        
        const createMockSession = (apiName) => {
          const sessionId = `${apiName}_${Date.now()}_${Math.random()}`;
          sessionTracker.active.add(sessionId);
          sessionTracker.maxConcurrent = Math.max(sessionTracker.maxConcurrent, sessionTracker.active.size);
          
          return {
            id: sessionId,
            prompt: vi.fn().mockImplementation(async () => {
              // Simulate processing time
              await new Promise(resolve => setTimeout(resolve, 10));
              return 'Response';
            }),
            destroy: vi.fn(() => {
              sessionTracker.active.delete(sessionId);
            })
          };
        };
        
        global.LanguageModel.create.mockImplementation(() => createMockSession('languageModel'));
        
        // Create multiple concurrent requests
        const promises = [];
        for (let i = 0; i < 5; i++) {
          promises.push(aiManager.generateMotivationalMessage({ avgScore: 85, minutes: 30 }));
        }
        
        await Promise.all(promises);
        
        // All sessions should be cleaned up
        expect(sessionTracker.active.size).toBe(0);
        expect(sessionTracker.maxConcurrent).toBe(5);
      });
    });

    describe('Session Reuse and Optimization', () => {
      it('should create new sessions for each request (no reuse by default)', async () => {
        await aiManager.initialize();
        
        let createCount = 0;
        global.LanguageModel.create.mockImplementation(() => {
          createCount++;
          return {
            prompt: vi.fn().mockResolvedValue('Response'),
            destroy: vi.fn()
          };
        });
        
        const performance = { avgScore: 85, minutes: 30 };
        
        // Make multiple requests
        await aiManager.generateMotivationalMessage(performance);
        await aiManager.generateMotivationalMessage(performance);
        await aiManager.generateMotivationalMessage(performance);
        
        // Should create a new session for each request
        expect(createCount).toBe(3);
      });

      it('should handle session configuration optimization', async () => {
        await aiManager.initialize();
        
        const configTracker = [];
        global.LanguageModel.create.mockImplementation((config) => {
          configTracker.push(config);
          return {
            prompt: vi.fn().mockResolvedValue('Response'),
            destroy: vi.fn()
          };
        });
        
        const performance = { avgScore: 85, minutes: 30 };
        
        // Make requests with different contexts
        await aiManager.generateMotivationalMessage(performance);
        await aiManager.generateMotivationalMessage({ avgScore: 95, minutes: 60 });
        
        // Should use consistent configuration
        expect(configTracker).toHaveLength(2);
        expect(configTracker[0]).toEqual({ temperature: 1.0, topK: 3 });
        expect(configTracker[1]).toEqual({ temperature: 1.0, topK: 3 });
      });

      it('should optimize session creation timing', async () => {
        await aiManager.initialize();
        
        const timingTracker = [];
        global.LanguageModel.create.mockImplementation(async () => {
          const start = Date.now();
          // Simulate session creation time
          await new Promise(resolve => setTimeout(resolve, 5));
          timingTracker.push(Date.now() - start);
          
          return {
            prompt: vi.fn().mockResolvedValue('Response'),
            destroy: vi.fn()
          };
        });
        
        const performance = { avgScore: 85, minutes: 30 };
        
        const start = Date.now();
        await aiManager.generateMotivationalMessage(performance);
        const totalTime = Date.now() - start;
        
        // Session creation should be reasonably fast
        expect(timingTracker[0]).toBeLessThan(50);
        expect(totalTime).toBeLessThan(100);
      });
    });

    describe('High API Usage Scenarios', () => {
      it('should handle rapid sequential API calls', async () => {
        await aiManager.initialize();
        
        const callTracker = {
          calls: 0,
          errors: 0,
          successes: 0
        };
        
        global.LanguageModel.create.mockImplementation(() => ({
          prompt: vi.fn().mockImplementation(async () => {
            callTracker.calls++;
            // Simulate occasional failures under load
            if (Math.random() < 0.1) {
              callTracker.errors++;
              throw new Error('Temporary overload');
            }
            callTracker.successes++;
            return 'Response';
          }),
          destroy: vi.fn()
        }));
        
        const performance = { avgScore: 85, minutes: 30 };
        const promises = [];
        
        // Make 20 rapid sequential calls
        for (let i = 0; i < 20; i++) {
          promises.push(aiManager.generateMotivationalMessage(performance));
        }
        
        const results = await Promise.all(promises);
        
        // All requests should complete (with fallbacks if needed)
        expect(results).toHaveLength(20);
        results.forEach(result => {
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
        });
        
        expect(callTracker.calls).toBe(20);
      });

      it('should handle batch processing performance', async () => {
        await aiManager.initialize();
        
        const performanceTracker = {
          batchStart: 0,
          batchEnd: 0,
          individualTimes: []
        };
        
        global.LanguageModel.create.mockImplementation(() => ({
          prompt: vi.fn().mockImplementation(async () => {
            const start = Date.now();
            await new Promise(resolve => setTimeout(resolve, 5));
            performanceTracker.individualTimes.push(Date.now() - start);
            return 'Response';
          }),
          destroy: vi.fn()
        }));
        
        global.Summarizer.create.mockImplementation(() => ({
          summarize: vi.fn().mockImplementation(async () => {
            const start = Date.now();
            await new Promise(resolve => setTimeout(resolve, 3));
            performanceTracker.individualTimes.push(Date.now() - start);
            return 'Summary';
          }),
          destroy: vi.fn()
        }));
        
        const requests = [
          { type: 'motivational', performance: { avgScore: 85, minutes: 30 } },
          { type: 'summary', sessionData: { minutes: 30, avgScore: 85 } },
          { type: 'motivational', performance: { avgScore: 90, minutes: 45 } },
          { type: 'summary', sessionData: { minutes: 45, avgScore: 90 } }
        ];
        
        performanceTracker.batchStart = Date.now();
        const results = await aiManager.batchProcess(requests);
        performanceTracker.batchEnd = Date.now();
        
        const totalTime = performanceTracker.batchEnd - performanceTracker.batchStart;
        const avgIndividualTime = performanceTracker.individualTimes.reduce((a, b) => a + b, 0) / performanceTracker.individualTimes.length;
        
        expect(results).toHaveLength(4);
        expect(results.every(r => r.success)).toBe(true);
        
        // Batch processing should be reasonably efficient
        expect(totalTime).toBeLessThan(200);
        expect(avgIndividualTime).toBeLessThan(50);
      });

      it('should handle token quota management under high usage', async () => {
        await aiManager.initialize();
        
        let tokenUsage = 0;
        const TOKEN_LIMIT = 1000;
        
        global.LanguageModel.create.mockImplementation(() => ({
          inputQuota: TOKEN_LIMIT,
          get inputUsage() { return tokenUsage; },
          prompt: vi.fn().mockImplementation(async () => {
            tokenUsage += 50; // Simulate token consumption
            if (tokenUsage > TOKEN_LIMIT) {
              throw new Error('Token quota exceeded');
            }
            return 'Response';
          }),
          destroy: vi.fn()
        }));
        
        const performance = { avgScore: 85, minutes: 30 };
        const results = [];
        
        // Make requests until quota is exhausted
        for (let i = 0; i < 25; i++) {
          try {
            const result = await aiManager.generateMotivationalMessage(performance);
            results.push({ success: true, result });
          } catch (error) {
            results.push({ success: false, error: error.message });
          }
        }
        
        // Should handle quota exhaustion gracefully
        const successfulRequests = results.filter(r => r.success).length;
        const failedRequests = results.filter(r => !r.success).length;
        
        expect(successfulRequests).toBe(20); // 1000 / 50 = 20 successful requests
        expect(failedRequests).toBe(5); // Remaining requests should get fallback content
        
        // All results should still provide content (AI or fallback)
        expect(results).toHaveLength(25);
      });
    });

    describe('Performance Impact of Corrected API Implementations', () => {
      it('should measure API detection performance', async () => {
        const start = Date.now();
        
        // Test multiple availability checks
        for (let i = 0; i < 10; i++) {
          await aiManager.checkAIAvailability();
        }
        
        const totalTime = Date.now() - start;
        const avgTime = totalTime / 10;
        
        // API detection should be fast
        expect(avgTime).toBeLessThan(10);
      });

      it('should measure session creation performance', async () => {
        await aiManager.initialize();
        
        const timings = [];
        
        for (let i = 0; i < 5; i++) {
          const start = Date.now();
          await aiManager.generateMotivationalMessage({ avgScore: 85, minutes: 30 });
          timings.push(Date.now() - start);
        }
        
        const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
        const maxTime = Math.max(...timings);
        
        // Session operations should be reasonably fast
        expect(avgTime).toBeLessThan(50);
        expect(maxTime).toBeLessThan(100);
      });

      it('should measure streaming performance', async () => {
        await aiManager.initialize();
        
        const chunkTimings = [];
        let streamStart = 0;
        
        const options = {
          streaming: true,
          onChunk: (chunk, full) => {
            if (chunkTimings.length === 0) {
              streamStart = Date.now();
            }
            chunkTimings.push(Date.now() - streamStart);
          }
        };
        
        const start = Date.now();
        await aiManager.generateMotivationalMessage({ avgScore: 85, minutes: 30 }, null, options);
        const totalTime = Date.now() - start;
        
        // Streaming should provide incremental results quickly
        expect(chunkTimings).toHaveLength(2);
        expect(chunkTimings[0]).toBeLessThan(20); // First chunk should arrive quickly
        expect(totalTime).toBeLessThan(50);
      });

      it('should measure fallback content performance', async () => {
        // Mock all APIs as unavailable
        global.Summarizer.availability.mockResolvedValue('unavailable');
        global.LanguageModel.availability.mockResolvedValue('unavailable');
        global.Translator.availability.mockResolvedValue('unavailable');
        
        await aiManager.initialize();
        
        const timings = [];
        
        for (let i = 0; i < 10; i++) {
          const start = Date.now();
          await aiManager.generateMotivationalMessage({ avgScore: 85, minutes: 30 });
          timings.push(Date.now() - start);
        }
        
        const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
        
        // Fallback content should be very fast
        expect(avgTime).toBeLessThan(5);
      });

      it('should measure memory usage patterns', async () => {
        await aiManager.initialize();
        
        // Simulate memory tracking (in real environment, would use performance.measureUserAgentSpecificMemory)
        const memoryTracker = {
          baseline: 100, // MB
          peak: 100,
          current: 100
        };
        
        const simulateMemoryUsage = (operation) => {
          // Simulate memory increase during operation
          memoryTracker.current += 5;
          memoryTracker.peak = Math.max(memoryTracker.peak, memoryTracker.current);
          
          // Simulate cleanup
          setTimeout(() => {
            memoryTracker.current -= 4; // Some memory is cleaned up
          }, 10);
        };
        
        global.LanguageModel.create.mockImplementation(() => {
          simulateMemoryUsage('session_create');
          return {
            prompt: vi.fn().mockImplementation(async () => {
              simulateMemoryUsage('prompt');
              return 'Response';
            }),
            destroy: vi.fn(() => {
              memoryTracker.current -= 1; // Session cleanup
            })
          };
        });
        
        // Perform multiple operations
        for (let i = 0; i < 10; i++) {
          await aiManager.generateMotivationalMessage({ avgScore: 85, minutes: 30 });
        }
        
        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Memory should not grow unbounded
        expect(memoryTracker.current).toBeLessThan(memoryTracker.baseline + 20);
        expect(memoryTracker.peak).toBeLessThan(memoryTracker.baseline + 50);
      });
    });
  });
});