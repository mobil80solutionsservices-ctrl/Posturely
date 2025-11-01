/**
 * Tests for BreakReminderManager
 */

import { BreakReminderManager } from '../src/BreakReminderManager.js';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: (keys, callback) => {
        const mockData = {
          breakReminders: {
            enabled: true,
            frequency: 30,
            threshold: 80
          },
          breakReminderEvents: [],
          exerciseHistory: [],
          timeSlotBehavior: {}
        };
        
        if (typeof keys === 'string') {
          callback({ [keys]: mockData[keys] });
        } else if (Array.isArray(keys)) {
          const result = {};
          keys.forEach(key => {
            result[key] = mockData[key];
          });
          callback(result);
        } else {
          callback(mockData);
        }
      },
      set: (data, callback) => {
        if (callback) callback();
      }
    }
  },
  notifications: {
    create: (id, options, callback) => {
      console.log('Mock notification created:', id, options);
      if (callback) callback(id);
      return Promise.resolve(id);
    },
    clear: (id, callback) => {
      console.log('Mock notification cleared:', id);
      if (callback) callback(true);
      return Promise.resolve(true);
    },
    onButtonClicked: {
      addListener: (callback) => {},
      removeListener: (callback) => {}
    },
    onClicked: {
      addListener: (callback) => {},
      removeListener: (callback) => {}
    }
  }
};

describe('BreakReminderManager', () => {
  let breakReminderManager;

  beforeEach(() => {
    breakReminderManager = new BreakReminderManager();
  });

  test('should initialize with default settings', () => {
    expect(breakReminderManager.isEnabled).toBe(true);
    expect(breakReminderManager.reminderFrequency).toBe(30);
    expect(breakReminderManager.postureThreshold).toBe(80);
  });

  test('should start and end session correctly', () => {
    breakReminderManager.startSession();
    expect(breakReminderManager.currentSessionStartTime).toBeTruthy();
    expect(breakReminderManager.consecutiveLowScoreMinutes).toBe(0);

    breakReminderManager.endSession();
    expect(breakReminderManager.currentSessionStartTime).toBeNull();
  });

  test('should update preferences correctly', async () => {
    await breakReminderManager.updatePreferences({
      enabled: false,
      frequency: 45,
      threshold: 75
    });

    expect(breakReminderManager.isEnabled).toBe(false);
    expect(breakReminderManager.reminderFrequency).toBe(45);
    expect(breakReminderManager.postureThreshold).toBe(75);
  });

  test('should track consecutive low score minutes', async () => {
    breakReminderManager.startSession();
    
    // Simulate low score updates
    await breakReminderManager.updatePostureScore(70, 1);
    expect(breakReminderManager.consecutiveLowScoreMinutes).toBe(0); // Just started
    
    // Mock time passage for low score tracking
    breakReminderManager.lowScoreStartTime = Date.now() - (6 * 60 * 1000); // 6 minutes ago
    await breakReminderManager.updatePostureScore(70, 6);
    expect(breakReminderManager.consecutiveLowScoreMinutes).toBe(6);
  });

  test('should get intelligent exercise suggestions', () => {
    const context = {
      currentScore: 50,
      consecutiveLowScoreMinutes: 10,
      sessionMinutes: 30
    };

    const exercise = breakReminderManager.getIntelligentStretchExercise(context);
    expect(exercise).toBeTruthy();
    expect(exercise.name).toBeTruthy();
    expect(exercise.description).toBeTruthy();
    expect(exercise.duration).toBeTruthy();
  });

  test('should handle break acceptance and dismissal', () => {
    const exercise = breakReminderManager.stretchExercises[0];
    
    // Test acceptance
    const initialMultiplier = breakReminderManager.adaptiveMultiplier;
    breakReminderManager.handleBreakAccepted(exercise);
    expect(breakReminderManager.adaptiveMultiplier).toBeLessThanOrEqual(initialMultiplier);
    
    // Test dismissal
    breakReminderManager.handleBreakDismissed();
    expect(breakReminderManager.dismissalCount).toBe(1);
  });

  test('should get personalized recommendations', () => {
    // Add some exercise history
    breakReminderManager.exerciseHistory = [
      { name: 'Neck Rolls', category: 'neck', difficulty: 'easy', timestamp: new Date().toISOString() },
      { name: 'Shoulder Shrugs', category: 'shoulders', difficulty: 'easy', timestamp: new Date().toISOString() }
    ];

    const recommendations = breakReminderManager.getPersonalizedRecommendations(3);
    expect(recommendations).toBeTruthy();
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.length).toBeLessThanOrEqual(3);
  });

  test('should get exercise insights', () => {
    // Add some exercise history
    breakReminderManager.exerciseHistory = [
      { name: 'Neck Rolls', category: 'neck', difficulty: 'easy', timestamp: new Date().toISOString() },
      { name: 'Shoulder Shrugs', category: 'shoulders', difficulty: 'easy', timestamp: new Date().toISOString() },
      { name: 'Upper Back Stretch', category: 'back', difficulty: 'easy', timestamp: new Date().toISOString() }
    ];

    const insights = breakReminderManager.getExerciseInsights();
    expect(insights.totalExercises).toBe(3);
    expect(insights.preferredDifficulty).toBe('easy');
    expect(insights.favoriteCategory).toBeTruthy();
  });

  test('should get status correctly', () => {
    const status = breakReminderManager.getStatus();
    expect(status.isEnabled).toBe(true);
    expect(status.frequency).toBe(30);
    expect(status.threshold).toBe(80);
    expect(status.adaptiveMultiplier).toBe(1.0);
  });

  test('should reset adaptive behavior', () => {
    breakReminderManager.adaptiveMultiplier = 1.5;
    breakReminderManager.dismissalCount = 3;
    
    breakReminderManager.resetAdaptiveBehavior();
    
    expect(breakReminderManager.adaptiveMultiplier).toBe(1.0);
    expect(breakReminderManager.dismissalCount).toBe(0);
  });
});