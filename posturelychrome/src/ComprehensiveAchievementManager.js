/**
 * ComprehensiveAchievementManager - Extends BadgeSystem to display all 15 achievements
 * Shows earned, in-progress, and locked achievement states with comprehensive UI
 */
import { BadgeSystem } from './BadgeSystem.js';

export class ComprehensiveAchievementManager extends BadgeSystem {
  constructor() {
    super();
    this.localizationService = null;
  }

  /**
   * Set localization service for translations
   */
  setLocalizationService(localizationService) {
    this.localizationService = localizationService;
  }

  /**
   * Get comprehensive achievement data with progress tracking
   */
  async getComprehensiveAchievementData() {
    const earnedBadges = await this.getEarnedBadges();
    const allAchievements = [];

    // Process all 15 achievements
    for (const [badgeId, badge] of Object.entries(this.badges)) {
      const earnedBadge = earnedBadges.find(earned => earned.id === badgeId);
      
      allAchievements.push({
        ...badge,
        isEarned: !!earnedBadge,
        earnedDate: earnedBadge?.earnedDate || null,
        progress: await this.calculateAchievementProgress(badge),
        status: this.getAchievementStatus(badge, !!earnedBadge)
      });
    }

    // Group by category
    const categorizedAchievements = this.groupAchievementsByCategory(allAchievements);

    return {
      summary: {
        earned: earnedBadges.length,
        total: Object.keys(this.badges).length,
        percentage: Math.round((earnedBadges.length / Object.keys(this.badges).length) * 100)
      },
      achievements: allAchievements,
      categories: categorizedAchievements,
      recentEarned: earnedBadges
        .sort((a, b) => new Date(b.earnedDate) - new Date(a.earnedDate))
        .slice(0, 3)
    };
  }

  /**
   * Calculate progress for a specific achievement
   */
  async calculateAchievementProgress(badge) {
    try {
      // Get current stats and streak data
      const stats = await this.getStatsFromStorage();
      const streakData = await this.getStreakDataFromStorage();

      switch (badge.requirement.type) {
        case 'sessions':
          const totalSessions = this.calculateTotalSessions(stats);
          return Math.min(100, Math.round((totalSessions / badge.requirement.value) * 100));

        case 'total_minutes':
          const totalMinutes = this.calculateTotalMinutes(stats);
          return Math.min(100, Math.round((totalMinutes / badge.requirement.value) * 100));

        case 'streak':
          return Math.min(100, Math.round((streakData.currentStreak / badge.requirement.value) * 100));

        case 'daily_minutes':
          // Check if any day meets the requirement
          const hasMetDaily = this.checkDailyMinutes(stats, badge.requirement.value);
          return hasMetDaily ? 100 : this.getBestDailyMinutes(stats, badge.requirement.value);

        case 'daily_score':
          const hasMetScore = this.checkDailyScore(stats, badge.requirement.value);
          return hasMetScore ? 100 : this.getBestDailyScore(stats, badge.requirement.value);

        case 'weekly_score':
          const hasMetWeekly = this.checkWeeklyScore(stats, badge.requirement.value);
          return hasMetWeekly ? 100 : this.getCurrentWeeklyScore(stats, badge.requirement.value);

        case 'mood_sessions':
          const moodSessions = this.calculateMoodSessions(stats);
          return Math.min(100, Math.round((moodSessions / badge.requirement.value) * 100));

        case 'early_start':
        case 'late_tracking':
          // These are event-based, either 0% or 100%
          return 0; // Will be 100% when earned

        default:
          return 0;
      }
    } catch (error) {
      console.error('Error calculating achievement progress:', error);
      return 0;
    }
  }

  /**
   * Get achievement status (earned, in-progress, locked)
   */
  getAchievementStatus(badge, isEarned) {
    if (isEarned) {
      return 'earned';
    }

    // Check if there's any progress
    // For now, we'll consider achievements with progress > 0 as "in-progress"
    // This will be updated when we calculate actual progress
    return 'locked';
  }

  /**
   * Group achievements by category
   */
  groupAchievementsByCategory(achievements) {
    const categories = {};

    achievements.forEach(achievement => {
      const category = achievement.category;
      if (!categories[category]) {
        categories[category] = {
          name: this.getCategoryName(category),
          achievements: [],
          earned: 0,
          total: 0
        };
      }

      categories[category].achievements.push(achievement);
      categories[category].total++;
      if (achievement.isEarned) {
        categories[category].earned++;
      }
    });

    return categories;
  }

  /**
   * Get best daily minutes progress for achievements not yet earned
   */
  getBestDailyMinutes(stats, requiredMinutes) {
    let bestMinutes = 0;
    Object.values(stats).forEach(day => {
      const dayMinutes = day.minutes || 0;
      if (dayMinutes > bestMinutes) {
        bestMinutes = dayMinutes;
      }
    });
    return Math.min(100, Math.round((bestMinutes / requiredMinutes) * 100));
  }

  /**
   * Get best daily score progress for achievements not yet earned
   */
  getBestDailyScore(stats, requiredScore) {
    let bestScore = 0;
    Object.values(stats).forEach(day => {
      if (day.samples && day.samples > 0) {
        const avgScore = Math.round(day.scoreSum / day.samples);
        if (avgScore > bestScore) {
          bestScore = avgScore;
        }
      }
    });
    return Math.min(100, Math.round((bestScore / requiredScore) * 100));
  }

  /**
   * Get current weekly score progress
   */
  getCurrentWeeklyScore(stats, requiredScore) {
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

    if (totalSamples === 0) return 0;
    const weeklyAverage = Math.round(totalScore / totalSamples);
    return Math.min(100, Math.round((weeklyAverage / requiredScore) * 100));
  }

  /**
   * Get stats from storage (helper method)
   */
  async getStatsFromStorage() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['statsByDate'], (result) => {
        resolve(result.statsByDate || {});
      });
    });
  }

  /**
   * Get streak data from storage (helper method)
   */
  async getStreakDataFromStorage() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['streakData'], (result) => {
        resolve(result.streakData || { currentStreak: 0, longestStreak: 0 });
      });
    });
  }

  /**
   * Render compact achievement display (badges and names only)
   */
  async renderCompactAchievements(container) {
    if (!container) return;

    const achievementData = await this.getComprehensiveAchievementData();
    
    // Update progress for all achievements
    for (const achievement of achievementData.achievements) {
      if (!achievement.isEarned) {
        achievement.progress = await this.calculateAchievementProgress(achievement);
        achievement.status = achievement.progress > 0 ? 'in-progress' : 'locked';
      } else {
        achievement.progress = 100;
      }
    }

    // Clear existing content
    container.innerHTML = '';

    // Create compact header with view details button
    let achievementsTitle = 'Achievements';
    let viewAllText = 'View All';
    
    if (this.localizationService) {
      try {
        achievementsTitle = await this.localizationService.getAchievementTranslation('achievements');
        viewAllText = await this.localizationService.getAchievementTranslation('view-all');
      } catch (error) {
        console.warn('Failed to translate achievement header text:', error);
      }
    }
    
    const header = document.createElement('div');
    header.className = 'achievements-compact-header';
    header.innerHTML = `
      <div class="achievements-title">${achievementsTitle}</div>
      <div class="achievements-summary">
        <span class="achievements-count">${achievementData.summary.earned}/${achievementData.summary.total}</span>
        <button class="view-details-btn" onclick="window.toggleAchievementDetails()">${viewAllText}</button>
      </div>
    `;
    container.appendChild(header);

    // Create horizontal scrollable achievement grid
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'achievements-scroll-container';
    
    const achievementGrid = document.createElement('div');
    achievementGrid.className = 'achievements-compact-grid';

    // Sort achievements: earned first, then by category
    const sortedAchievements = achievementData.achievements.sort((a, b) => {
      if (a.isEarned && !b.isEarned) return -1;
      if (!a.isEarned && b.isEarned) return 1;
      return a.category.localeCompare(b.category);
    });

    for (const achievement of sortedAchievements) {
      const achievementElement = await this.createCompactAchievementElement(achievement);
      achievementGrid.appendChild(achievementElement);
    }

    scrollContainer.appendChild(achievementGrid);
    container.appendChild(scrollContainer);

    // Create detailed view (initially hidden)
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'achievements-details-container hidden';
    detailsContainer.id = 'achievementDetailsContainer';
    
    await this.renderDetailedAchievements(detailsContainer, achievementData);
    container.appendChild(detailsContainer);

    // Store reference for toggle functionality
    window.toggleAchievementDetails = async () => {
      const detailsContainer = document.getElementById('achievementDetailsContainer');
      const viewBtn = container.querySelector('.view-details-btn');
      
      let viewAllText = 'View All';
      let viewLessText = 'View Less';
      
      if (this.localizationService) {
        try {
          viewAllText = await this.localizationService.getAchievementTranslation('view-all');
          viewLessText = await this.localizationService.getAchievementTranslation('view-less');
        } catch (error) {
          console.warn('Failed to translate toggle button text:', error);
        }
      }
      
      if (detailsContainer.classList.contains('hidden')) {
        detailsContainer.classList.remove('hidden');
        scrollContainer.classList.add('hidden');
        viewBtn.textContent = viewLessText;
      } else {
        detailsContainer.classList.add('hidden');
        scrollContainer.classList.remove('hidden');
        viewBtn.textContent = viewAllText;
      }
    };
  }

  /**
   * Create compact achievement element (badge + name only)
   */
  async createCompactAchievementElement(achievement) {
    const element = document.createElement('div');
    element.className = `achievement-compact-item ${achievement.status}`;
    
    // Get translated name and description
    let achievementName = achievement.name;
    let achievementDescription = achievement.description;
    
    if (this.localizationService) {
      try {
        achievementName = await this.localizationService.translateText(achievement.name);
        achievementDescription = await this.localizationService.translateText(achievement.description);
      } catch (error) {
        console.warn('Failed to translate achievement text:', error);
      }
    }
    
    element.title = achievementDescription; // Tooltip for description
    
    element.innerHTML = `
      <div class="achievement-compact-icon">${achievement.status === 'locked' ? '🔒' : achievement.icon}</div>
      <div class="achievement-compact-name">${achievementName}</div>
      ${achievement.status === 'in-progress' ? `<div class="achievement-compact-progress">${achievement.progress}%</div>` : ''}
    `;

    return element;
  }

  /**
   * Render detailed achievement display (full information)
   */
  async renderDetailedAchievements(container, achievementData) {
    if (!container) return;

    // Create category sections
    for (const [, category] of Object.entries(achievementData.categories)) {
      const categorySection = document.createElement('div');
      categorySection.className = 'achievement-category';
      
      // Get translated category name
      let categoryName = category.name;
      if (this.localizationService) {
        try {
          categoryName = await this.localizationService.translateText(category.name);
        } catch (error) {
          console.warn('Failed to translate category name:', error);
        }
      }
      
      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'category-header';
      categoryHeader.innerHTML = `
        <div class="category-name">${categoryName}</div>
        <div class="category-progress">${category.earned}/${category.total}</div>
      `;
      categorySection.appendChild(categoryHeader);

      const achievementGrid = document.createElement('div');
      achievementGrid.className = 'achievement-grid';

      for (const achievement of category.achievements) {
        const achievementElement = await this.createDetailedAchievementElement(achievement);
        achievementGrid.appendChild(achievementElement);
      }

      categorySection.appendChild(achievementGrid);
      container.appendChild(categorySection);
    }
  }

  /**
   * Render comprehensive achievement display (legacy method for backward compatibility)
   */
  async renderComprehensiveAchievements(container) {
    // Use the new compact view by default
    await this.renderCompactAchievements(container);
  }

  /**
   * Create detailed achievement element (full information)
   */
  async createDetailedAchievementElement(achievement) {
    const element = document.createElement('div');
    element.className = `achievement-item ${achievement.status}`;
    
    // Get translated name and description
    let achievementName = achievement.name;
    let achievementDescription = achievement.description;
    let earnedText = 'Earned';
    
    if (this.localizationService) {
      try {
        achievementName = await this.localizationService.translateText(achievement.name);
        achievementDescription = await this.localizationService.translateText(achievement.description);
        earnedText = await this.localizationService.getAchievementTranslation('earned');
      } catch (error) {
        console.warn('Failed to translate achievement text:', error);
      }
    }
    
    const progressBar = achievement.status !== 'earned' ? `
      <div class="achievement-progress-bar">
        <div class="achievement-progress-fill" style="width: ${achievement.progress}%"></div>
      </div>
      <div class="achievement-progress-text">${achievement.progress}%</div>
    ` : '';

    element.innerHTML = `
      <div class="achievement-icon">${achievement.status === 'locked' ? '🔒' : achievement.icon}</div>
      <div class="achievement-info">
        <div class="achievement-name">${achievementName}</div>
        <div class="achievement-description">${achievementDescription}</div>
        ${progressBar}
        ${achievement.isEarned ? `<div class="achievement-earned-date">${earnedText} ${new Date(achievement.earnedDate).toLocaleDateString()}</div>` : ''}
      </div>
    `;

    return element;
  }

  /**
   * Update the existing badge display to show compact view
   */
  async updateBadgeDisplayComprehensive(badgesCount, recentBadges) {
    if (!badgesCount || !recentBadges) return;

    try {
      const achievementData = await this.getComprehensiveAchievementData();
      
      // Update badge count with accurate format
      badgesCount.textContent = `${achievementData.summary.earned}/15 earned`;
      
      // Render compact achievement view (new improved UI)
      await this.renderCompactAchievements(recentBadges);
      
    } catch (error) {
      console.error('Failed to update comprehensive badge display:', error);
    }
  }
}