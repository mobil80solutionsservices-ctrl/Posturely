/**
 * BadgeSystem - Manages badge earning, display, and achievement notifications
 * Implements predefined achievements and milestone tracking
 */
export class BadgeSystem {
  constructor() {
    this.badges = this.initializeBadges();
  }

  /**
   * Initialize predefined badge definitions
   */
  initializeBadges() {
    return {
      // First-time achievements
      first_session: {
        id: 'first_session',
        name: 'Getting Started',
        description: 'Complete your first tracking session',
        icon: '🎯',
        category: 'milestone',
        requirement: { type: 'sessions', value: 1 }
      },
      first_hour: {
        id: 'first_hour',
        name: 'Hour Hero',
        description: 'Track posture for 1 hour in a single day',
        icon: '⏰',
        category: 'milestone',
        requirement: { type: 'daily_minutes', value: 60 }
      },
      first_week: {
        id: 'first_week',
        name: 'Week Warrior',
        description: 'Track posture for 7 consecutive days',
        icon: '🔥',
        category: 'streak',
        requirement: { type: 'streak', value: 7 }
      },

      // Streak achievements
      streak_3: {
        id: 'streak_3',
        name: 'Habit Builder',
        description: 'Maintain a 3-day tracking streak',
        icon: '🌱',
        category: 'streak',
        requirement: { type: 'streak', value: 3 }
      },
      streak_14: {
        id: 'streak_14',
        name: 'Consistency King',
        description: 'Maintain a 2-week tracking streak',
        icon: '👑',
        category: 'streak',
        requirement: { type: 'streak', value: 14 }
      },
      streak_30: {
        id: 'streak_30',
        name: 'Monthly Master',
        description: 'Maintain a 30-day tracking streak',
        icon: '🏆',
        category: 'streak',
        requirement: { type: 'streak', value: 30 }
      },
      streak_100: {
        id: 'streak_100',
        name: 'Centurion',
        description: 'Maintain a 100-day tracking streak',
        icon: '💎',
        category: 'streak',
        requirement: { type: 'streak', value: 100 }
      },

      // Time-based achievements
      total_10h: {
        id: 'total_10h',
        name: 'Ten Hour Club',
        description: 'Track posture for 10 total hours',
        icon: '🕙',
        category: 'time',
        requirement: { type: 'total_minutes', value: 600 }
      },
      total_50h: {
        id: 'total_50h',
        name: 'Fifty Hour Hero',
        description: 'Track posture for 50 total hours',
        icon: '⭐',
        category: 'time',
        requirement: { type: 'total_minutes', value: 3000 }
      },
      total_100h: {
        id: 'total_100h',
        name: 'Century Tracker',
        description: 'Track posture for 100 total hours',
        icon: '🌟',
        category: 'time',
        requirement: { type: 'total_minutes', value: 6000 }
      },

      // Posture quality achievements
      perfect_day: {
        id: 'perfect_day',
        name: 'Perfect Posture',
        description: 'Achieve 95+ average posture score in a day',
        icon: '✨',
        category: 'quality',
        requirement: { type: 'daily_score', value: 95 }
      },
      excellent_week: {
        id: 'excellent_week',
        name: 'Excellence Week',
        description: 'Maintain 85+ average posture for a week',
        icon: '🎖️',
        category: 'quality',
        requirement: { type: 'weekly_score', value: 85 }
      },

      // Special achievements
      early_bird: {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Start tracking before 8 AM',
        icon: '🌅',
        category: 'special',
        requirement: { type: 'early_start', value: 8 }
      },
      night_owl: {
        id: 'night_owl',
        name: 'Night Owl',
        description: 'Track posture after 10 PM',
        icon: '🦉',
        category: 'special',
        requirement: { type: 'late_tracking', value: 22 }
      },
      mood_tracker: {
        id: 'mood_tracker',
        name: 'Mood Master',
        description: 'Log mood in 10 different sessions',
        icon: '😊',
        category: 'special',
        requirement: { type: 'mood_sessions', value: 10 }
      }
    };
  }

  /**
   * Get all earned badges for the user
   */
  async getEarnedBadges() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['earnedBadges'], (result) => {
        const earnedBadges = result.earnedBadges || [];
        resolve(earnedBadges);
      });
    });
  }

  /**
   * Award a badge to the user
   */
  async awardBadge(badgeId) {
    const earnedBadges = await this.getEarnedBadges();
    
    // Check if badge already earned
    if (earnedBadges.find(badge => badge.id === badgeId)) {
      return null; // Already earned
    }

    const badge = this.badges[badgeId];
    if (!badge) {
      console.warn(`Badge ${badgeId} not found`);
      return null;
    }

    const earnedBadge = {
      ...badge,
      earnedDate: new Date().toISOString(),
      earnedTimestamp: Date.now()
    };

    earnedBadges.push(earnedBadge);

    return new Promise((resolve) => {
      chrome.storage.local.set({ earnedBadges }, () => {
        console.log('🏅 Badge earned:', earnedBadge);
        this.showBadgeNotification(earnedBadge);
        resolve(earnedBadge);
      });
    });
  }

  /**
   * Check all badge requirements and award eligible badges
   */
  async checkAndAwardBadges(stats, streakData, sessionData = null) {
    const earnedBadges = await this.getEarnedBadges();
    const newBadges = [];

    // Calculate totals
    const totalMinutes = this.calculateTotalMinutes(stats);
    const totalSessions = this.calculateTotalSessions(stats);
    const moodSessions = this.calculateMoodSessions(stats);

    // Check each badge requirement
    for (const [badgeId, badge] of Object.entries(this.badges)) {
      // Skip if already earned
      if (earnedBadges.find(earned => earned.id === badgeId)) {
        continue;
      }

      let shouldAward = false;

      switch (badge.requirement.type) {
        case 'sessions':
          shouldAward = totalSessions >= badge.requirement.value;
          break;

        case 'total_minutes':
          shouldAward = totalMinutes >= badge.requirement.value;
          break;

        case 'streak':
          shouldAward = streakData.currentStreak >= badge.requirement.value;
          break;

        case 'daily_minutes':
          shouldAward = this.checkDailyMinutes(stats, badge.requirement.value);
          break;

        case 'daily_score':
          shouldAward = this.checkDailyScore(stats, badge.requirement.value);
          break;

        case 'weekly_score':
          shouldAward = this.checkWeeklyScore(stats, badge.requirement.value);
          break;

        case 'early_start':
          shouldAward = sessionData && this.checkEarlyStart(sessionData, badge.requirement.value);
          break;

        case 'late_tracking':
          shouldAward = sessionData && this.checkLateTracking(sessionData, badge.requirement.value);
          break;

        case 'mood_sessions':
          shouldAward = moodSessions >= badge.requirement.value;
          break;
      }

      if (shouldAward) {
        const newBadge = await this.awardBadge(badgeId);
        if (newBadge) {
          newBadges.push(newBadge);
        }
      }
    }

    return newBadges;
  }

  /**
   * Calculate total minutes tracked across all days
   */
  calculateTotalMinutes(stats) {
    return Object.values(stats).reduce((total, day) => {
      return total + (day.minutes || 0);
    }, 0);
  }

  /**
   * Calculate total sessions across all days
   */
  calculateTotalSessions(stats) {
    return Object.values(stats).reduce((total, day) => {
      return total + (day.sessions ? day.sessions.length : 0);
    }, 0);
  }

  /**
   * Calculate sessions with mood data
   */
  calculateMoodSessions(stats) {
    return Object.values(stats).reduce((total, day) => {
      if (!day.sessions) return total;
      return total + day.sessions.filter(session => session.mood && session.mood.trim()).length;
    }, 0);
  }

  /**
   * Check if any day meets the daily minutes requirement
   */
  checkDailyMinutes(stats, requiredMinutes) {
    return Object.values(stats).some(day => (day.minutes || 0) >= requiredMinutes);
  }

  /**
   * Check if any day meets the daily score requirement
   */
  checkDailyScore(stats, requiredScore) {
    return Object.values(stats).some(day => {
      if (!day.samples || day.samples === 0) return false;
      const avgScore = Math.round(day.scoreSum / day.samples);
      return avgScore >= requiredScore;
    });
  }

  /**
   * Check if the past week meets the weekly score requirement
   */
  checkWeeklyScore(stats, requiredScore) {
    const today = new Date();
    const weekStart = this.mondayStartOfWeek(today);
    let totalScore = 0;
    let totalSamples = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateKey = this.ymd(date);
      const dayStats = stats[dateKey];

      if (dayStats && dayStats.samples > 0) {
        totalScore += dayStats.scoreSum;
        totalSamples += dayStats.samples;
      }
    }

    if (totalSamples === 0) return false;
    const weeklyAverage = Math.round(totalScore / totalSamples);
    return weeklyAverage >= requiredScore;
  }

  /**
   * Check if session started early (before specified hour)
   */
  checkEarlyStart(sessionData, beforeHour) {
    if (!sessionData.startTime) return false;
    const startTime = new Date(sessionData.startTime);
    return startTime.getHours() < beforeHour;
  }

  /**
   * Check if session was active late (after specified hour)
   */
  checkLateTracking(sessionData, afterHour) {
    if (!sessionData.startTime) return false;
    const startTime = new Date(sessionData.startTime);
    return startTime.getHours() >= afterHour;
  }

  /**
   * Show badge notification
   */
  showBadgeNotification(badge) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'badge-notification';
    notification.innerHTML = `
      <div class="badge-notification-content">
        <div class="badge-icon">${badge.icon}</div>
        <div class="badge-info">
          <div class="badge-title">Badge Earned!</div>
          <div class="badge-name">${badge.name}</div>
          <div class="badge-description">${badge.description}</div>
        </div>
      </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    }, 5000);
  }

  /**
   * Get badge progress for display
   */
  async getBadgeProgress() {
    const earnedBadges = await this.getEarnedBadges();
    const totalBadges = Object.keys(this.badges).length;
    const earnedCount = earnedBadges.length;
    
    // Group badges by category
    const categories = {};
    for (const badge of Object.values(this.badges)) {
      if (!categories[badge.category]) {
        categories[badge.category] = {
          name: this.getCategoryName(badge.category),
          badges: [],
          earned: 0,
          total: 0
        };
      }
      
      const isEarned = earnedBadges.find(earned => earned.id === badge.id);
      categories[badge.category].badges.push({
        ...badge,
        earned: !!isEarned,
        earnedDate: isEarned?.earnedDate || null
      });
      
      categories[badge.category].total++;
      if (isEarned) {
        categories[badge.category].earned++;
      }
    }

    return {
      summary: {
        earned: earnedCount,
        total: totalBadges,
        percentage: Math.round((earnedCount / totalBadges) * 100)
      },
      categories,
      recentBadges: earnedBadges
        .sort((a, b) => new Date(b.earnedDate) - new Date(a.earnedDate))
        .slice(0, 3)
    };
  }

  /**
   * Get category display name
   */
  getCategoryName(category) {
    const names = {
      milestone: 'Milestones',
      streak: 'Streaks',
      time: 'Time Tracking',
      quality: 'Posture Quality',
      special: 'Special'
    };
    return names[category] || category;
  }

  /**
   * Get date string in YYYY-MM-DD format
   */
  ymd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Get Monday start of week for a given date
   */
  mondayStartOfWeek(date) {
    const d = new Date(date);
    const day = (d.getDay() + 6) % 7; // 0=Mon ... 6=Sun
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}