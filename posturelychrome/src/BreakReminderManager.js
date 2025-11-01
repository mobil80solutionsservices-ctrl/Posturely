/**
 * BreakReminderManager - Handles smart break reminders based on posture patterns
 * Implements Chrome notifications API for break reminders with adaptive timing
 */
export class BreakReminderManager {
  constructor() {
    this.isEnabled = true;
    this.reminderFrequency = 30; // Default: 30 minutes
    this.postureThreshold = 80; // Score below which to trigger reminders
    this.consecutiveLowScoreMinutes = 0;
    this.lastReminderTime = 0;
    this.dismissalCount = 0;
    this.adaptiveMultiplier = 1.0;
    this.currentSessionStartTime = null;
    this.lowScoreStartTime = null;
    
    // Stretch exercise suggestions with categories and difficulty levels
    this.stretchExercises = [
      {
        name: "Neck Rolls",
        description: "Gently roll your head in circles to release neck tension",
        duration: "30 seconds",
        category: "neck",
        difficulty: "easy",
        benefits: ["neck tension", "headache relief"]
      },
      {
        name: "Shoulder Shrugs",
        description: "Lift shoulders to ears, hold for 5 seconds, then release",
        duration: "10 repetitions",
        category: "shoulders",
        difficulty: "easy",
        benefits: ["shoulder tension", "upper back relief"]
      },
      {
        name: "Upper Back Stretch",
        description: "Clasp hands in front, round upper back and push arms forward",
        duration: "15 seconds",
        category: "back",
        difficulty: "easy",
        benefits: ["upper back tension", "posture improvement"]
      },
      {
        name: "Chest Opener",
        description: "Clasp hands behind back, lift chest and squeeze shoulder blades",
        duration: "15 seconds",
        category: "chest",
        difficulty: "easy",
        benefits: ["chest tightness", "posture correction"]
      },
      {
        name: "Spinal Twist",
        description: "Sit tall, twist gently to each side while keeping hips forward",
        duration: "10 seconds each side",
        category: "spine",
        difficulty: "easy",
        benefits: ["spinal mobility", "lower back relief"]
      },
      {
        name: "Cat-Cow Stretch",
        description: "Arch and round your back while seated, moving slowly",
        duration: "8 repetitions",
        category: "spine",
        difficulty: "easy",
        benefits: ["spinal flexibility", "back pain relief"]
      },
      {
        name: "Seated Hip Flexor Stretch",
        description: "Sit at edge of chair, extend one leg back, feel stretch in hip",
        duration: "20 seconds each leg",
        category: "hips",
        difficulty: "moderate",
        benefits: ["hip tightness", "lower back relief"]
      },
      {
        name: "Wrist Circles",
        description: "Extend arms, make slow circles with your wrists",
        duration: "10 circles each direction",
        category: "wrists",
        difficulty: "easy",
        benefits: ["wrist tension", "carpal tunnel prevention"]
      },
      {
        name: "Ankle Pumps",
        description: "Lift feet slightly, flex and point toes to improve circulation",
        duration: "15 repetitions",
        category: "legs",
        difficulty: "easy",
        benefits: ["circulation", "leg stiffness"]
      },
      {
        name: "Seated Forward Fold",
        description: "Sit tall, slowly fold forward over your legs, let arms hang",
        duration: "20 seconds",
        category: "back",
        difficulty: "moderate",
        benefits: ["full back stretch", "stress relief"]
      },
      {
        name: "Shoulder Blade Squeeze",
        description: "Pull shoulder blades together, hold, then release",
        duration: "5 seconds, 8 repetitions",
        category: "shoulders",
        difficulty: "easy",
        benefits: ["posture improvement", "upper back strength"]
      },
      {
        name: "Seated Pigeon Pose",
        description: "Place ankle on opposite knee, gently lean forward",
        duration: "20 seconds each side",
        category: "hips",
        difficulty: "moderate",
        benefits: ["hip flexibility", "lower back relief"]
      }
    ];
    
    // Track exercise usage for intelligent selection
    this.exerciseHistory = [];
    this.loadExerciseHistory();
    
    this.loadPreferences();
  }

  /**
   * Load user preferences from storage
   */
  async loadPreferences() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['breakReminders'], (result) => {
        const prefs = result.breakReminders || {};
        this.isEnabled = prefs.enabled !== false; // Default to true
        this.reminderFrequency = prefs.frequency || 30;
        this.postureThreshold = prefs.threshold || 80;
        resolve();
      });
    });
  }

  /**
   * Save user preferences to storage
   */
  async savePreferences() {
    const preferences = {
      enabled: this.isEnabled,
      frequency: this.reminderFrequency,
      threshold: this.postureThreshold
    };
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ breakReminders: preferences }, resolve);
    });
  }

  /**
   * Update break reminder preferences
   */
  async updatePreferences(preferences) {
    if (preferences.enabled !== undefined) {
      this.isEnabled = preferences.enabled;
    }
    if (preferences.frequency !== undefined) {
      this.reminderFrequency = Math.max(5, Math.min(120, preferences.frequency)); // 5-120 minutes
    }
    if (preferences.threshold !== undefined) {
      this.postureThreshold = Math.max(50, Math.min(95, preferences.threshold)); // 50-95 score
    }
    
    await this.savePreferences();
    console.log('Break reminder preferences updated:', {
      enabled: this.isEnabled,
      frequency: this.reminderFrequency,
      threshold: this.postureThreshold
    });
  }

  /**
   * Start tracking session for break reminders
   */
  startSession() {
    this.currentSessionStartTime = Date.now();
    this.consecutiveLowScoreMinutes = 0;
    this.lowScoreStartTime = null;
    this.dismissalCount = 0;
    this.adaptiveMultiplier = 1.0;
    
    console.log('Break reminder session started');
  }

  /**
   * End tracking session
   */
  endSession() {
    this.currentSessionStartTime = null;
    this.consecutiveLowScoreMinutes = 0;
    this.lowScoreStartTime = null;
    
    console.log('Break reminder session ended');
  }

  /**
   * Update posture score and check for break reminder triggers
   */
  async updatePostureScore(score, sessionMinutes) {
    if (!this.isEnabled || !this.currentSessionStartTime) {
      return;
    }

    const now = Date.now();
    const isLowScore = score < this.postureThreshold;

    // Track consecutive low score duration
    if (isLowScore) {
      if (!this.lowScoreStartTime) {
        this.lowScoreStartTime = now;
        this.consecutiveLowScoreMinutes = 0;
      } else {
        this.consecutiveLowScoreMinutes = Math.floor((now - this.lowScoreStartTime) / (1000 * 60));
      }
    } else {
      this.lowScoreStartTime = null;
      this.consecutiveLowScoreMinutes = 0;
    }

    // Check if we should trigger a break reminder
    await this.checkBreakReminderTriggers(sessionMinutes, score);
  }

  /**
   * Check various conditions that should trigger break reminders
   */
  async checkBreakReminderTriggers(sessionMinutes, currentScore) {
    const now = Date.now();
    const timeSinceLastReminder = (now - this.lastReminderTime) / (1000 * 60); // minutes
    const adaptiveFrequency = this.reminderFrequency * this.adaptiveMultiplier;

    // Trigger 1: Time-based reminder (every X minutes with adaptive adjustment)
    if (timeSinceLastReminder >= adaptiveFrequency) {
      await this.triggerBreakReminder('time', {
        sessionMinutes,
        currentScore,
        reason: `You've been tracking for ${sessionMinutes} minutes`
      });
      return;
    }

    // Trigger 2: Consecutive low posture score (5+ minutes below threshold)
    if (this.consecutiveLowScoreMinutes >= 5) {
      await this.triggerBreakReminder('posture', {
        sessionMinutes,
        currentScore,
        lowScoreMinutes: this.consecutiveLowScoreMinutes,
        reason: `Poor posture detected for ${this.consecutiveLowScoreMinutes} minutes`
      });
      return;
    }

    // Trigger 3: Extended session without break (45+ minutes)
    if (sessionMinutes >= 45 && timeSinceLastReminder >= 20) {
      await this.triggerBreakReminder('extended', {
        sessionMinutes,
        currentScore,
        reason: `Extended tracking session (${sessionMinutes} minutes)`
      });
      return;
    }
  }

  /**
   * Trigger a break reminder notification
   */
  async triggerBreakReminder(triggerType, context) {
    if (!this.isEnabled) return;

    const now = Date.now();
    this.lastReminderTime = now;

    // Get an intelligent stretch exercise suggestion based on context
    const exercise = this.getIntelligentStretchExercise(context);
    
    // Create notification based on trigger type
    const notification = this.createNotificationContent(triggerType, context, exercise);
    
    try {
      // Create Chrome notification
      const notificationId = `break-reminder-${now}`;
      await chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: notification.title,
        message: notification.message,
        buttons: [
          { title: 'Take Break' },
          { title: 'Dismiss' }
        ],
        requireInteraction: true
      });

      // Set up notification click handlers
      this.setupNotificationHandlers(notificationId, exercise);
      
      // Track the reminder trigger
      this.trackBreakEvent('triggered', exercise);
      
      console.log(`Break reminder triggered: ${triggerType}`, context);
      
    } catch (error) {
      console.error('Failed to create break reminder notification:', error);
    }
  }

  /**
   * Create notification content based on trigger type
   */
  createNotificationContent(triggerType, context, exercise) {
    const titles = {
      time: '⏰ Time for a Break!',
      posture: '🚨 Posture Alert!',
      extended: '💪 Break Time!'
    };

    const messages = {
      time: `${context.reason}. Try this: ${exercise.name} (${exercise.duration})`,
      posture: `${context.reason}. Stretch suggestion: ${exercise.name}`,
      extended: `${context.reason}. Recommended: ${exercise.name} - ${exercise.description}`
    };

    return {
      title: titles[triggerType] || '⏰ Break Reminder',
      message: messages[triggerType] || `Time for a break! Try: ${exercise.name}`
    };
  }

  /**
   * Get an intelligent stretch exercise suggestion based on user patterns and posture issues
   */
  getIntelligentStretchExercise(context = {}) {
    const { currentScore, consecutiveLowScoreMinutes, sessionMinutes } = context;
    
    // Filter exercises based on context
    let availableExercises = [...this.stretchExercises];
    
    // Prioritize exercises based on posture score and session duration
    if (currentScore < 60) {
      // Poor posture - prioritize posture correction exercises
      availableExercises = availableExercises.filter(ex => 
        ex.benefits.includes('posture improvement') || 
        ex.benefits.includes('posture correction')
      );
    } else if (sessionMinutes > 60) {
      // Long session - prioritize circulation and general stretches
      availableExercises = availableExercises.filter(ex => 
        ex.benefits.includes('circulation') || 
        ex.category === 'legs' || 
        ex.category === 'spine'
      );
    }
    
    // Avoid recently used exercises
    const recentExercises = this.exerciseHistory.slice(-3).map(h => h.name);
    const nonRecentExercises = availableExercises.filter(ex => 
      !recentExercises.includes(ex.name)
    );
    
    // Use non-recent exercises if available, otherwise use all available
    const finalExercises = nonRecentExercises.length > 0 ? nonRecentExercises : availableExercises;
    
    // Select exercise with weighted randomness (prefer easy exercises for frequent reminders)
    const weightedExercises = finalExercises.map(ex => ({
      ...ex,
      weight: ex.difficulty === 'easy' ? 3 : ex.difficulty === 'moderate' ? 2 : 1
    }));
    
    const totalWeight = weightedExercises.reduce((sum, ex) => sum + ex.weight, 0);
    let randomWeight = Math.random() * totalWeight;
    
    for (const exercise of weightedExercises) {
      randomWeight -= exercise.weight;
      if (randomWeight <= 0) {
        this.trackExerciseSelection(exercise);
        return exercise;
      }
    }
    
    // Fallback to first exercise
    const fallback = finalExercises[0] || this.stretchExercises[0];
    this.trackExerciseSelection(fallback);
    return fallback;
  }

  /**
   * Get a random stretch exercise suggestion (fallback method)
   */
  getRandomStretchExercise() {
    const randomIndex = Math.floor(Math.random() * this.stretchExercises.length);
    const exercise = this.stretchExercises[randomIndex];
    this.trackExerciseSelection(exercise);
    return exercise;
  }

  /**
   * Track exercise selection for intelligent recommendations
   */
  trackExerciseSelection(exercise) {
    const selection = {
      name: exercise.name,
      category: exercise.category,
      timestamp: new Date().toISOString(),
      difficulty: exercise.difficulty
    };
    
    this.exerciseHistory.push(selection);
    
    // Keep only last 20 selections
    if (this.exerciseHistory.length > 20) {
      this.exerciseHistory = this.exerciseHistory.slice(-20);
    }
    
    this.saveExerciseHistory();
  }

  /**
   * Load exercise history from storage
   */
  async loadExerciseHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['exerciseHistory'], (result) => {
        this.exerciseHistory = result.exerciseHistory || [];
        resolve();
      });
    });
  }

  /**
   * Save exercise history to storage
   */
  saveExerciseHistory() {
    chrome.storage.local.set({ exerciseHistory: this.exerciseHistory });
  }

  /**
   * Set up notification click and button handlers
   */
  setupNotificationHandlers(notificationId, exercise) {
    // Handle notification button clicks
    const buttonClickHandler = (notifId, buttonIndex) => {
      if (notifId !== notificationId) return;

      if (buttonIndex === 0) {
        // "Take Break" button clicked
        this.handleBreakAccepted(exercise);
      } else if (buttonIndex === 1) {
        // "Dismiss" button clicked
        this.handleBreakDismissed();
      }

      // Clear the notification
      chrome.notifications.clear(notificationId);
    };

    // Handle notification click (not button)
    const clickHandler = (notifId) => {
      if (notifId !== notificationId) return;
      
      // Show exercise details
      this.showExerciseDetails(exercise);
      chrome.notifications.clear(notificationId);
    };

    // Add event listeners
    chrome.notifications.onButtonClicked.addListener(buttonClickHandler);
    chrome.notifications.onClicked.addListener(clickHandler);

    // Clean up listeners after 5 minutes
    setTimeout(() => {
      chrome.notifications.onButtonClicked.removeListener(buttonClickHandler);
      chrome.notifications.onClicked.removeListener(clickHandler);
    }, 5 * 60 * 1000);
  }

  /**
   * Handle when user accepts break suggestion
   */
  handleBreakAccepted(exercise) {
    console.log('User accepted break suggestion:', exercise.name);
    
    // Reset adaptive multiplier (user is responsive)
    this.adaptiveMultiplier = Math.max(0.8, this.adaptiveMultiplier - 0.1);
    this.dismissalCount = Math.max(0, this.dismissalCount - 1);
    
    // Track acceptance by time slot
    const now = new Date();
    const timeSlot = this.getTimeSlot(now.getHours());
    this.updateTimeSlotBehavior(timeSlot, 'accepted');
    
    // Show exercise instructions
    this.showExerciseDetails(exercise);
    
    // Track break acceptance for analytics
    this.trackBreakEvent('accepted', exercise);
    
    // Provide positive reinforcement for next reminder
    this.schedulePositiveReinforcement();
  }

  /**
   * Schedule positive reinforcement for responsive users
   */
  schedulePositiveReinforcement() {
    // Slightly reduce next reminder interval for responsive users
    const reinforcementMultiplier = 0.9;
    this.adaptiveMultiplier *= reinforcementMultiplier;
    this.adaptiveMultiplier = Math.max(0.7, this.adaptiveMultiplier);
  }

  /**
   * Handle when user dismisses break reminder
   */
  handleBreakDismissed() {
    console.log('User dismissed break reminder');
    
    this.dismissalCount++;
    
    // Adaptive logic based on dismissal patterns
    if (this.dismissalCount >= 3) {
      // User consistently dismisses - reduce frequency significantly
      this.adaptiveMultiplier = Math.min(2.5, this.adaptiveMultiplier + 0.3);
    } else if (this.dismissalCount >= 2) {
      // Moderate dismissals - slight reduction in frequency
      this.adaptiveMultiplier = Math.min(2.0, this.adaptiveMultiplier + 0.2);
    }
    
    // Track dismissal for analytics
    this.trackBreakEvent('dismissed');
    
    // Implement smart timing adjustment based on time of day
    this.adjustTimingBasedOnBehavior();
  }

  /**
   * Adjust reminder timing based on user behavior patterns
   */
  adjustTimingBasedOnBehavior() {
    const now = new Date();
    const hour = now.getHours();
    
    // Track dismissal patterns by time of day
    const timeSlot = this.getTimeSlot(hour);
    this.updateTimeSlotBehavior(timeSlot, 'dismissed');
    
    // Adjust frequency based on time-specific patterns
    const timeSlotData = this.getTimeSlotData(timeSlot);
    if (timeSlotData.dismissalRate > 0.7) {
      // High dismissal rate in this time slot - reduce frequency
      this.adaptiveMultiplier *= 1.2;
    }
  }

  /**
   * Get time slot for behavior tracking (morning, afternoon, evening)
   */
  getTimeSlot(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Update time slot behavior data
   */
  updateTimeSlotBehavior(timeSlot, action) {
    chrome.storage.local.get(['timeSlotBehavior'], (result) => {
      const behavior = result.timeSlotBehavior || {};
      
      if (!behavior[timeSlot]) {
        behavior[timeSlot] = { accepted: 0, dismissed: 0, total: 0 };
      }
      
      behavior[timeSlot][action]++;
      behavior[timeSlot].total++;
      behavior[timeSlot].dismissalRate = behavior[timeSlot].dismissed / behavior[timeSlot].total;
      
      chrome.storage.local.set({ timeSlotBehavior: behavior });
    });
  }

  /**
   * Get time slot behavior data
   */
  getTimeSlotData(timeSlot) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['timeSlotBehavior'], (result) => {
        const behavior = result.timeSlotBehavior || {};
        resolve(behavior[timeSlot] || { accepted: 0, dismissed: 0, total: 0, dismissalRate: 0 });
      });
    });
  }

  /**
   * Show detailed exercise instructions
   */
  async showExerciseDetails(exercise) {
    try {
      const detailNotificationId = `exercise-detail-${Date.now()}`;
      await chrome.notifications.create(detailNotificationId, {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: `💪 ${exercise.name}`,
        message: `${exercise.description}\nDuration: ${exercise.duration}`,
        requireInteraction: false
      });

      // Auto-clear after 10 seconds
      setTimeout(() => {
        chrome.notifications.clear(detailNotificationId);
      }, 10000);

    } catch (error) {
      console.error('Failed to show exercise details:', error);
    }
  }

  /**
   * Track break reminder events for analytics
   */
  trackBreakEvent(action, exercise = null) {
    const event = {
      timestamp: new Date().toISOString(),
      action: action, // 'accepted', 'dismissed', 'triggered'
      exercise: exercise ? exercise.name : null,
      adaptiveMultiplier: this.adaptiveMultiplier,
      dismissalCount: this.dismissalCount
    };

    // Store in chrome.storage for analytics
    chrome.storage.local.get(['breakReminderEvents'], (result) => {
      const events = result.breakReminderEvents || [];
      events.push(event);
      
      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      chrome.storage.local.set({ breakReminderEvents: events });
    });
  }

  /**
   * Get break reminder statistics
   */
  async getBreakReminderStats() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['breakReminderEvents'], (result) => {
        const events = result.breakReminderEvents || [];
        
        const stats = {
          totalReminders: events.filter(e => e.action === 'triggered').length,
          acceptedBreaks: events.filter(e => e.action === 'accepted').length,
          dismissedBreaks: events.filter(e => e.action === 'dismissed').length,
          currentAdaptiveMultiplier: this.adaptiveMultiplier,
          currentDismissalCount: this.dismissalCount,
          isEnabled: this.isEnabled,
          frequency: this.reminderFrequency,
          threshold: this.postureThreshold
        };
        
        stats.acceptanceRate = stats.totalReminders > 0 
          ? Math.round((stats.acceptedBreaks / stats.totalReminders) * 100) 
          : 0;
        
        resolve(stats);
      });
    });
  }

  /**
   * Reset adaptive behavior (useful for testing or user preference)
   */
  resetAdaptiveBehavior() {
    this.adaptiveMultiplier = 1.0;
    this.dismissalCount = 0;
    console.log('Break reminder adaptive behavior reset');
  }

  /**
   * Get current break reminder status
   */
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      frequency: this.reminderFrequency,
      threshold: this.postureThreshold,
      adaptiveMultiplier: this.adaptiveMultiplier,
      consecutiveLowScoreMinutes: this.consecutiveLowScoreMinutes,
      timeSinceLastReminder: this.lastReminderTime > 0 
        ? Math.floor((Date.now() - this.lastReminderTime) / (1000 * 60))
        : null
    };
  }

  /**
   * Get personalized exercise recommendations based on user history
   */
  getPersonalizedRecommendations(limit = 5) {
    // Analyze exercise history to find preferences
    const categoryPreferences = {};
    const difficultyPreferences = {};
    
    this.exerciseHistory.forEach(selection => {
      categoryPreferences[selection.category] = (categoryPreferences[selection.category] || 0) + 1;
      difficultyPreferences[selection.difficulty] = (difficultyPreferences[selection.difficulty] || 0) + 1;
    });
    
    // Get preferred categories and difficulties
    const preferredCategories = Object.keys(categoryPreferences)
      .sort((a, b) => categoryPreferences[b] - categoryPreferences[a])
      .slice(0, 3);
    
    const preferredDifficulty = Object.keys(difficultyPreferences)
      .sort((a, b) => difficultyPreferences[b] - difficultyPreferences[a])[0] || 'easy';
    
    // Filter exercises based on preferences
    let recommendations = this.stretchExercises.filter(exercise => {
      const categoryMatch = preferredCategories.length === 0 || preferredCategories.includes(exercise.category);
      const difficultyMatch = exercise.difficulty === preferredDifficulty;
      return categoryMatch || difficultyMatch;
    });
    
    // Avoid recently used exercises
    const recentExercises = this.exerciseHistory.slice(-5).map(h => h.name);
    recommendations = recommendations.filter(ex => !recentExercises.includes(ex.name));
    
    // If no recommendations after filtering, use all exercises
    if (recommendations.length === 0) {
      recommendations = this.stretchExercises;
    }
    
    // Sort by preference score and return top recommendations
    return recommendations
      .sort((a, b) => {
        const aScore = (categoryPreferences[a.category] || 0) + (a.difficulty === preferredDifficulty ? 2 : 0);
        const bScore = (categoryPreferences[b.category] || 0) + (b.difficulty === preferredDifficulty ? 2 : 0);
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  /**
   * Get exercise statistics and insights
   */
  getExerciseInsights() {
    if (this.exerciseHistory.length === 0) {
      return {
        totalExercises: 0,
        favoriteCategory: null,
        preferredDifficulty: null,
        recentStreak: 0
      };
    }
    
    const categoryCount = {};
    const difficultyCount = {};
    
    this.exerciseHistory.forEach(selection => {
      categoryCount[selection.category] = (categoryCount[selection.category] || 0) + 1;
      difficultyCount[selection.difficulty] = (difficultyCount[selection.difficulty] || 0) + 1;
    });
    
    const favoriteCategory = Object.keys(categoryCount)
      .sort((a, b) => categoryCount[b] - categoryCount[a])[0];
    
    const preferredDifficulty = Object.keys(difficultyCount)
      .sort((a, b) => difficultyCount[b] - difficultyCount[a])[0];
    
    // Calculate recent streak (consecutive days with exercises)
    const recentDays = new Set();
    this.exerciseHistory.slice(-10).forEach(selection => {
      const date = new Date(selection.timestamp).toDateString();
      recentDays.add(date);
    });
    
    return {
      totalExercises: this.exerciseHistory.length,
      favoriteCategory: favoriteCategory,
      preferredDifficulty: preferredDifficulty,
      recentStreak: recentDays.size,
      categoryBreakdown: categoryCount,
      difficultyBreakdown: difficultyCount
    };
  }
}