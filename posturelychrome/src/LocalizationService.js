/**
 * LocalizationService - Handles text translation for the entire extension interface
 * Provides language switching for both sidepanel and analytics dashboard
 */
export class LocalizationService {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = new Map();
    this.translationCache = new Map();
    this.translatorCache = new Map(); // Cache translator instances to avoid repeated downloads
    this.isTranslating = false;
    
    // Define translatable text elements and their selectors
    this.translatableElements = {
      // Main interface elements
      // 'title': { selector: '.title', text: 'Posturely' }, // Don't translate brand name
      'status-inactive': { selector: '#status', text: 'No active tracking' },
      'status-subtext': { selector: '.subtext', text: 'Start a session to monitor your posture.' },
      'start-tracking': { selector: '#startTracking', text: 'Start tracking' },
      'full-body-scan': { selector: '#startScan', text: '📷 Full Body Scan' },
      'stop-tracking': { selector: '#stopTracking', text: '⏹️ Stop Tracking' },
      'view-past-data': { selector: '#viewPastDataBtn', text: '📊 View Past Data' },
      
      // Score display
      'score-label': { selector: '.score-label', text: 'Current Posture Score' },
      'score-calibrating': { selector: '#scoreStatus', text: 'Calibrating...' },
      
      // Mood section
      'mood-title': { selector: '.mood-title', text: 'How are you feeling?' },
      'mood-subtitle': { selector: '#moodModal p', text: 'Optional mood note for this session' },
      'mood-placeholder': { selector: '#moodInput', attribute: 'placeholder', text: 'e.g., focused, tired, energetic...' },
      
      // Goals section
      'goals-title': { selector: '.goals-title', text: 'Daily Goals' },
      'streak-label': { selector: '.streak-label', text: 'day streak' },
      
      // Badges section
      'badges-title': { selector: '.badges-title', text: 'Achievements' },
      
      // Settings modal
      'settings-title': { selector: '#settingsModal .modal-header h3', text: 'Break Reminder Settings' },
      'break-reminders-label': { selector: 'label[for="breakRemindersEnabled"]', text: 'Enable Break Reminders' },
      'break-reminders-desc': { selector: '.setting-item:first-child .setting-description', text: 'Get smart notifications to take breaks based on your posture patterns' },
      'reminder-frequency-label': { selector: 'label[for="reminderFrequency"]', text: 'Reminder Frequency' },
      'reminder-frequency-desc': { selector: '.setting-item:nth-child(2) .setting-description', text: 'How often to remind you to take breaks (5-120 minutes)' },
      'posture-threshold-label': { selector: 'label[for="postureThreshold"]', text: 'Posture Threshold' },
      'posture-threshold-desc': { selector: '.setting-item:nth-child(3) .setting-description', text: 'Trigger reminders when posture score drops below this value' },
      'break-stats-label': { selector: '.setting-item:last-child .setting-label', text: 'Break Reminder Stats' },
      
      // Language modal
      'language-modal-title': { selector: '#languageModal .modal-header h3', text: 'Select Language' },
      
      // Origin trial messages
      'origin-trial-checking': { selector: '#originTrialText', text: 'Checking Chrome AI features...' },
      'origin-trial-optional': { selector: '#originTrialDetails p', text: 'Optional: Enable AI-powered features for enhanced summaries and motivational messages:' },
      'setup-guide-btn': { selector: '#setupGuideBtn', text: '📖 Setup Guide' },
      'recheck-btn': { selector: '#recheckAIBtn', text: '🔄 Recheck' },
      'test-ai-btn': { selector: '#testAIBtn', text: '🧪 Test AI' },
      'dismiss-btn': { selector: '#dismissAISetupBtn', text: '✕ Don\'t show again' },
      
      // Common buttons and actions
      'close': { selector: '.close-button', text: '×' },
      'cancel': { selector: '.cancel-btn', text: 'Cancel' },
      'retry': { selector: '.retry-btn', text: '↻' },
      
      // Status messages
      'downloading': { text: 'Downloading...' },
      'downloaded': { text: 'Downloaded' },
      'available': { text: 'Available' },
      'built-in': { text: 'Built-in' },
      'download-failed': { text: 'Download failed' },
      'preparing-download': { text: 'Preparing download...' },
      'download-cancelled': { text: 'Download cancelled by user' },
      'download-success': { text: 'downloaded successfully!' }
    };
    
    // Analytics dashboard specific elements
    this.analyticsElements = {
      'analytics-title': { selector: '.analytics-title', text: 'Posture Analytics' },
      'calendar-view': { selector: '.card-title', text: 'Calendar View' },
      'day-details': { selector: '.card-title', text: 'Day Details' },
      'session-history': { selector: '.card-title', text: 'Session History' },
      'statistics-overview': { selector: '.statistics-header', text: 'Statistics Overview' },
      'insights': { selector: '.card-title', text: 'Insights' },
      'back-to-main': { selector: '.back-button', text: '← Back to Main' },
      'full-body-scan-history': { selector: '.card-title', text: 'Full Body Scan History' },
      
      // Calendar controls
      'today-btn': { selector: '#todayBtn', text: 'Today' },
      
      // Week labels
      'monday': { selector: '.week-label:nth-child(1)', text: 'Mon' },
      'tuesday': { selector: '.week-label:nth-child(2)', text: 'Tue' },
      'wednesday': { selector: '.week-label:nth-child(3)', text: 'Wed' },
      'thursday': { selector: '.week-label:nth-child(4)', text: 'Thu' },
      'friday': { selector: '.week-label:nth-child(5)', text: 'Fri' },
      'saturday': { selector: '.week-label:nth-child(6)', text: 'Sat' },
      'sunday': { selector: '.week-label:nth-child(7)', text: 'Sun' },
      
      // Statistics labels
      'total-time': { text: 'Total Time' },
      'total-sessions': { text: 'Total Sessions' },
      'active-days': { text: 'Active Days' },
      'avg-score': { text: 'Avg Score' },
      'avg-per-day': { text: 'Avg Per Day' },
      'this-week': { text: 'This Week' },
      
      // Day details labels
      'date-label': { text: 'Date' },
      'total-time-label': { text: 'Total Time' },
      'average-score-label': { text: 'Average Score' },
      'sessions-label': { text: 'Sessions' },
      'notes-label': { text: 'Notes' },
      'save-notes': { text: 'Save Notes' },
      'add-notes-placeholder': { text: 'Add notes for this day...' },
      
      // Score labels
      'good-score': { text: 'Good' },
      'fair-score': { text: 'Fair' },
      'poor-score': { text: 'Poor' },
      
      // Empty states
      'loading': { text: 'Loading...' },
      'please-wait': { text: 'Please wait while we load your data' },
      'error': { text: 'Error' },
      'select-day': { text: 'Select a day' },
      'click-calendar-day': { text: 'Click on a calendar day to view details' },
      'no-sessions': { text: 'No sessions' },
      'no-tracking-sessions': { text: 'No tracking sessions for this day' },
      'no-scans-yet': { text: 'No scans yet' },
      'complete-scan-message': { text: 'Complete a full body scan to see your posture analysis history' },
      'calendar-error': { text: 'Calendar Error' },
      'failed-calendar-view': { text: 'Failed to render calendar view' },
      'failed-day-details': { text: 'Failed to load day details' },
      'failed-session-history': { text: 'Failed to load session history' },
      'error-loading-scan-history': { text: 'Error loading scan history' },
      'refresh-page': { text: 'Please try refreshing the page' },
      'failed-statistics': { text: 'Failed to calculate statistics' },
      'error-loading-insights': { text: 'Error loading insights' },
      'no-data': { text: 'No data' },
      
      // Scan history
      'multi-view-scan': { text: 'Multi-view scan' },
      'analysis-complete': { text: 'Analysis complete' },
      'views-captured': { text: 'views captured' },
      'recommendations': { text: 'recommendations' },
      
      // Scan page elements
      'full-body-posture-scan': { text: 'Full Body Posture Scan' },
      'comprehensive-posture-analysis': { text: 'Get comprehensive posture analysis with AI-powered insights' },
      'start-scan': { text: 'Start Scan' },
      'capture': { text: 'Capture' },
      'retake': { text: 'Retake' },
      'new-scan': { text: 'New Scan' },
      'view-past-data': { text: 'View Past Data' },
      'do-guided-exercises': { text: 'Do Guided Exercises' },
      
      // Scan status messages
      'initializing-camera': { text: 'Initializing camera...' },
      'position-yourself': { text: 'Position yourself for full body capture' },
      'camera-ready': { text: 'Camera ready. Position yourself for full body capture.' },
      'full-body-detected': { text: 'Full body detected! Hold position...' },
      'hold-position': { text: 'Hold position...' },
      'front-capture-starting': { text: 'Front capture starting...' },
      'side-capture-starting': { text: 'Side capture starting...' },
      'please-turn-to-side': { text: 'Please turn to your side' },
      'capturing-front': { text: 'Capturing front...' },
      'capturing-side': { text: 'Capturing side...' },
      'scan-complete-generating': { text: 'Scan complete! Generating report...' },
      'analyzing-posture': { text: 'Analyzing posture...' },
      'analysis-complete-check-report': { text: 'Analysis complete! Check your posture report below.' },
      'scan-completed-successfully': { text: 'Scan completed successfully!' },
      
      // Scan results display
      'scan-complete-title': { text: 'Full Body Scan Complete!' },
      'overall-posture-score': { text: 'Overall Posture Score' },
      'out-of-100': { text: 'out of 100' },
      'detailed-analysis': { text: 'Detailed Analysis' },
      'neck-tilt': { text: 'Neck Tilt' },
      'shoulder-tilt': { text: 'Shoulder Tilt' },
      'hip-alignment': { text: 'Hip Alignment' },
      'overall-alignment': { text: 'Overall Alignment' },
      'multi-view-analysis': { text: 'Multi-View Analysis' },
      'front-view-score': { text: 'Front View Score' },
      'side-view-score': { text: 'Side View Score' },
      'ai-analysis-recommendations': { text: 'AI Analysis & Recommendations' },
      'scan-results-saved': { text: 'Your scan results have been saved to your Full Body Scan History in View Past Data' },
      
      // Scan quality indicators
      'good': { text: 'Good' },
      'needs-attention': { text: 'Needs attention' },
      'excellent': { text: 'Excellent' },
      'needs-work': { text: 'Needs work' },
      
      // Scan countdown
      'get-ready-for-scan': { text: 'Get Ready for Scan!' },
      'position-for-capture': { text: 'Position yourself for full body capture' },
      'front-capture': { text: 'FRONT CAPTURE' },
      'side-capture': { text: 'SIDE CAPTURE' },
      
      // Scan history details
      'scan-details': { text: 'Scan Details' },
      'measurements': { text: 'Measurements' },
      'views-captured-count': { text: 'Views Captured' },
      'neck-tilt-measurement': { text: 'Neck Tilt' },
      'shoulder-tilt-measurement': { text: 'Shoulder Tilt' },
      'hip-tilt-measurement': { text: 'Hip Tilt' },
      'overall-alignment-measurement': { text: 'Overall Alignment' },
      
      // Error messages
      'failed-camera-access': { text: 'Failed to access camera. Please check permissions.' },
      'no-pose-detected': { text: 'No pose detected. Please ensure you are visible in the camera.' },
      'failed-analyze-scan': { text: 'Failed to analyze scan. Please try again.' },
      'pose-detection-failed': { text: 'Failed to initialize pose detection. Please refresh the page.' },
      
      // Session details
      'session': { text: 'Session' },
      'error-loading-session': { text: 'Error loading session data' },
      
      // Insights
      'no-insights-available': { text: 'No insights available for this day' },
      'no-insight-text': { text: 'No insight text available' },
      'posture-consistency-improved': { text: 'Your posture tracking consistency has improved this week!' },
      'best-tracking-times': { text: 'Best tracking times: 9-11 AM and 2-4 PM' },
      'daily-goal-tip': { text: 'Try to maintain 60+ minutes daily for optimal results' }
    };
    
    // Achievement translations
    this.achievementTranslations = {
      // Achievement names and descriptions
      'first-session': {
        name: 'First Session',
        description: 'Complete your first posture tracking session'
      },
      'early-bird': {
        name: 'Early Bird',
        description: 'Start a tracking session before 8 AM'
      },
      'night-owl': {
        name: 'Night Owl', 
        description: 'Track your posture after 10 PM'
      },
      'streak-starter': {
        name: 'Streak Starter',
        description: 'Track posture for 3 consecutive days'
      },
      'week-warrior': {
        name: 'Week Warrior',
        description: 'Track posture for 7 consecutive days'
      },
      'month-master': {
        name: 'Month Master',
        description: 'Track posture for 30 consecutive days'
      },
      'hour-hero': {
        name: 'Hour Hero',
        description: 'Track posture for 60 minutes in a single day'
      },
      'marathon-tracker': {
        name: 'Marathon Tracker',
        description: 'Track posture for 120 minutes in a single day'
      },
      'posture-perfectionist': {
        name: 'Posture Perfectionist',
        description: 'Achieve an average score of 90+ for a full day'
      },
      'consistency-champion': {
        name: 'Consistency Champion',
        description: 'Maintain 80+ average score for a week'
      },
      'mood-tracker': {
        name: 'Mood Tracker',
        description: 'Add mood notes to 10 tracking sessions'
      },
      'goal-getter': {
        name: 'Goal Getter',
        description: 'Reach your daily goal 5 times'
      },
      'scan-specialist': {
        name: 'Scan Specialist',
        description: 'Complete 5 full body scans'
      },
      'improvement-icon': {
        name: 'Improvement Icon',
        description: 'Improve your weekly average by 10 points'
      },
      'dedication-master': {
        name: 'Dedication Master',
        description: 'Complete 100 total tracking sessions'
      },
      
      // Achievement categories
      'tracking': 'Tracking',
      'consistency': 'Consistency', 
      'improvement': 'Improvement',
      'milestones': 'Milestones',
      'special': 'Special',
      
      // Achievement status
      'earned': 'Earned',
      'in-progress': 'In Progress',
      'locked': 'Locked',
      'achievements': 'Achievements',
      'view-all': 'View All',
      'view-less': 'View Less'
    };
  }

  /**
   * Initialize the localization service
   */
  async initialize() {
    try {
      // Load saved language preference
      const result = await chrome.storage.local.get(['userLanguage']);
      if (result.userLanguage) {
        this.currentLanguage = result.userLanguage;
      }
      
      // Test if translation actually works
      await this.testTranslationCapability();
      
      // Set up language change listener
      document.addEventListener('languageChanged', (event) => {
        this.handleLanguageChange(event.detail.language);
      });
      
      console.log('LocalizationService initialized');
    } catch (error) {
      console.warn('Failed to initialize LocalizationService:', error);
    }
  }

  /**
   * Test if translation capability is actually working
   */
  async testTranslationCapability() {
    if (!this.isTranslationAvailable()) {
      console.warn('Translation API not available');
      return false;
    }

    try {
      // Test with a simple word that should definitely translate
      const testTranslator = await Translator.create({
        sourceLanguage: 'en',
        targetLanguage: 'es' // Spanish usually has good support
      });
      
      const testResult = await testTranslator.translate('Hello');
      
      if (testResult === 'Hello') {
        console.warn('⚠️ Translation API is not working properly - returned same text');
        this.translationWorking = false;
        return false;
      } else {
        console.log('✅ Translation API is working:', testResult);
        this.translationWorking = true;
        return true;
      }
    } catch (error) {
      console.warn('Translation capability test failed:', error);
      this.translationWorking = false;
      return false;
    }
  }

  /**
   * Check if translation is available using Chrome's built-in Translator API
   */
  isTranslationAvailable() {
    const available = typeof Translator !== 'undefined';
    console.log('Translation API available:', available);
    return available;
  }

  /**
   * Handle language change event
   */
  async handleLanguageChange(newLanguage) {
    if (newLanguage === this.currentLanguage) return;
    
    const currentLangName = this.getLanguageName(this.currentLanguage);
    const newLangName = this.getLanguageName(newLanguage);
    console.log(`Language change requested: ${this.currentLanguage}: ${currentLangName} -> ${newLanguage}: ${newLangName}`);
    this.currentLanguage = newLanguage;
    
    // Translate current interface
    await this.translateCurrentInterface();
    
    // Save language preference
    await this.persistLanguagePreference(newLanguage);
  }

  /**
   * Translate the sidepanel interface
   */
  async translateSidepanel(languageCode = this.currentLanguage) {
    const languageName = this.getLanguageName(languageCode);
    console.log(`Translating sidepanel to ${languageCode}: ${languageName}`);
    
    if (languageCode === 'en') {
      console.log('Restoring original English text');
      this.restoreOriginalText();
      return;
    }
    
    this.isTranslating = true;
    
    try {
      console.log(`Starting translation of ${Object.keys(this.translatableElements).length} elements`);
      
      // Translate all defined elements
      for (const [key, config] of Object.entries(this.translatableElements)) {
        await this.translateElement(key, config, languageCode);
      }
      
      // Translate achievement descriptions
      await this.translateAchievementDescriptions(languageCode);
      
      // Translate dynamic content
      await this.translateDynamicContent(languageCode);
      
      console.log('Sidepanel translation completed successfully');
      
    } catch (error) {
      console.error('Failed to translate sidepanel:', error);
    } finally {
      this.isTranslating = false;
    }
  }

  /**
   * Translate the analytics dashboard
   */
  async translateAnalyticsDashboard(languageCode = this.currentLanguage) {
    if (languageCode === 'en') {
      this.restoreAnalyticsOriginalText();
      return;
    }
    
    try {
      // Check if we're on the analytics page
      if (!window.location.pathname.includes('analytics.html')) {
        return;
      }
      
      // Translate analytics-specific elements
      for (const [key, config] of Object.entries(this.analyticsElements)) {
        await this.translateElement(key, config, languageCode);
      }
      
      // Translate analytics data labels and chart titles
      await this.translateAnalyticsDataLabels(languageCode);
      
    } catch (error) {
      console.error('Failed to translate analytics dashboard:', error);
    }
  }

  /**
   * Translate analytics data labels and chart titles
   */
  async translateAnalyticsDataLabels(languageCode) {
    try {
      // Translate statistics card labels
      const statLabels = document.querySelectorAll('.stat-label');
      for (const label of statLabels) {
        const originalText = label.dataset.originalText || label.textContent;
        if (!label.dataset.originalText) {
          label.dataset.originalText = originalText;
        }
        
        const translatedText = await this.getTranslation(originalText, languageCode);
        label.textContent = translatedText;
      }
      
      // Translate detail labels in day details
      const detailLabels = document.querySelectorAll('.detail-label');
      for (const label of detailLabels) {
        const originalText = label.dataset.originalText || label.textContent;
        if (!label.dataset.originalText) {
          label.dataset.originalText = originalText;
        }
        
        const translatedText = await this.getTranslation(originalText, languageCode);
        label.textContent = translatedText;
      }
      
      // Translate empty state messages
      const emptyStateTexts = document.querySelectorAll('.empty-state-text');
      for (const text of emptyStateTexts) {
        const originalText = text.dataset.originalText || text.textContent;
        if (!text.dataset.originalText) {
          text.dataset.originalText = originalText;
        }
        
        const translatedText = await this.getTranslation(originalText, languageCode);
        text.textContent = translatedText;
      }
      
      // Translate empty state subtexts
      const emptyStateSubtexts = document.querySelectorAll('.empty-state-subtext');
      for (const subtext of emptyStateSubtexts) {
        const originalText = subtext.dataset.originalText || subtext.textContent;
        if (!subtext.dataset.originalText) {
          subtext.dataset.originalText = originalText;
        }
        
        const translatedText = await this.getTranslation(originalText, languageCode);
        subtext.textContent = translatedText;
      }
      
      // Translate button texts
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        const originalText = button.dataset.originalText || button.textContent;
        if (!button.dataset.originalText) {
          button.dataset.originalText = originalText;
        }
        
        const translatedText = await this.getTranslation(originalText, languageCode);
        button.textContent = translatedText;
      }
      
      // Translate placeholder texts
      const placeholders = document.querySelectorAll('[placeholder]');
      for (const element of placeholders) {
        const originalPlaceholder = element.dataset.originalPlaceholder || element.placeholder;
        if (!element.dataset.originalPlaceholder) {
          element.dataset.originalPlaceholder = originalPlaceholder;
        }
        
        const translatedPlaceholder = await this.getTranslation(originalPlaceholder, languageCode);
        element.placeholder = translatedPlaceholder;
      }
      
    } catch (error) {
      console.error('Failed to translate analytics data labels:', error);
    }
  }

  /**
   * Translate current interface based on current page
   */
  async translateCurrentInterface() {
    console.log('Translating current interface to:', this.currentLanguage);
    
    if (window.location.pathname.includes('analytics.html')) {
      console.log('Translating analytics dashboard');
      await this.translateAnalyticsDashboard();
    } else {
      console.log('Translating sidepanel');
      await this.translateSidepanel();
    }
    
    // Always translate achievements regardless of page
    await this.translateAchievementDescriptions();
    
    console.log('Interface translation completed');
  }

  /**
   * Translate a single element
   */
  async translateElement(key, config, languageCode) {
    try {
      const elements = document.querySelectorAll(config.selector);
      if (elements.length === 0) {
        console.log(`No elements found for selector: ${config.selector} (key: ${key})`);
        return;
      }
      
      console.log(`Translating ${elements.length} element(s) for key: ${key}`);
      const translatedText = await this.getTranslation(config.text, languageCode);
      
      elements.forEach(element => {
        if (config.attribute) {
          element.setAttribute(config.attribute, translatedText);
        } else {
          // Store original text if not already stored
          if (!element.dataset.originalText) {
            element.dataset.originalText = element.textContent;
          }
          element.textContent = translatedText;
        }
      });
      
      console.log(`Successfully translated element ${key}: "${config.text}" -> "${translatedText}"`);
      
    } catch (error) {
      console.warn(`Failed to translate element ${key}:`, error);
    }
  }

  /**
   * Translate dynamic content (like status messages, notifications)
   */
  async translateDynamicContent(languageCode) {
    // This method can be called to translate dynamically generated content
    // Implementation depends on specific dynamic elements
    
    // Set up mutation observer to translate dynamically added content
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(async (mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                await this.translateNewElement(node, languageCode);
              }
            }
          }
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Store observer reference for cleanup
      this.mutationObserver = observer;
    }
  }

  /**
   * Translate newly added elements
   */
  async translateNewElement(element, languageCode) {
    if (languageCode === 'en') return;
    
    try {
      // Translate stat labels
      const statLabels = element.querySelectorAll('.stat-label');
      for (const label of statLabels) {
        if (!label.dataset.originalText) {
          label.dataset.originalText = label.textContent;
          const translatedText = await this.getTranslation(label.textContent, languageCode);
          label.textContent = translatedText;
        }
      }
      
      // Translate detail labels
      const detailLabels = element.querySelectorAll('.detail-label');
      for (const label of detailLabels) {
        if (!label.dataset.originalText) {
          label.dataset.originalText = label.textContent;
          const translatedText = await this.getTranslation(label.textContent, languageCode);
          label.textContent = translatedText;
        }
      }
      
      // Translate empty state messages
      const emptyStates = element.querySelectorAll('.empty-state-text, .empty-state-subtext');
      for (const state of emptyStates) {
        if (!state.dataset.originalText) {
          state.dataset.originalText = state.textContent;
          const translatedText = await this.getTranslation(state.textContent, languageCode);
          state.textContent = translatedText;
        }
      }
      
      // Translate buttons
      const buttons = element.querySelectorAll('button');
      for (const button of buttons) {
        if (!button.dataset.originalText && button.textContent.trim()) {
          button.dataset.originalText = button.textContent;
          const translatedText = await this.getTranslation(button.textContent, languageCode);
          button.textContent = translatedText;
        }
      }
      
      // Translate achievement elements
      const achievementNames = element.querySelectorAll('.achievement-name, .achievement-compact-name');
      for (const name of achievementNames) {
        if (!name.dataset.originalText) {
          name.dataset.originalText = name.textContent;
          const translatedText = await this.getTranslation(name.textContent, languageCode);
          name.textContent = translatedText;
        }
      }
      
      const achievementDescriptions = element.querySelectorAll('.achievement-description');
      for (const desc of achievementDescriptions) {
        if (!desc.dataset.originalText) {
          desc.dataset.originalText = desc.textContent;
          const translatedText = await this.getTranslation(desc.textContent, languageCode);
          desc.textContent = translatedText;
        }
      }
      
    } catch (error) {
      console.warn('Failed to translate new element:', error);
    }
  }

  /**
   * Get translation for text using Chrome's built-in Translator API
   */
  async getTranslation(text, targetLanguage) {
    if (targetLanguage === 'en') return text;
    
    // Check cache first
    const cacheKey = `${text}:${targetLanguage}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }
    
    try {
      // Check if Translator API is available
      if (typeof Translator === 'undefined') {
        console.warn('Translator API not available');
        return text;
      }
      
      // Check translator availability for this language pair
      const availability = await Translator.availability({
        sourceLanguage: 'en',
        targetLanguage: targetLanguage
      });
      
      if (availability === 'unavailable') {
        console.warn(`Translation to ${targetLanguage} is unavailable`);
        return text;
      }
      
      // Create translator using the exact same approach as the working test button
      const translator = await Translator.create({
        sourceLanguage: 'en',
        targetLanguage: targetLanguage
      });
      
      // Translate using the exact same approach as the working test button
      console.log(`🔥 NEW METHOD: About to translate "${text}"`);
      const translatedText = await translator.translate(text);
      console.log(`🔥 NEW METHOD: Translation result: "${text}" -> "${translatedText}"`);
      
      // Cache and return the result
      if (translatedText && translatedText !== text) {
        this.translationCache.set(cacheKey, translatedText);
        return translatedText;
      } else {
        return text;
      }
      
    } catch (error) {
      console.warn(`Translation failed for "${text}" to ${targetLanguage}:`, error);
      return text;
    }
  }

  /**
   * Restore original text for all elements
   */
  restoreOriginalText() {
    const elementsWithOriginalText = document.querySelectorAll('[data-original-text]');
    elementsWithOriginalText.forEach(element => {
      element.textContent = element.dataset.originalText;
      delete element.dataset.originalText;
    });
  }

  /**
   * Restore original text for analytics elements
   */
  restoreAnalyticsOriginalText() {
    // Similar to restoreOriginalText but for analytics page
    this.restoreOriginalText();
  }

  /**
   * Persist language preference across browser sessions
   */
  async persistLanguagePreference(languageCode) {
    try {
      await chrome.storage.local.set({ userLanguage: languageCode });
    } catch (error) {
      console.warn('Failed to persist language preference:', error);
    }
  }

  /**
   * Get current language
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Check if translation is in progress
   */
  isTranslationInProgress() {
    return this.isTranslating;
  }

  /**
   * Clear translator cache (useful when switching languages or on errors)
   */
  clearTranslatorCache(languageCode = null) {
    if (languageCode) {
      this.translatorCache.delete(languageCode);
      const languageName = this.getLanguageName(languageCode);
      console.log(`Cleared translator cache for ${languageCode}: ${languageName}`);
    } else {
      this.translatorCache.clear();
      console.log('Cleared all translator caches');
    }
  }

  /**
   * Get translator cache status
   */
  getTranslatorCacheStatus() {
    return {
      cachedLanguages: Array.from(this.translatorCache.keys()),
      cacheSize: this.translatorCache.size
    };
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.translationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.translationCache.size,
      languages: [...new Set(Array.from(this.translationCache.keys()).map(key => key.split(':')[1]))],
      entries: Array.from(this.translationCache.keys())
    };
  }

  /**
   * Translate achievement descriptions and names
   */
  async translateAchievementDescriptions(languageCode = this.currentLanguage) {
    if (languageCode === 'en') {
      return;
    }
    
    try {
      // Translate achievement names
      const achievementNames = document.querySelectorAll('.achievement-name, .achievement-compact-name');
      for (const nameElement of achievementNames) {
        const originalText = nameElement.dataset.originalText || nameElement.textContent;
        if (!nameElement.dataset.originalText) {
          nameElement.dataset.originalText = originalText;
        }
        
        const translatedText = await this.getTranslation(originalText, languageCode);
        nameElement.textContent = translatedText;
      }
      
      // Translate achievement descriptions
      const achievementDescriptions = document.querySelectorAll('.achievement-description');
      for (const descElement of achievementDescriptions) {
        const originalText = descElement.dataset.originalText || descElement.textContent;
        if (!descElement.dataset.originalText) {
          descElement.dataset.originalText = originalText;
        }
        
        const translatedText = await this.getTranslation(originalText, languageCode);
        descElement.textContent = translatedText;
      }
      
      // Translate achievement category names
      const categoryNames = document.querySelectorAll('.category-name');
      for (const categoryElement of categoryNames) {
        const originalText = categoryElement.dataset.originalText || categoryElement.textContent;
        if (!categoryElement.dataset.originalText) {
          categoryElement.dataset.originalText = originalText;
        }
        
        const translatedText = await this.getTranslation(originalText, languageCode);
        categoryElement.textContent = translatedText;
      }
      
      // Translate achievement section titles
      const achievementTitles = document.querySelectorAll('.achievements-title, .badges-title');
      for (const titleElement of achievementTitles) {
        const originalText = titleElement.dataset.originalText || titleElement.textContent;
        if (!titleElement.dataset.originalText) {
          titleElement.dataset.originalText = originalText;
        }
        
        const translatedText = await this.getTranslation(originalText, languageCode);
        titleElement.textContent = translatedText;
      }
      
      // Translate view all/view less buttons
      const viewButtons = document.querySelectorAll('.view-details-btn');
      for (const button of viewButtons) {
        const originalText = button.dataset.originalText || button.textContent;
        if (!button.dataset.originalText) {
          button.dataset.originalText = originalText;
        }
        
        const translatedText = await this.getTranslation(originalText, languageCode);
        button.textContent = translatedText;
      }
      
    } catch (error) {
      console.error('Failed to translate achievement descriptions:', error);
    }
  }

  /**
   * Translate a custom text (for dynamic content)
   */
  async translateText(text, targetLanguage = this.currentLanguage) {
    return await this.getTranslation(text, targetLanguage);
  }

  /**
   * Add new translatable element
   */
  addTranslatableElement(key, config) {
    this.translatableElements[key] = config;
  }

  /**
   * Remove translatable element
   */
  removeTranslatableElement(key) {
    delete this.translatableElements[key];
  }

  /**
   * Force translate interface to a specific language (for debugging/testing)
   */
  async forceTranslateInterface(languageCode) {
    const languageName = this.getLanguageName(languageCode);
    console.log(`Force translating interface to ${languageCode}: ${languageName}`);
    this.currentLanguage = languageCode;
    await this.translateCurrentInterface();
  }

  /**
   * Get translation status
   */
  getStatus() {
    return {
      currentLanguage: this.currentLanguage,
      isTranslating: this.isTranslating,
      cacheSize: this.translationCache.size,
      supportedElements: Object.keys(this.translatableElements).length
    };
  }

  /**
   * Get translated text for analytics elements
   */
  async getAnalyticsTranslation(key, languageCode = this.currentLanguage) {
    if (languageCode === 'en') {
      return this.analyticsElements[key]?.text || key;
    }
    
    const element = this.analyticsElements[key];
    if (!element) {
      return key;
    }
    
    return await this.getTranslation(element.text, languageCode);
  }

  /**
   * Get translated achievement text
   */
  async getAchievementTranslation(key, type = 'name', languageCode = this.currentLanguage) {
    if (languageCode === 'en') {
      return this.achievementTranslations[key]?.[type] || key;
    }
    
    const achievement = this.achievementTranslations[key];
    if (!achievement || !achievement[type]) {
      return key;
    }
    
    return await this.getTranslation(achievement[type], languageCode);
  }

  /**
   * Get language name in the target language itself
   */
  getLanguageName(languageCode) {
    const languageNames = {
      'en': 'English',
      'es': 'español', 
      'fr': 'français',
      'de': 'Deutsch',
      'it': 'italiano',
      'pt': 'português',
      'ru': 'русский',
      'ja': '日本語',
      'ko': '한국어',
      'zh': '中文',
      'ar': 'العربية',
      'hi': 'हिंदी'
    };
    return languageNames[languageCode] || languageCode;
  }

  /**
   * Fallback translations for common UI elements when Chrome API fails
   */
  getFallbackTranslation(text, targetLanguage) {
    const fallbackTranslations = {
      'hi': {
        'Hello': 'नमस्ते',
        'Select Language': 'भाषा चुनें',
        'Settings': 'सेटिंग्स',
        'Cancel': 'रद्द करें',
        'Save': 'सेव करें',
        'Close': 'बंद करें',
        'Start tracking': 'ट्रैकिंग शुरू करें',
        'Stop Tracking': 'ट्रैकिंग बंद करें',
        'Posturely': 'पोस्चरली',
        'No active tracking': 'कोई सक्रिय ट्रैकिंग नहीं',
        'Start a session to monitor your posture.': 'अपनी मुद्रा की निगरानी के लिए एक सत्र शुरू करें।',
        'Full Body Scan': 'पूर्ण शरीर स्कैन',
        'View Past Data': 'पिछला डेटा देखें',
        'Current Posture Score': 'वर्तमान मुद्रा स्कोर',
        'Calibrating...': 'कैलिब्रेट कर रहे हैं...',
        'How are you feeling?': 'आप कैसा महसूस कर रहे हैं?',
        'Daily Goals': 'दैनिक लक्ष्य',
        'Achievements': 'उपलब्धियां',
        'Break Reminder Settings': 'ब्रेक रिमाइंडर सेटिंग्स',
        'Enable Break Reminders': 'ब्रेक रिमाइंडर सक्षम करें'
      },
      'es': {
        'Hello': 'Hola',
        'Select Language': 'Seleccionar idioma',
        'Settings': 'Configuración',
        'Cancel': 'Cancelar',
        'Save': 'Guardar',
        'Close': 'Cerrar',
        'Start tracking': 'Iniciar seguimiento',
        'Stop Tracking': 'Detener seguimiento',
        'Posturely': 'Posturely',
        'No active tracking': 'Sin seguimiento activo',
        'Start a session to monitor your posture.': 'Inicia una sesión para monitorear tu postura.',
        'Full Body Scan': 'Escaneo corporal completo',
        'View Past Data': 'Ver datos anteriores',
        'Current Posture Score': 'Puntuación de postura actual',
        'Calibrating...': 'Calibrando...',
        'How are you feeling?': '¿Cómo te sientes?',
        'Daily Goals': 'Objetivos diarios',
        'Achievements': 'Logros',
        'Break Reminder Settings': 'Configuración de recordatorios de descanso',
        'Enable Break Reminders': 'Habilitar recordatorios de descanso'
      },
      'fr': {
        'Select Language': 'Sélectionner la langue',
        'Settings': 'Paramètres',
        'Cancel': 'Annuler',
        'Save': 'Enregistrer',
        'Close': 'Fermer',
        'Start tracking': 'Commencer le suivi',
        'Stop Tracking': 'Arrêter le suivi',
        'Posturely': 'Posturely',
        'No active tracking': 'Aucun suivi actif',
        'Start a session to monitor your posture.': 'Démarrez une session pour surveiller votre posture.',
        'Full Body Scan': 'Scan corporel complet',
        'View Past Data': 'Voir les données passées',
        'Current Posture Score': 'Score de posture actuel',
        'Calibrating...': 'Calibrage...',
        'How are you feeling?': 'Comment vous sentez-vous?',
        'Daily Goals': 'Objectifs quotidiens',
        'Achievements': 'Réalisations',
        'Break Reminder Settings': 'Paramètres de rappel de pause',
        'Enable Break Reminders': 'Activer les rappels de pause'
      }
    };

    return fallbackTranslations[targetLanguage]?.[text] || text;
  }

  /**
   * Show translation error to user
   */
  showTranslationError(message) {
    // Only show error once per session to avoid spam
    if (this.errorShown) return;
    this.errorShown = true;
    
    console.warn('Translation Error:', message);
    
    // You could also show a user-friendly notification here
    // For now, just log to console
  }

  /**
   * Cleanup method to remove mutation observer
   */
  cleanup() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }
}