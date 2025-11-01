/**
 * Tests for ComprehensiveAchievementManager
 */

import { ComprehensiveAchievementManager } from '../src/ComprehensiveAchievementManager.js';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: (keys, callback) => {
        const mockData = {
          earnedBadges: [
            {
              id: 'first_session',
              name: 'Getting Started',
              description: 'Complete your first tracking session',
              icon: '🎯',
              category: 'milestone',
              earnedDate: '2024-01-01T10:00:00.000Z'
            }
          ],
          statsByDate: {
            '2024-01-01': {
              minutes: 30,
              scoreSum: 2400,
              samples: 30,
              sessions: [
                { startTime: '2024-01-01T10:00:00.000Z', endTime: '2024-01-01T10:30:00.000Z' }
              ]
            }
          },
          streakData: {
            currentStreak: 3,
            longestStreak: 5
          }
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
  }
};

describe('ComprehensiveAchievementManager', () => {
  let achievementManager;

  beforeEach(() => {
    achievementManager = new ComprehensiveAchievementManager();
  });

  test('should initialize with all 15 badges', () => {
    const badges = achievementManager.badges;
    expect(Object.keys(badges)).toHaveLength(15);
    
    // Check that all required badges exist
    const expectedBadges = [
      'first_session', 'first_hour', 'first_week',
      'streak_3', 'streak_14', 'streak_30', 'streak_100',
      'total_10h', 'total_50h', 'total_100h',
      'perfect_day', 'excellent_week',
      'early_bird', 'night_owl', 'mood_tracker'
    ];
    
    expectedBadges.forEach(badgeId => {
      expect(badges[badgeId]).toBeDefined();
    });
  });

  test('should get comprehensive achievement data', async () => {
    const data = await achievementManager.getComprehensiveAchievementData();
    
    expect(data.summary.total).toBe(15);
    expect(data.summary.earned).toBe(1); // Mock has 1 earned badge
    expect(data.summary.percentage).toBe(Math.round((1/15) * 100));
    
    expect(data.achievements).toHaveLength(15);
    expect(data.categories).toBeDefined();
    expect(data.recentEarned).toHaveLength(1);
  });

  test('should calculate achievement progress correctly', async () => {
    // Test session-based achievement
    const sessionBadge = achievementManager.badges.first_session;
    const sessionProgress = await achievementManager.calculateAchievementProgress(sessionBadge);
    expect(sessionProgress).toBe(100); // Mock has 1 session, requirement is 1
    
    // Test streak-based achievement
    const streakBadge = achievementManager.badges.streak_3;
    const streakProgress = await achievementManager.calculateAchievementProgress(streakBadge);
    expect(streakProgress).toBe(100); // Mock has 3 streak, requirement is 3
    
    // Test time-based achievement
    const timeBadge = achievementManager.badges.total_10h;
    const timeProgress = await achievementManager.calculateAchievementProgress(timeBadge);
    expect(timeProgress).toBe(5); // Mock has 30 minutes (0.5h), requirement is 10h (600 minutes)
  });

  test('should group achievements by category', async () => {
    const data = await achievementManager.getComprehensiveAchievementData();
    const categories = data.categories;
    
    expect(categories.milestone).toBeDefined();
    expect(categories.streak).toBeDefined();
    expect(categories.time).toBeDefined();
    expect(categories.quality).toBeDefined();
    expect(categories.special).toBeDefined();
    
    // Check category totals
    expect(categories.milestone.total).toBe(2); // first_session, first_hour
    expect(categories.streak.total).toBe(5); // first_week, streak_3, streak_14, streak_30, streak_100
    expect(categories.time.total).toBe(3); // total_10h, total_50h, total_100h
    expect(categories.quality.total).toBe(2); // perfect_day, excellent_week
    expect(categories.special.total).toBe(3); // early_bird, night_owl, mood_tracker
  });

  test('should determine achievement status correctly', () => {
    const badge = achievementManager.badges.first_session;
    
    // Test earned status
    const earnedStatus = achievementManager.getAchievementStatus(badge, true);
    expect(earnedStatus).toBe('earned');
    
    // Test locked status
    const lockedStatus = achievementManager.getAchievementStatus(badge, false);
    expect(lockedStatus).toBe('locked');
  });

  test('should create achievement element with correct structure', () => {
    const mockAchievement = {
      id: 'test_badge',
      name: 'Test Badge',
      description: 'Test description',
      icon: '🧪',
      status: 'in-progress',
      progress: 75,
      isEarned: false
    };
    
    const element = achievementManager.createAchievementElement(mockAchievement);
    
    expect(element.className).toContain('achievement-item');
    expect(element.className).toContain('in-progress');
    expect(element.innerHTML).toContain('Test Badge');
    expect(element.innerHTML).toContain('Test description');
    expect(element.innerHTML).toContain('75%');
  });

  test('should handle earned achievement element correctly', () => {
    const earnedAchievement = {
      id: 'earned_badge',
      name: 'Earned Badge',
      description: 'Earned description',
      icon: '🏆',
      status: 'earned',
      progress: 100,
      isEarned: true,
      earnedDate: '2024-01-01T10:00:00.000Z'
    };
    
    const element = achievementManager.createAchievementElement(earnedAchievement);
    
    expect(element.className).toContain('earned');
    expect(element.innerHTML).toContain('🏆');
    expect(element.innerHTML).toContain('Earned 1/1/2024');
    expect(element.innerHTML).not.toContain('achievement-progress-bar');
  });

  test('should get best daily minutes progress', () => {
    const stats = {
      '2024-01-01': { minutes: 30 },
      '2024-01-02': { minutes: 45 },
      '2024-01-03': { minutes: 20 }
    };
    
    const progress = achievementManager.getBestDailyMinutes(stats, 60);
    expect(progress).toBe(75); // Best is 45 minutes, 45/60 = 75%
  });

  test('should get best daily score progress', () => {
    const stats = {
      '2024-01-01': { scoreSum: 2400, samples: 30 }, // avg 80
      '2024-01-02': { scoreSum: 2700, samples: 30 }, // avg 90
      '2024-01-03': { scoreSum: 2100, samples: 30 }  // avg 70
    };
    
    const progress = achievementManager.getBestDailyScore(stats, 95);
    expect(progress).toBe(Math.round((90/95) * 100)); // Best is 90, 90/95 = ~95%
  });
});