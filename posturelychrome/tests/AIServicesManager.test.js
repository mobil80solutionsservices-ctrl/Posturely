import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIServicesManager } from '../src/AIServicesManager.js';

describe('AIServicesManager', () => {
  let manager;
  let mockAISession;

  beforeEach(() => {
    manager = new AIServicesManager();
    
    // Mock AI session
    mockAISession = {
      prompt: vi.fn(),
      summarize: vi.fn(),
      translate: vi.fn(),
      write: vi.fn(),
      rewrite: vi.fn(),
      destroy: vi.fn()
    };

    // Mock Chrome AI APIs using global objects
    global.Summarizer = {
      availability: vi.fn(),
      create: vi.fn(() => mockAISession)
    };
    
    global.LanguageModel = {
      availability: vi.fn(),
      create: vi.fn(() => mockAISession)
    };
    
    global.Translator = {
      availability: vi.fn(),
      create: vi.fn(() => mockAISession)
    };
    
    global.Writer = {
      availability: vi.fn(),
      create: vi.fn(() => mockAISession)
    };
    
    global.Rewriter = {
      availability: vi.fn(),
      create: vi.fn(() => mockAISession)
    };
  });

  describe('AI Availability Check', () => {
    it('should check AI availability correctly', async () => {
      Summarizer.availability.mockResolvedValue('readily');
      LanguageModel.availability.mockResolvedValue('readily');
      Translator.availability.mockResolvedValue('readily');
      Writer.availability.mockResolvedValue('readily');
      Rewriter.availability.mockResolvedValue('readily');

      const availability = await manager.checkAIAvailability();

      expect(availability).toEqual({
        summarizer: true,
        languageModel: true,
        translator: true,
        writer: true,
        rewriter: true
      });
    });

    it('should handle AI unavailability', async () => {
      Summarizer.availability.mockResolvedValue('unavailable');
      LanguageModel.availability.mockRejectedValue(new Error('Not available'));
      Translator.availability.mockResolvedValue('unavailable');
      Writer.availability.mockResolvedValue('unavailable');
      Rewriter.availability.mockResolvedValue('unavailable');

      const availability = await manager.checkAIAvailability();

      expect(availability).toEqual({
        summarizer: false,
        languageModel: false,
        translator: false,
        writer: false,
        rewriter: false
      });
    });
  });

  describe('Posture Summary Generation', () => {
    it('should generate AI summary when available', async () => {
      Summarizer.availability.mockResolvedValue('readily');
      mockAISession.summarize.mockResolvedValue('Great posture session! Keep it up.');

      const sessionData = { minutes: 30, avgScore: 85 };
      const summary = await manager.generatePostureSummary(sessionData);

      expect(summary).toBe('Great posture session! Keep it up.');
      expect(mockAISession.summarize).toHaveBeenCalled();
      expect(mockAISession.destroy).toHaveBeenCalled();
    });

    it('should use fallback when AI unavailable', async () => {
      Summarizer.availability.mockResolvedValue('unavailable');

      const sessionData = { minutes: 30, avgScore: 85 };
      const summary = await manager.generatePostureSummary(sessionData);

      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
      expect(mockAISession.summarize).not.toHaveBeenCalled();
    });

    it('should include mood data in prompt', async () => {
      Summarizer.availability.mockResolvedValue('readily');
      mockAISession.summarize.mockResolvedValue('Summary with mood');

      const sessionData = { minutes: 30, avgScore: 85 };
      const moodData = { mood: 'focused' };
      
      await manager.generatePostureSummary(sessionData, moodData);

      const promptCall = mockAISession.summarize.mock.calls[0][0];
      expect(promptCall).toContain('focused');
    });
  });

  describe('Motivational Message Generation', () => {
    it('should generate motivational message with AI', async () => {
      LanguageModel.availability.mockResolvedValue('readily');
      mockAISession.prompt.mockResolvedValue('You are doing great!');

      const performance = { avgScore: 90, minutes: 45 };
      const message = await manager.generateMotivationalMessage(performance);

      expect(message).toBe('You are doing great!');
      expect(mockAISession.prompt).toHaveBeenCalled();
    });

    it('should adapt message based on performance', async () => {
      LanguageModel.availability.mockResolvedValue('readily');
      mockAISession.prompt.mockResolvedValue('Keep improving!');

      const lowPerformance = { avgScore: 60, minutes: 30 };
      await manager.generateMotivationalMessage(lowPerformance);

      const promptCall = mockAISession.prompt.mock.calls[0][0];
      expect(promptCall).toContain('encouragement and improvement');
    });

    it('should use fallback for motivational messages', async () => {
      LanguageModel.availability.mockResolvedValue('unavailable');

      const performance = { avgScore: 85, minutes: 30 };
      const message = await manager.generateMotivationalMessage(performance);

      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });
  });

  describe('Translation', () => {
    it('should translate content when AI available', async () => {
      Translator.availability.mockResolvedValue('readily');
      mockAISession.translate.mockResolvedValue('Hola mundo');

      const translation = await manager.translateContent('Hello world', 'es');

      expect(translation).toBe('Hola mundo');
      expect(mockAISession.translate).toHaveBeenCalledWith('Hello world');
    });

    it('should return original text when translation fails', async () => {
      Translator.availability.mockResolvedValue('unavailable');

      const translation = await manager.translateContent('Hello world', 'es');

      expect(translation).toBe('Hello world');
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple AI requests', async () => {
      LanguageModel.availability.mockResolvedValue('readily');
      Summarizer.availability.mockResolvedValue('readily');
      
      mockAISession.summarize.mockResolvedValueOnce('Summary result');
      mockAISession.prompt.mockResolvedValueOnce('Motivational result');

      const requests = [
        { type: 'summary', sessionData: { minutes: 30, avgScore: 85 } },
        { type: 'motivational', performance: { avgScore: 85, minutes: 30 } }
      ];

      const results = await manager.batchProcess(requests);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].data).toBe('Summary result');
      expect(results[1].success).toBe(true);
      expect(results[1].data).toBe('Motivational result');
    });
  });

  describe('Streaming Support', () => {
    it('should handle LanguageModel streaming', async () => {
      LanguageModel.availability.mockResolvedValue('readily');
      
      // Mock streaming session
      const mockStreamingSession = {
        ...mockAISession,
        promptStreaming: vi.fn(() => ({
          async *[Symbol.asyncIterator]() {
            yield 'Hello ';
            yield 'Hello world!';
          }
        }))
      };
      
      LanguageModel.create.mockResolvedValue(mockStreamingSession);
      
      const chunks = [];
      const onChunk = (chunk, full) => chunks.push({ chunk, full });
      
      const performance = { avgScore: 85, minutes: 30 };
      const result = await manager.generateMotivationalMessage(performance, null, {
        streaming: true,
        onChunk
      });
      
      expect(result).toBe('Hello world!');
      expect(chunks).toHaveLength(2);
      expect(chunks[0].chunk).toBe('Hello ');
      expect(chunks[1].chunk).toBe('world!');
    });

    it('should handle Writer streaming', async () => {
      Writer.availability.mockResolvedValue('readily');
      
      const mockStreamingSession = {
        ...mockAISession,
        writeStreaming: vi.fn(() => ({
          async *[Symbol.asyncIterator]() {
            yield 'Take ';
            yield 'a break!';
          }
        }))
      };
      
      Writer.create.mockResolvedValue(mockStreamingSession);
      
      const chunks = [];
      const onChunk = (chunk, full) => chunks.push({ chunk, full });
      
      const result = await manager.generateContent('Generate break reminder', {
        streaming: true,
        onChunk
      });
      
      expect(result).toBe('Take a break!');
      expect(chunks).toHaveLength(2);
    });

    it('should handle Rewriter streaming', async () => {
      Rewriter.availability.mockResolvedValue('readily');
      
      const mockStreamingSession = {
        ...mockAISession,
        rewriteStreaming: vi.fn(() => ({
          async *[Symbol.asyncIterator]() {
            yield 'Improved ';
            yield 'text!';
          }
        }))
      };
      
      Rewriter.create.mockResolvedValue(mockStreamingSession);
      
      const chunks = [];
      const onChunk = (chunk, full) => chunks.push({ chunk, full });
      
      const result = await manager.rewriteContent('Original text', {
        streaming: true,
        onChunk
      });
      
      // Since 'Rewriter' in self is true in test environment, it uses incremental pattern
      expect(result).toBe('Improved text!');
      expect(chunks).toHaveLength(2);
      expect(chunks[0].chunk).toBe('Improved ');
      expect(chunks[0].full).toBe('Improved ');
      expect(chunks[1].chunk).toBe('text!');
      expect(chunks[1].full).toBe('Improved text!');
    });
  });

  describe('Token Usage Tracking', () => {
    it('should get token usage with new API properties', () => {
      const sessionWithNewAPI = {
        inputQuota: 1000,
        inputUsage: 250
      };
      
      const usage = manager.getTokenUsage(sessionWithNewAPI);
      
      expect(usage.inputQuota).toBe(1000);
      expect(usage.inputUsage).toBe(250);
      expect(usage.tokensLeft).toBe(750);
    });

    it('should get token usage with old API properties', () => {
      const sessionWithOldAPI = {
        maxTokens: 1000,
        tokensSoFar: 300,
        tokensLeft: 700
      };
      
      const usage = manager.getTokenUsage(sessionWithOldAPI);
      
      expect(usage.inputQuota).toBe(1000);
      expect(usage.inputUsage).toBe(300);
      expect(usage.tokensLeft).toBe(700);
    });

    it('should measure input usage with new API', async () => {
      const sessionWithNewAPI = {
        measureInputUsage: vi.fn().mockResolvedValue(50)
      };
      
      const usage = await manager.measureInputUsage(sessionWithNewAPI, 'test prompt');
      
      expect(usage).toBe(50);
      expect(sessionWithNewAPI.measureInputUsage).toHaveBeenCalledWith('test prompt');
    });

    it('should measure input usage with old API', async () => {
      const sessionWithOldAPI = {
        countPromptTokens: vi.fn().mockResolvedValue(45)
      };
      
      const usage = await manager.measureInputUsage(sessionWithOldAPI, 'test prompt');
      
      expect(usage).toBe(45);
      expect(sessionWithOldAPI.countPromptTokens).toHaveBeenCalledWith('test prompt');
    });

    it('should check if session has enough tokens', () => {
      const sessionWithTokens = {
        inputQuota: 1000,
        inputUsage: 100
      };
      
      expect(manager.hasEnoughTokens(sessionWithTokens, 500)).toBe(true);
      expect(manager.hasEnoughTokens(sessionWithTokens, 950)).toBe(false);
    });

    it('should get detailed session statistics', () => {
      const session = {
        temperature: 0.8,
        topK: 3,
        inputQuota: 1000,
        inputUsage: 250
      };
      
      const stats = manager.getSessionStats(session);
      
      expect(stats.temperature).toBe(0.8);
      expect(stats.topK).toBe(3);
      expect(stats.inputQuota).toBe(1000);
      expect(stats.inputUsage).toBe(250);
      expect(stats.tokensLeft).toBe(750);
      expect(stats.usagePercentage).toBe(25);
    });
  });

  describe('Fallback Content', () => {
    it('should provide different fallback content types', () => {
      const summary = manager._getFallbackContent('summaries');
      const motivational = manager._getFallbackContent('motivational');
      const breakReminder = manager._getFallbackContent('breakReminders');

      expect(typeof summary).toBe('string');
      expect(typeof motivational).toBe('string');
      expect(typeof breakReminder).toBe('string');
    });

    it('should select motivational content based on performance', () => {
      const highPerformance = { avgScore: 90 };
      const lowPerformance = { avgScore: 50 };

      const highMessage = manager._getFallbackContent('motivational', highPerformance);
      const lowMessage = manager._getFallbackContent('motivational', lowPerformance);

      expect(typeof highMessage).toBe('string');
      expect(typeof lowMessage).toBe('string');
    });
  });
});