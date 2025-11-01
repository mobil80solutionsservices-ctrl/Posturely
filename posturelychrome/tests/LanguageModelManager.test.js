import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LanguageModelManager } from '../src/LanguageModelManager.js';

describe('LanguageModelManager', () => {
  let manager;
  let mockTranslatorSession;

  beforeEach(() => {
    // Mock translator session
    mockTranslatorSession = {
      translate: vi.fn(),
      destroy: vi.fn()
    };

    // Mock Chrome storage
    global.chrome = {
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn(),
          getBytesInUse: vi.fn()
        }
      }
    };

    // Mock global Translator API
    global.self = global;
    global.Translator = {
      availability: vi.fn(),
      create: vi.fn(() => mockTranslatorSession)
    };

    // Create manager after setting up mocks
    manager = new LanguageModelManager();
    // Reset API availability cache
    manager.apiAvailable = undefined;
  });

  describe('Initialization', () => {
    it('should initialize with default settings', async () => {
      chrome.storage.local.get.mockResolvedValue({});

      await manager.initialize();

      expect(manager.getCurrentLanguage()).toBe('en');
      expect(manager.getSupportedLanguages()).toHaveProperty('en', 'English');
    });

    it('should load saved preferences', async () => {
      chrome.storage.local.get.mockResolvedValue({
        userLanguage: 'es',
        downloadedModels: ['es', 'fr']
      });
      
      // Mock the model availability check to return true
      global.Translator.availability.mockResolvedValue('readily');

      await manager.initialize();

      expect(manager.getCurrentLanguage()).toBe('es');
      // Note: refreshModelAvailability is called during init, so we check that models are validated
      expect(global.Translator.availability).toHaveBeenCalled();
    });
  });

  describe('API Detection', () => {
    it('should detect Translator API availability using global object', () => {
      expect(manager.isTranslatorAPIAvailable()).toBe(true);
    });

    it('should return false when Translator is not in global scope', () => {
      delete global.Translator;
      manager.apiAvailable = undefined; // Reset cache
      
      expect(manager.isTranslatorAPIAvailable()).toBe(false);
    });
  });

  describe('Language Support', () => {
    it('should return supported languages', () => {
      const languages = manager.getSupportedLanguages();
      
      expect(languages).toHaveProperty('en', 'English');
      expect(languages).toHaveProperty('es', 'Spanish');
      expect(languages).toHaveProperty('fr', 'French');
    });

    it('should get current language', () => {
      expect(manager.getCurrentLanguage()).toBe('en');
    });
  });

  describe('Model Availability', () => {
    it('should always return true for English', async () => {
      const isAvailable = await manager.checkModelAvailability('en');
      expect(isAvailable).toBe(true);
    });

    it('should check translator API for other languages', async () => {
      global.Translator.availability.mockResolvedValue('readily');
      mockTranslatorSession.destroy = vi.fn();

      const isAvailable = await manager.checkModelAvailability('es');

      expect(global.Translator.availability).toHaveBeenCalledWith({
        sourceLanguage: 'en',
        targetLanguage: 'es'
      });
      expect(global.Translator.create).toHaveBeenCalledWith({
        sourceLanguage: 'en',
        targetLanguage: 'es'
      });
      expect(isAvailable).toBe(true);
    });

    it('should return false when translator API unavailable', async () => {
      global.Translator.availability.mockResolvedValue('unavailable');

      const isAvailable = await manager.checkModelAvailability('es');

      expect(isAvailable).toBe(false);
    });
  });

  describe('Model Download', () => {
    it('should immediately return true for English', async () => {
      const progressCallback = vi.fn();
      
      const result = await manager.downloadModel('en', progressCallback);

      expect(result).toBe(true);
      expect(progressCallback).toHaveBeenCalledWith(100);
    });

    it('should download model with progress tracking', async () => {
      const progressCallback = vi.fn();
      global.Translator.availability.mockResolvedValue('readily');
      mockTranslatorSession.translate.mockResolvedValue('Hola');

      const result = await manager.downloadModel('es', progressCallback);

      expect(result).toBe(true);
      expect(progressCallback).toHaveBeenCalledWith(0);
      expect(progressCallback).toHaveBeenCalledWith(100);
      expect(manager.getDownloadedModels()).toContain('es');
    });

    it('should handle download failures', async () => {
      global.Translator.availability.mockResolvedValue('readily');
      global.Translator.create.mockRejectedValue(new Error('Download failed'));

      await expect(manager.downloadModel('es')).rejects.toThrow('Failed to download translation model for Spanish. Download failed');
    });
  });

  describe('Language Selection', () => {
    it('should set language preference', async () => {
      global.Translator.availability.mockResolvedValue('readily');
      mockTranslatorSession.destroy = vi.fn();
      chrome.storage.local.set.mockResolvedValue();

      await manager.setLanguage('es');

      expect(manager.getCurrentLanguage()).toBe('es');
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ userLanguage: 'es' });
    });

    it('should reject unsupported languages', async () => {
      await expect(manager.setLanguage('xyz')).rejects.toThrow('Unsupported language: xyz');
    });

    it('should reject unavailable languages', async () => {
      global.Translator.availability.mockResolvedValue('unavailable');

      await expect(manager.setLanguage('es')).rejects.toThrow('Model not available for language: es');
    });
  });

  describe('Download Progress', () => {
    it('should track download progress', () => {
      manager.downloadProgress.set('es', 50);

      expect(manager.getDownloadProgress('es')).toBe(50);
      expect(manager.isDownloading('es')).toBe(true);
    });

    it('should detect completed downloads', () => {
      manager.downloadProgress.set('es', 100);

      expect(manager.isDownloading('es')).toBe(false);
    });
  });

  describe('Model Management', () => {
    it('should remove downloaded models', async () => {
      manager.downloadedModels.add('es');
      chrome.storage.local.set.mockResolvedValue();

      const result = await manager.removeModel('es');

      expect(result).toBe(true);
      expect(manager.getDownloadedModels()).not.toContain('es');
    });

    it('should not remove English model', async () => {
      const result = await manager.removeModel('en');

      expect(result).toBe(false);
    });
  });

  describe('Storage Information', () => {
    it('should get storage usage info', async () => {
      chrome.storage.local.getBytesInUse.mockResolvedValue(1024);
      manager.downloadedModels.add('es');
      manager.downloadedModels.add('fr');

      const info = await manager.getStorageInfo();

      expect(info.totalBytes).toBe(1024);
      expect(info.modelCount).toBe(2);
      expect(info.languages).toContain('es');
      expect(info.languages).toContain('fr');
    });

    it('should handle storage API errors', async () => {
      chrome.storage.local.getBytesInUse.mockRejectedValue(new Error('Storage error'));
      manager.downloadedModels.add('es');

      const info = await manager.getStorageInfo();

      expect(info.totalBytes).toBe(0);
      expect(info.modelCount).toBe(1);
    });
  });
});