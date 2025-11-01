/**
 * GoalTracker - Manages daily tracking goals and streak counters
 * Implements goal setting interface for daily minutes and posture targets
 */
export class GoalTracker {
  constructor() {
    this.defaultGoals = {
      dailyMinutes: 60,        // Default: 1 hour per day
      postureScore: 80,        // Default: 80% average posture score
      streakDays: 7            // Default: 7 day streak goal
    };
  }

  /**
   * Get current user goals from storage
   */
  async getGoals() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['userGoals'], (result) => {
        const goals = result.userGoals || { ...this.defaultGoals };
        resolve(goals);
      });
    });
  }

  /**
   * Set user goals
   */
  async setGoals(goals) {
    const currentGoals = await this.getGoals();
    const updatedGoals = { ...currentGoals, ...goals };
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ userGoals: updatedGoals }, () => {
        console.log('Goals updated:', updatedGoals);
        resolve(updatedGoals);
      });
    });
  }

  /**
   * Get current streak data
   */
  async getStreakData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['streakData'], (result) => {
        const streakData = result.streakData || {
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: null,
          streakStartDate: null
        };
        resolve(streakData);
      });
    });
  }

  /**
   * Update streak data
   */
  async updateStreakData(streakData) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ streakData }, () => {
        console.log('Streak data updated:', streakData);
        resolve(streakData);
      });
    });
  }

  /**
   * Check if daily goals are met for a specific date
   */
  async checkDailyGoals(date, stats) {
    const goals = await this.getGoals();
    const dateKey = this.ymd(date);
    
    const dayStats = stats[dateKey] || { minutes: 0, scoreSum: 0, samples: 0 };
    const avgScore = dayStats.samples > 0 ? Math.round(dayStats.scoreSum / dayStats.samples) : 0;
    
    const minutesGoalMet = dayStats.minutes >= goals.dailyMinutes;
    const postureGoalMet = avgScore >= goals.postureScore;
    const allGoalsMet = minutesGoalMet && postureGoalMet;
    
    return {
      minutesGoalMet,
      postureGoalMet,
      allGoalsMet,
      actualMinutes: dayStats.minutes,
      actualScore: avgScore,
      targetMinutes: goals.dailyMinutes,
      targetScore: goals.postureScore
    };
  }

  /**
   * Update streak based on today's performance
   */
  async updateStreak(stats) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayGoals = await this.checkDailyGoals(today, stats);
    const streakData = await this.getStreakData();
    
    if (todayGoals.allGoalsMet) {
      const todayKey = this.ymd(today);
      
      // Check if we already counted today
      if (streakData.lastActiveDate === todayKey) {
        return streakData; // Already processed today
      }
      
      // Check if streak continues from yesterday
      const yesterdayKey = this.ymd(yesterday);
      if (streakData.lastActiveDate === yesterdayKey) {
        // Continue streak
        streakData.currentStreak += 1;
      } else {
        // Start new streak
        streakData.currentStreak = 1;
        streakData.streakStartDate = todayKey;
      }
      
      // Update longest streak if needed
      if (streakData.currentStreak > streakData.longestStreak) {
        streakData.longestStreak = streakData.currentStreak;
      }
      
      streakData.lastActiveDate = todayKey;
      
      await this.updateStreakData(streakData);
      
      // Check for streak achievements
      await this.checkStreakAchievements(streakData.currentStreak);
    }
    
    return streakData;
  }

  /**
   * Check for streak-based achievements
   */
  async checkStreakAchievements(currentStreak) {
    const streakMilestones = [3, 7, 14, 30, 60, 100];
    
    for (const milestone of streakMilestones) {
      if (currentStreak === milestone) {
        // Trigger achievement notification
        await this.triggerAchievement('streak', milestone);
        break;
      }
    }
  }

  /**
   * Trigger achievement celebration
   */
  async triggerAchievement(type, value) {
    const achievement = {
      type,
      value,
      timestamp: new Date().toISOString(),
      message: this.getAchievementMessage(type, value)
    };
    
    // Store achievement
    await this.storeAchievement(achievement);
    
    // Show celebration notification
    await this.showCelebrationNotification(achievement);
    
    console.log('🎉 Achievement unlocked:', achievement);
  }

  /**
   * Get achievement message
   */
  getAchievementMessage(type, value) {
    const messages = {
      streak: {
        3: "🔥 3-day streak! You're building great habits!",
        7: "🌟 One week streak! Fantastic consistency!",
        14: "💪 Two weeks strong! You're unstoppable!",
        30: "🏆 30-day streak! Posture champion!",
        60: "👑 60-day streak! Legendary dedication!",
        100: "🎯 100-day streak! Posture master achieved!"
      }
    };
    
    return messages[type]?.[value] || `🎉 ${type} achievement: ${value}!`;
  }

  /**
   * Store achievement in history
   */
  async storeAchievement(achievement) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['achievements'], (result) => {
        const achievements = result.achievements || [];
        achievements.push(achievement);
        
        chrome.storage.local.set({ achievements }, () => {
          resolve(achievements);
        });
      });
    });
  }

  /**
   * Show celebration notification
   */
  async showCelebrationNotification(achievement) {
    // Create a temporary celebration element
    const celebration = document.createElement('div');
    celebration.className = 'goal-celebration';
    celebration.innerHTML = `
      <div class="celebration-content">
        <div class="celebration-icon">🎉</div>
        <div class="celebration-message">${achievement.message}</div>
      </div>
    `;
    
    // Add to page
    document.body.appendChild(celebration);
    
    // Animate in
    setTimeout(() => {
      celebration.classList.add('show');
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
      celebration.classList.remove('show');
      setTimeout(() => {
        if (celebration.parentNode) {
          celebration.parentNode.removeChild(celebration);
        }
      }, 500);
    }, 4000);
  }

  /**
   * Get goal progress for today
   */
  async getTodayProgress(stats) {
    const today = new Date();
    const goals = await this.getGoals();
    const goalCheck = await this.checkDailyGoals(today, stats);
    const streakData = await this.getStreakData();
    
    return {
      goals,
      progress: {
        minutes: {
          current: goalCheck.actualMinutes,
          target: goalCheck.targetMinutes,
          percentage: Math.min(100, Math.round((goalCheck.actualMinutes / goalCheck.targetMinutes) * 100))
        },
        posture: {
          current: goalCheck.actualScore,
          target: goalCheck.targetScore,
          percentage: Math.min(100, Math.round((goalCheck.actualScore / goalCheck.targetScore) * 100))
        }
      },
      streak: streakData,
      goalsAchieved: goalCheck.allGoalsMet
    };
  }

  /**
   * Get weekly goal summary
   */
  async getWeeklyProgress(stats) {
    const today = new Date();
    const weekStart = this.mondayStartOfWeek(today);
    const weekProgress = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      
      const goalCheck = await this.checkDailyGoals(date, stats);
      weekProgress.push({
        date: this.ymd(date),
        dayName: date.toLocaleDateString(undefined, { weekday: 'short' }),
        goalsAchieved: goalCheck.allGoalsMet,
        minutes: goalCheck.actualMinutes,
        score: goalCheck.actualScore
      });
    }
    
    const daysWithGoals = weekProgress.filter(day => day.goalsAchieved).length;
    const weeklyGoalPercentage = Math.round((daysWithGoals / 7) * 100);
    
    return {
      days: weekProgress,
      summary: {
        daysWithGoals,
        totalDays: 7,
        percentage: weeklyGoalPercentage
      }
    };
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