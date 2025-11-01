/**
 * EnhancedLanguageManager - Extends LanguageModelManager with enhanced UI and download features
 * Provides comprehensive language selection interface with download status indicators
 */
import { LanguageModelManager } from './LanguageModelManager.js';

export class EnhancedLanguageManager extends LanguageModelManager {
  constructor() {
    super();
    
    // Enhanced language support with more detailed information
    this.languageDetails = {
      'en': { name: 'English', flag: '🇺🇸', size: 0, isDefault: true },
      'es': { name: 'español', flag: '🇪🇸', size: 25 },
      'fr': { name: 'français', flag: '🇫🇷', size: 28 },
      'de': { name: 'Deutsch', flag: '🇩🇪', size: 30 },
      'it': { name: 'italiano', flag: '🇮🇹', size: 26 },
      'pt': { name: 'português', flag: '🇵🇹', size: 27 },
      'ru': { name: 'русский', flag: '🇷🇺', size: 35 },
      'ja': { name: '日本語', flag: '🇯🇵', size: 32 },
      'ko': { name: '한국어', flag: '🇰🇷', size: 29 },
      'zh': { name: '中文', flag: '🇨🇳', size: 38 },
      'ar': { name: 'العربية', flag: '🇸🇦', size: 33 },
      'hi': { name: 'हिंदी', flag: '🇮🇳', size: 31 }
    };
    
    // Download status tracking
    this.downloadStatus = new Map(); // 'available', 'downloading', 'downloaded', 'error'
    this.downloadErrors = new Map();
  }

  /**
   * Get all supported languages with enhanced details
   */
  getAllSupportedLanguages() {
    return Object.entries(this.languageDetails).map(([code, details]) => ({
      code,
      name: details.name,
      flag: details.flag,
      size: details.size,
      isDefault: details.isDefault || false,
      status: this.getLanguageDownloadStatus(code),
      isActive: code === this.currentLanguage,
      error: this.downloadErrors.get(code) || null,
      isExperimental: this.isLanguageExperimental && this.isLanguageExperimental(code)
    }));
  }

  /**
   * Check actual API availability for a language (async)
   */
  async checkRealAvailability(languageCode) {
    if (languageCode === 'en') return 'downloaded';
    
    try {
      if (!this.isTranslatorAPIAvailable()) {
        return 'unavailable';
      }
      
      const availability = await Translator.availability({
        sourceLanguage: 'en',
        targetLanguage: languageCode
      });
      
      return availability;
    } catch (error) {
      const languageName = this.languageDetails[languageCode]?.name || languageCode;
      console.warn(`Failed to check availability for ${languageCode}: ${languageName}`, error);
      return 'unavailable';
    }
  }

  /**
   * Get download status for a specific language
   */
  getLanguageDownloadStatus(languageCode) {
    if (languageCode === 'en') {
      return 'downloaded'; // English is always available
    }
    
    // Check if currently downloading
    if (this.isDownloading(languageCode)) {
      return 'downloading';
    }
    
    // Check if downloaded
    if (this.downloadedModels.has(languageCode)) {
      return 'downloaded';
    }
    
    // Check if there was an error
    if (this.downloadErrors.has(languageCode)) {
      return 'error';
    }
    
    // Default to available (this will show the size from languageDetails)
    return 'available';
  }

  /**
   * Enhanced download with better progress tracking and error handling
   */
  async downloadLanguageModel(languageCode, progressCallback = null) {
    if (languageCode === 'en') {
      if (progressCallback) progressCallback(100);
      return true;
    }

    try {
      // Clear any previous errors
      this.downloadErrors.delete(languageCode);
      
      // Set status to downloading
      this.downloadStatus.set(languageCode, 'downloading');
      
      // First check real API availability
      const languageName = this.languageDetails[languageCode]?.name || languageCode;
      console.log(`Checking real availability for ${languageCode}: ${languageName}...`);
      const realAvailability = await this.checkRealAvailability(languageCode);
      console.log(`Real availability for ${languageCode}: ${languageName}`, realAvailability);
      
      if (realAvailability === 'unavailable') {
        throw new Error(`${this.languageDetails[languageCode]?.name || languageCode} is not supported by the Chrome Translator API`);
      }
      
      // Use parent class download method with enhanced error handling
      const result = await this.downloadModel(languageCode, progressCallback);
      
      if (result) {
        this.downloadStatus.set(languageCode, 'downloaded');
        return true;
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error(`Enhanced download failed for ${languageCode}:`, error);
      this.downloadStatus.set(languageCode, 'error');
      
      // Provide user-friendly error messages based on the specific error
      let userMessage = error.message;
      
      if (error.message.includes('not yet available') || error.message.includes('not yet supported')) {
        userMessage = `${this.languageDetails[languageCode]?.name || languageCode} translation is not yet fully supported. Currently working: English, Spanish, Japanese.`;
      } else if (error.message.includes('not supported by the Chrome Translator API')) {
        userMessage = `${this.languageDetails[languageCode]?.name || languageCode} is not supported by Chrome's built-in translator.`;
      } else if (error.message.includes('not supported on this device')) {
        userMessage = `Translation is not supported on this device.`;
      } else if (error.message.includes('Translation test failed')) {
        userMessage = `${this.languageDetails[languageCode]?.name || languageCode} model downloaded but translation test failed. This language may not be fully ready yet.`;
      }
      
      this.downloadErrors.set(languageCode, userMessage);
      throw new Error(userMessage);
    }
  }

  /**
   * Retry download for a language that failed
   */
  async retryDownload(languageCode, progressCallback = null) {
    // Clear error state
    this.downloadErrors.delete(languageCode);
    this.downloadStatus.delete(languageCode);
    
    return await this.downloadLanguageModel(languageCode, progressCallback);
  }

  /**
   * Get formatted status text for UI display
   */
  getStatusText(languageCode) {
    const status = this.getLanguageDownloadStatus(languageCode);
    const details = this.languageDetails[languageCode];
    
    switch (status) {
      case 'downloaded':
        return languageCode === 'en' ? 'Built-in' : 'Downloaded';
      case 'downloading':
        const progress = this.getDownloadProgress(languageCode);
        return `Downloading... ${progress}%`;
      case 'error':
        return 'Download failed';
      case 'available':
        return `Available (${details.size}MB)`;
      default:
        return 'Unknown';
    }
  }

  /**
   * Get status color for UI styling
   */
  getStatusColor(languageCode) {
    const status = this.getLanguageDownloadStatus(languageCode);
    
    switch (status) {
      case 'downloaded':
        return '#34C759'; // Green
      case 'downloading':
        return '#007AFF'; // Blue
      case 'error':
        return '#EF4444'; // Red
      case 'available':
        return '#6B7280'; // Gray
      default:
        return '#6B7280';
    }
  }

  /**
   * Check if a language can be selected (downloaded or downloading)
   */
  canSelectLanguage(languageCode) {
    const status = this.getLanguageDownloadStatus(languageCode);
    return status === 'downloaded' || languageCode === 'en';
  }

  /**
   * Switch to a language (enhanced with validation)
   */
  async switchExtensionLanguage(languageCode) {
    if (!this.canSelectLanguage(languageCode)) {
      throw new Error(`Cannot switch to ${languageCode}: language not available`);
    }
    
    // Use parent class method
    await this.setLanguage(languageCode);
    
    // Notify about language change
    this.notifyLanguageChange(languageCode);
    
    return true;
  }

  /**
   * Notify about language change (for UI updates)
   */
  notifyLanguageChange(languageCode) {
    // Dispatch custom event for language change
    const event = new CustomEvent('languageChanged', {
      detail: {
        language: languageCode,
        languageName: this.languageDetails[languageCode]?.name || languageCode
      }
    });
    document.dispatchEvent(event);
    
    // Also save to storage for persistence
    this.persistLanguagePreference(languageCode);
  }
  
  /**
   * Persist language preference
   */
  async persistLanguagePreference(languageCode) {
    try {
      await chrome.storage.local.set({ userLanguage: languageCode });
    } catch (error) {
      console.warn('Failed to persist language preference:', error);
    }
  }

  /**
   * Get language statistics for display
   */
  getLanguageStats() {
    const total = Object.keys(this.languageDetails).length;
    const downloaded = this.downloadedModels.size + 1; // +1 for English
    const downloading = Array.from(this.downloadStatus.values()).filter(s => s === 'downloading').length;
    const errors = this.downloadErrors.size;
    
    return {
      total,
      downloaded,
      downloading,
      available: total - downloaded - downloading,
      errors
    };
  }

  /**
   * Clear all download errors
   */
  clearAllErrors() {
    this.downloadErrors.clear();
    // Reset error statuses
    for (const [code, status] of this.downloadStatus.entries()) {
      if (status === 'error') {
        this.downloadStatus.delete(code);
      }
    }
  }

  /**
   * Get enhanced API status with more details
   */
  getEnhancedAPIStatus() {
    const baseStatus = this.getAPIStatus();
    const stats = this.getLanguageStats();
    
    return {
      ...baseStatus,
      stats,
      enhancedFeatures: {
        progressTracking: true,
        errorRecovery: true,
        detailedStatus: true,
        retrySupport: true
      }
    };
  }
}