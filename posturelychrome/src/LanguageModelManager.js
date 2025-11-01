/**
 * LanguageModelManager - Handles Chrome Translator API model downloads
 * Manages language selection, model downloads, and translation preferences
 */
export class LanguageModelManager {
  constructor() {
    this.supportedLanguages = {
      'en': 'English',
      'es': 'español',
      'ja': '日本語',
      'fr': 'français',
      'de': 'Deutsch',
      'it': 'italiano',
      'pt': 'português',
      'ko': '한국어',
      'zh': '中文',
      'hi': 'हिंदी',
      'ar': 'العربية',
      'ru': 'русский'
    };
    
    // Languages that are confirmed to work in Chrome's built-in translator
    this.confirmedLanguages = new Set(['en', 'es', 'ja']);
    
    // Languages that may work but are still rolling out
    this.experimentalLanguages = new Set(['fr', 'de', 'it', 'pt', 'ko', 'zh', 'hi', 'ar', 'ru']);
    
    this.downloadedModels = new Set();
    this.currentLanguage = 'en';
    this.downloadProgress = new Map();
    this.apiAvailable = false;
    
    // Error message templates for different scenarios
    this.errorMessages = {
      API_NOT_AVAILABLE: 'Translation features are not available. Only English is supported at this time. To enable translations:\n1. Join Chrome AI Early Preview Program\n2. Add Origin Trial token to manifest.json\n3. Enable chrome://flags/#optimization-guide-on-device-model\n\nSee CHROME_AI_SETUP.md for detailed instructions.',
      DEVICE_NOT_SUPPORTED: 'Your device does not support Chrome AI translation features. Translation is only available on supported devices with sufficient resources.',
      LANGUAGE_NOT_SUPPORTED: (language) => `Translation to ${this.supportedLanguages[language] || language} is not supported on this device. Please try a different language.`,
      MODEL_DOWNLOAD_FAILED: (language, reason) => `Failed to download translation model for ${this.supportedLanguages[language] || language}. ${reason}`,
      QUOTA_EXCEEDED: 'Translation quota has been exceeded. Please try again later or reduce usage.',
      NETWORK_ERROR: 'Network error occurred while accessing translation services. Please check your internet connection and try again.',
      SESSION_CREATION_FAILED: (language) => `Unable to create translation session for ${this.supportedLanguages[language] || language}. The model may not be available or there may be a temporary issue.`,
      ORIGIN_TRIAL_REQUIRED: 'Chrome AI features require a valid Origin Trial token. Please:\n1. Join the Chrome AI Early Preview Program\n2. Register for the "Prompt API for Gemini Nano" trial\n3. Add the token to your manifest.json',
      SECURE_CONTEXT_REQUIRED: 'Translation API requires HTTPS. Please use a secure context.'
    };
  }

  /**
   * Initialize the language manager and load preferences
   */
  async initialize() {
    try {
      // Check secure context first
      if (!isSecureContext) {
        console.error('Translation API requires HTTPS. Please use a secure context.');
        return;
      }
      
      // Check if Chrome AI APIs are available
      const apiAvailable = this.isTranslatorAPIAvailable();
      if (!apiAvailable) {
        console.warn(this.errorMessages.API_NOT_AVAILABLE);
        // Still continue initialization for English-only mode
      }
      
      // Load saved language preference
      const result = await chrome.storage.local.get(['userLanguage', 'downloadedModels']);
      
      if (result.userLanguage) {
        this.currentLanguage = result.userLanguage;
      }
      
      if (result.downloadedModels) {
        this.downloadedModels = new Set(result.downloadedModels);
      }
      
      // Check which models are actually available (only if API is available)
      if (apiAvailable) {
        await this.refreshModelAvailability();
      } else {
        // Reset to English if API is not available
        this.currentLanguage = 'en';
        this.downloadedModels.clear();
      }
      
    } catch (error) {
      console.warn('Failed to initialize LanguageModelManager:', error);
    }
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages() {
    return { ...this.supportedLanguages };
  }

  /**
   * Get languages that are confirmed to work
   */
  getConfirmedLanguages() {
    const confirmed = {};
    for (const code of this.confirmedLanguages) {
      confirmed[code] = this.supportedLanguages[code];
    }
    return confirmed;
  }

  /**
   * Check if a language is likely to work
   */
  isLanguageLikelySupported(language) {
    return this.confirmedLanguages.has(language);
  }

  /**
   * Check if a language is experimental
   */
  isLanguageExperimental(language) {
    return this.experimentalLanguages.has(language);
  }

  /**
   * Get current selected language
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Check if Chrome AI Translator API is available
   */
  isTranslatorAPIAvailable() {
    return typeof Translator !== 'undefined';
  }

  /**
   * Get available languages based on API availability
   */
  getAvailableLanguages() {
    if (this.isTranslatorAPIAvailable()) {
      return { ...this.supportedLanguages };
    } else {
      // Only English is available without the API
      return { 'en': 'English' };
    }
  }

  /**
   * Check if a language model is available locally using Translator API
   */
  async checkModelAvailability(language) {
    try {
      if (language === 'en') return true; // English is always available
      
      // Check if Translator API is available
      if (!this.isTranslatorAPIAvailable()) {
        return false;
      }
      
      try {
        const availability = await Translator.availability({
          sourceLanguage: 'en',
          targetLanguage: language
        });
        
        return availability !== 'unavailable';
      } catch (error) {
        const languageName = this.supportedLanguages[language] || language;
        console.warn(`Failed to check availability for ${language}: ${languageName}`, error.message);
        return false;
      }
    } catch (error) {
      const languageName = this.supportedLanguages[language] || language;
      console.warn(`Failed to check model availability for ${language}: ${languageName}`, error);
      return false;
    }
  }

  /**
   * Download a language model with progress tracking using Translator API
   */
  async downloadModel(language, progressCallback = null) {
    if (language === 'en') {
      if (progressCallback) progressCallback(100);
      return true;
    }

    // Check if translator API is available
    if (!this.isTranslatorAPIAvailable()) {
      throw new Error('Translation API not available - only English is supported');
    }

    try {
      this.downloadProgress.set(language, 0);
      
      if (progressCallback) progressCallback(0);

      // Check availability first
      const availability = await Translator.availability({
        sourceLanguage: 'en',
        targetLanguage: language
      });

      const languageName = this.supportedLanguages[language] || language;
      console.log(`Translator availability for ${language}: ${languageName}`, availability);

      if (availability === 'unavailable') {
        throw new Error(`Translation to ${this.supportedLanguages[language] || language} is not supported on this device`);
      }
      
      // For experimental languages, log a warning but continue
      if (this.isLanguageExperimental(language)) {
        console.warn(`${language}: ${languageName} is experimental and may not be fully supported yet in Chrome's built-in translator`);
      }

      if (progressCallback) progressCallback(25);

      // Create a translator (this triggers model download if needed)
      const translator = await Translator.create({
        sourceLanguage: 'en',
        targetLanguage: language,
        monitor(monitor) {
          monitor.addEventListener('downloadprogress', (e) => {
            const progress = Math.round(25 + (e.loaded * 50)); // 25-75% for download
            if (progressCallback) progressCallback(progress);
          });
        }
      });

      if (progressCallback) progressCallback(75);

      // Test the translator with a simple translation
      console.log(`Testing translation for ${language}: ${languageName}...`);
      
      // Try both API formats to handle different Chrome versions
      let result;
      let translatedText;
      
      try {
        // Try new API format first (direct string)
        result = await translator.translate('Hello');
        if (typeof result === 'string' && result.trim()) {
          translatedText = result;
        }
      } catch (error) {
        console.log('New API format failed, trying old format...');
      }
      
      if (!translatedText) {
        try {
          // Try old API format (object with text property)
          result = await translator.translate({ text: 'Hello' });
          if (result && result.output && typeof result.output === 'string') {
            translatedText = result.output;
          }
        } catch (error) {
          console.log('Old API format also failed...');
        }
      }
      
      console.log(`Translation result for ${language}: ${languageName}`, result);
      console.log(`Extracted text:`, translatedText);
      
      if (!translatedText || translatedText.trim() === '') {
        console.warn(`Translation test failed for ${language}: ${languageName} - no valid output received`);
        throw new Error(`Translation to ${this.supportedLanguages[language] || language} is not yet supported in your Chrome version`);
      }
      
      console.log(`Translation test successful for ${language}: ${languageName} - "Hello" -> "${translatedText}"`);
      
      if (progressCallback) progressCallback(100);
      this.downloadProgress.set(language, 100);

      // Mark model as downloaded
      this.downloadedModels.add(language);
      await this.saveDownloadedModels();

      return true;

    } catch (error) {
      console.error(`Failed to download model for ${language}:`, error);
      this.downloadProgress.delete(language);
      
      // Provide more helpful error messages
      if (error.message.includes('not yet supported')) {
        throw new Error(`${this.supportedLanguages[language] || language} translation is not yet available in your Chrome version. Currently supported languages: English, Spanish, Japanese.`);
      } else if (error.message.includes('unavailable')) {
        throw new Error(`Translation to ${this.supportedLanguages[language] || language} is not supported on this device.`);
      } else {
        throw new Error(`Failed to set up translation for ${this.supportedLanguages[language] || language}: ${error.message}`);
      }
    }
  }

  /**
   * Set the current language preference
   */
  async setLanguage(language) {
    if (!this.supportedLanguages[language]) {
      throw new Error(`Unsupported language: ${language}`);
    }

    // Check if model is available, download if needed
    const isAvailable = await this.checkModelAvailability(language);
    
    if (!isAvailable && language !== 'en') {
      throw new Error(`Model not available for language: ${language}`);
    }

    this.currentLanguage = language;
    
    // Save preference
    await chrome.storage.local.set({ userLanguage: language });
    
    return true;
  }

  /**
   * Get download progress for a language
   */
  getDownloadProgress(language) {
    return this.downloadProgress.get(language) || 0;
  }

  /**
   * Check if a model download is in progress
   */
  isDownloading(language) {
    return this.downloadProgress.has(language) && this.downloadProgress.get(language) < 100;
  }

  /**
   * Get list of downloaded models
   */
  getDownloadedModels() {
    return Array.from(this.downloadedModels);
  }

  /**
   * Refresh model availability by checking each downloaded model
   */
  async refreshModelAvailability() {
    const modelsToCheck = Array.from(this.downloadedModels);
    const availableModels = new Set();

    for (const language of modelsToCheck) {
      const isAvailable = await this.checkModelAvailability(language);
      if (isAvailable) {
        availableModels.add(language);
      }
    }

    this.downloadedModels = availableModels;
    await this.saveDownloadedModels();
  }

  /**
   * Save downloaded models list to storage
   */
  async saveDownloadedModels() {
    try {
      await chrome.storage.local.set({ 
        downloadedModels: Array.from(this.downloadedModels) 
      });
    } catch (error) {
      console.warn('Failed to save downloaded models:', error);
    }
  }

  /**
   * Remove a downloaded model (cleanup)
   */
  async removeModel(language) {
    if (language === 'en') return false; // Can't remove English
    
    this.downloadedModels.delete(language);
    await this.saveDownloadedModels();
    
    return true;
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo() {
    try {
      const usage = await chrome.storage.local.getBytesInUse();
      return {
        totalBytes: usage,
        modelCount: this.downloadedModels.size,
        languages: Array.from(this.downloadedModels)
      };
    } catch (error) {
      console.warn('Failed to get storage info:', error);
      return {
        totalBytes: 0,
        modelCount: this.downloadedModels.size,
        languages: Array.from(this.downloadedModels)
      };
    }
  }

  /**
   * Get API availability status
   */
  getAPIStatus() {
    const translatorAvailable = this.isTranslatorAPIAvailable();
    return {
      translatorAvailable,
      supportedLanguages: this.getSupportedLanguages(),
      currentLanguage: this.getCurrentLanguage(),
      downloadedModels: this.getDownloadedModels(),
      errorMessage: translatorAvailable ? null : this.errorMessages.API_NOT_AVAILABLE
    };
  }

  /**
   * Get user-friendly error message for a specific scenario
   */
  getErrorMessage(errorType, ...args) {
    const message = this.errorMessages[errorType];
    if (typeof message === 'function') {
      return message(...args);
    }
    return message || 'An unknown error occurred with the translation service.';
  }

  /**
   * Check if the current environment supports translation features using Translator API
   */
  async getTranslationCapabilities() {
    if (!this.isTranslatorAPIAvailable()) {
      return {
        available: false,
        reason: 'api_not_available',
        message: 'Translation API not available - only English is supported',
        supportedLanguages: { 'en': 'English' }
      };
    }

    try {
      // Test with Spanish to see if translation works
      const availability = await Translator.availability({
        sourceLanguage: 'en',
        targetLanguage: 'es'
      });

      if (availability === 'unavailable') {
        return {
          available: false,
          reason: 'device_not_supported',
          message: 'Your device does not support translation features',
          supportedLanguages: { 'en': 'English' }
        };
      }

      return {
        available: true,
        reason: 'available',
        message: null,
        supportedLanguages: this.getSupportedLanguages(),
        requiresDownload: availability === 'after-download'
      };
    } catch (error) {
      return {
        available: false,
        reason: 'error',
        message: 'Error checking translation capabilities',
        supportedLanguages: { 'en': 'English' }
      };
    }
  }
}