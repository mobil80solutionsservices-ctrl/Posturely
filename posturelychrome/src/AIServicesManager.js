import { LanguageModelManager } from './LanguageModelManager.js';

/**
 * AIServicesManager - Coordinates Chrome's built-in AI APIs
 * Handles Summarizer, Writer, and Translator APIs with fallback content
 */
export class AIServicesManager {
  constructor() {
    this.languageManager = new LanguageModelManager();
    this.fallbackContent = {
      summaries: [
        "Your posture tracking session is complete. Keep up the good work!",
        "Remember to take breaks and maintain good posture throughout the day.",
        "You're building healthy habits one session at a time.",
        "Great progress on your posture awareness journey!"
      ],
      motivational: [
        "Great job on your posture tracking session!",
        "Every minute of good posture counts towards better health.",
        "You're building healthy habits one session at a time.",
        "Keep up the excellent work maintaining good posture!",
        "Your dedication to better posture is paying off!",
        "Small improvements in posture lead to big health benefits."
      ],
      breakReminders: [
        "Time for a posture break! Stand up and stretch.",
        "Your posture could use some attention. Take a moment to adjust.",
        "Remember to sit up straight and relax your shoulders.",
        "Take a deep breath and reset your posture."
      ]
    };
  }

  /**
   * Initialize the AI services manager
   */
  async initialize() {
    await this.languageManager.initialize();
    await this.validateOriginTrial();
  }

  /**
   * Validate Origin Trial configuration
   */
  async validateOriginTrial() {
    try {
      // Check if we're in an extension context
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
        const manifest = chrome.runtime.getManifest();
        const trialTokens = manifest.trial_tokens || [];

        // Check if trial tokens are configured
        if (trialTokens.length === 0 || trialTokens.every(token => token.startsWith('//'))) {
          console.warn('Origin Trial tokens not configured. Chrome AI features may not work.');
          return {
            configured: false,
            reason: 'no_tokens',
            message: 'Origin Trial tokens not configured in manifest.json'
          };
        }

        // Validate token format (basic check)
        const validTokens = trialTokens.filter(token =>
          !token.startsWith('//') &&
          token.length > 50 &&
          /^[A-Za-z0-9+/=]+$/.test(token)
        );

        if (validTokens.length === 0) {
          console.warn('No valid Origin Trial tokens found. Chrome AI features may not work.');
          return {
            configured: false,
            reason: 'invalid_tokens',
            message: 'Origin Trial tokens appear to be invalid or placeholder values'
          };
        }

        console.log(`Found ${validTokens.length} valid Origin Trial token(s)`);
        return {
          configured: true,
          tokenCount: validTokens.length,
          message: 'Origin Trial tokens configured successfully'
        };
      }

      return {
        configured: false,
        reason: 'not_extension',
        message: 'Not running in extension context'
      };
    } catch (error) {
      console.error('Origin Trial validation failed:', error);
      return {
        configured: false,
        reason: 'validation_error',
        message: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Get Origin Trial status and user-friendly error messages
   */
  async getOriginTrialStatus() {
    const validation = await this.validateOriginTrial();
    const availability = await this.checkAIAvailability();
    const storage = await this.checkDeviceStorage();

    // Check if any AI APIs are available
    const hasAnyAPI = Object.values(availability)
      .filter(value => typeof value === 'boolean')
      .some(available => available);

    // Analyze errors to provide specific guidance
    const errorAnalysis = this._analyzeAPIErrors(availability.errors || {});

    if (!validation.configured) {
      return {
        status: 'not_configured',
        message: this._getOriginTrialErrorMessage(validation.reason),
        setupRequired: true,
        canUseAI: false,
        errorDetails: errorAnalysis,
        troubleshooting: this._getTroubleshootingSteps('not_configured')
      };
    }

    if (!hasAnyAPI) {
      return {
        status: 'apis_unavailable',
        message: this._getAPIUnavailableMessage(errorAnalysis),
        setupRequired: true,
        canUseAI: false,
        errorDetails: errorAnalysis,
        storage: storage,
        troubleshooting: this._getTroubleshootingSteps('apis_unavailable', errorAnalysis)
      };
    }

    // Partial availability - some APIs work, others don't
    const partiallyAvailable = Object.values(availability.errors || {}).length > 0;
    if (partiallyAvailable) {
      return {
        status: 'partial',
        message: 'Some Chrome AI features are available',
        setupRequired: false,
        canUseAI: true,
        availableAPIs: availability,
        errorDetails: errorAnalysis,
        storage: storage,
        troubleshooting: this._getTroubleshootingSteps('partial', errorAnalysis)
      };
    }

    return {
      status: 'ready',
      message: 'Chrome AI features are ready to use',
      setupRequired: false,
      canUseAI: true,
      availableAPIs: availability,
      storage: storage
    };
  }

  /**
   * Analyze API errors to provide specific guidance
   */
  _analyzeAPIErrors(errors) {
    const analysis = {
      primaryIssue: 'unknown',
      affectedAPIs: [],
      commonCause: null,
      severity: 'low'
    };

    const errorTypes = Object.values(errors);
    const apiNames = Object.keys(errors);

    // Determine primary issue
    if (errorTypes.includes('origin_trial_invalid')) {
      analysis.primaryIssue = 'origin_trial_invalid';
      analysis.severity = 'high';
    } else if (errorTypes.includes('api_not_available')) {
      analysis.primaryIssue = 'api_not_available';
      analysis.severity = 'high';
    } else if (errorTypes.includes('permission_denied')) {
      analysis.primaryIssue = 'permission_denied';
      analysis.severity = 'medium';
    } else if (errorTypes.includes('feature_not_available')) {
      analysis.primaryIssue = 'feature_not_available';
      analysis.severity = 'medium';
    }

    analysis.affectedAPIs = apiNames;

    // Determine if there's a common cause
    const uniqueErrors = [...new Set(errorTypes)];
    if (uniqueErrors.length === 1) {
      analysis.commonCause = uniqueErrors[0];
    }

    return analysis;
  }

  /**
   * Get specific error message based on API availability analysis
   */
  _getAPIUnavailableMessage(errorAnalysis) {
    switch (errorAnalysis.primaryIssue) {
      case 'origin_trial_invalid':
        return 'Origin Trial tokens appear to be invalid or expired';
      case 'insufficient_storage':
        return 'Not enough storage space for AI models (2-4 GB required)';
      case 'model_download_error':
        return 'AI models are downloading or unavailable';
      case 'invalid_parameters':
        return 'AI API configuration needs updating';
      case 'api_not_available':
        return 'Chrome AI APIs are not available in this browser';
      case 'permission_denied':
        return 'Chrome AI APIs are blocked by permissions or security settings';
      case 'feature_not_available':
        return 'Chrome AI features need Origin Trial tokens and Chrome flags';
      case 'unknown_status':
        return 'Chrome AI features returned unexpected status';
      default:
        return 'Chrome AI APIs are not available. Please check your setup.';
    }
  }

  /**
   * Get troubleshooting steps based on status and error analysis
   */
  _getTroubleshootingSteps(status, errorAnalysis = null) {
    const baseSteps = [
      'Ensure you are using Chrome Canary or Chrome Dev (version 127+)',
      'Join the Chrome Built-in AI Early Preview Program',
      'Enable required flags in chrome://flags/',
      'Configure valid Origin Trial tokens in manifest.json'
    ];

    switch (status) {
      case 'not_configured':
        return [
          'Configure Origin Trial tokens in the extension manifest',
          'Restart Chrome after configuration changes',
          ...baseSteps.slice(0, 3)
        ];

      case 'apis_unavailable':
        if (errorAnalysis?.primaryIssue === 'insufficient_storage') {
          return [
            'Free up 2-4 GB of disk space for AI models',
            'Check available storage in your system',
            'Clear browser cache and temporary files',
            'Restart Chrome after freeing space'
          ];
        } else if (errorAnalysis?.primaryIssue === 'model_download_error') {
          return [
            'Wait for AI models to finish downloading',
            'Check your internet connection',
            'Ensure you have sufficient disk space (2-4 GB)',
            'Try restarting Chrome to retry download'
          ];
        } else if (errorAnalysis?.primaryIssue === 'invalid_parameters') {
          return [
            'Update the extension to the latest version',
            'Check Chrome version compatibility',
            'Verify API usage patterns are correct',
            'Report this issue to extension developers'
          ];
        } else if (errorAnalysis?.primaryIssue === 'origin_trial_invalid') {
          return [
            'Check if Origin Trial tokens are valid and not expired',
            'Verify tokens are correctly formatted in manifest.json',
            'Ensure extension ID matches the Origin Trial registration',
            'Restart Chrome after token updates'
          ];
        } else if (errorAnalysis?.primaryIssue === 'api_not_available') {
          return [
            'Update to Chrome Canary or Chrome Dev latest version',
            'Enable chrome://flags/#optimization-guide-on-device-model',
            'Enable chrome://flags/#prompt-api-for-gemini-nano',
            'Restart Chrome and wait for model download'
          ];
        }
        return baseSteps;

      case 'partial':
        return [
          'Some features may require additional Chrome flags',
          'Check if specific APIs need separate Origin Trial tokens',
          'Verify all required flags are enabled in chrome://flags/',
          'Restart Chrome if you made recent changes'
        ];

      default:
        return baseSteps;
    }
  }

  /**
   * Get user-friendly error messages for Origin Trial issues
   */
  _getOriginTrialErrorMessage(reason) {
    const messages = {
      no_tokens: 'AI-powered features are available with additional setup (optional)',
      invalid_tokens: 'AI features need configuration to work properly',
      not_extension: 'Chrome AI features are only available in extension context.',
      validation_error: 'Unable to check AI feature availability'
    };

    return messages[reason] || 'AI features need additional setup';
  }

  /**
   * Handle Origin Trial specific errors
   */
  _handleOriginTrialError(apiName, errorType, originalError) {
    const errorMessages = {
      origin_trial_invalid: `${apiName} API: Origin Trial token is invalid or expired`,
      permission_denied: `${apiName} API: Permission denied - check Chrome flags and Origin Trial setup`,
      feature_not_available: `${apiName} API: Feature not available in this Chrome version`,
      device_incompatible: `${apiName} API: Not supported on this device`,
      network_error: `${apiName} API: Network error during model download`,
      api_not_available: `${apiName} API: Not available - check Chrome version and flags`
    };

    const message = errorMessages[errorType] || `${apiName} API: Unknown error`;
    console.warn(message, originalError);

    // Store error for potential user notification
    this._storeAPIError(apiName, errorType, message);
  }

  /**
   * Notify user about AI unavailability (can be overridden by UI)
   */
  _notifyUserAboutAIUnavailability(apiName, errorType) {
    // This method can be overridden by the UI layer to show user notifications
    // Provide detailed logging based on error type
    const messages = {
      'feature_not_available': `${apiName} API status is 'unavailable' - needs Origin Trial tokens and Chrome flags`,
      'api_not_available': `${apiName} API not found in browser - update Chrome or enable flags`,
      'unknown_status': `${apiName} API returned unexpected status - check Chrome version`,
      'origin_trial_invalid': `${apiName} API blocked - Origin Trial tokens needed`,
      'unknown': `${apiName} API unavailable for unknown reason`
    };

    const message = messages[errorType] || `${apiName} API is unavailable (${errorType})`;
    console.info(`ℹ️ ${message}. Using fallback content.`);
  }

  /**
   * Store API errors for later retrieval by UI
   */
  _storeAPIError(apiName, errorType, message) {
    if (!this.apiErrors) {
      this.apiErrors = {};
    }

    this.apiErrors[apiName] = {
      type: errorType,
      message: message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get stored API errors
   */
  getAPIErrors() {
    return this.apiErrors || {};
  }

  /**
   * Clear stored API errors
   */
  clearAPIErrors() {
    this.apiErrors = {};
  }

  /**
   * Check if Origin Trial is likely to expire soon
   */
  async checkOriginTrialExpiration() {
    try {
      const validation = await this.validateOriginTrial();

      if (!validation.configured) {
        return {
          expiring: false,
          daysLeft: 0,
          message: 'Origin Trial not configured'
        };
      }

      // Note: We can't actually check token expiration without decoding the JWT
      // This is a placeholder for future enhancement
      return {
        expiring: false,
        daysLeft: null,
        message: 'Unable to determine token expiration'
      };
    } catch (error) {
      console.warn('Failed to check Origin Trial expiration:', error);
      return {
        expiring: false,
        daysLeft: 0,
        message: 'Error checking expiration'
      };
    }
  }

  /**
   * Plan for transition from Origin Trial to stable API
   */
  async planStableAPITransition() {
    // This method will be used when Chrome AI APIs become stable
    // For now, it's a placeholder that logs the current status

    const status = await this.getOriginTrialStatus();

    console.log('Chrome AI API Transition Planning:', {
      currentStatus: status.status,
      usingOriginTrial: status.status !== 'not_configured',
      readyForStable: false, // Will be true when stable APIs are available
      migrationRequired: status.status === 'ready'
    });

    return {
      currentlyUsingOriginTrial: status.status !== 'not_configured',
      stableAPIAvailable: false, // Will be updated when stable APIs are released
      migrationSteps: [
        'Monitor Chrome release notes for stable API availability',
        'Update manifest.json to remove trial_tokens when stable',
        'Test functionality with stable APIs',
        'Update user documentation'
      ]
    };
  }

  /**
   * Get the language manager instance
   */
  getLanguageManager() {
    return this.languageManager;
  }

  /**
   * Check device storage for AI models
   */
  async checkDeviceStorage() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const availableBytes = estimate.quota - estimate.usage;
        const availableGB = availableBytes / (1024 * 1024 * 1024);

        return {
          available: availableGB >= 2, // AI models need ~2-4 GB
          availableGB: Math.round(availableGB * 10) / 10,
          totalGB: Math.round((estimate.quota / (1024 * 1024 * 1024)) * 10) / 10,
          usedGB: Math.round((estimate.usage / (1024 * 1024 * 1024)) * 10) / 10
        };
      }

      // Fallback: assume storage is available if we can't check
      return {
        available: true,
        availableGB: null,
        totalGB: null,
        usedGB: null
      };
    } catch (error) {
      console.warn('Failed to check device storage:', error);
      return {
        available: true, // Assume available if check fails
        availableGB: null,
        totalGB: null,
        usedGB: null
      };
    }
  }

  /**
   * Check if Chrome AI APIs are available
   */
  async checkAIAvailability() {
    const availability = {
      summarizer: false,
      languageModel: false,
      translator: false,
      writer: false,
      rewriter: false,
      errors: {}
    };

    try {
      // Check if Chrome AI APIs are available using global objects
      if ('Summarizer' in self) {
        try {
          console.log('🔍 AIServicesManager: Checking Summarizer availability...');
          const status = await self.Summarizer.availability();
          console.log('✅ AIServicesManager: Summarizer availability status:', status);
          // Support both old and new availability values
          availability.summarizer = status === 'readily' || status === 'after-download' ||
            status === 'available' || status === 'downloadable';

          // If not available, store the reason
          if (!availability.summarizer) {
            if (status === 'unavailable' || status === 'no') {
              availability.errors.summarizer = 'feature_not_available';
            } else {
              availability.errors.summarizer = 'unknown_status';
            }
          }
        } catch (error) {
          console.warn('❌ AIServicesManager: Summarizer availability check failed:', error);
          availability.errors.summarizer = this._categorizeAPIError(error);
        }
      } else {
        console.log('⚠️ AIServicesManager: Summarizer not in self');
        availability.errors.summarizer = 'api_not_available';
      }

      if ('LanguageModel' in self) {
        try {
          const status = await self.LanguageModel.availability();
          availability.languageModel = status === 'readily' || status === 'after-download' ||
            status === 'available' || status === 'downloadable';
        } catch (error) {
          console.warn('LanguageModel availability check failed:', error);
          availability.errors.languageModel = this._categorizeAPIError(error);
        }
      } else {
        availability.errors.languageModel = 'api_not_available';
      }

      if ('Translator' in self) {
        try {
          // Translator.availability() requires language pair parameters
          const status = await self.Translator.availability({
            sourceLanguage: 'en',
            targetLanguage: 'es' // Test with a common language pair
          });
          availability.translator = status === 'readily' || status === 'after-download' ||
            status === 'available' || status === 'downloadable';
        } catch (error) {
          console.warn('Translator availability check failed:', error);
          availability.errors.translator = this._categorizeAPIError(error);
        }
      } else {
        availability.errors.translator = 'api_not_available';
      }

      if ('Writer' in self) {
        try {
          const status = await self.Writer.availability();
          availability.writer = status === 'readily' || status === 'after-download' ||
            status === 'available' || status === 'downloadable';
        } catch (error) {
          console.warn('Writer availability check failed:', error);
          availability.errors.writer = this._categorizeAPIError(error);
        }
      } else {
        availability.errors.writer = 'api_not_available';
      }

      if ('Rewriter' in self) {
        try {
          const status = await self.Rewriter.availability();
          availability.rewriter = status === 'readily' || status === 'after-download' ||
            status === 'available' || status === 'downloadable';
        } catch (error) {
          console.warn('Rewriter availability check failed:', error);
          availability.errors.rewriter = this._categorizeAPIError(error);
        }
      } else {
        availability.errors.rewriter = 'api_not_available';
      }
    } catch (error) {
      console.warn('AI availability check failed:', error);
      availability.errors.general = this._categorizeAPIError(error);
    }

    return availability;
  }

  /**
   * Categorize API errors to provide better user guidance
   */
  _categorizeAPIError(error) {
    if (!error) return 'unknown_error';

    const errorMessage = error.message?.toLowerCase() || '';

    // Origin Trial related errors
    if (errorMessage.includes('origin trial') ||
      errorMessage.includes('trial token') ||
      errorMessage.includes('not enabled for this origin')) {
      return 'origin_trial_invalid';
    }

    // Storage/space errors
    if (errorMessage.includes('not have enough space') ||
      errorMessage.includes('insufficient storage') ||
      errorMessage.includes('disk space') ||
      errorMessage.includes('storage quota')) {
      return 'insufficient_storage';
    }

    // Model download errors
    if (errorMessage.includes('model download') ||
      errorMessage.includes('downloading') ||
      errorMessage.includes('model not available')) {
      return 'model_download_error';
    }

    // API parameter errors
    if (errorMessage.includes('argument required') ||
      errorMessage.includes('parameter') ||
      errorMessage.includes('invalid argument')) {
      return 'invalid_parameters';
    }

    // Permission/security errors
    if (errorMessage.includes('permission') ||
      errorMessage.includes('not allowed') ||
      errorMessage.includes('security')) {
      return 'permission_denied';
    }

    // Feature not available errors
    if (errorMessage.includes('not available') ||
      errorMessage.includes('not supported') ||
      errorMessage.includes('not implemented')) {
      return 'feature_not_available';
    }

    // Network/download errors
    if (errorMessage.includes('network') ||
      errorMessage.includes('download') ||
      errorMessage.includes('fetch')) {
      return 'network_error';
    }

    // Device compatibility errors
    if (errorMessage.includes('device') ||
      errorMessage.includes('hardware') ||
      errorMessage.includes('not supported on this device')) {
      return 'device_incompatible';
    }

    return 'unknown_error';
  }

  /**
   * Generate posture summary using Chrome Summarizer API
   */
  async generatePostureSummary(sessionData, moodData = null) {
    try {
      const availability = await this.checkAIAvailability();

      if (availability.summarizer) {
        console.log('🔍 AIServicesManager: Creating Summarizer session...');
        const session = await self.Summarizer.create({
          type: 'tldr',
          format: 'plain-text',
          length: 'medium'
          // Note: Removed outputLanguage to match official demo pattern
        });
        console.log('✅ AIServicesManager: Summarizer session created successfully');

        const prompt = this._buildSummaryPrompt(sessionData, moodData);
        console.log('🔍 AIServicesManager: Calling summarize with prompt...');
        const summary = await session.summarize(prompt);
        console.log('✅ AIServicesManager: Summary generated successfully');

        session.destroy();
        return summary;
      } else {
        // Log specific reason for unavailability
        const errorType = availability.errors?.summarizer || 'unknown';
        console.warn(`Summarizer API unavailable: ${errorType}`);

        // Provide user feedback about why AI features aren't working
        this._notifyUserAboutAIUnavailability('summarizer', errorType);
      }
    } catch (error) {
      console.warn('AI summary generation failed:', error);

      // Categorize and handle the error
      const errorType = this._categorizeAPIError(error);
      this._handleOriginTrialError('summarizer', errorType, error);
    }

    // Fallback to pre-written content
    return this._getFallbackContent('summaries', sessionData);
  }

  /**
   * Generate motivational message using Chrome LanguageModel API
   */
  async generateMotivationalMessage(performance, mood = null, options = {}) {
    try {
      const availability = await this.checkAIAvailability();

      if (availability.languageModel) {
        const session = await self.LanguageModel.create({
          temperature: 1.0,
          topK: 3
        });

        const prompt = this._buildMotivationalPrompt(performance, mood);

        // Use streaming if requested and callback provided
        if (options.streaming && options.onChunk) {
          return await this._handleLanguageModelStreaming(session, prompt, options.onChunk);
        } else {
          const message = await session.prompt(prompt);
          session.destroy();
          return message;
        }
      }
    } catch (error) {
      console.warn('AI motivational message generation failed:', error);
    }

    // Fallback to pre-written content
    return this._getFallbackContent('motivational', performance);
  }

  /**
   * Translate content using Chrome Translator API
   */
  async translateContent(text, targetLanguage = null) {
    try {
      const language = targetLanguage || this.languageManager.getCurrentLanguage();

      // No translation needed for English
      if (language === 'en') {
        return text;
      }

      const availability = await this.checkAIAvailability();

      if (availability.translator) {
        const session = await self.Translator.create({
          sourceLanguage: 'en',
          targetLanguage: language
        });

        const translation = await session.translate(text);
        session.destroy();

        return translation;
      }
    } catch (error) {
      console.warn('AI translation failed:', error);
    }

    // Fallback: return original text
    return text;
  }

  /**
   * Translate content to user's preferred language
   */
  async translateToUserLanguage(text) {
    return await this.translateContent(text, this.languageManager.getCurrentLanguage());
  }

  /**
   * Get random fallback content
   */
  _getFallbackContent(type, contextData = null) {
    const content = this.fallbackContent[type] || this.fallbackContent.motivational;

    if (contextData && type === 'motivational') {
      // Select content based on performance
      if (contextData.avgScore >= 80) {
        return content[Math.floor(Math.random() * 2)]; // Positive messages
      } else {
        return content[Math.floor(Math.random() * content.length)]; // All messages
      }
    }

    return content[Math.floor(Math.random() * content.length)];
  }

  /**
   * Build prompt for summary generation
   */
  _buildSummaryPrompt(sessionData, moodData) {
    let prompt = `Summarize this posture tracking session in 1-2 sentences: `;
    prompt += `Duration: ${sessionData.minutes || 0} minutes, `;
    prompt += `Average posture score: ${sessionData.avgScore || 0}/100`;

    if (moodData && moodData.mood) {
      prompt += `, User mood: ${moodData.mood}`;
    }

    if (sessionData.notes) {
      prompt += `, Notes: ${sessionData.notes}`;
    }

    prompt += `. Focus on encouragement and actionable insights.`;

    return prompt;
  }

  /**
   * Build prompt for motivational message generation
   */
  _buildMotivationalPrompt(performance, mood) {
    let prompt = `Generate a short motivational message (1 sentence) for posture tracking: `;
    prompt += `Score: ${performance.avgScore || 0}/100, `;
    prompt += `Minutes tracked: ${performance.minutes || 0}`;

    if (mood) {
      prompt += `, User mood: ${mood}`;
    }

    if (performance.avgScore >= 80) {
      prompt += `. Focus on positive reinforcement.`;
    } else {
      prompt += `. Focus on encouragement and improvement.`;
    }

    return prompt;
  }

  /**
   * Generate break reminder message using Writer API (preferred) or LanguageModel API
   */
  async generateBreakReminder(postureScore, duration, options = {}) {
    try {
      const availability = await this.checkAIAvailability();

      let prompt = `Generate a gentle break reminder message: `;
      prompt += `Current posture score: ${postureScore}/100, `;
      prompt += `Time since last break: ${duration} minutes. `;
      prompt += `Keep it friendly and actionable.`;

      // Try Writer API first (more specialized for content generation)
      if (availability.writer) {
        const session = await self.Writer.create({
          tone: 'friendly',
          format: 'plain-text',
          length: 'short'
        });

        // Use streaming if requested and callback provided
        if (options.streaming && options.onChunk) {
          return await this._handleWriterStreaming(session, prompt, options.onChunk);
        } else {
          const message = await session.write(prompt);
          session.destroy();
          return message;
        }
      }

      // Fallback to LanguageModel API
      if (availability.languageModel) {
        const session = await self.LanguageModel.create({
          temperature: 0.8,
          topK: 3
        });

        // Use streaming if requested and callback provided
        if (options.streaming && options.onChunk) {
          return await this._handleLanguageModelStreaming(session, prompt, options.onChunk);
        } else {
          const message = await session.prompt(prompt);
          session.destroy();
          return message;
        }
      }
    } catch (error) {
      console.warn('AI break reminder generation failed:', error);
    }

    return this._getFallbackContent('breakReminders');
  }

  /**
   * Generate content using Writer API
   */
  async generateContent(prompt, options = {}) {
    try {
      const availability = await this.checkAIAvailability();

      if (availability.writer) {
        const session = await self.Writer.create({
          tone: options.tone || 'neutral',
          format: options.format || 'plain-text',
          length: options.length || 'medium',
          sharedContext: options.sharedContext || ''
        });

        // Use streaming if requested and callback provided
        if (options.streaming && options.onChunk) {
          return await this._handleWriterStreaming(session, prompt, options.onChunk);
        } else {
          const content = await session.write(prompt);
          session.destroy();
          return content;
        }
      }
    } catch (error) {
      console.warn('Writer API content generation failed:', error);
    }

    // Fallback to LanguageModel if Writer not available
    try {
      const availability = await this.checkAIAvailability();

      if (availability.languageModel) {
        const session = await self.LanguageModel.create({
          temperature: options.temperature || 1.0,
          topK: options.topK || 3
        });

        // Use streaming if requested and callback provided
        if (options.streaming && options.onChunk) {
          return await this._handleLanguageModelStreaming(session, prompt, options.onChunk);
        } else {
          const content = await session.prompt(prompt);
          session.destroy();
          return content;
        }
      }
    } catch (error) {
      console.warn('LanguageModel fallback failed:', error);
    }

    return null;
  }

  /**
   * Rewrite content using Rewriter API
   */
  async rewriteContent(text, options = {}) {
    try {
      const availability = await this.checkAIAvailability();

      if (availability.rewriter) {
        const session = await self.Rewriter.create({
          tone: options.tone || 'as-is',
          format: options.format || 'as-is',
          length: options.length || 'as-is',
          sharedContext: options.sharedContext || ''
        });

        // Use streaming if requested and callback provided
        if (options.streaming && options.onChunk) {
          return await this._handleRewriterStreaming(session, text, options.onChunk);
        } else {
          const rewritten = await session.rewrite(text);
          session.destroy();
          return rewritten;
        }
      }
    } catch (error) {
      console.warn('Rewriter API failed:', error);
    }

    // Fallback: return original text
    return text;
  }

  /**
   * Handle LanguageModel streaming with proper chunk processing
   */
  async _handleLanguageModelStreaming(session, prompt, onChunk) {
    try {
      const stream = session.promptStreaming(prompt);
      let fullResponse = '';
      let previousChunk = '';

      for await (const chunk of stream) {
        // Handle both incremental and full response patterns
        // Chrome Stable returns full text, Canary returns incremental
        const newChunk = chunk.startsWith(previousChunk)
          ? chunk.slice(previousChunk.length)
          : chunk;

        if (newChunk) {
          fullResponse += newChunk;
          onChunk(newChunk, fullResponse);
        }

        previousChunk = chunk;
      }

      session.destroy();
      return fullResponse;
    } catch (error) {
      session.destroy();
      throw error;
    }
  }

  /**
   * Handle Writer streaming with proper response patterns
   */
  async _handleWriterStreaming(session, prompt, onChunk) {
    try {
      const stream = session.writeStreaming(prompt);
      let fullResponse = '';

      for await (const chunk of stream) {
        // Chrome Stable returns full text, Canary returns incremental
        // Check if Writer API is available to determine pattern
        fullResponse = 'Writer' in self ? fullResponse + chunk : chunk;
        onChunk(chunk, fullResponse);
      }

      session.destroy();
      return fullResponse;
    } catch (error) {
      session.destroy();
      throw error;
    }
  }

  /**
   * Handle Rewriter streaming with proper response patterns
   */
  async _handleRewriterStreaming(session, text, onChunk) {
    try {
      const stream = session.rewriteStreaming(text);
      let fullResponse = '';

      for await (const chunk of stream) {
        // Chrome Stable returns full text, Canary returns incremental
        // Check if Rewriter API is available to determine pattern
        fullResponse = 'Rewriter' in self ? fullResponse + chunk : chunk;
        onChunk(chunk, fullResponse);
      }

      session.destroy();
      return fullResponse;
    } catch (error) {
      session.destroy();
      throw error;
    }
  }

  /**
   * Get token usage information with support for both API versions
   */
  getTokenUsage(session) {
    const usage = {
      inputQuota: session.inputQuota || session.maxTokens || 0,
      inputUsage: session.inputUsage || session.tokensSoFar || 0,
      tokensLeft: 0
    };

    // Calculate tokens left using appropriate properties
    if (session.tokensLeft !== undefined) {
      usage.tokensLeft = session.tokensLeft;
    } else if (session.inputQuota && session.inputUsage !== undefined) {
      usage.tokensLeft = session.inputQuota - session.inputUsage;
    } else if (session.maxTokens && session.tokensSoFar !== undefined) {
      usage.tokensLeft = session.maxTokens - session.tokensSoFar;
    }

    return usage;
  }

  /**
   * Measure input usage with support for both API versions
   */
  async measureInputUsage(session, input) {
    try {
      // Try new API first
      if (session.measureInputUsage) {
        return await session.measureInputUsage(input);
      }
      // Fallback to old API
      if (session.countPromptTokens) {
        return await session.countPromptTokens(input);
      }
      return 0;
    } catch (error) {
      console.warn('Token usage measurement failed:', error);
      return 0;
    }
  }

  /**
   * Check if session has sufficient tokens for operation
   */
  hasEnoughTokens(session, requiredTokens = 100) {
    const usage = this.getTokenUsage(session);
    return usage.tokensLeft >= requiredTokens;
  }

  /**
   * Get detailed session statistics
   */
  getSessionStats(session) {
    const usage = this.getTokenUsage(session);

    return {
      temperature: session.temperature || 'N/A',
      topK: session.topK || 'N/A',
      inputQuota: usage.inputQuota,
      inputUsage: usage.inputUsage,
      tokensLeft: usage.tokensLeft,
      usagePercentage: usage.inputQuota > 0 ? Math.round((usage.inputUsage / usage.inputQuota) * 100) : 0
    };
  }

  /**
   * Test AI functionality with sample data
   */
  async testAIFunctionality() {
    const results = {
      summarizer: { available: false, tested: false, result: null, error: null },
      languageModel: { available: false, tested: false, result: null, error: null },
      translator: { available: false, tested: false, result: null, error: null }
    };

    try {
      const availability = await this.checkAIAvailability();

      // Test Summarizer
      if (availability.summarizer) {
        results.summarizer.available = true;
        try {
          const testSessionData = {
            minutes: 30,
            avgScore: 85,
            samples: 100
          };
          const summary = await this.generatePostureSummary(testSessionData);
          results.summarizer.tested = true;
          results.summarizer.result = summary;
        } catch (error) {
          results.summarizer.error = error.message;
        }
      }

      // Test LanguageModel
      if (availability.languageModel) {
        results.languageModel.available = true;
        try {
          const testPerformance = { avgScore: 85, minutes: 30 };
          const message = await this.generateMotivationalMessage(testPerformance);
          results.languageModel.tested = true;
          results.languageModel.result = message;
        } catch (error) {
          results.languageModel.error = error.message;
        }
      }

      // Test Translator
      if (availability.translator) {
        results.translator.available = true;
        try {
          const translation = await this.translateContent('Hello, world!', 'es');
          results.translator.tested = true;
          results.translator.result = translation;
        } catch (error) {
          results.translator.error = error.message;
        }
      }

    } catch (error) {
      console.error('AI functionality test failed:', error);
    }

    return results;
  }

  /**
   * Batch process multiple AI requests
   */
  async batchProcess(requests) {
    const results = [];

    for (const request of requests) {
      try {
        let result;

        switch (request.type) {
          case 'summary':
            result = await this.generatePostureSummary(request.sessionData, request.moodData);
            break;
          case 'motivational':
            result = await this.generateMotivationalMessage(request.performance, request.mood, request.options);
            break;
          case 'translation':
            result = await this.translateContent(request.text, request.targetLanguage);
            break;
          case 'writer':
            result = await this.generateContent(request.prompt, request.options);
            break;
          case 'rewriter':
            result = await this.rewriteContent(request.text, request.options);
            break;
          default:
            result = 'Unknown request type';
        }

        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }

    return results;
  }
}